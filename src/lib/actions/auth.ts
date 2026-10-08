"use server";

/**
 * Authentication Server Actions
 *
 * Handles login and logout on the server.
 * Creates/destroys Firebase session cookies.
 * Enforces Administrator approval for new Google accounts.
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import {
  createSessionCookie,
  getCurrentUser,
  SESSION_COOKIE_NAME,
  SESSION_EXPIRY_MS,
} from "@/lib/auth/session";
import { serializeFirestoreData } from "@/lib/utils/serialization";
import type { ActionState, User, UserRole, UserStatus } from "@/lib/types";
import { FieldValue } from "firebase-admin/firestore";

export interface LoginActionResult extends ActionState {
  isPending?: boolean;
}

/**
 * Login action — verifies Firebase ID token and creates session cookie.
 * First user ever becomes the OWNER ADMIN (status: ACTIVE).
 * Subsequent new users are set to PENDING and require admin approval before accessing.
 */
export async function loginAction(idToken: string): Promise<LoginActionResult> {
  try {
    // Verify the ID token server-side
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;
    const userEmail = decodedToken.email || "";

    // Check if user exists in Firestore
    const userDoc = await adminDb.collection("users").doc(uid).get();

    if (!userDoc.exists) {
      // Check if there are any users in the database
      const usersSnapshot = await adminDb.collection("users").limit(1).get();
      const isFirstUser = usersSnapshot.empty;

      if (isFirstUser) {
        // The first user ever is the OWNER / SUPER ADMIN
        const ownerUser = {
          name: decodedToken.name || userEmail.split("@")[0] || "Owner Admin",
          email: userEmail,
          role: "ADMIN" as UserRole,
          status: "ACTIVE" as UserStatus,
          photoURL: decodedToken.picture || null,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        };

        await adminDb.collection("users").doc(uid).set(ownerUser);
      } else {
        // Any subsequent new user is recorded as PENDING approval
        const pendingUser = {
          name: decodedToken.name || userEmail.split("@")[0] || "User",
          email: userEmail,
          role: "CASHIER" as UserRole,
          status: "PENDING" as UserStatus,
          photoURL: decodedToken.picture || null,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        };

        await adminDb.collection("users").doc(uid).set(pendingUser);

        return {
          success: false,
          isPending: true,
          message: `Akun Google Anda (${userEmail}) telah didaftarkan namun belum disetujui. Hubungi Administrator Noury untuk meng-ACC akun Anda.`,
        };
      }
    } else {
      const data = userDoc.data();
      const status: UserStatus =
        data?.status || (data?.role === "ADMIN" ? "ACTIVE" : "PENDING");

      if (status === "PENDING") {
        return {
          success: false,
          isPending: true,
          message: `Akun Anda (${userEmail}) masih berstatus MENUNGGU PERSETUJUAN (Pending). Silakan hubungi Administrator Noury untuk menyetujui akun Anda.`,
        };
      }

      if (status === "REJECTED") {
        return {
          success: false,
          message:
            "Akses akun Anda telah DITOLAK atau DINONAKTIFKAN oleh Administrator Noury.",
        };
      }

      // If active, update photo or last active timestamp
      if (decodedToken.picture && decodedToken.picture !== data?.photoURL) {
        await userDoc.ref.update({
          photoURL: decodedToken.picture,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    }

    // Create session cookie for approved active user
    const sessionCookie = await createSessionCookie(idToken);

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_EXPIRY_MS / 1000,
      path: "/",
    });

    return { success: true };
  } catch (error) {
    console.error("Login error:", error);
    return {
      success: false,
      message: "Login gagal. Silakan periksa kredensial Anda dan coba lagi.",
    };
  }
}

/**
 * Logout action — destroys the session cookie.
 */
export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  redirect("/admin/login");
}

/**
 * Update user role (ADMIN only).
 */
