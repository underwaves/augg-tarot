"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Filter,
  RefreshCw,
  Search,
  Sparkles,
} from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { useToast } from "@/components/Toast";

export default function AuditLogsPage() {
  const { showToast } = useToast();

  const [logs, setLogs] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("all");

  const fetchLogs = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "20");
      if (actionFilter !== "all") {
        params.set("action", actionFilter);
      }

      const res = await fetch(`/api/audit-logs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setPagination(data.pagination || { total: 0, page: 1, limit: 20, totalPages: 1 });
      } else {
        showToast("ไม่สามารถโหลดบันทึกกิจกรรมได้", "error");
      }
    } catch {
      showToast("เกิดข้อผิดพลาดในการโหลดข้อมูล", "error");
    } finally {
      setLoading(false);
    }
  }, [actionFilter, showToast]);

  useEffect(() => {
    fetchLogs(1);
  }, [fetchLogs]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-purple-700 text-xs font-bold uppercase tracking-wider mb-1">
              <ShieldAlert className="w-4 h-4" />
              <span>ความโปร่งใสและความปลอดภัย (System Audit Log)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-pastel-deep font-magic">
              บันทึกกิจกรรมระบบ 📜
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              ตรวจสอบทุกการเปลี่ยนแปลง ทั้งการเพิ่มคิว แก้ไข ลัดคิว ยกเลิก หรือสร้างลิงก์
            </p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="pastel-card p-4 border-pastel-lavender/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 min-w-0 w-full sm:w-auto">
            <div className="flex items-center gap-1.5 shrink-0 text-gray-700 text-xs font-bold">
              <Filter className="w-4 h-4 text-gray-500" />
              <span>กรองตามประเภท:</span>
            </div>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full sm:w-auto max-w-full px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-xs font-medium text-pastel-deep focus:outline-none focus:ring-2 focus:ring-pastel-purple"
            >
              <option value="all">ทุกกิจกรรม</option>
              <option value="CREATE_QUEUE">เพิ่มคิว (CREATE_QUEUE)</option>
              <option value="UPDATE_QUEUE">แก้ไขคิว (UPDATE_QUEUE)</option>
              <option value="CHANGE_STATUS">เปลี่ยนสถานะ (CHANGE_STATUS)</option>
              <option value="REORDER_QUEUE">ลัดคิว/จัดลำดับ (REORDER_QUEUE)</option>
              <option value="CREATE_TRACKING_TOKEN">สร้างลิงก์ (CREATE_TRACKING_TOKEN)</option>
              <option value="REVOKE_TRACKING_TOKEN">เพิกถอนลิงก์ (REVOKE_TRACKING_TOKEN)</option>
              <option value="LOGIN">เข้าสู่ระบบ (LOGIN)</option>
              <option value="CREATE_ADMIN">สร้างแอดมิน (CREATE_ADMIN)</option>
              <option value="UPDATE_USER">อัปเดตผู้ใช้ (UPDATE_USER)</option>
            </select>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => fetchLogs(pagination.page)}
              className="p-2 rounded-xl bg-white hover:bg-pastel-babypink border border-gray-200 text-gray-600 transition"
              title="รีเฟรชบันทึก"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-purple-600" : ""}`} />
            </button>
          </div>
        </div>

        {/* Logs Table */}
        {loading ? (
          <div className="pastel-card p-12 text-center text-sm text-gray-500 animate-pulse">
            กำลังอ่านคัมภีร์บันทึกมนตรา... ✨
          </div>
        ) : logs.length === 0 ? (
          <div className="pastel-card p-12 text-center">
            <h3 className="text-base font-bold text-pastel-deep">ไม่มีบันทึกกิจกรรมตามเงื่อนไข</h3>
          </div>
        ) : (
          <div className="pastel-card overflow-hidden border-pastel-lavender/60 max-w-full">
            <div className="overflow-x-auto max-w-full">
              <table className="w-full text-left text-xs min-w-[500px]">
                <thead className="bg-pastel-babypink/70 border-b border-pastel-pink/50 text-pastel-deep font-bold">
                  <tr>
                    <th className="py-3 px-4">วันและเวลา</th>
                    <th className="py-3 px-4">ผู้ดำเนินการ</th>
                    <th className="py-3 px-4">ประเภทเหตุการณ์</th>
                    <th className="py-3 px-4">รายละเอียด</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-pastel-babypink/20 transition-colors">
                      <td className="py-3 px-4 text-gray-500 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString("th-TH")}
                      </td>
                      <td className="py-3 px-4 font-bold text-purple-900 whitespace-nowrap">
                        {log.actorName || "ระบบอัตโนมัติ"}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-mono text-[10px] font-semibold bg-gray-100 text-gray-800 px-2 py-0.5 rounded-md border border-gray-200">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-700">
                        {log.details || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="p-4 border-t border-pastel-lavender/40 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-600">
                <span>
                  หน้า {pagination.page} / {pagination.totalPages} (ทั้งหมด {pagination.total} รายการ)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={pagination.page <= 1}
                    onClick={() => fetchLogs(pagination.page - 1)}
                    className="p-1.5 rounded-lg bg-white border border-gray-200 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => fetchLogs(pagination.page + 1)}
                    className="p-1.5 rounded-lg bg-white border border-gray-200 disabled:opacity-40"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
