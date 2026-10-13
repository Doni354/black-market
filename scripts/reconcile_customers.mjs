import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

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
  console.log("=== STARTING SAFE CUSTOMER RECONCILIATION & DEDUPLICATION ===");

  // 1. Fix cancelled orders that still have PENDING paymentStatus
  const cancelledOrdersSnap = await db.collection("orders").where("status", "==", "CANCELLED").get();
  for (const doc of cancelledOrdersSnap.docs) {
    const data = doc.data();
    if (data.paymentStatus !== "CANCELLED") {
      console.log(`Fixing order #${data.orderNumber} paymentStatus -> CANCELLED`);
      await doc.ref.update({
        paymentStatus: "CANCELLED",
        updatedAt: FieldValue.serverTimestamp(),
      });
      // also fix payment doc
      const paySnap = await db.collection("payments").where("orderId", "==", doc.id).get();
      for (const pDoc of paySnap.docs) {
        await pDoc.ref.update({ status: "CANCELLED" });
      }
    }
  }

  // 2. Merge Daniel Harley (eG0VJ9e8tkVJtTYa8GqG -> KieWULFDMabeV8mUSnUEdcq8fQ72)
  const canonicalDanielRef = db.collection("customers").doc("KieWULFDMabeV8mUSnUEdcq8fQ72");
  const secondaryDanielRef = db.collection("customers").doc("eG0VJ9e8tkVJtTYa8GqG");

  const [canonicalSnap, secondarySnap] = await Promise.all([
    canonicalDanielRef.get(),
    secondaryDanielRef.get(),
  ]);

  if (secondarySnap.exists) {
    const secondaryData = secondarySnap.data() || {};
    const canonicalData = canonicalSnap.data() || {};

    console.log("Merging Daniel Harley duplicate document...");
    const updates = {
      phone: secondaryData.phone || canonicalData.phone || "087842248811",
      updatedAt: FieldValue.serverTimestamp(),
    };

    // Merge claimedCoupons safely if any
    const existingCoupons = canonicalData.claimedCoupons || [];
    const secondaryCoupons = secondaryData.claimedCoupons || [];
    const mergedCoupons = [...existingCoupons];
    for (const sc of secondaryCoupons) {
      if (!mergedCoupons.some((ec) => ec.id === sc.id || ec.code === sc.code)) {
        mergedCoupons.push(sc);
      }
    }
    updates.claimedCoupons = mergedCoupons;

    await canonicalDanielRef.update(updates);
    console.log("Updated canonical Daniel Harley document with phone:", updates.phone);

    // Update any orders pointing to secondary
    const danielOrders = await db.collection("orders").where("customerId", "==", "eG0VJ9e8tkVJtTYa8GqG").get();
    for (const oDoc of danielOrders.docs) {
      await oDoc.ref.update({ customerId: "KieWULFDMabeV8mUSnUEdcq8fQ72" });
    }

    // Delete secondary
    await secondaryDanielRef.delete();
    console.log("Deleted orphaned secondary Daniel Harley document (eG0VJ9e8tkVJtTYa8GqG).");
  }

  // 3. Fetch latest customers and orders
  const custSnap = await db.collection("customers").get();
  const orderSnap = await db.collection("orders").get();

  const allOrders = orderSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  console.log("\n=== RECONCILING CUSTOMER STATS WITH ACTUAL ORDERS ===");
  const minSpendPerStamp = 15000;

  for (const cDoc of custSnap.docs) {
    const custId = cDoc.id;
    const cData = cDoc.data();

    // Match orders by customerId, or clean phone, or email
    const matchedOrders = allOrders.filter((o) => {
      const matchId = o.customerId === custId;
      const matchPhone = cData.phone && o.customerPhone && (
        cData.phone.replace(/\D/g, "") === o.customerPhone.replace(/\D/g, "") &&
        cData.phone.replace(/\D/g, "").length >= 7
      );
      const matchEmail = cData.email && o.customerEmail && (
        cData.email.trim().toLowerCase() === o.customerEmail.trim().toLowerCase()
      );
      return matchId || matchPhone || matchEmail;
    });

    // Make sure matched orders have customerId set to custId if missing
    for (const o of matchedOrders) {
      if (o.customerId !== custId && custId.length === 28) { // 28 chars is Google UID
        console.log(`Linking order #${o.orderNumber || o.id} to Google account ${custId}`);
        await db.collection("orders").doc(o.id).update({ customerId: custId });
        o.customerId = custId;
      }
    }

    // Filter valid (non-cancelled) orders
    const validOrders = matchedOrders.filter(
      (o) => o.status !== "CANCELLED" && o.paymentStatus !== "CANCELLED"
    );

    const correctTotalOrders = validOrders.length;
    const correctTotalSpent = validOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    
    // Stamps: calculate from valid orders meeting minSpend
    const qualifyingOrdersCount = validOrders.filter((o) => (Number(o.total) || 0) >= minSpendPerStamp).length;

    const currentOrders = cData.totalOrders ?? 0;
    const currentSpent = cData.totalSpent ?? 0;
    const currentStamps = cData.stampsCount ?? 0;

    let needsUpdate = false;
    const docUpdates = {};

    if (currentOrders !== correctTotalOrders) {
      docUpdates.totalOrders = correctTotalOrders;
      needsUpdate = true;
    }
    if (currentSpent !== correctTotalSpent) {
      docUpdates.totalSpent = correctTotalSpent;
      needsUpdate = true;
    }
    // For stamps: if customer had stamps from doubled orders (like Daniel had 2 stamps for 1 order), adjust to real
    if (currentStamps > qualifyingOrdersCount && matchedOrders.length > 0) {
      docUpdates.stampsCount = qualifyingOrdersCount;
      needsUpdate = true;
    } else if (cData.stampsCount === undefined) {
      docUpdates.stampsCount = qualifyingOrdersCount;
      needsUpdate = true;
    }

    if (needsUpdate) {
      console.log(`Reconciling Customer: "${cData.name}" (${custId})`);
      console.log(`  Before: totalOrders=${currentOrders}, totalSpent=${currentSpent}, stamps=${currentStamps}`);
      console.log(`  After:  totalOrders=${docUpdates.totalOrders ?? currentOrders}, totalSpent=${docUpdates.totalSpent ?? currentSpent}, stamps=${docUpdates.stampsCount ?? currentStamps}`);
      docUpdates.updatedAt = FieldValue.serverTimestamp();
      await cDoc.ref.update(docUpdates);
    }
  }

  console.log("\n=== RECONCILIATION COMPLETE! ===");
}

run().catch(console.error);
