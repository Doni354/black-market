"use client";

/**
 * Login Page — Client Component
 *
 * Flow:
 * 1. User inputs email + password
 * 2. Client-side: Firebase Auth signInWithEmailAndPassword
 * 3. Get ID token from Firebase
 * 4. Server Action: exchange ID token for session cookie
 * 5. Redirect to dashboard
 */

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { loginAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/admin/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Step 1: Firebase client-side auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      // Step 2: Get ID token
      const idToken = await userCredential.user.getIdToken();

      // Step 3: Exchange for server session cookie
      const result = await loginAction(idToken);

      if (!result.success) {
        setError(result.message || "Login failed. Please try again.");
        return;
      }

      // Step 4: Redirect
      router.push(redirectTo);
      router.refresh();
    } catch (err: unknown) {
      // Handle Firebase auth errors
      if (err && typeof err === "object" && "code" in err) {
        const code = (err as { code: string }).code;
        if (
          code === "auth/invalid-credential" ||
          code === "auth/user-not-found" ||
          code === "auth/wrong-password"
        ) {
          setError("Email atau password salah.");
        } else if (code === "auth/too-many-requests") {
          setError("Terlalu banyak percobaan. Coba lagi nanti.");
        } else if (code === "auth/user-disabled") {
          setError("Akun ini telah dinonaktifkan.");
        } else {
          setError("Login gagal. Coba lagi.");
        }
      } else {
        setError("Login gagal. Coba lagi.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500 shadow-lg shadow-amber-500/25">
            <span className="text-xl font-black text-black">BM</span>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-zinc-100">Black Market</h1>
            <p className="text-sm text-zinc-500">Masuk ke sistem operasional</p>
          </div>
        </div>

        {/* Login card */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Email"
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              autoComplete="email"
              required
              disabled={loading}
            />

            <Input
              label="Password"
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
              disabled={loading}
            />

            {error && (
              <div className="rounded-lg border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full mt-1"
            >
              {loading ? "Masuk..." : "Masuk"}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-zinc-600">
          Black Market Operations System
        </p>
      </div>
    </div>
  );
}
