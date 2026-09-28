/**
 * Auth utilities — server-side only
 *
 * Verifies Firebase ID tokens and retrieves user sessions.
 * Only import this in Server Components, Route Handlers, or Server Actions.
 */

import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import type { User, UserRole } from "@/lib/types";
import { SESSION_COOKIE_NAME, SESSION_EXPIRY_MS } from "./constants";
import { serializeFirestoreData } from "@/lib/utils/serialization";

// Re-export constants for convenience
export { SESSION_COOKIE_NAME, SESSION_EXPIRY_MS } from "./constants";

/**
 * Create a session cookie from a Firebase ID token.
 * Called after successful login.
 */
export async function createSessionCookie(idToken: string): Promise<string> {
  const sessionCookie = await adminAuth.createSessionCookie(idToken, {
    expiresIn: SESSION_EXPIRY_MS,
  });
  return sessionCookie;
}

/**
 * Verify the session cookie and return the decoded token.
 * Returns null if the session is invalid or expired.
 */
export async function verifySession() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionCookie) return null;

  try {
    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);
    return decodedToken;
  } catch {
    return null;
  }
}

/**
 * Get the current authenticated user with their Firestore profile.
 * Returns null if not authenticated.
 * All Timestamps are serialized to plain strings for safe Client Component passing.
 */
export async function getCurrentUser(): Promise<User | null> {
  const session = await verifySession();
  if (!session) return null;

  try {
    const userDoc = await adminDb.collection("users").doc(session.uid).get();
    if (!userDoc.exists) return null;

    const data = userDoc.data();
    if (!data) return null;

    // If user is not ACTIVE (e.g. PENDING or REJECTED), deny access to admin session
    if (data.status && data.status !== "ACTIVE") {
      return null;
    }

    const rawUser = {
      id: userDoc.id,
      name: data.name || session.name || session.email?.split("@")[0] || "User",
      email: data.email || session.email || "",
      role: data.role || "CASHIER",
      status: data.status || "ACTIVE",
      photoURL: data.photoURL || session.picture || undefined,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };

    return serializeFirestoreData<User>(rawUser);
  } catch (error) {
    console.error("getCurrentUser error:", error);
    return null;
  }
}

/**
 * Require authentication. Returns user or returns null (caller handles redirect).
 */
export async function requireAuth(): Promise<User | null> {
  return getCurrentUser();
}

/**
 * Require a specific role — returns user if role matches, null otherwise.
 */
export async function requireRole(role: UserRole): Promise<User | null> {
  const user = await getCurrentUser();
  if (!user || user.role !== role) return null;
  return user;
}
