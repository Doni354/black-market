/**
 * Firebase Admin SDK Initialization — SERVER-SIDE ONLY
 *
 * IMPORTANT: This module must NEVER be imported in:
 * - Client components ('use client')
 * - Any file that is part of the browser bundle
 *
 * Safe to use in:
 * - Route Handlers (app/api/*)
 * - Server Actions ('use server')
 * - Server Components
 * - proxy.ts (but don't import Firebase here — use cookie check only)
 *
 * Credentials come from server-only env vars (no NEXT_PUBLIC_ prefix).
 * Uses lazy initialization so it doesn't crash during `next build` if env vars
 * are not set (they will be set at runtime in production).
 */

import { getApps, cert, initializeApp } from "firebase-admin/app";
import type { App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getAuth, type Auth } from "firebase-admin/auth";

let _app: App | null = null;
let _db: Firestore | null = null;
let _auth: Auth | null = null;

function getAdminApp(): App {
  if (_app) return _app;

  if (getApps().length > 0) {
    _app = getApps()[0];
    return _app;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase Admin SDK: Missing environment variables. " +
        "Ensure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY are set in your environment."
    );
  }

  _app = initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      // Replace escaped newlines that may come from env var formatting
      privateKey: privateKey.replace(/\\n/g, "\n"),
    }),
  });

  return _app;
}

// Lazy-initialized singletons — only call getAdminApp() when actually used
export const adminDb: Firestore = new Proxy({} as Firestore, {
  get(_target, prop) {
    if (!_db) _db = getFirestore(getAdminApp());
    return (_db as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export const adminAuth: Auth = new Proxy({} as Auth, {
  get(_target, prop) {
    if (!_auth) _auth = getAuth(getAdminApp());
    return (_auth as unknown as Record<string | symbol, unknown>)[prop];
  },
});
