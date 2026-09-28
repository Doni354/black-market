# BLACK MARKET — Application Development Specification

> Dokumen acuan implementasi aplikasi operasional Black Market.
>
> Target implementasi: **Next.js + Firebase + Cloudinary + Vercel**
>
> Dokumen ini ditujukan sebagai **source of truth untuk AI coding agent (Antigravity)**. Implementasi sebaiknya mengikuti arsitektur, data model, flow, dan aturan bisnis di dokumen ini sebelum menambahkan fitur baru.

---

# 1. Project Overview

## 1.1 Nama

**Black Market**

## 1.2 Tujuan Aplikasi

Black Market membutuhkan aplikasi web untuk membantu pencatatan dan pengelolaan operasional usaha, terutama:

1. Mencatat seluruh transaksi penjualan.
2. Mencatat pembayaran cash, QRIS, dan transfer.
3. Menangani transaksi langsung melalui POS/Kasir.
4. Menangani pre-order F&B dan merchandise.
5. Menghasilkan QR sebagai bukti/order ticket untuk pengambilan barang pada Market Day.
6. Mencatat stok barang dan perubahan stok.
7. Mencatat pemasukan dan pengeluaran.
8. Menyediakan laporan penjualan dan keuangan sederhana.
9. Menyediakan katalog dan halaman informasi usaha sebagai fitur pendukung.

### Prinsip utama

> **Setiap barang yang terjual dan setiap uang yang masuk/keluar harus dapat ditelusuri kembali melalui sistem.**

Aplikasi bukan sekadar website katalog. Core system adalah:

```text
POS / Transaction
        +
Inventory
        +
Income & Expense
        +
Pre-Order
        +
Order Redemption
        +
Reports
```

---

# 2. Tech Stack

## Frontend

- Next.js
- TypeScript
- App Router
- Tailwind CSS
- Component-based UI
- Responsive design

## Backend / Database

- Firebase
- Firebase Authentication
- Cloud Firestore
- Firebase Admin SDK untuk server-side operation jika diperlukan

## Hosting

- Vercel

**Jangan menggunakan Firebase Hosting.**

Next.js application dideploy langsung ke Vercel.

## Object Storage

- Cloudinary

Digunakan untuk:

- Foto produk
- Foto merchandise
- Banner/konten katalog
- Bukti pembayaran
- Asset visual lain yang diperlukan

### Catatan keamanan Cloudinary

Bukti pembayaran tidak boleh diletakkan sebagai asset publik biasa.

Gunakan authenticated/private asset atau mekanisme signed URL jika diperlukan.

---

# 3. Scope MVP

MVP harus fokus pada operasional.

## Prioritas P0 — wajib

- Authentication
- Dashboard
- Product management
- POS / Kasir
- Transaction management
- Payment recording
- Pre-order
- QR order ticket
- QR redemption
- Inventory
- Income
- Expense
- Basic reports

## Prioritas P1 — setelah core stabil

- Customer management
- Public catalog
- Website profile
- Customer order page
- Order status tracking
- Product image upload
- Better analytics

## Prioritas P2 — jangan dikerjakan dulu

- Payment gateway
- Virtual Account otomatis
- Integrasi QRIS otomatis
- Notifikasi WhatsApp otomatis
- Loyalty system
- Advanced accounting
- Multi-outlet
- Complex role hierarchy

Jangan melakukan overengineering pada MVP.

---

# 4. Business Model yang Harus Didukung

Black Market memiliki dua pola penjualan utama.

## 4.1 Direct Sale

Customer datang langsung.

```text
Customer
  ↓
Kasir
  ↓
Pilih produk
  ↓
Hitung total
  ↓
Customer bayar
  ↓
Payment confirmed
  ↓
Transaction completed
  ↓
Inventory berkurang
  ↓
Income tercatat
```

Contoh:

```text
Sosis       x 2 = Rp16.000
Es Teh      x 1 = Rp 5.000
---------------------------
Total            Rp21.000

Payment: CASH
Paid: Rp25.000
Change: Rp4.000
```

---

# 5. Pre-Order

Pre-order dapat digunakan untuk:

- Merchandise
- F&B
- Bundling
- Produk lain yang nantinya ditentukan kelompok

Pre-order dilakukan sebelum Market Day.

