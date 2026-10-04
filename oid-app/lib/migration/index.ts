export type ImportStatus = "IMPORTED_UNREVIEWED"|"IMPORTED_REVIEW_REQUIRED"|"IMPORTED_VERIFIED"|"IMPORT_CONFLICT";
export type LegacyRow = { source: string; sheet?: string; row?: string; legacyIdentifier?: string; values: Record<string, unknown> };

export function classifyLegacyRow(input: { row: LegacyRow; requiredFields: string[]; duplicate: boolean; conflicts: string[] }): ImportStatus {
  if (input.duplicate || input.conflicts.length > 0) return "IMPORT_CONFLICT";
  for (const field of input.requiredFields) if (input.row.values[field] === undefined || input.row.values[field] === null || input.row.values[field] === "") return "IMPORTED_REVIEW_REQUIRED";
  return "IMPORTED_UNREVIEWED";
}

export function assertImportCanCommit(input: { conflictsOpen: number; dryRunCompleted: boolean; approvedByAuthorizedUser: boolean }): void {
  if (!input.dryRunCompleted) throw new Error("IMPORT_DRY_RUN_REQUIRED");
  if (input.conflictsOpen > 0) throw new Error("IMPORT_CONFLICTS_OPEN");
  if (!input.approvedByAuthorizedUser) throw new Error("IMPORT_APPROVAL_REQUIRED");
}
