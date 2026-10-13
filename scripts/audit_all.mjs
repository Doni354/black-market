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
  const orderSnap = await db.collection("orders").get();

  const orders = [];
  orderSnap.forEach((d) => orders.push({ id: d.id, ...d.data() }));

  console.log("=== ALL CUSTOMERS AUDIT ===");
  custSnap.forEach((d) => {
    const c = d.data();
    const custOrders = orders.filter((o) => {
      return o.customerId === d.id ||
        (c.phone && o.customerPhone && c.phone.replace(/\D/g, "") === o.customerPhone.replace(/\D/g, "") && c.phone.replace(/\D/g, "").length >= 7) ||
        (c.email && o.customerEmail && c.email.toLowerCase() === o.customerEmail.toLowerCase());
    });
    const paidOrders = custOrders.filter((o) => o.status !== "CANCELLED" && o.paymentStatus !== "CANCELLED");
    const sumPaid = paidOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

    console.log(`ID: ${d.id} | Name: "${c.name}" | Email: "${c.email || ''}" | Phone: "${c.phone || ''}"`);
    console.log(`  -> Current in doc: orders=${c.totalOrders}, spent=${c.totalSpent}, stamps=${c.stampsCount}`);
    console.log(`  -> Actual valid orders: count=${paidOrders.length}, sum=${sumPaid}`);
    if (custOrders.length > 0) {
      custOrders.forEach((o) => {
        console.log(`     * Order #${o.orderNumber || o.id} | Total: ${o.total} | Status: ${o.status} | PayStatus: ${o.paymentStatus} | orderCustId: ${o.customerId}`);
      });
    }
    console.log("");
  });
}

run().catch(console.error);
