"use server";

import { getCurrentUser } from "@/lib/auth/session";
import {
  getReportData,
  type ReportFilters,
  type ReportSummary,
} from "@/lib/db/reports";
import type { ActionState } from "@/lib/types";

export async function getReportsAction(
  filters?: ReportFilters
): Promise<ActionState<ReportSummary>> {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return {
        success: false,
        message: "Hanya Administrator yang memiliki akses ke laporan keuangan.",
      };
    }

    const data = await getReportData(filters);

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error("getReportsAction error:", error);
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Gagal memuat data laporan bisnis.",
    };
  }
}
