import { mkdir, writeFile, readFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import { DefaultAzureCredential } from "@azure/identity";
import { BlobServiceClient } from "@azure/storage-blob";

export interface ObjectStorage { put(key: string, bytes: Buffer): Promise<void>; get(key: string): Promise<Buffer>; }

export function assertSafeStorageKey(key: string): string {
  const normalized = key.replace(/\\/g, "/");
  if (!normalized || normalized.startsWith("/") || normalized.split("/").some((part) => !part || part === "." || part === "..")) {
    throw new Error("STORAGE_KEY_INVALID");
  }
  return normalized;
}

export class LocalPrivateStorage implements ObjectStorage {
  constructor(private root = process.env.OID_STORAGE_ROOT ?? "/var/lib/oid/private") {}
  private pathFor(key: string): string {
    const root = resolve(this.root);
    const path = resolve(root, key);
    if (path === root || !path.startsWith(`${root}${sep}`)) throw new Error("STORAGE_KEY_OUTSIDE_PRIVATE_ROOT");
    return path;
  }
  async put(key: string, bytes: Buffer) { const path = this.pathFor(key); await mkdir(dirname(path), { recursive: true }); await writeFile(path, bytes, { mode: 0o600, flag: "wx" }); }
  async get(key: string) { return readFile(this.pathFor(key)); }
}

export class AzureBlobStorage implements ObjectStorage {
  private readonly container;

  constructor(env: NodeJS.ProcessEnv = process.env) {
    const serviceUrl = env.OID_BLOB_SERVICE_URL?.trim();
    const containerName = env.OID_BLOB_CONTAINER?.trim();
    if (!serviceUrl || !containerName) throw new Error("BLOB_STORAGE_CONFIG_MISSING");
    const credential = new DefaultAzureCredential({ managedIdentityClientId: env.AZURE_CLIENT_ID?.trim() || undefined });
    this.container = new BlobServiceClient(serviceUrl, credential).getContainerClient(containerName);
  }

  async put(key: string, bytes: Buffer): Promise<void> {
    const blob = this.container.getBlockBlobClient(assertSafeStorageKey(key));
    try {
      await blob.uploadData(bytes, { conditions: { ifNoneMatch: "*" } });
    } catch (error) {
      const statusCode = typeof error === "object" && error !== null && "statusCode" in error ? Number(error.statusCode) : undefined;
      if (statusCode === 409 || statusCode === 412) throw new Error("STORAGE_OBJECT_ALREADY_EXISTS");
      throw error;
    }
  }

  async get(key: string): Promise<Buffer> {
    return this.container.getBlobClient(assertSafeStorageKey(key)).downloadToBuffer();
  }
}

export function objectStorage(env: NodeJS.ProcessEnv = process.env): ObjectStorage {
  const backend = env.OID_STORAGE_BACKEND?.trim().toLowerCase() || "local";
  if (backend === "local") return new LocalPrivateStorage(env.OID_STORAGE_ROOT);
  if (backend === "azure-blob") return new AzureBlobStorage(env);
  throw new Error("STORAGE_BACKEND_UNSUPPORTED");
}
