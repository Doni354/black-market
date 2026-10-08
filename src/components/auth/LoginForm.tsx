"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { loginAction } from "@/lib/actions/auth";

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/admin/dashboard";

  const [error, setError] = useState("");
  const [pendingNotice, setPendingNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleGoogleLogin() {
    setError("");
    setPendingNotice(null);
    setLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });

      const userCredential = await signInWithPopup(auth, provider);
      const idToken = await userCredential.user.getIdToken();

      const result = await loginAction(idToken);

      if (!result.success) {
        if (result.isPending) {
          setPendingNotice(result.message || "Akun Anda sedang menunggu persetujuan Admin.");
        } else {
          setError(result.message || "Gagal membuat sesi login di server.");
        }
        return;
      }

      router.push(redirectTo);
      router.refresh();
    } catch (err: unknown) {
      if (err && typeof err === "object" && "code" in err) {
        const code = (err as { code: string }).code;
        if (code === "auth/popup-closed-by-user") {
          setError("Proses login Google dibatalkan.");
        } else if (code === "auth/unauthorized-domain") {
          setError(
            "Domain belum diizinkan di Firebase Console. Tambahkan domain Vercel Anda di Firebase Console > Authentication > Settings > Authorized domains."
          );
        } else if (code === "auth/popup-blocked") {
          setError("Popup Google login diblokir browser. Silakan izinkan popup.");
        } else if (code === "auth/operation-not-allowed") {
          setError(
            "Provider Google belum diaktifkan di Firebase Console > Authentication > Sign-in method."
          );
        } else {
          setError("Login Google gagal. Pastikan konfigurasi Firebase sudah benar.");
        }
      } else {
        setError("Terjadi kesalahan saat login dengan Google.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Pending approval notice */}
      {pendingNotice && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900 space-y-2 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center gap-2">
            <svg
              className="h-5 w-5 shrink-0 text-amber-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span className="font-bold text-sm text-amber-900">Menunggu Persetujuan Admin</span>
          </div>
          <p className="leading-relaxed text-amber-800">{pendingNotice}</p>
          <p className="text-[11px] text-amber-700 pt-2 border-t border-amber-200">
            Hubungi Administrator Noury KWH untuk meng-ACC akun Anda melalui menu <strong>Pengaturan</strong>.
          </p>
        </div>
      )}

      {/* Error alert */}
      {error && !pendingNotice && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700">
          <div className="flex items-center gap-2">
            <svg
              className="h-4 w-4 shrink-0 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span className="font-semibold">Login Gagal</span>
          </div>
          <p className="mt-1 text-red-600 leading-relaxed">{error}</p>
        </div>
      )}

      {/* Google Login Button */}
      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={loading}
        className="group relative flex w-full items-center justify-center gap-3 rounded-2xl border border-[#CCE0DA] bg-white px-4 py-3.5 text-sm font-bold text-[#183331] shadow-xs transition-all hover:bg-[#F2F8F6] hover:border-noury-mint disabled:opacity-60 cursor-pointer"
      >
        {loading ? (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-noury-mint border-t-transparent" />
        ) : (
          <GoogleIcon />
        )}
        <span>{loading ? "Menghubungkan Akun..." : "Masuk dengan Akun Google"}</span>
      </button>

      {/* Role-Based Explanation Card */}
      <div className="rounded-2xl border border-[#DCE8E4] bg-[#F9FBFA] p-4 text-xs text-[#52706C] flex flex-col gap-2.5">
        <div className="flex items-center gap-1.5 text-[#183331] font-semibold uppercase tracking-wider text-[10px]">
          <svg className="h-3.5 w-3.5 text-noury-mint" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
          Sistem Akses Peran Staf & Admin (RBAC)
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#EDF4F1]">
          <div className="rounded-xl bg-white p-2.5 border border-[#DCE8E4]">
            <span className="inline-block rounded bg-[#3D8383]/15 text-[#3D8383] border border-[#3D8383]/30 px-1.5 py-0.5 text-[10px] font-bold mb-1">
              ADMIN
            </span>
            <p className="text-[11px] text-[#4A6864] leading-snug">
              Hak akses penuh: Katalog, Inventaris, Pengeluaran, Laporan Keuangan, & Manajemen User.
            </p>
          </div>

          <div className="rounded-xl bg-white p-2.5 border border-[#DCE8E4]">
            <span className="inline-block rounded bg-[#47957F]/15 text-[#47957F] border border-[#47957F]/30 px-1.5 py-0.5 text-[10px] font-bold mb-1">
              CASHIER
            </span>
            <p className="text-[11px] text-[#4A6864] leading-snug">
              Hak akses kasir: Transaksi POS, Riwayat pesanan, & Scan tiket QR penukaran.
            </p>
          </div>
        </div>

        <p className="text-[10px] text-[#7A9C96] italic text-center pt-1">
          Role akun ditentukan oleh sistem saat pertama kali login dan dapat disesuaikan oleh Koordinator KWH.
        </p>
      </div>
    </div>
  );
}
