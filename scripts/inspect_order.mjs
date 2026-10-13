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
  const snap = await db.collection("orders").get();
  snap.forEach((doc) => {
    const d = doc.data();
    if (d.customerName?.includes("Daniel") || d.customerName?.includes("Bilal") || d.orderNumber === "NOURY-261013-K7QQ") {
      console.log("ORDER:", doc.id, JSON.stringify({
        orderNumber: d.orderNumber,
        customerId: d.customerId,
        customerName: d.customerName,
        customerPhone: d.customerPhone,
        customerEmail: d.customerEmail,
        total: d.total,
        status: d.status,
        paymentStatus: d.paymentStatus,
        createdAt: d.createdAt ? (d.createdAt.toDate ? d.createdAt.toDate().toISOString() : d.createdAt) : null
      }, null, 2));
    }
  });
}

run().catch(console.error);
