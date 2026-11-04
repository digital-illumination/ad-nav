import { CosmosClient, type Container } from "@azure/cosmos";
import { AzureCliCredential, DefaultAzureCredential } from "@azure/identity";

/**
 * Singleton Azure Cosmos DB client (NoSQL API, serverless account).
 *
 * Auth is Microsoft Entra only, no account keys:
 *   - On Azure Container Apps the app's user-assigned managed identity is
 *     picked up by DefaultAzureCredential through AZURE_CLIENT_ID.
 *   - Locally, sign in with `az login` and set AZURE_SUBSCRIPTION to the
 *     Digital Illumination subscription (name or id). The CLI credential then
 *     signs in as that subscription's account, whatever the CLI default is.
 *
 * Env:
 *   COSMOS_ENDPOINT   account endpoint, e.g. https://<account>.documents.azure.com:443/
 *   COSMOS_DATABASE   database name (default "ad-nav")
 *
 * Containers (one per former Firestore collection, all with per-item TTL
 * enabled so expired documents clean themselves up):
 *   sessions, oauth_clients, oauth_codes, oauth_refresh_tokens  partition /id
 *   flags                                                       partition /subject
 *   journal_embeddings, archive_embeddings                      partition /id
 *
 * The client is lazy: nothing connects at import time.
 */

type GlobalWithCosmos = typeof globalThis & { __cosmosClient?: CosmosClient };
const globalForCosmos = globalThis as GlobalWithCosmos;

function getClient(): CosmosClient {
  if (!globalForCosmos.__cosmosClient) {
    const endpoint = process.env.COSMOS_ENDPOINT;
    if (!endpoint) throw new Error("COSMOS_ENDPOINT is not set");
    const subscription = process.env.AZURE_SUBSCRIPTION;
    globalForCosmos.__cosmosClient = new CosmosClient({
      endpoint,
      aadCredentials: subscription
        ? new AzureCliCredential({ subscription })
        : new DefaultAzureCredential(),
    });
  }
  return globalForCosmos.__cosmosClient;
}

export function getContainer(name: string): Container {
  const database = process.env.COSMOS_DATABASE || "ad-nav";
  return getClient().database(database).container(name);
}

/** Cosmos returns 404 for a missing item, 412 for a failed etag precondition. */
export function cosmosStatus(err: unknown): number | undefined {
  if (err && typeof err === "object" && "code" in err) {
    const code = (err as { code?: unknown }).code;
    if (typeof code === "number") return code;
  }
  return undefined;
}

const SYSTEM_FIELDS = ["_rid", "_self", "_etag", "_attachments", "_ts", "ttl"] as const;

/**
 * Strip Cosmos system properties so callers see exactly the shape they wrote.
 * `id` is removed too unless `keepId` is set: the stored documents carry an
 * `id` only because Cosmos requires one, and it must not leak into OAuth
 * registration responses or tool output.
 */
export function clean<T>(resource: Record<string, unknown>, keepId = false): T {
  const out: Record<string, unknown> = { ...resource };
  for (const f of SYSTEM_FIELDS) delete out[f];
  if (!keepId) delete out.id;
  return out as T;
}

/** Read one item by id and partition key value; null when it does not exist. */
export async function readItem<T>(
  container: string,
  id: string,
  partitionKey: string = id,
  keepId = false
): Promise<T | null> {
  try {
    const { resource } = await getContainer(container).item(id, partitionKey).read();
    if (!resource) return null;
    return clean<T>(resource as Record<string, unknown>, keepId);
  } catch (err) {
    if (cosmosStatus(err) === 404) return null;
    throw err;
  }
}

/** Seconds until `expiresAtMs`, plus a margin, as a Cosmos per-item TTL. */
export function ttlFor(expiresAtMs: number, marginSeconds = 24 * 60 * 60): number {
  return Math.max(60, Math.ceil((expiresAtMs - Date.now()) / 1000) + marginSeconds);
}
