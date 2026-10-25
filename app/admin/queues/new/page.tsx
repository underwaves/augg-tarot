"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Sparkles,
  ArrowLeft,
  Calendar,
  User,
  Package,
  HelpCircle,
  FileText,
  Lock,
  Copy,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { useToast } from "@/components/Toast";
import { getBangkokToday } from "@/lib/date";

const POPULAR_PACKAGES = [
  "เปิดไพ่ความรัก 3 ใบ (เจาะลึกความสัมพันธ์)",
  "เปิดไพ่การงานและการเงิน (Celtic Cross)",
  "ถาม-ตอบ 3 คำถามเคลียร์ใจ",
  "เปิดไพ่ดูภาพรวมชีวิต 12 เรือนชะตา (Zodiac Wheel)",
  "เช็กดวงความรักคนโสด เจาะลึกเนื้อคู่",
  "เช็กพลังงานรายสัปดาห์ / รายเดือน",
];

export default function NewQueuePage() {
  const router = useRouter();
  const { showToast } = useToast();

  const todayStr = getBangkokToday();

  const [nickname, setNickname] = useState("");
  const [queueDate, setQueueDate] = useState(todayStr);
  const [packageName, setPackageName] = useState("");
  const [questionCount, setQuestionCount] = useState(3);
  const [details, setDetails] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [initialStatus, setInitialStatus] = useState("waiting");

  const [loading, setLoading] = useState(false);
  const [createdResult, setCreatedResult] = useState<any | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nickname.trim()) {
      showToast("กรุณากรอกชื่อเล่นลูกค้า", "error");
      return;
    }
    if (!queueDate) {
      showToast("กรุณาเลือกวันที่รับคิว", "error");
      return;
    }
    if (!packageName.trim()) {
      showToast("กรุณาระบุชื่อแพ็กเกจ", "error");
      return;
    }
    if (questionCount < 0) {
      showToast("จำนวนคำถามต้องไม่ติดลบ", "error");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/queues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname: nickname.trim(),
          queueDate,
          packageName: packageName.trim(),
          questionCount,
          details: details.trim(),
          internalNote: internalNote.trim(),
          initialStatus,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || "เกิดข้อผิดพลาดในการบันทึกคิว", "error");
        return;
      }

      showToast(`เพิ่มคิว ${data.queue.queueNumber} สำเร็จเรียบร้อยค่ะ ✨`, "success");
      setCreatedResult(data);
    } catch {
      showToast("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้", "error");
    } finally {
      setLoading(false);
    }
  };

  const copyCreatedLink = () => {
    if (createdResult?.trackingUrl) {
      navigator.clipboard.writeText(createdResult.trackingUrl);
      showToast("คัดลอกลิงก์ติดตามคิวเรียบร้อยแล้วค่ะ ✨", "success");
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Navigation Back */}
        <Link
          href="/admin/queues"
          className="inline-flex items-center gap-2 text-xs font-semibold text-purple-700 hover:text-purple-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>กลับไปหน้าจัดการคิว</span>
        </Link>

        {/* Title */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-pastel-deep font-magic">
              เพิ่มคิวลูกค้าใหม่ 🔮
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              กรอกรายละเอียดการเปิดไพ่ ระบบจะออกเลขคิวอัตโนมัติและสร้างลิงก์ติดตามทันที
            </p>
          </div>
        </div>

        {/* Success Modal / Banner when created */}
        {createdResult && (
          <div className="pastel-card p-6 bg-emerald-50/80 border-emerald-200 animate-in fade-in space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-emerald-900 text-base">
                  สร้างคิวสำเร็จ: {createdResult.queue.queueNumber}
                </h3>
                <p className="text-xs text-emerald-700">
                  ลูกค้า: คุณ{createdResult.queue.nickname} • ลำดับที่ #{createdResult.queue.queueOrder}
                </p>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-emerald-200/80 space-y-2">
              <label className="block text-xs font-bold text-gray-700">
                🔗 ลิงก์สำหรับส่งให้ลูกค้าติดตามคิว (ไม่ต้องล็อกอิน):
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={createdResult.trackingUrl}
                  className="w-full bg-gray-50 text-xs text-gray-600 px-3 py-2 rounded-xl border border-gray-200 font-mono select-all"
                />
                <button
                  type="button"
                  onClick={copyCreatedLink}
                  className="btn-magical px-4 py-2 rounded-xl text-xs whitespace-nowrap flex items-center gap-1.5 shadow-sm"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>คัดลอกลิงก์</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setCreatedResult(null);
                  setNickname("");
                  setDetails("");
                  setInternalNote("");
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-purple-700 hover:bg-emerald-100/60 transition"
              >
                + เพิ่มอีกหนึ่งคิว
              </button>
              <Link
                href={`/admin/queues/${createdResult.queue.id}`}
                className="btn-magical px-5 py-2 rounded-xl text-xs font-semibold shadow-xs"
              >
                ดูรายละเอียดคิวที่สร้าง
              </Link>
            </div>
          </div>
        )}

        {/* Main Form */}
        <form onSubmit={handleSubmit} className="pastel-card p-6 sm:p-8 space-y-5 border-pastel-lavender/60">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nickname */}
            <div>
              <label className="block text-xs font-bold text-pastel-deep mb-1.5">
                ชื่อเล่นลูกค้า <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="เช่น คุณแพรว, น้องฟ้าใส"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-pastel-purple text-sm text-pastel-deep"
                />
              </div>
            </div>

            {/* Queue Date */}
            <div>
              <label className="block text-xs font-bold text-pastel-deep mb-1.5">
                วันที่รับคิว <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="date"
                  required
                  value={queueDate}
                  onChange={(e) => setQueueDate(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-pastel-purple text-sm text-pastel-deep"
                />
              </div>
            </div>
          </div>

          {/* Package Name */}
          <div>
            <label className="block text-xs font-bold text-pastel-deep mb-1.5">
              ชื่อแพ็กเกจเปิดไพ่ <span className="text-rose-500">*</span>
            </label>
            <div className="relative mb-2">
              <Package className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                placeholder="ระบุหรือเลือกแพ็กเกจด้านล่าง..."
                value={packageName}
                onChange={(e) => setPackageName(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-pastel-purple text-sm text-pastel-deep"
              />
            </div>

            {/* Popular package pills */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {POPULAR_PACKAGES.map((pkg) => (
                <button
                  key={pkg}
                  type="button"
                  onClick={() => setPackageName(pkg)}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-pastel-lavender/30 hover:bg-pastel-lavender/60 text-purple-900 border border-purple-200/60 transition text-left"
                >
                  ✦ {pkg}
                </button>
              ))}
            </div>
          </div>

          {/* Question Count & Initial Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-pastel-deep mb-1.5">
                จำนวนคำถาม <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <HelpCircle className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  min="0"
                  required
                  value={questionCount}
                  onChange={(e) => setQuestionCount(parseInt(e.target.value) || 0)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-pastel-purple text-sm text-pastel-deep"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-pastel-deep mb-1.5">
                สถานะเริ่มต้นของคิว
              </label>
              <select
                value={initialStatus}
                onChange={(e) => setInitialStatus(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-pastel-purple text-sm text-pastel-deep"
              >
                <option value="waiting">รอคิว (Waiting)</option>
                <option value="in_progress">เริ่มดำเนินการทันที (In Progress)</option>
              </select>
            </div>
          </div>

          {/* Details (Optional) */}
          <div>
            <label className="block text-xs font-bold text-pastel-deep mb-1.5">
              รายละเอียดเพิ่มเติม / คำถามลูกค้า (ไม่บังคับ)
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
              <textarea
                rows={3}
                placeholder="คำถามหรือประเด็นที่ลูกค้าต้องการเน้นย้ำ..."
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-pastel-purple text-sm text-pastel-deep"
              />
            </div>
          </div>

          {/* Internal Note (Optional) */}
          <div>
            <label className="block text-xs font-bold text-pastel-deep mb-1.5 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-600" />
              <span>หมายเหตุภายในร้าน (ลูกค้าจะไม่เห็นข้อความนี้)</span>
            </label>
            <textarea
              rows={2}
              placeholder="เช่น ข้อมูลการชำระเงิน, ช่องทางติดต่อไลน์, ข้อความเตือนความจำของแม่หมอ..."
              value={internalNote}
              onChange={(e) => setInternalNote(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-amber-200/70 bg-amber-50/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-300 text-sm text-pastel-deep"
            />
          </div>

          {/* Submit Buttons */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
            <Link
              href="/admin/queues"
              className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
            >
              ยกเลิก
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="btn-magical px-6 py-2.5 rounded-xl text-sm font-bold shadow-md flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-purple-900 border-t-transparent rounded-full animate-spin" />
                  <span>กำลังออกเลขคิว...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>บันทึกและสร้างเลขคิว</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
