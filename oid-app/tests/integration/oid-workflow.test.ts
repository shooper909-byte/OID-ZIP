import { randomBytes, randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "../../lib/database";
import { actorForServerRequest, actorFromRoles, type Actor } from "../../lib/auth";
import { nextOidCode } from "../../lib/oid-identifiers/counter";
import { assertCriticalExceptionCanClose } from "../../lib/control";
import { createReceiptWithPrisma } from "../../services/receipts/prisma-create";
import { reviewTestResultWithPrisma } from "../../services/testing/prisma-review-result";
import { releaseLotWithPrisma } from "../../services/lots/prisma-release";
import { allocateLotWithPrisma } from "../../services/inventory/prisma-allocate";
import { createCapa, closeCapa } from "../../services/capas";
import { uploadDocument } from "../../services/documents/upload";
import { downloadDocument } from "../../services/documents/download";
import { queryOid } from "../../services/intelligence/query";
import { PERMISSIONS } from "../../lib/permissions";
import { POST as releaseRoute } from "../../app/api/v1/lots/[id]/release/route";
import { createInternalSession, revokeInternalSession, validateInternalSession } from "../../lib/auth/session";

const runId = randomUUID().slice(0, 8);
const uniqueCode = (entity: string) => `OID-${entity}-E2E-${runId}-${randomUUID().slice(0, 8)}`;

describe.sequential("OID PostgreSQL control workflow", { timeout: 60_000 }, () => {
  let actor: Actor;
  let productId: string;
  let supplierId: string;
  let laboratoryId: string;
  let auditorEmail: string;
  let aiEmail: string;
  let disabledEmail: string;

  beforeAll(async () => {
    const user = await db.user.create({
      data: {
        email: `oid-e2e-${runId}@example.invalid`,
        displayName: "OID synthetic workflow actor",
        status: "ACTIVE",
      },
    });
    actor = actorFromRoles(user.id, user.email, ["FOUNDER"]);

    const product = await db.product.create({
      data: {
        oidCode: uniqueCode("PROD"),
        name: `Synthetic research material ${runId}`,
        status: "UNDER_REVIEW",
        evidenceState: "PROVISIONAL",
      },
    });
    productId = product.id;

    const supplier = await db.supplier.create({
      data: {
        oidCode: uniqueCode("SUP"),
        legalName: `Synthetic supplier ${runId}`,
        supplierType: "MANUFACTURER",
        qualificationStatus: "CONDITIONAL",
        riskLevel: "SYNTHETIC_VALIDATION_ONLY",
      },
    });
    supplierId = supplier.id;

    const laboratory = await db.laboratory.create({
      data: {
        oidCode: uniqueCode("LAB"),
        name: `Synthetic independent laboratory ${runId}`,
        status: "ACTIVE",
        accreditationStatus: "SYNTHETIC_VALIDATION_ONLY",
      },
    });
    laboratoryId = laboratory.id;

    auditorEmail = `oid-auditor-${runId}@example.invalid`;
    aiEmail = `oid-ai-${runId}@example.invalid`;
    for (const [email, roleName] of [[auditorEmail, "AUDITOR"], [aiEmail, "AI_ASSISTANT"]] as const) {
      const role = await db.role.findUniqueOrThrow({ where: { name: roleName } });
      const user = await db.user.create({ data: { email, status: "ACTIVE" } });
      await db.userRole.create({ data: { userId: user.id, roleId: role.id, assignedBy: actor.userId } });
    }
    disabledEmail = `oid-disabled-${runId}@example.invalid`;
    const auditorRole = await db.role.findUniqueOrThrow({ where: { name: "AUDITOR" } });
    const disabledUser = await db.user.create({ data: { email: disabledEmail, status: "DISABLED" } });
    await db.userRole.create({ data: { userId: disabledUser.id, roleId: auditorRole.id, assignedBy: actor.userId } });
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  async function receiveSyntheticLot(label: string) {
    const purchaseOrder = await db.purchaseOrder.create({
      data: {
        oidCode: uniqueCode("PO"),
        supplierId,
        supplierReference: `SYNTH-${label}-${runId}`,
        orderDate: new Date(),
        orderStatus: "PLACED",
        createdBy: actor.userId,
        items: {
          create: {
            productId,
            supplierProductName: `Synthetic ${label} material`,
            quantity: 10,
            unit: "g",
            unitCost: 1,
            totalCost: 10,
          },
        },
      },
      include: { items: true },
    });

    const receipt = await createReceiptWithPrisma({
      purchaseOrderId: purchaseOrder.id,
      receivedAt: new Date(),
      receivedBy: actor.userId,
      trackingNumber: `TRACK-${label}-${runId}`,
      carrier: "SYNTHETIC",
      photographsComplete: true,
      packingSlipPresent: true,
      invoicePresent: true,
      items: [
        {
          purchaseOrderItemId: purchaseOrder.items[0].id,
          productId,
          supplierLot: `SUP-${label}-${runId}`,
          quantityReceived: 10,
          unit: "g",
          labelPresent: true,
          lotMarkingPresent: true,
          coaReceived: true,
          conditionStatus: "ACCEPTABLE",
        },
      ],
      permissions: actor.permissions,
    }) as { id: string };

    return db.lot.findFirstOrThrow({
      where: { receiptId: receipt.id },
      include: { inventoryMovements: true },
    });
  }

  async function createTestResult(lotId: string, resultStatus: "PASS" | "FAIL", isIndependent: boolean) {
    const sample = await db.sample.create({
      data: {
        oidCode: uniqueCode("SMP"),
        lotId,
        laboratoryId,
        sampleType: "IDENTITY_AND_PURITY",
        quantity: 0.1,
        unit: "g",
        collectedAt: new Date(),
        collectedBy: actor.userId,
        chainOfCustodyStatus: "COMPLETE",
        sealed: true,
        receivedByLabAt: new Date(),
        status: "COMPLETE",
      },
    });
    const testOrder = await db.testOrder.create({
      data: {
        oidCode: uniqueCode("TST"),
        sampleId: sample.id,
        lotId,
        laboratoryId,
        isIndependent,
        testType: "IDENTITY_AND_PURITY",
        methodRequested: "SYNTHETIC HPLC/LC-MS VALIDATION",
        orderedAt: new Date(),
        resultReceivedAt: new Date(),
        status: "RESULT_REVIEW",
      },
    });
    return db.testResult.create({
      data: {
        oidCode: uniqueCode("RES"),
        testOrderId: testOrder.id,
        sampleId: sample.id,
        lotId,
        testType: "IDENTITY_AND_PURITY",
        method: "SYNTHETIC HPLC/LC-MS VALIDATION",
        textResult: resultStatus === "PASS" ? "Synthetic acceptance criteria met" : "Synthetic acceptance criteria not met",
        acceptanceCriteria: "Synthetic validation criteria",
        resultStatus,
        testDate: new Date(),
      },
    });
  }

  async function expectDatabaseAllocationBlocked(lotId: string, marker: string) {
    await expect(
      db.allocation.create({
        data: {
          oidCode: uniqueCode("ALLOC"),
          lotId,
          customerOrderRef: `DB-GUARD-${marker}-${runId}`,
          quantity: 1,
          unit: "g",
          allocatedBy: actor.userId,
        },
      }),
    ).rejects.toThrow(/ALLOCATION_BLOCKED:LOT_NOT_RELEASED/);
  }

  async function expectServiceAllocationBlocked(lotId: string, marker: string) {
    await expect(
      allocateLotWithPrisma({
        lotId,
        customerOrderRef: `SERVICE-GUARD-${marker}-${runId}`,
        quantity: 1,
        unit: "g",
        userId: actor.userId,
        permissions: actor.permissions,
      }),
    ).rejects.toThrow(/ALLOCATION_BLOCKED:LOT_NOT_RELEASED/);
  }

  it("runs supplier through released-only allocation and enforces independent human-reviewed PASS", async () => {
    const lot = await receiveSyntheticLot("PASS");
    expect(lot.status).toBe("QUARANTINE");
    expect(lot.releaseGateStatus).toBe("INCOMPLETE");
    expect(lot.inventoryMovements).toHaveLength(1);
    expect(Number(lot.inventoryMovements[0].quantityIn)).toBe(10);

    await expectServiceAllocationBlocked(lot.id, "QUARANTINE");
    await expectDatabaseAllocationBlocked(lot.id, "QUARANTINE");
    await expect(
      releaseLotWithPrisma({ lotId: lot.id, userId: actor.userId, permissions: actor.permissions, reason: "Synthetic release attempt without testing" }),
    ).rejects.toThrow(/INDEPENDENT_TEST_NOT_PASSED_AND_REVIEWED/);
    await expect(db.lot.update({
      where: { id: lot.id },
      data: { status: "RELEASED", releaseGateStatus: "PASS", releasedAt: new Date(), releasedBy: actor.userId },
    })).rejects.toThrow(/LOT_RELEASE_BLOCKED:/);

    await db.lot.update({ where: { id: lot.id }, data: { status: "TESTING", releaseGateStatus: "IN_REVIEW" } });
    const nonIndependentResult = await createTestResult(lot.id, "PASS", false);
    await reviewTestResultWithPrisma({
      resultId: nonIndependentResult.id,
      reviewerId: actor.userId,
      reviewStatus: "REVIEWED",
      note: "Synthetic human review of a non-independent result",
      permissions: actor.permissions,
    });
    await expect(
      releaseLotWithPrisma({ lotId: lot.id, userId: actor.userId, permissions: actor.permissions, reason: "Non-independent result must not release" }),
    ).rejects.toThrow(/INDEPENDENT_TEST_NOT_PASSED_AND_REVIEWED/);

    const independentResult = await createTestResult(lot.id, "PASS", true);
    await reviewTestResultWithPrisma({
      resultId: independentResult.id,
      reviewerId: actor.userId,
      reviewStatus: "APPROVED",
      note: "Synthetic authorized human review of independent PASS",
      permissions: actor.permissions,
    });
    const released = await releaseLotWithPrisma({
      lotId: lot.id,
      userId: actor.userId,
      permissions: actor.permissions,
      reason: "Synthetic release after complete traceability and independent reviewed PASS",
    }) as { status: string; releaseGateStatus: string };
    expect(released.status).toBe("RELEASED");
    expect(released.releaseGateStatus).toBe("PASS");

    await expect(allocateLotWithPrisma({
      lotId: lot.id, customerOrderRef: `UNAUTHORIZED-${runId}`, quantity: 1, unit: "g",
      userId: actor.userId, permissions: actorFromRoles(actor.userId, auditorEmail, ["AUDITOR"]).permissions,
    })).rejects.toThrow(/FORBIDDEN:inventory.allocate/);

    await allocateLotWithPrisma({
      lotId: lot.id,
      customerOrderRef: `ORDER-INITIAL-${runId}`,
      quantity: 2,
      unit: "g",
      userId: actor.userId,
      permissions: actor.permissions,
    });

    const concurrent = await Promise.allSettled([
      allocateLotWithPrisma({ lotId: lot.id, customerOrderRef: `ORDER-A-${runId}`, quantity: 5, unit: "g", userId: actor.userId, permissions: actor.permissions }),
      allocateLotWithPrisma({ lotId: lot.id, customerOrderRef: `ORDER-B-${runId}`, quantity: 5, unit: "g", userId: actor.userId, permissions: actor.permissions }),
    ]);
    expect(concurrent.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(concurrent.filter((result) => result.status === "rejected")).toHaveLength(1);

    const sums = await db.inventoryMovement.aggregate({ where: { lotId: lot.id }, _sum: { quantityIn: true, quantityOut: true } });
    expect(Number(sums._sum.quantityIn) - Number(sums._sum.quantityOut)).toBe(3);

    const releaseAudit = await db.auditLog.findFirstOrThrow({ where: { entityType: "LOT", entityId: lot.id, eventType: "RELEASE" } });
    await expect(db.auditLog.update({ where: { id: releaseAudit.id }, data: { reason: "tamper attempt" } })).rejects.toThrow(/AUDIT_LOG_IMMUTABLE/);
    await expect(db.auditLog.delete({ where: { id: releaseAudit.id } })).rejects.toThrow(/AUDIT_LOG_IMMUTABLE/);

    const documentBytes = Buffer.from(`OID synthetic evidence ${runId}`, "utf8");
    const firstDocument = await uploadDocument({
      filename: `synthetic-${runId}.txt`,
      mimeType: "text/plain",
      bytes: documentBytes,
      documentType: "LAB_REPORT",
      title: "Synthetic validation evidence",
      entityType: "LOT",
      entityId: lot.id,
      userId: actor.userId,
      permissions: actor.permissions,
    });
    await expect(uploadDocument({
      filename: `synthetic-duplicate-${runId}.txt`,
      mimeType: "text/plain",
      bytes: documentBytes,
      documentType: "LAB_REPORT",
      title: "Synthetic duplicate evidence",
      entityType: "LOT",
      entityId: lot.id,
      userId: actor.userId,
      permissions: actor.permissions,
    })).rejects.toThrow(/DUPLICATE_DOCUMENT:/);

    const downloaded = await downloadDocument({ documentId: firstDocument.id, userId: actor.userId, permissions: actor.permissions });
    expect(downloaded.bytes.equals(documentBytes)).toBe(true);
    expect(await db.auditLog.count({ where: { entityType: "DOCUMENT", entityId: firstDocument.id, eventType: "DOWNLOAD" } })).toBe(1);

    const secondDocument = await uploadDocument({
      filename: `synthetic-v2-${runId}.txt`, mimeType: "text/plain",
      bytes: Buffer.from(`OID synthetic evidence version two ${runId}`, "utf8"),
      documentType: "LAB_REPORT", title: "Synthetic validation evidence version two",
      entityType: "LOT", entityId: lot.id, supersedesDocumentId: firstDocument.id,
      userId: actor.userId, permissions: actor.permissions,
    });
    expect(secondDocument.version).toBe(2);
    expect((await db.document.findUniqueOrThrow({ where: { id: firstDocument.id } })).status).toBe("SUPERSEDED");
    await expect(downloadDocument({
      documentId: secondDocument.id, userId: actor.userId,
      permissions: actorFromRoles(actor.userId, "commercial@example.invalid", ["COMMERCIAL"]).permissions,
    })).rejects.toThrow(/FORBIDDEN:document.read/);

    const concurrentDocumentBytes = Buffer.from(`OID concurrent document ${runId}`, "utf8");
    const concurrentDocuments = await Promise.allSettled([
      uploadDocument({ filename: `concurrent-a-${runId}.txt`, mimeType: "text/plain", bytes: concurrentDocumentBytes, documentType: "LAB_REPORT", title: "Concurrent document A", entityType: "LOT", entityId: lot.id, userId: actor.userId, permissions: actor.permissions }),
      uploadDocument({ filename: `concurrent-b-${runId}.txt`, mimeType: "text/plain", bytes: concurrentDocumentBytes, documentType: "LAB_REPORT", title: "Concurrent document B", entityType: "LOT", entityId: lot.id, userId: actor.userId, permissions: actor.permissions }),
    ]);
    expect(concurrentDocuments.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(concurrentDocuments.filter((result) => result.status === "rejected")).toHaveLength(1);
  });

  it("routes failed independent testing to HOLD, exception, CAPA, and rejected disposition", async () => {
    const lot = await receiveSyntheticLot("FAIL");
    await db.lot.update({ where: { id: lot.id }, data: { status: "TESTING", releaseGateStatus: "IN_REVIEW" } });
    const failedResult = await createTestResult(lot.id, "FAIL", true);
    await reviewTestResultWithPrisma({
      resultId: failedResult.id,
      reviewerId: actor.userId,
      reviewStatus: "APPROVED",
      note: "Synthetic human review confirms failed independent result",
      permissions: actor.permissions,
    });

    const held = await db.lot.findUniqueOrThrow({ where: { id: lot.id } });
    expect(held.status).toBe("HOLD");
    expect(held.releaseGateStatus).toBe("BLOCKED");
    const blockingException = await db.exception.findFirstOrThrow({ where: { lotId: lot.id, entityId: failedResult.id } });
    expect(blockingException.severity).toBe("CRITICAL");
    expect(blockingException.blocksProcess).toBe("RELEASE");
    expect(blockingException.status).toBe("OPEN");

    const passingResult = await createTestResult(lot.id, "PASS", true);
    await db.testResult.update({
      where: { id: passingResult.id },
      data: { reviewStatus: "APPROVED", reviewedBy: actor.userId, reviewedAt: new Date() },
    });
    await expect(
      releaseLotWithPrisma({ lotId: lot.id, userId: actor.userId, permissions: actor.permissions, reason: "Open blocker must prevent release" }),
    ).rejects.toThrow(/OPEN_BLOCKING_EXCEPTION/);
    await expect(db.lot.update({
      where: { id: lot.id },
      data: { status: "RELEASED", releaseGateStatus: "PASS", releasedAt: new Date(), releasedBy: actor.userId },
    })).rejects.toThrow(/LOT_RELEASE_BLOCKED:OPEN_BLOCKING_EXCEPTION/);
    await expectServiceAllocationBlocked(lot.id, "HOLD");
    await expectDatabaseAllocationBlocked(lot.id, "HOLD");

    await db.exception.update({ where: { id: blockingException.id }, data: { status: "INVESTIGATING" } });
    const capa = await createCapa({
      exceptionId: blockingException.id,
      title: "Synthetic failed-test investigation",
      ownerId: actor.userId,
      userId: actor.userId,
      permissions: actor.permissions,
    });
    const closedCapa = await closeCapa({
      capaId: capa.id,
      rootCause: "Synthetic result failed the predefined acceptance criterion",
      correctiveAction: "Segregate and reject the synthetic lot",
      preventiveAction: "Retain the independent-test release gate",
      effectivenessReview: "Synthetic validation confirms release and allocation remain blocked",
      effectivenessStatus: "EFFECTIVE",
      userId: actor.userId,
      permissions: actor.permissions,
    });
    expect(closedCapa.status).toBe("CLOSED");

    assertCriticalExceptionCanClose({
      severity: "CRITICAL",
      resolution: "Synthetic investigation completed; lot rejected and remains unavailable for allocation",
      evidenceCount: 2,
      reviewerAuthorized: true,
    });
    await db.$transaction(async (tx) => {
      await tx.exception.update({
        where: { id: blockingException.id },
        data: {
          status: "CLOSED",
          resolution: "Synthetic investigation completed; lot rejected and remains unavailable for allocation",
          resolvedAt: new Date(),
          resolvedBy: actor.userId,
          evidenceSummary: "Synthetic failed result and completed CAPA",
        },
      });
      await tx.lot.update({
        where: { id: lot.id },
        data: { status: "REJECTED", releaseGateStatus: "FAIL", rejectedAt: new Date(), rejectedBy: actor.userId },
      });
      await tx.auditLog.create({
        data: {
          oidCode: await nextOidCode(tx, "AUD"),
          eventType: "REJECT",
          userId: actor.userId,
          entityType: "LOT",
          entityId: lot.id,
          previousValues: { status: "HOLD", releaseGateStatus: "BLOCKED" },
          newValues: { status: "REJECTED", releaseGateStatus: "FAIL", capaId: capa.id },
          reason: "Synthetic failed-test final disposition",
        },
      });
    });

    await expectServiceAllocationBlocked(lot.id, "REJECTED");
    await expectDatabaseAllocationBlocked(lot.id, "REJECTED");

    const recalledLot = await receiveSyntheticLot("RECALLED");
    await db.lot.update({ where: { id: recalledLot.id }, data: { status: "RECALLED", releaseGateStatus: "BLOCKED" } });
    await expectServiceAllocationBlocked(recalledLot.id, "RECALLED");
    await expectDatabaseAllocationBlocked(recalledLot.id, "RECALLED");
  });

  it("enforces Ask OID retrieval scope and rejects unauthorized release API calls", async () => {
    const lot = await db.lot.findFirstOrThrow({ where: { supplierId }, orderBy: { createdAt: "asc" } });
    await expect(queryOid({
      question: `Explain ${lot.oidCode}`,
      userId: actor.userId,
      permissions: new Set([PERMISSIONS.INTELLIGENCE_QUERY]),
    })).rejects.toThrow("FORBIDDEN:lot.read");

    const scoped = await queryOid({
      question: `Explain ${lot.oidCode}`,
      userId: actor.userId,
      permissions: new Set([PERMISSIONS.INTELLIGENCE_QUERY, PERMISSIONS.LOT_READ]),
    });
    expect(scoped.evidence).toHaveLength(0);
    expect(scoped.unknowns).toContain("Testing evidence is outside the requesting user's authorized retrieval scope.");
    expect(scoped.unknowns).toContain("Exception evidence is outside the requesting user's authorized retrieval scope.");

    const previous = {
      NODE_ENV: process.env.NODE_ENV, OID_IDENTITY_MODE: process.env.OID_IDENTITY_MODE,
      OID_TRUSTED_PROXY_SECRET: process.env.OID_TRUSTED_PROXY_SECRET, OID_IDENTITY_EMAIL_HEADER: process.env.OID_IDENTITY_EMAIL_HEADER,
      OID_REQUIRE_MFA: process.env.OID_REQUIRE_MFA, OID_ALLOWED_ORIGIN: process.env.OID_ALLOWED_ORIGIN,
    };
    const mutableEnv = process.env as Record<string, string | undefined>;
    mutableEnv.NODE_ENV = "production";
    process.env.OID_IDENTITY_MODE = "trusted-proxy";
    process.env.OID_TRUSTED_PROXY_SECRET = randomBytes(32).toString("hex");
    process.env.OID_IDENTITY_EMAIL_HEADER = "x-oid-user-email";
    process.env.OID_REQUIRE_MFA = "true";
    process.env.OID_ALLOWED_ORIGIN = "https://oid.example.invalid";
    const objectIds = new Map<string, string>();
    const oidFor = (email: string) => { if (!objectIds.has(email)) objectIds.set(email, randomUUID()); return objectIds.get(email)!; };
    try {
      for (const email of [auditorEmail, aiEmail]) {
        const request = new Request(`https://oid.example.invalid/api/v1/lots/${lot.id}/release`, {
          method: "POST",
          headers: { "content-type": "application/json", origin: "https://oid.example.invalid", "x-oid-proxy-secret": process.env.OID_TRUSTED_PROXY_SECRET, "x-oid-user-oid": oidFor(email), "x-oid-user-email": email, "x-oid-mfa": "true" },
          body: JSON.stringify({ reason: "Unauthorized synthetic release attempt" }),
        });
        const response = await releaseRoute(request, { params: Promise.resolve({ id: lot.id }) });
        expect(response.status).toBe(403);
      }
      const disabledRequest = new Request("https://oid.example.invalid/api/v1/search?q=OID", {
        headers: { "x-oid-proxy-secret": process.env.OID_TRUSTED_PROXY_SECRET, "x-oid-user-oid": oidFor(disabledEmail), "x-oid-user-email": disabledEmail, "x-oid-mfa": "true" },
      });
      await expect(actorForServerRequest(disabledRequest)).rejects.toThrow("UNAUTHORIZED:LOCAL_USER_DISABLED");
      const missingMfaRequest = new Request("https://oid.example.invalid/api/v1/search?q=OID", {
        headers: { "x-oid-proxy-secret": process.env.OID_TRUSTED_PROXY_SECRET, "x-oid-user-oid": oidFor(auditorEmail), "x-oid-user-email": auditorEmail },
      });
      await expect(actorForServerRequest(missingMfaRequest)).rejects.toThrow("UNAUTHORIZED:MFA_CLAIM_MISSING");
      const unknownUserRequest = new Request("https://oid.example.invalid/api/v1/search?q=OID", {
        headers: { "x-oid-proxy-secret": process.env.OID_TRUSTED_PROXY_SECRET, "x-oid-user-oid": randomUUID(), "x-oid-user-email": `unknown-${runId}@example.invalid`, "x-oid-mfa": "true" },
      });
      await expect(actorForServerRequest(unknownUserRequest)).rejects.toThrow("UNAUTHORIZED:LOCAL_USER_MISSING");
      const noObjectIdRequest = new Request("https://oid.example.invalid/api/v1/search?q=OID", {
        headers: { "x-oid-proxy-secret": process.env.OID_TRUSTED_PROXY_SECRET, "x-oid-user-email": auditorEmail, "x-oid-mfa": "true" },
      });
      await expect(actorForServerRequest(noObjectIdRequest)).rejects.toThrow("UNAUTHORIZED:NO_PRINCIPAL");
      // Once linked by object ID, a changed email claim no longer matters.
      const linkedRequest = new Request("https://oid.example.invalid/api/v1/search?q=OID", {
        headers: { "x-oid-proxy-secret": process.env.OID_TRUSTED_PROXY_SECRET, "x-oid-user-oid": oidFor(auditorEmail), "x-oid-user-email": `renamed-${runId}@example.invalid`, "x-oid-mfa": "true" },
      });
      expect((await actorForServerRequest(linkedRequest)).email).toBe(auditorEmail);
    } finally {
      for (const [key, value] of Object.entries(previous)) value === undefined ? delete process.env[key] : process.env[key] = value;
    }
  });

  it("revokes an individual internal session and rejects subsequent replay", async () => {
    const session = await createInternalSession(actor.userId, 1);
    expect(await validateInternalSession(session.token)).toBe(true);
    expect(await revokeInternalSession(session.token, actor.userId)).toBe(true);
    expect(await validateInternalSession(session.token)).toBe(false);
    expect(await revokeInternalSession(session.token, actor.userId)).toBe(false);
  });
});
