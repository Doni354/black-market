import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
let privateKey = (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
if ((privateKey.startsWith('"') && privateKey.endsWith('"')) || (privateKey.startsWith("'") && privateKey.endsWith("'"))) {
  privateKey = privateKey.slice(1, -1);
}

if (!getApps().length) {
  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}

const db = getFirestore();

async function run() {
  const custSnap = await db.collection("customers").get();
  console.log(`=== ALL ${custSnap.size} CUSTOMERS ===`);
  custSnap.forEach((d) => {
    const data = d.data();
    console.log(JSON.stringify({
      id: d.id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      totalOrders: data.totalOrders,
      totalSpent: data.totalSpent,
      stampsCount: data.stampsCount,
      claimedCoupons: data.claimedCoupons,
      createdAt: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate().toISOString() : data.createdAt) : null,
    }));
  });
}

run().catch(console.error);
