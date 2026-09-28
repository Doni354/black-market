"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import {
  updateUserRoleAction,
  approveUserAction,
  rejectUserAction,
  kickUserAction,
} from "@/lib/actions/auth";
import type { User, UserRole, UserStatus } from "@/lib/types";

interface UserRoleManagerProps {
  initialUsers: User[];
  currentUserId: string;
}

export function UserRoleManager({ initialUsers, currentUserId }: UserRoleManagerProps) {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [activeTab, setActiveTab] = useState<"ALL" | "PENDING" | "ACTIVE" | "REJECTED">("ALL");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [confirmKickUser, setConfirmKickUser] = useState<User | null>(null);

  // Count pending users for attention badge
  const pendingCount = useMemo(
    () => users.filter((u) => u.status === "PENDING").length,
    [users]
  );

  const filteredUsers = useMemo(() => {
    if (activeTab === "ALL") return users;
    return users.filter((u) => u.status === activeTab);
  }, [users, activeTab]);

  // Handler: Change Role
  async function handleRoleChange(targetUserId: string, newRole: UserRole) {
    setProcessingId(targetUserId);
    try {
      const res = await updateUserRoleAction(targetUserId, newRole);
      if (!res.success) throw new Error(res.message);

      setUsers((prev) =>
        prev.map((u) => (u.id === targetUserId ? { ...u, role: newRole } : u))
      );
      toast(res.message || "Role berhasil diubah!", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Gagal mengubah role.", "error");
    } finally {
      setProcessingId(null);
    }
  }

  // Handler: Approve user
  async function handleApprove(targetUserId: string, role: UserRole = "CASHIER") {
    setProcessingId(targetUserId);
    try {
      const res = await approveUserAction(targetUserId, role);
      if (!res.success) throw new Error(res.message);

      setUsers((prev) =>
        prev.map((u) =>
          u.id === targetUserId ? { ...u, status: "ACTIVE", role } : u
        )
      );
      toast(res.message || "Pengguna berhasil disetujui (ACC)!", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Gagal menyetujui pengguna.", "error");
    } finally {
      setProcessingId(null);
    }
  }

  // Handler: Reject user
  async function handleReject(targetUserId: string) {
    setProcessingId(targetUserId);
    try {
      const res = await rejectUserAction(targetUserId);
      if (!res.success) throw new Error(res.message);

      setUsers((prev) =>
        prev.map((u) =>
          u.id === targetUserId ? { ...u, status: "REJECTED" } : u
        )
      );
      toast(res.message || "Akses pengguna berhasil ditolak.", "warning");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Gagal menolak akses pengguna.", "error");
    } finally {
      setProcessingId(null);
    }
  }

  // Handler: Kick user
  async function handleKick(targetUserId: string) {
    setProcessingId(targetUserId);
    try {
      const res = await kickUserAction(targetUserId);
      if (!res.success) throw new Error(res.message);

      setUsers((prev) => prev.filter((u) => u.id !== targetUserId));
      setConfirmKickUser(null);
      toast(res.message || "Pengguna berhasil di-kick dari sistem.", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Gagal meng-kick pengguna.", "error");
    } finally {
      setProcessingId(null);
    }
  }

  function getStatusBadge(status?: UserStatus) {
    switch (status) {
      case "ACTIVE":
        return <Badge variant="success">AKTIF</Badge>;
      case "PENDING":
        return <Badge variant="warning">MENUNGGU ACC</Badge>;
      case "REJECTED":
        return <Badge variant="danger">DITOLAK</Badge>;
      default:
        return <Badge variant="default">AKTIF</Badge>;
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 sm:p-5 backdrop-blur-xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
            <span>Manajemen Hak Akses & Persetujuan Pengguna</span>
            {pendingCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-semibold animate-pulse">
                {pendingCount} Menunggu ACC
              </span>
            )}
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Setujui (ACC), tolak, ubah role kasir/admin, atau kick pengguna dari sistem Black Market.
          </p>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-1 p-1 bg-zinc-950 rounded-xl border border-zinc-800 self-start sm:self-auto overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === "ALL"
                ? "bg-zinc-800 text-zinc-100"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Semua ({users.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("PENDING")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              activeTab === "PENDING"
                ? "bg-amber-600/30 text-amber-300 border border-amber-500/40"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <span>Pending</span>
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-black font-mono text-[10px] font-bold">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ACTIVE")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === "ACTIVE"
                ? "bg-zinc-800 text-zinc-100"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Aktif
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("REJECTED")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === "REJECTED"
                ? "bg-zinc-800 text-zinc-100"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Ditolak
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-zinc-300">
          <thead className="border-b border-zinc-800 bg-zinc-950/60 uppercase tracking-wider text-[10px] text-zinc-400">
            <tr>
              <th className="px-4 py-3">Pengguna</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3 text-right">Aksi Kelola</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/80">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">
                  Tidak ada data pengguna pada kategori ini.
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => {
                const isSelf = u.id === currentUserId;
                const isProcessing = processingId === u.id;
                const isPending = u.status === "PENDING";
                const isRejected = u.status === "REJECTED";

                return (
                  <tr key={u.id} className="hover:bg-zinc-800/20 transition-colors">
                    {/* User info */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        {u.photoURL ? (
                          <Image
                            src={u.photoURL}
                            alt={u.name}
                            width={32}
                            height={32}
                            unoptimized
                            className="w-8 h-8 rounded-full border border-zinc-700 object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-xs text-zinc-300 flex-shrink-0">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-zinc-100 flex items-center gap-1.5">
                            <span>{u.name}</span>
                            {isSelf && (
                              <span className="rounded bg-red-950/80 text-red-400 border border-red-800/60 px-1.5 py-0.2 text-[10px] font-bold">
                                Anda (Owner)
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-zinc-500 font-mono">
                            {u.email}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {getStatusBadge(u.status)}
                    </td>

                    {/* Role Badge */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge variant={u.role === "ADMIN" ? "danger" : "default"}>
                        {u.role}
                      </Badge>
                    </td>

                    {/* Action Buttons */}
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {isSelf ? (
                        <span className="text-[11px] text-zinc-500 italic">
                          Akun Utama (Terkunci)
                        </span>
                      ) : (
                        <div className="flex items-center justify-end gap-1.5">
                          {/* If PENDING: Show ACC Kasir, ACC Admin, and Tolak */}
                          {isPending && (
                            <>
                              <button
                                type="button"
                                disabled={isProcessing}
                                onClick={() => handleApprove(u.id, "CASHIER")}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition disabled:opacity-50"
                                title="ACC sebagai Staf Kasir"
                              >
                                ✓ ACC Kasir
                              </button>
                              <button
                                type="button"
                                disabled={isProcessing}
                                onClick={() => handleApprove(u.id, "ADMIN")}
                                className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-[11px] font-semibold transition disabled:opacity-50"
                                title="ACC sebagai Admin"
                              >
                                ACC Admin
                              </button>
                              <button
                                type="button"
                                disabled={isProcessing}
                                onClick={() => handleReject(u.id)}
                                className="px-2 py-1 rounded-lg bg-red-950/60 hover:bg-red-900/60 text-red-400 border border-red-800/60 text-[11px] font-semibold transition disabled:opacity-50"
                                title="Tolak Akses"
                              >
                                Tolak
                              </button>
                            </>
                          )}

                          {/* If ACTIVE: Show Role Switcher & Tolak & Kick */}
                          {!isPending && !isRejected && (
                            <>
                              <select
                                value={u.role}
                                disabled={isProcessing}
                                onChange={(e) =>
                                  handleRoleChange(u.id, e.target.value as UserRole)
                                }
                                className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:border-red-500 cursor-pointer disabled:opacity-50"
                              >
                                <option value="CASHIER">Kasir (CASHIER)</option>
                                <option value="ADMIN">Admin (ADMIN)</option>
                              </select>
                              <button
                                type="button"
                                disabled={isProcessing}
                                onClick={() => handleReject(u.id)}
                                className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-medium transition"
                                title="Tolak / Nonaktifkan Akses"
                              >
                                Suspend
                              </button>
                              <button
                                type="button"
                                disabled={isProcessing}
                                onClick={() => setConfirmKickUser(u)}
                                className="px-2 py-1 rounded-lg bg-red-950/60 hover:bg-red-900/60 text-red-400 border border-red-800/60 text-[11px] font-semibold transition"
                                title="Kick Pengguna"
                              >
                                Kick
                              </button>
                            </>
                          )}

                          {/* If REJECTED: Show Aktifkan Kembali and Kick */}
                          {isRejected && (
                            <>
                              <button
                                type="button"
                                disabled={isProcessing}
                                onClick={() => handleApprove(u.id, u.role)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition disabled:opacity-50"
                              >
                                Aktifkan Kembali
                              </button>
                              <button
                                type="button"
                                disabled={isProcessing}
                                onClick={() => setConfirmKickUser(u)}
                                className="px-2 py-1 rounded-lg bg-red-950/60 hover:bg-red-900/60 text-red-400 border border-red-800/60 text-[11px] font-semibold transition"
                              >
                                Kick
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Confirmation Modal to Kick User */}
      {confirmKickUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-600/20 text-red-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-100">
                  Kick Pengguna Ini?
                </h3>
                <p className="text-xs text-zinc-400">
                  {confirmKickUser.name} ({confirmKickUser.email})
                </p>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              Pengguna ini akan dihapus dari database sistem dan sesi loginnya akan langsung diputus. Tindakan ini tidak dapat dibatalkan.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setConfirmKickUser(null)}
                className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={processingId === confirmKickUser.id}
                onClick={() => handleKick(confirmKickUser.id)}
                className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-red-600/20"
              >
                {processingId === confirmKickUser.id ? "Memproses..." : "Ya, Kick Pengguna"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