export async function updateUserRoleAction(
  targetUserId: string,
  newRole: UserRole
): Promise<ActionState> {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return { success: false, message: "Hanya Admin yang dapat mengubah role pengguna." };
    }

    if (user.id === targetUserId && newRole !== "ADMIN") {
      return {
        success: false,
        message: "Anda tidak dapat menurunkan role akun Anda sendiri.",
      };
    }

    await adminDb.collection("users").doc(targetUserId).update({
      role: newRole,
      updatedAt: FieldValue.serverTimestamp(),
    });

    revalidatePath("/admin/settings");
    return { success: true, message: `Role berhasil diubah menjadi ${newRole}.` };
  } catch (err) {
    console.error("updateUserRoleAction error:", err);
    return { success: false, message: "Gagal memperbarui role pengguna." };
  }
}

/**
 * Approve a pending or rejected user (ADMIN only).
 */
export async function approveUserAction(
  targetUserId: string,
  assignedRole: UserRole = "CASHIER"
): Promise<ActionState> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "ADMIN") {
      return { success: false, message: "Hanya Admin yang berhak menyetujui pengguna." };
    }

    await adminDb.collection("users").doc(targetUserId).update({
      status: "ACTIVE",
      role: assignedRole,
      updatedAt: FieldValue.serverTimestamp(),
    });

    revalidatePath("/admin/settings");
    return {
      success: true,
      message: `Pengguna berhasil disetujui (ACC) dengan role ${assignedRole}.`,
    };
  } catch (err) {
    console.error("approveUserAction error:", err);
    return { success: false, message: "Gagal menyetujui pengguna." };
  }
}

/**
 * Reject / suspend user access (ADMIN only).
 */
export async function rejectUserAction(targetUserId: string): Promise<ActionState> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "ADMIN") {
      return { success: false, message: "Hanya Admin yang berhak menolak akses pengguna." };
    }

    if (currentUser.id === targetUserId) {
      return { success: false, message: "Anda tidak dapat menolak akun Anda sendiri." };
    }

    await adminDb.collection("users").doc(targetUserId).update({
      status: "REJECTED",
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Revoke Firebase Auth tokens so existing sessions are killed
    try {
      await adminAuth.revokeRefreshTokens(targetUserId);
    } catch {
      // Ignore if user not found in Auth SDK
    }

    revalidatePath("/admin/settings");
    return {
      success: true,
      message: "Akses pengguna berhasil ditolak / dinonaktifkan.",
    };
  } catch (err) {
    console.error("rejectUserAction error:", err);
    return { success: false, message: "Gagal menolak akses pengguna." };
  }
}

/**
 * Kick / delete user completely from system (ADMIN only).
 */
export async function kickUserAction(targetUserId: string): Promise<ActionState> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "ADMIN") {
      return { success: false, message: "Hanya Admin yang berhak meng-kick pengguna." };
    }

    if (currentUser.id === targetUserId) {
      return { success: false, message: "Anda tidak dapat meng-kick akun Anda sendiri." };
    }

    // Delete Firestore profile
    await adminDb.collection("users").doc(targetUserId).delete();

    // Revoke Auth refresh tokens
    try {
      await adminAuth.revokeRefreshTokens(targetUserId);
    } catch {
      // Ignore if not present in Auth
    }

    revalidatePath("/admin/settings");
    return {
      success: true,
      message: "Pengguna berhasil di-kick dan dihapus dari sistem.",
    };
  } catch (err) {
    console.error("kickUserAction error:", err);
    return { success: false, message: "Gagal meng-kick pengguna." };
  }
}

/**
 * Fetch all registered users for role & status management (ADMIN only).
 */
export async function getUsersAction(): Promise<User[]> {
  try {
    const snap = await adminDb.collection("users").get();
    return snap.docs.map((doc) => {
      const data = doc.data();
      return serializeFirestoreData<User>({
        id: doc.id,
        name: data.name || "User",
        email: data.email || "",
        role: data.role || "CASHIER",
        status: data.status || (data.role === "ADMIN" ? "ACTIVE" : "PENDING"),
        photoURL: data.photoURL || undefined,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      });
    });
  } catch (err) {
    console.error("getUsersAction error:", err);
    return [];
  }
}
