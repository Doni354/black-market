"use client";

import { useState } from "react";
import Link from "next/link";
import { QRScanner } from "./QRScanner";
import { RedemptionReview } from "./RedemptionReview";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { lookupRedemptionAction, redeemOrderAction } from "@/lib/actions/redemption";
import type { RedemptionDetails } from "@/lib/db/redemptions";
import type { Order, Redemption } from "@/lib/types";

interface SessionHistoryItem {
  orderNumber: string;
  customerName: string;
  code: string;
  redeemedAt: string;
}

export function RedemptionContainer() {
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<"camera" | "manual">("camera");
  const [manualCode, setManualCode] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Review modal state
  const [currentDetails, setCurrentDetails] = useState<RedemptionDetails | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [successResult, setSuccessResult] = useState<{
    order: Order;
    redemption: Redemption;
  } | null>(null);

  // Session redemption history
  const [sessionHistory, setSessionHistory] = useState<SessionHistoryItem[]>([]);

  // Handle scanned or submitted code
  async function handleProcessCode(code: string) {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      toast("Masukkan kode redemption terlebih dahulu.", "warning");
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setSuccessResult(null);

    const res = await lookupRedemptionAction(cleanCode);
    setIsProcessing(false);

    if (!res.success || !res.data) {
      toast(res.message || "Tiket tidak ditemukan.", "error");
      setErrorMessage(res.message || "Kode tiket tidak ditemukan.");
      return;
    }

    setCurrentDetails(res.data);
    setIsReviewOpen(true);
  }

  // Handle confirming the redemption
  async function handleConfirmRedeem(code: string) {
    setIsRedeeming(true);
    setErrorMessage(null);

    const res = await redeemOrderAction(code);
    setIsRedeeming(false);

    if (!res.success || !res.data) {
      setErrorMessage(res.message || "Gagal memproses penukaran.");
      toast(res.message || "Gagal memproses penukaran tiket.", "error");
      return;
    }

    setSuccessResult(res.data);
    toast(res.message || "Pesanan berhasil diserahkan!", "success");

    // Add to session history
    const nowTime = new Date().toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
    setSessionHistory((prev) => [
      {
        orderNumber: res.data!.order.orderNumber,
        customerName: res.data!.order.customerName || "Pelanggan",
        code,
        redeemedAt: nowTime,
      },
      ...prev,
    ]);
  }

  function handleCloseReview() {
    setIsReviewOpen(false);
    setCurrentDetails(null);
    setSuccessResult(null);
    setErrorMessage(null);
    setManualCode("");
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
              Penukaran Tiket (Redeem)
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-red-600/20 border border-red-500/30 text-red-400 text-xs font-semibold">
              Live Scanner
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Scan QR Code tiket pemesan pre-order untuk serah terima barang di stand.
          </p>
        </div>

        <Link
          href="/admin/pos"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium border border-zinc-700 transition self-start sm:self-auto"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Kembali ke POS Kasir
        </Link>
      </div>

      {/* Main Scanner & Input Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Column: Scanner & Input Tabs (8 cols) */}
        <div className="md:col-span-7 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl">
          {/* Mode Switcher Tabs */}
          <div className="flex p-1 bg-zinc-950 rounded-xl border border-zinc-800 mb-5">
            <button
              type="button"
              onClick={() => setActiveTab("camera")}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
                activeTab === "camera"
                  ? "bg-red-600 text-white shadow-md shadow-red-600/20"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Scan Kamera
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("manual")}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
                activeTab === "manual"
                  ? "bg-red-600 text-white shadow-md shadow-red-600/20"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Input Manual
            </button>
          </div>

          {/* Tab 1: Live Camera Scanner */}
          {activeTab === "camera" && (
            <div className="flex flex-col items-center">
              <QRScanner
                onScanSuccess={handleProcessCode}
                isPaused={isReviewOpen || isProcessing}
                isActive={activeTab === "camera" && !isReviewOpen}
              />
              <p className="text-[11px] text-zinc-500 mt-4 text-center max-w-xs">
                Arahkan layar ponsel pelanggan yang memuat QR tiket ke dalam kotak pemindai kamera di atas.
              </p>
            </div>
          )}

          {/* Tab 2: Manual Code Input */}
          {activeTab === "manual" && (
            <div className="space-y-4 py-2">
              <div>
                <label
                  htmlFor="manual-code-input"
                  className="block text-xs font-semibold text-zinc-300 mb-1.5"
                >
                  Kode Tiket Redemption
                </label>
                <div className="relative">
                  <input
                    id="manual-code-input"
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                    placeholder="Contoh: RDM-A1B2-C3D4-E5F6"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 font-mono tracking-wider focus:outline-none focus:border-red-500"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleProcessCode(manualCode);
                      }
                    }}
                  />
                  {manualCode && (
                    <button
                      type="button"
                      onClick={() => setManualCode("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-zinc-500 mt-1.5">
                  Masukkan 20 karakter kode token yang tertera di bawah QR tiket.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleProcessCode(manualCode)}
                disabled={!manualCode.trim() || isProcessing}
                className="w-full py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-red-600/20"
              >
                {isProcessing ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Mencari Tiket...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <span>Cari & Validasi Tiket</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Instructions & Live Session History (5 cols) */}
        <div className="md:col-span-5 space-y-5">
          {/* Quick Guide */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl">
            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Alur Serah Terima Stand
            </h3>
            <ol className="space-y-2.5 text-xs text-zinc-400">
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-zinc-800 text-zinc-300 font-bold flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">
                  1
                </span>
                <span>Minta pelanggan menunjukkan e-ticket QR di ponsel.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-zinc-800 text-zinc-300 font-bold flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">
                  2
                </span>
                <span>Arahkan kamera ke QR atau ketik kode jika kamera buram.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-zinc-800 text-zinc-300 font-bold flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">
                  3
                </span>
                <span>Cocokkan daftar barang fisik dengan checklist pesanan.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-zinc-800 text-zinc-300 font-bold flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">
                  4
                </span>
                <span>Klik <strong>Konfirmasi Serah Terima</strong> untuk menutup tiket secara permanen.</span>
              </li>
            </ol>
          </div>

          {/* Session Redemption History */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Riwayat Sesi Ini ({sessionHistory.length})
              </h3>
            </div>

            {sessionHistory.length === 0 ? (
              <p className="text-xs text-zinc-500 py-4 text-center">
                Belum ada tiket yang ditukarkan pada sesi ini.
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {sessionHistory.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-mono font-bold text-zinc-200">
                        #{item.orderNumber}
                      </p>
                      <p className="text-zinc-400 text-[11px] truncate max-w-[140px]">
                        {item.customerName}
                      </p>
                    </div>
                    <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      {item.redeemedAt}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Review & Handover Modal */}
      <Modal
        isOpen={isReviewOpen}
        onClose={handleCloseReview}
        title="Validasi Penukaran Tiket"
        size="lg"
      >
        {currentDetails && (
          <RedemptionReview
            details={currentDetails}
            onConfirmRedeem={handleConfirmRedeem}
            onClose={handleCloseReview}
            isSubmitting={isRedeeming}
            errorMsg={errorMessage}
            successResult={successResult}
          />
        )}
      </Modal>
    </div>
  );
}
