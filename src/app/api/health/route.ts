import { NextResponse } from "next/server";
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";

export async function GET() {
  const envCheck = {
    FIREBASE_PROJECT_ID: Boolean(process.env.FIREBASE_PROJECT_ID),
    FIREBASE_CLIENT_EMAIL: Boolean(process.env.FIREBASE_CLIENT_EMAIL),
    FIREBASE_PRIVATE_KEY: Boolean(process.env.FIREBASE_PRIVATE_KEY),
    FIREBASE_PRIVATE_KEY_LEN: process.env.FIREBASE_PRIVATE_KEY?.length || 0,
    FIREBASE_PRIVATE_KEY_START: process.env.FIREBASE_PRIVATE_KEY?.slice(0, 30) || "MISSING",
    NEXT_PUBLIC_FIREBASE_API_KEY: Boolean(process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "MISSING",
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "MISSING",
  };

  let firebaseStatus = "UNKNOWN";
  let firebaseError: string | null = null;

  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error("Missing required Firebase Admin env vars");
    }

    if (
      (privateKey.startsWith('"') && privateKey.endsWith('"')) ||
      (privateKey.startsWith("'") && privateKey.endsWith("'"))
    ) {
      privateKey = privateKey.slice(1, -1);
    }
    privateKey = privateKey.replace(/\\n/g, "\n");

    const appName = "health-check-app";
    const app = getApps().find((a) => a.name === appName) || initializeApp(
      {
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      },
      appName
    );

    const db = getFirestore(app);
    // Ping firestore directly
    const testDoc = await db.collection("products").limit(1).get();
    
    // Also ping via adminDb and getProducts()
    const { adminDb } = await import("@/lib/firebase/admin");
    const adminDbDoc = await adminDb.collection("products").limit(1).get();

    const { getProducts } = await import("@/lib/db/products");
    const products = await getProducts();

    firebaseStatus = `CONNECTED (Direct: ${testDoc.size}, AdminDb: ${adminDbDoc.size}, getProducts: ${products.length})`;
  } catch (err: unknown) {
    firebaseStatus = "FAILED";
    firebaseError = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  }

  return NextResponse.json({
    status: firebaseStatus === "FAILED" ? "ERROR" : "OK",
    timestamp: new Date().toISOString(),
    envCheck,
    firebaseStatus,
    firebaseError,
  });
}
