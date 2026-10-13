import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

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

async function backup() {
  const custSnap = await db.collection("customers").get();
  const orderSnap = await db.collection("orders").get();
  const paymentSnap = await db.collection("payments").get();

  const customers = custSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const orders = orderSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const payments = paymentSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const data = {
    timestamp: new Date().toISOString(),
    customers,
    orders,
    payments,
  };

  const backupDir = path.resolve("scripts/backup");
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const filename = `backup_before_reconcile_${Date.now()}.json`;
  const filePath = path.join(backupDir, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");

  console.log(`Backup saved to ${filePath}`);
  console.log(`Backed up ${customers.length} customers, ${orders.length} orders, ${payments.length} payments.`);
}

backup().catch(console.error);
