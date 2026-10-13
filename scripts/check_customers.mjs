import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
let privateKey = process.env.FIREBASE_PRIVATE_KEY || "";
if (
  (privateKey.startsWith('"') && privateKey.endsWith('"')) ||
  (privateKey.startsWith("'") && privateKey.endsWith("'"))
) {
  privateKey = privateKey.slice(1, -1);
}
privateKey = privateKey.replace(/\\n/g, "\n");

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

const db = getFirestore();

async function run() {
  const custSnap = await db.collection("customers").get();
  const orderSnap = await db.collection("orders").get();

  console.log(`Loaded ${custSnap.size} customers and ${orderSnap.size} orders.\n`);

  const orders = [];
  orderSnap.forEach((doc) => {
    orders.push({ id: doc.id, ...doc.data() });
  });

  const customers = [];
  custSnap.forEach((doc) => {
    customers.push({ id: doc.id, ...doc.data() });
  });

  console.log("=== CHECKING DISCREPANCIES ===");
  for (const c of customers) {
    // find orders by customerId, or by phone, or by email
    const matchedOrders = orders.filter((o) => {
      const matchId = o.customerId === c.id;
      const matchPhone = c.phone && o.customerPhone && (c.phone === o.customerPhone || c.phone.replace(/\D/g, "") === o.customerPhone.replace(/\D/g, ""));
      const matchEmail = c.email && o.customerEmail && c.email.toLowerCase() === o.customerEmail.toLowerCase();
      return matchId || matchPhone || matchEmail;
    });

    // Valid orders: not cancelled
    const validOrders = matchedOrders.filter((o) => o.status !== "CANCELLED" && o.paymentStatus !== "CANCELLED");
    const validOrdersTotal = validOrders.reduce((acc, o) => acc + (Number(o.total) || 0), 0);

    const hasDiff = c.totalOrders !== validOrders.length || c.totalSpent !== validOrdersTotal;

    if (hasDiff || c.totalOrders > 0) {
      console.log(`Customer: ${c.name} (${c.id})`);
      console.log(`  Doc values: totalOrders = ${c.totalOrders}, totalSpent = ${c.totalSpent}`);
      console.log(`  Actual non-cancelled orders count = ${validOrders.length}, sum = ${validOrdersTotal}`);
      console.log(`  Total matched orders (inc cancelled) = ${matchedOrders.length}`);
      matchedOrders.forEach((o) => {
        console.log(`    -> Order #${o.orderNumber || o.id} | status: ${o.status} | payment: ${o.paymentStatus} | total: ${o.total} | customerId: ${o.customerId}`);
      });
      if (hasDiff) {
        console.log(`  ⚠️ MISMATCH DETECTED!`);
      }
      console.log("-----------------------------------------");
    }
  }
}

run().catch(console.error);