```text
Customer
  ↓
Website / Admin
  ↓
Pilih produk
  ↓
Create Order
  ↓
Payment
  ↓
Order PAID
  ↓
Generate Redemption QR
  ↓
Customer datang Market Day
  ↓
Scan QR
  ↓
Redeem
  ↓
Order COMPLETED
```

---

# 6. Konsep Coupon / QR

## Penting

Coupon di Black Market **bukan voucher diskon**.

Istilah yang digunakan di aplikasi boleh:

> **Order Ticket**
>
> atau
>
> **Redemption Ticket**

Ticket tersebut adalah bukti bahwa customer telah membeli dan berhak mengambil pesanan pada Market Day.

Contoh:

```text
ORDER #BM-000123

Customer:
Doni

Items:
- Paket Sosis x 2
- Es Teh x 1

Total:
Rp37.000

Payment:
PAID

Pickup:
Market Day

Status:
READY FOR REDEMPTION

[ QR CODE ]
```

---

# 7. QR Redemption Flow

## 7.1 Generate QR

QR dibuat setelah order sudah berstatus:

```text
PAID
```

QR berisi identifier/order token, bukan data sensitif lengkap.

Contoh payload:

```text
BM-ORD-000123
```

atau signed redemption token.

Jangan menaruh informasi sensitif customer langsung di QR.

---

## 7.2 Scan

Admin membuka halaman:

```text
/pos/redeem
```

Kemudian scan QR.

System mencari order berdasarkan redemption token.

Jika valid:

```text
Order #BM-000123
Customer: Doni

2x Paket Sosis
1x Es Teh

Total: Rp37.000

Payment: PAID
Status: READY

[ REDEEM ORDER ]
```

---

## 7.3 Setelah Redeem

Status berubah:

```text
READY_FOR_REDEMPTION
        ↓
REDEEMED
```

QR tidak boleh dapat digunakan lagi.

Jika QR yang sama discan lagi:

```text
Order already redeemed.
Redeemed at:
26 September 2026 12:31
```

---

# 8. Payment Method

MVP menggunakan pencatatan pembayaran manual.

Payment method:

```text
CASH
QRIS
BANK_TRANSFER
```

Optional:

```text
OTHER
```

## CASH

Kasir memasukkan nominal pembayaran.

System menghitung:

```text
change = amountPaid - total
```

---

## QRIS

QRIS digunakan sebagai metode pembayaran.

Flow:

```text
Customer scan QRIS
        ↓
Customer membayar
        ↓
Kasir mengecek pembayaran
        ↓
Kasir klik Confirm Payment
        ↓
Transaction = PAID
```

Tidak perlu payment gateway pada MVP.

---

## BANK TRANSFER

Customer melakukan transfer.

Untuk pre-order:

```text
Customer transfer
        ↓
Upload payment proof
        ↓
Admin verification
        ↓
PAID
```

Payment proof disimpan di Cloudinary dengan asset private/authenticated.

---

# 9. Product Types

Product harus memiliki field `type`.

Contoh:

```text
FOOD
MERCH
DRINK
BUNDLE
OTHER
```

Jenis produk merchandise:

```text
STICKER
PIN
KEYCHAIN
```

F&B belum final.

Karena menu F&B masih dapat berubah, product system harus bersifat dynamic.

Jangan hardcode:

```text
sosis
nugget
kentang
```

di source code.

Produk harus berasal dari Firestore.

---

# 10. Bundling

Bundling merupakan bagian penting dari business model Black Market.

Contoh:

```text
Black Market Bundle A

1x F&B
1x Sticker
1x Pin

Harga:
Rp25.000
```

Bundle harus dapat memiliki beberapa item.

Data bundle:

```text
bundleItems:
[
  {
    productId: "...",
    quantity: 1
  },
  {
    productId: "...",
    quantity: 1
  }
]
```

Ketika bundle terjual, stok komponen harus ikut berkurang.

Jangan membuat stok bundle terpisah jika bundle hanya merupakan kombinasi produk.

---

# 11. Mystery Box

Mystery Box adalah produk yang dapat digunakan untuk menjual stok merchandise.

Contoh:

```text
Mystery Box
Rp20.000

Isi:
1–3 merchandise random
```

Untuk MVP, mystery box dapat diperlakukan sebagai product biasa jika isi random ditentukan secara manual oleh admin.

Jangan membuat sistem random kompleks terlebih dahulu.

---

# 12. Database Design

