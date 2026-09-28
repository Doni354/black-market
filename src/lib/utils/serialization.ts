/**
 * Serialization helper for Next.js Server Components -> Client Components boundary.
 *
 * Firestore returns instances of Timestamp (with class prototypes and methods like .toDate()),
 * which Next.js React Server Component serialization rejects with:
 * "Only plain objects, and a few built-ins, can be passed to Client Components from Server Components."
 *
 * This function recursively transforms Firestore Timestamps into plain ISO date strings.
 */

export function serializeFirestoreData<T>(obj: unknown): T {
  if (obj === null || obj === undefined) {
    return obj as T;
  }

  // Handle Firestore Timestamp instances (admin SDK or client SDK)
  if (
    typeof obj === "object" &&
    "toDate" in obj &&
    typeof (obj as { toDate: unknown }).toDate === "function"
  ) {
    return (obj as { toDate: () => Date }).toDate().toISOString() as unknown as T;
  }

  // Handle Firestore internal timestamp representation {_seconds, _nanoseconds}
  if (
    typeof obj === "object" &&
    "_seconds" in obj &&
    typeof (obj as { _seconds: unknown })._seconds === "number"
  ) {
    const raw = obj as { _seconds: number; _nanoseconds?: number };
    const millis = raw._seconds * 1000 + Math.floor((raw._nanoseconds || 0) / 1000000);
    return new Date(millis).toISOString() as unknown as T;
  }

  // Handle standard Date instances
  if (obj instanceof Date) {
    return obj.toISOString() as unknown as T;
  }

  // Handle Arrays
  if (Array.isArray(obj)) {
    return obj.map((item) => serializeFirestoreData(item)) as unknown as T;
  }

  // Handle plain objects
  if (
    typeof obj === "object" &&
    (obj.constructor === Object || !obj.constructor)
  ) {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[key] = serializeFirestoreData(value);
    }
    return result as unknown as T;
  }

  return obj as T;
}
