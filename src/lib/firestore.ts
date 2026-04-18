import { Firestore } from "@google-cloud/firestore";

/**
 * Singleton Firestore client.
 *
 * On Cloud Run, the client picks up credentials and project from the metadata
 * server automatically. No explicit config needed. For local dev, set up
 * Application Default Credentials via `gcloud auth application-default login`.
 *
 * Firestore connections are lazy: nothing happens at import time. The client
 * only reaches out when a read or write is issued.
 */

type GlobalWithFirestore = typeof globalThis & { __firestoreClient?: Firestore };
const globalForFirestore = globalThis as GlobalWithFirestore;

export function getFirestore(): Firestore {
  if (!globalForFirestore.__firestoreClient) {
    globalForFirestore.__firestoreClient = new Firestore({
      // databaseId is "(default)" unless we explicitly named one
      ignoreUndefinedProperties: true,
    });
  }
  return globalForFirestore.__firestoreClient;
}