Gunakan Cloud Firestore.

Struktur collection utama:

```text
users
products
orders
orderItems
payments
inventoryMovements
expenses
customers
redemptions
settings
```

Jika ingin menyederhanakan MVP, `orderItems` dapat menjadi subcollection di dalam `orders`.

Struktur yang direkomendasikan:

```text
users/{userId}

products/{productId}

orders/{orderId}
orders/{orderId}/items/{itemId}

payments/{paymentId}

inventoryMovements/{movementId}

expenses/{expenseId}

customers/{customerId}

redemptions/{redemptionId}
```

---

# 13. User Model

```ts
User {
  id: string
  name: string
  email: string
  role: "ADMIN" | "CASHIER"
  photoURL?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

MVP hanya membutuhkan dua role:

- ADMIN
- CASHIER

ADMIN:

- Semua akses

CASHIER:

- POS
- Transaction
- Redemption
- Melihat product
- Melihat stok

---

# 14. Product Model

```ts
Product {
  id: string
  name: string
  description?: string

  type:
    | "FOOD"
    | "MERCH"
    | "DRINK"
    | "BUNDLE"
    | "OTHER"

  category?: string

  price: number
  costPrice?: number

  stock: number

  trackInventory: boolean
  isPreOrderAvailable: boolean
  isActive: boolean

  imageUrl?: string

  bundleItems?: {
    productId: string
    quantity: number
  }[]

  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### Catatan

`costPrice` berguna untuk menghitung margin/HPP jika kelompok ingin mengembangkan laporan.

Jangan menggunakan JavaScript floating point untuk perhitungan uang jika memungkinkan.

Gunakan integer dalam rupiah.

Contoh:

```ts
25000
```

bukan:

```ts
25000.00
```

---

# 15. Order Model

```ts
Order {
  id: string
  orderNumber: string

  customerId?: string
  customerName?: string
  customerPhone?: string

  source: "POS" | "ONLINE"

  orderType: "DIRECT" | "PRE_ORDER"

  status:
    | "DRAFT"
    | "PENDING_PAYMENT"
    | "WAITING_VERIFICATION"
    | "PAID"
    | "READY_FOR_REDEMPTION"
    | "REDEEMED"
    | "COMPLETED"
    | "CANCELLED"

  paymentStatus:
    | "UNPAID"
    | "PENDING"
    | "PAID"
    | "FAILED"
    | "REFUNDED"

  paymentMethod?:
    | "CASH"
    | "QRIS"
    | "BANK_TRANSFER"
    | "OTHER"

  subtotal: number
  discount: number
  total: number

  amountPaid?: number
  change?: number

  pickupMethod?: "MARKET_DAY"

  redemptionCode?: string
  redemptionQrUrl?: string

  notes?: string

  createdBy: string
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

---

# 16. Order Item Model

```ts
OrderItem {
  id: string

  productId: string
  productName: string

  quantity: number

  unitPrice: number
  subtotal: number

  costPrice?: number

  type: string
}
```

Simpan `productName` dan `unitPrice` sebagai snapshot.

Alasannya:

Jika harga produk berubah setelah transaksi, transaksi lama tetap menunjukkan harga ketika pembelian terjadi.

---

# 17. Payment Model

```ts
Payment {
  id: string
  orderId: string

  method:
    | "CASH"
    | "QRIS"
    | "BANK_TRANSFER"
    | "OTHER"

  amount: number

  status:
    | "PENDING"
    | "PAID"
    | "REJECTED"

  proofUrl?: string

  verifiedBy?: string
  verifiedAt?: Timestamp

  createdAt: Timestamp
}
```

---

# 18. Inventory Movement

Jangan hanya menyimpan angka stok.

Simpan histori perubahan stok.

```ts
InventoryMovement {
  id: string

  productId: string
  productName: string

  type:
    | "INITIAL"
    | "PURCHASE"
    | "SALE"
    | "PRE_ORDER"
    | "ADJUSTMENT"
    | "CANCELLED_ORDER"
    | "RETURN"

  quantity: number

  referenceType?:
    | "ORDER"
    | "EXPENSE"
    | "MANUAL"

  referenceId?: string

  note?: string

  createdBy: string
  createdAt: Timestamp
}
```

Contoh:

```text
INITIAL      +50
PRE_ORDER     -5
SALE          -3
ADJUSTMENT    +2
```

---

# 19. Expense Model

```ts
Expense {
  id: string

  category:
    | "FOOD_MATERIAL"
    | "MERCH_PRODUCTION"
    | "PACKAGING"
    | "OPERATIONAL"
    | "PROMOTION"
    | "OTHER"

  description: string

  amount: number

  paymentMethod:
    | "CASH"
    | "QRIS"
    | "BANK_TRANSFER"
    | "OTHER"

  proofUrl?: string

  createdBy: string
  createdAt: Timestamp
}
```

---

# 20. Customer Model

Customer tidak wajib dibuat untuk setiap pembelian cash.

Tetapi untuk:

- PO
- Custom merchandise
- Repeat order
- Customer yang ingin menyimpan riwayat

customer dapat disimpan.

```ts
Customer {
  id: string

  name: string
  phone?: string
  email?: string

  notes?: string

  totalOrders: number
  totalSpent: number

  createdAt: Timestamp
  updatedAt: Timestamp
}
```

---

# 21. Redemption Model

```ts
Redemption {
  id: string

  orderId: string
  redemptionCode: string

  status:
    | "READY"
    | "REDEEMED"
    | "CANCELLED"

  redeemedBy?: string
  redeemedAt?: Timestamp

  createdAt: Timestamp
}
```

Jangan menyimpan redemption sebagai boolean sederhana di order saja jika ingin histori lebih jelas.

---

# 22. Transaction Rules

## Direct Sale

Ketika kasir menyelesaikan transaksi:

1. Validate product.
2. Validate stock.
3. Calculate total.
4. Create order.
5. Create order items.
6. Create payment.
7. Create inventory movement.
8. Update product stock.
9. Transaction status menjadi `COMPLETED`.
10. Income tercatat melalui order/payment.

Semua operasi yang harus konsisten dilakukan menggunakan Firestore transaction/batch sesuai kebutuhan.

---

# 23. Pre-Order Rules

Ketika customer membuat PO:

```text
PENDING_PAYMENT
```

Stock belum boleh dianggap terjual sebelum pembayaran dikonfirmasi jika bisnis ingin menghindari reservasi palsu.

Setelah:

```text
PAID
```

maka:

```text
Order → READY_FOR_REDEMPTION
Stock → berkurang / dialokasikan
Redemption → READY
```

Untuk MVP, gunakan aturan sederhana:

> **Stok berkurang ketika pembayaran PO dikonfirmasi.**

Jika PO dibatalkan:

```text
Order → CANCELLED
Stock → dikembalikan
Inventory Movement → CANCELLED_ORDER
```

Jangan mengurangi stok lagi ketika QR diredeem.

**Redemption hanya mengubah status pengambilan.**

---

# 24. Redemption Rules

Validasi:

1. QR valid.
2. Order exists.
3. Payment status = PAID.
4. Order status = READY_FOR_REDEMPTION.
5. Redemption status = READY.

Jika valid:

```text
Redemption → REDEEMED
Order → REDEEMED / COMPLETED
```

Operasi harus atomic agar dua kasir tidak dapat menukarkan QR yang sama secara bersamaan.

---

# 25. Cash Flow

Aplikasi harus membedakan:

```text
INCOME
EXPENSE
```

## Income

Income berasal dari pembayaran order yang sudah confirmed/paid.

Contoh:

```text
Order #001
Rp30.000
Cash
```

masuk sebagai pemasukan.

## Expense

Contoh:

```text
Pembelian bahan sosis
Rp100.000
Cash
```

masuk sebagai pengeluaran.

---

# 26. Dashboard

Dashboard utama:

```text
Today's Sales
Rp xxx.xxx

Today's Transactions
xx

Cash
Rp xxx.xxx

QRIS
Rp xxx.xxx

Pre-Order
Rp xxx.xxx

Expenses
Rp xxx.xxx

Net Cash Flow
Rp xxx.xxx
```

Tambahan:

```text
Top Selling Products
Low Stock Products
Pending PO
Unredeemed Orders
Recent Transactions
```

---

# 27. POS Page

Route:

```text
/pos
```

Layout:

```text
Product Grid
+
Current Cart
```

Product card:

```text
[Image]
Sosis
Rp8.000

[ + ]
```

Cart:

```text
Sosis x2
Rp16.000

Es Teh x1
Rp5.000

----------------
Total Rp21.000

Payment:
[ Cash ]
[ QRIS ]
[ Transfer ]

[ COMPLETE SALE ]
```

Untuk Cash:

```text
Amount Received
Rp25.000

Change
Rp4.000
```

---

# 28. Redemption Page

Route:

```text
/pos/redeem
```

UI:

```text
Scan QR

[ Camera ]

atau

[ Input Redemption Code ]
```

Setelah valid:

```text
ORDER #BM-00123

Doni

2x Paket Sosis
1x Es Teh

Total Rp37.000

Payment: PAID

[ REDEEM ]
```

---

# 29. Orders Page

Route:

```text
/orders
```

Filter:

- All
- Pending Payment
- Waiting Verification
- Paid
- Ready
- Redeemed
- Cancelled

Search:

- Order number
- Customer
- Phone

---

# 30. Inventory Page

Route:

```text
/inventory
```

Tampilkan:

```text
Product
Current Stock
Minimum Stock
Stock Status
```

Detail product:

```text
Stock History
```

Contoh:

```text
+50 Initial Stock
-5 Pre Order
-3 Direct Sale
+10 Purchase
```

---

# 31. Expenses Page

Route:

```text
/expenses
```

Form:

```text
Category
Description
Amount
Payment Method
Proof
```

---

# 32. Reports Page

Route:

```text
/reports
```

Report minimal:

### Sales Report

- Total sales
- Total transaction
- Sales by product
- Sales by payment method
- Sales by date

### Expense Report

- Total expense
- Expense by category
- Expense by date

### Cash Flow

```text
Total Income
- Total Expense
----------------
Net Cash Flow
```

### Inventory

- Initial stock
- Sold
- Remaining
- Stock movement

---

# 33. Public Website

Public website bukan core system.

Route:

```text
/
```

Isi:

- Brand Black Market
- Tentang usaha
- Katalog
- Produk
- Merchandise
- F&B
- Cara PO
- Market Day information
- Contact

---

# 34. Public Catalog

Route:

```text
/products
```

Customer dapat:

- Melihat produk
- Melihat harga
- Melihat gambar
- Melihat deskripsi
- Melakukan PO jika produk mengizinkan

Produk yang:

```text
isPreOrderAvailable = false
```

tidak dapat di-PO.

---

# 35. Customer Pre-Order

Route:

```text
/order
```

Flow:

```text
Select Product
      ↓
Cart
      ↓
Customer Information
      ↓
Order Summary
      ↓
Payment Instructions
      ↓
Upload Payment Proof
      ↓
Waiting Verification
```

Setelah admin verifikasi:

```text
PAID
      ↓
Generate Order Ticket
      ↓
Customer dapat melihat QR
```

Customer tidak wajib memiliki account pada MVP.

Gunakan order number + contact information atau secure token untuk melihat order.

---

# 36. Custom Merchandise

Custom merchandise:

```text
Sticker
Pin
Keychain
```

Customer dapat melakukan request.

Form:

```text
Nama
Kontak
Jenis Merchandise
Jumlah
Request Desain
Catatan
Upload Reference Image
```

Status:

```text
REQUESTED
    ↓
DESIGN_REVIEW
    ↓
APPROVED
    ↓
WAITING_PAYMENT
    ↓
PAID
    ↓
PRODUCTION
    ↓
READY
    ↓
REDEEMED
```

MVP dapat menggunakan proses approval manual oleh admin.

---

# 37. Cloudinary

Folder/struktur asset yang disarankan:

```text
black-market/
├── products/
├── catalog/
├── custom-designs/
└── payment-proofs/
```

Jangan menyimpan file binary di Firestore.

Firestore hanya menyimpan:

```text
imageUrl
publicId
```

Untuk payment proof:

- gunakan private/authenticated asset
- jangan tampilkan URL publik secara bebas

---

# 38. Firebase Architecture

Recommended:

```text
Next.js
   │
   ├── Firebase Auth
   │
   ├── Firestore
   │
   └── Server-side Firebase Admin
             │
             └── Business operations
```

Cloudinary:

```text
Next.js
   ↓
Cloudinary Upload
   ↓
URL / publicId
   ↓
Firestore
```

Untuk operasi sensitif:

```text
POS completion
Payment verification
Inventory update
Redemption
Expense creation
```

pastikan validasi dilakukan server-side.

Jangan mempercayai data harga/total dari client.

---

# 39. Security Rules

Firestore harus default-deny.

User hanya dapat mengakses data sesuai role.

Contoh prinsip:

```text
Public:
- Read active products
- Create pre-order sesuai endpoint yang diizinkan

Cashier:
- Read products
- Create sales
- Read orders
- Redeem orders
- Tidak boleh mengubah konfigurasi sensitif

Admin:
- Full operational access
```

Jangan menggunakan:

```text
allow read, write: if true;
```

untuk production.

---

# 40. Money Calculation Rules

Semua harga menggunakan integer rupiah.

Contoh:

```ts
price = 15000
quantity = 2

subtotal = 30000
```

Total harus dihitung server-side:

```text
subtotal
+ additional charges
- discount
= total
```

Jangan menerima `total` dari browser sebagai sumber kebenaran.

Browser hanya mengirim:

```text
productId
quantity
```

Server mengambil harga dari database.

---

# 41. Auditability

Karena tujuan utama aplikasi adalah pencatatan transaksi, setiap perubahan penting harus dapat ditelusuri.

Minimal simpan:

```text
createdBy
createdAt
updatedAt
```

Untuk:

- Order
- Payment
- Expense
- Inventory movement
- Redemption

Jika memungkinkan tambahkan:

```text
verifiedBy
verifiedAt
```

untuk pembayaran.

---

# 42. Naming Convention

Order number:

```text
BM-000001
BM-000002
BM-000003
```

Redemption code harus unik.

Jangan menggunakan sequential ID sebagai satu-satunya security mechanism.

---

# 43. Error Handling

System harus menangani:

### Stock habis

```text
Product is out of stock.
```

### Stock tidak cukup

```text
Only 3 items remaining.
```

### Payment proof belum diverifikasi

```text
Payment is still waiting for verification.
```

### QR sudah digunakan

```text
This order has already been redeemed.
```

### Order dibatalkan

```text
This order has been cancelled.
```

### QR invalid

```text
Invalid redemption code.
```

---

# 44. Recommended Development Order

Implementasi jangan langsung membuat seluruh fitur sekaligus.

## Phase 1 — Foundation

- Initialize Next.js
- TypeScript
- Tailwind
- Firebase setup
- Firebase Auth
- Firestore
- Environment variables
- Basic layout
- Admin authentication

## Phase 2 — Product

- Product CRUD
- Product category
- Price
- Stock
- Product image
- Cloudinary integration

## Phase 3 — POS

- Product selection
- Cart
- Quantity
- Total
- Cash payment
- QRIS payment recording
- Transaction creation

## Phase 4 — Inventory

- Stock deduction
- Stock movement
- Initial stock
- Manual adjustment
- Stock history

## Phase 5 — Expense

- Expense CRUD
- Expense categories
- Payment method
- Proof upload

## Phase 6 — Pre-Order

- Public catalog
- Cart
- Customer information
- Order creation
- Payment proof
- Admin verification

## Phase 7 — QR Redemption

- Generate redemption code
- Generate QR
- Customer order ticket
- QR scanner
- Redeem
- Prevent double redemption

## Phase 8 — Reports

- Sales
- Expense
- Cash flow
- Inventory
- Payment method

## Phase 9 — UI Polish

- Dashboard refinement
- Responsive layout
- Empty states
- Loading states
- Error states
- Toast
- Confirmation dialogs

---

# 45. Suggested Route Structure

```text
/
├── /products
├── /order
├── /order/[orderNumber]
├── /about
├── /contact
│
└── /admin
    ├── /login
    ├── /dashboard
    ├── /pos
    ├── /pos/redeem
    ├── /orders
    ├── /products
    ├── /inventory
    ├── /expenses
    ├── /customers
    ├── /reports
    └── /settings
```

---

# 46. Dashboard Navigation

Recommended sidebar:

```text
Dashboard
POS / Kasir
Orders
Products
Inventory
Expenses
Customers
Reports
Settings
```

Public:

```text
Home
Catalog
Pre-Order
About
Contact
```

---

# 47. UX Principles

Aplikasi digunakan saat Market Day sehingga POS harus cepat.

Prioritas:

1. Sedikit klik.
2. Product mudah ditemukan.
3. Cart selalu terlihat.
4. Total mudah dibaca.
5. Payment mudah dipilih.
6. Status transaksi jelas.
7. QR redemption cepat.
8. Tidak membutuhkan input berlebihan.

Jangan membuat kasir mengisi:

```text
alamat
email
deskripsi panjang
```

untuk transaksi langsung.

Direct sale cukup:

```text
Product
Quantity
Payment
Complete
```

---

# 48. Important Business Rules

1. **Coupon/QR bukan diskon.**
2. Coupon/QR adalah **ticket untuk mengambil order yang sudah dibayar**.
3. Satu QR hanya boleh diredeem satu kali.
4. Direct sale tidak wajib menghasilkan QR.
5. Pre-order menghasilkan QR setelah pembayaran dikonfirmasi.
6. F&B dapat dijual langsung maupun melalui pre-order.
7. Merchandise dapat dijual melalui pre-order, ready stock, mystery box, dan bundling.
8. Inventory harus memiliki histori perubahan.
9. Income berasal dari pembayaran order yang confirmed.
10. Expense dicatat secara terpisah.
11. Payment gateway tidak digunakan pada MVP.
12. QRIS hanya dicatat sebagai metode pembayaran manual.
13. Total transaksi dihitung server-side.
14. Harga transaksi lama harus tetap tersimpan walaupun harga produk berubah.
15. Pengurangan stok tidak boleh terjadi dua kali ketika order diredeem.
16. Pembatalan order yang sudah mengurangi stok harus mengembalikan stok.
17. Semua transaksi penting harus memiliki timestamp dan user yang melakukan aksi.

---

# 49. Definition of Done — MVP

MVP dianggap selesai jika:

- [ ] Admin dapat login.
- [ ] Admin dapat membuat produk.
- [ ] Admin dapat mengatur harga dan stok.
- [ ] Kasir dapat melakukan direct sale.
- [ ] Cash payment dapat dicatat.
- [ ] QRIS payment dapat dicatat.
- [ ] Transaction tersimpan di Firestore.
- [ ] Stock otomatis berkurang.
- [ ] Inventory movement tercatat.
- [ ] Admin dapat mencatat expense.
- [ ] Customer dapat melakukan pre-order.
- [ ] Customer dapat mengirim payment proof.
- [ ] Admin dapat melakukan payment verification.
- [ ] Order yang paid mendapatkan redemption QR.
- [ ] Kasir dapat scan QR.
- [ ] QR hanya dapat digunakan satu kali.
- [ ] F&B dapat di-pre-order.
- [ ] Merchandise dapat di-pre-order.
- [ ] Bundling dapat dibuat.
- [ ] Mystery box dapat dijual.
- [ ] Dashboard menampilkan sales.
- [ ] Dashboard menampilkan expense.
- [ ] Dashboard menampilkan net cash flow.
- [ ] Report transaksi dapat dilihat.
- [ ] Semua transaksi dapat ditelusuri.
- [ ] Aplikasi dapat dideploy ke Vercel.
- [ ] Firebase Firestore security rules sudah tidak menggunakan public read/write.
- [ ] Tidak ada secret Firebase Admin/Cloudinary API secret di client.

---

# 50. Instruction for AI Coding Agent

Implement application berdasarkan dokumen ini sebagai source of truth.

Prioritas utama adalah **correctness of business logic**, bukan jumlah fitur.

Jangan:

- menambahkan payment gateway tanpa diminta
- membuat fitur kompleks yang belum diperlukan
- hardcode produk F&B
- hardcode harga
- menggunakan Firebase Hosting
- menyimpan secret di client
- menggunakan public Firestore read/write
- mengurangi inventory dua kali
- membuat coupon sebagai sistem diskon
- menganggap redemption sebagai payment
- menganggap QRIS sebagai redemption QR

Sebelum implementasi:

1. Buat struktur project.
2. Buat Firebase configuration.
3. Buat TypeScript types.
4. Buat Firestore data access layer.
5. Buat authentication/authorization.
6. Implement Product → POS → Order → Payment → Inventory.
7. Setelah core stabil, implement Pre-Order → QR → Redemption.
8. Setelah itu Reports.
9. Baru implement public catalog dan UI polish.

Setiap fitur harus mengikuti data model dan business rules dalam dokumen ini.

Jika ada requirement yang belum ditentukan, pilih solusi **sederhana, maintainable, dan sesuai MVP**, jangan menambah kompleksitas tanpa alasan.
