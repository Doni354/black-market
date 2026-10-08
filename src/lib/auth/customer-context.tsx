"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import {
  syncCustomerAction,
  updateCustomerPhoneAction,
  claimStampRewardAction,
} from "@/lib/actions/customer";
import type { CustomerAccount } from "@/lib/types";

interface CustomerAuthContextValue {
  user: FirebaseUser | null;
  account: CustomerAccount | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOutCustomer: () => Promise<void>;
  updatePhone: (phone: string) => Promise<boolean>;
  claimReward: () => Promise<boolean>;
  refreshAccount: () => Promise<void>;
}

const CustomerAuthContext = createContext<CustomerAuthContextValue | undefined>(undefined);

export function CustomerAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [account, setAccount] = useState<CustomerAccount | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAndSyncAccount = useCallback(async (currentUser: FirebaseUser) => {
    try {
      const res = await syncCustomerAction({
        uid: currentUser.uid,
        email: currentUser.email,
        displayName: currentUser.displayName,
        photoURL: currentUser.photoURL,
      });

      if (res.success && res.data) {
        setAccount(res.data);
      }
    } catch (err) {
      console.error("Failed to sync customer account:", err);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await fetchAndSyncAccount(currentUser);
      } else {
        setAccount(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [fetchAndSyncAccount]);

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const cred = await signInWithPopup(auth, provider);
      if (cred.user) {
        setUser(cred.user);
        await fetchAndSyncAccount(cred.user);
      }
    } catch (err) {
      console.error("Google sign-in error:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signOutCustomer = async () => {
    setLoading(true);
    try {
      await firebaseSignOut(auth);
      setUser(null);
      setAccount(null);
    } catch (err) {
      console.error("Sign-out error:", err);
    } finally {
      setLoading(false);
    }
  };

  const updatePhone = async (phone: string): Promise<boolean> => {
    if (!user) return false;
    const res = await updateCustomerPhoneAction(user.uid, phone);
    if (res.success && res.data) {
      setAccount(res.data);
      return true;
    }
    return false;
  };

  const claimReward = async (): Promise<boolean> => {
    if (!user) return false;
    const res = await claimStampRewardAction(user.uid);
    if (res.success && res.data) {
      setAccount(res.data);
      return true;
    }
    return false;
  };

  const refreshAccount = async () => {
    if (user) {
      await fetchAndSyncAccount(user);
    }
  };

  return (
    <CustomerAuthContext.Provider
      value={{
        user,
        account,
        loading,
        signInWithGoogle,
        signOutCustomer,
        updatePhone,
        claimReward,
        refreshAccount,
      }}
    >
      {children}
    </CustomerAuthContext.Provider>
  );
}

export function useCustomerAuth() {
  const context = useContext(CustomerAuthContext);
  if (!context) {
    throw new Error("useCustomerAuth must be used within a CustomerAuthProvider");
  }
  return context;
}
