"use server";

/**
 * Authentication Server Actions
 *
 * Handles login and logout on the server.
 * Creates/destroys Firebase session cookies.
 *
 * These are Server Actions — they run on the server only.
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { createSessionCookie, SESSION_COOKIE_NAME, SESSION_EXPIRY_MS } from "@/lib/auth/session";
import type { ActionState } from "@/lib/types";
import { FieldValue } from "firebase-admin/firestore";

/**
 * Login action — verifies Firebase ID token and creates session cookie.
 *
 * Called from the login page after client-side Firebase Auth sign-in.
 * The client gets the ID token from Firebase Auth, then calls this action
 * to exchange it for a server-side session cookie.
 */
export async function loginAction(idToken: string): Promise<ActionState> {
  try {
    // Verify the ID token server-side
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;

    // Check if user exists in Firestore
    const userDoc = await adminDb.collection("users").doc(uid).get();

    if (!userDoc.exists) {
      // Auto-create user profile on first login
      // First user becomes ADMIN (or can be set manually in Firestore)
      const usersSnapshot = await adminDb.collection("users").limit(1).get();
      const isFirstUser = usersSnapshot.empty;

      const newUser = {
        name: decodedToken.name || decodedToken.email?.split("@")[0] || "User",
        email: decodedToken.email || "",
        role: isFirstUser ? "ADMIN" : "CASHIER",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };

      await adminDb.collection("users").doc(uid).set(newUser);
    }

    // Create session cookie
    const sessionCookie = await createSessionCookie(idToken);

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_EXPIRY_MS / 1000, // Convert ms to seconds
      path: "/",
    });

    return { success: true };
  } catch (error) {
    console.error("Login error:", error);
    return {
      success: false,
      message: "Login failed. Please check your credentials and try again.",
    };
  }
}

/**
 * Logout action — destroys the session cookie.
 */
export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  redirect("/admin/login");
}
