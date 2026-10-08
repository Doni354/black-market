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
    <div className="rounded-2xl border border-[#E2ECE8] bg-white p-4 sm:p-5 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[#183331] flex items-center gap-2">
            <span>Manajemen Hak Akses & Persetujuan Pengguna</span>
            {pendingCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 text-xs font-semibold animate-pulse">
                {pendingCount} Menunggu ACC
              </span>
            )}
          </h2>
          <p className="text-xs text-[#52706C] mt-0.5">
            Setujui (ACC), tolak, ubah role kasir/admin, atau kick pengguna dari sistem Noury — No Worries.
          </p>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-1 p-1 bg-[#F4F9F7] rounded-xl border border-[#D5E6E1] self-start sm:self-auto overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === "ALL"
                ? "bg-white text-[#183331] shadow-xs"
                : "text-[#52706C] hover:text-[#183331]"
            }`}
          >
            Semua ({users.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("PENDING")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              activeTab === "PENDING"
                ? "bg-amber-100 text-amber-900 border border-amber-300 shadow-xs"
                : "text-[#52706C] hover:text-[#183331]"
            }`}
          >
            <span>Pending</span>
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white font-mono text-[10px] font-bold">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ACTIVE")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === "ACTIVE"
                ? "bg-white text-[#183331] shadow-xs"
                : "text-[#52706C] hover:text-[#183331]"
            }`}
          >
            Aktif
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("REJECTED")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === "REJECTED"
                ? "bg-white text-[#183331] shadow-xs"
                : "text-[#52706C] hover:text-[#183331]"
            }`}
          >
            Ditolak
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-[#183331]">
          <thead className="border-b border-[#E2ECE8] bg-[#FAFCFB] uppercase tracking-wider text-[10px] text-[#52706C]">
            <tr>
              <th className="px-4 py-3">Pengguna</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3 text-right">Aksi Kelola</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0F5F3]">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-[#7A9C96]">
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
                  <tr key={u.id} className="hover:bg-[#F8FAF9] transition-colors">
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
                            className="w-8 h-8 rounded-full border border-[#D5E6E1] object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-[#EAF5F1] border border-[#CDE5DC] flex items-center justify-center font-bold text-xs text-[#3D8383] flex-shrink-0">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-[#183331] flex items-center gap-1.5">
                            <span>{u.name}</span>
                            {isSelf && (
                              <span className="rounded bg-[#EAF5F1] text-[#3D8383] border border-[#CDE5DC] px-1.5 py-0.2 text-[10px] font-bold">
                                Anda (Owner)
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-[#7A9C96] font-mono">
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
                      <Badge variant={u.role === "ADMIN" ? "default" : "info"}>
                        {u.role}
                      </Badge>
                    </td>

                    {/* Action Buttons */}
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {isSelf ? (
                        <span className="text-[11px] text-[#7A9C96] italic">
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
                                className="px-2.5 py-1 rounded-lg bg-[#47957F] hover:bg-[#3D8383] text-white text-[11px] font-bold transition disabled:opacity-50"
                                title="ACC sebagai Staf Kasir"
                              >
                                ✓ ACC Kasir
                              </button>
                              <button
                                type="button"
                                disabled={isProcessing}
                                onClick={() => handleApprove(u.id, "ADMIN")}
                                className="px-2.5 py-1 rounded-lg bg-white hover:bg-[#F2F8F5] text-[#3D8383] border border-[#CDE5DC] text-[11px] font-bold transition disabled:opacity-50"
                                title="ACC sebagai Admin"
                              >
                                ACC Admin
                              </button>
                              <button
                                type="button"
                                disabled={isProcessing}
                                onClick={() => handleReject(u.id)}
                                className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-semibold transition disabled:opacity-50"
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
                                className="rounded-lg border border-[#D5E6E1] bg-white px-2 py-1 text-xs text-[#183331] focus:outline-none focus:border-[#47957F] cursor-pointer disabled:opacity-50"
                              >
                                <option value="CASHIER">Kasir (CASHIER)</option>
                                <option value="ADMIN">Admin (ADMIN)</option>
                              </select>
                              <button
                                type="button"
                                disabled={isProcessing}
                                onClick={() => handleReject(u.id)}
                                className="px-2 py-1 rounded-lg bg-white border border-[#D5E6E1] hover:bg-[#F2F8F5] text-[#52706C] text-[11px] font-medium transition cursor-pointer"
                                title="Tolak / Nonaktifkan Akses"
                              >
                                Suspend
                              </button>
                              <button
                                type="button"
                                disabled={isProcessing}
                                onClick={() => setConfirmKickUser(u)}
                                className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-semibold transition cursor-pointer"
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
                                className="px-2.5 py-1 rounded-lg bg-[#47957F] hover:bg-[#3D8383] text-white text-[11px] font-bold transition disabled:opacity-50"
                              >
                                Aktifkan Kembali
                              </button>
                              <button
                                type="button"
                                disabled={isProcessing}
                                onClick={() => setConfirmKickUser(u)}
                                className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-semibold transition cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl border border-[#E2ECE8] bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#183331]">
                  Kick Pengguna Ini?
                </h3>
                <p className="text-xs text-[#52706C]">
                  {confirmKickUser.name} ({confirmKickUser.email})
                </p>
              </div>
            </div>

            <p className="text-xs text-[#52706C] leading-relaxed">
              Pengguna ini akan dihapus dari database sistem dan sesi loginnya akan langsung diputus. Tindakan ini tidak dapat dibatalkan.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#EEF5F2]">
              <button
                type="button"
                onClick={() => setConfirmKickUser(null)}
                className="px-3 py-1.5 rounded-xl border border-[#D5E6E1] bg-white hover:bg-[#F2F8F5] text-[#52706C] text-xs font-semibold transition"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={processingId === confirmKickUser.id}
                onClick={() => handleKick(confirmKickUser.id)}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
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
