import React from "react";
import { Clock, PlayCircle, CheckCircle2, XCircle } from "lucide-react";
import { QueueStatus } from "@/lib/types";

interface StatusBadgeProps {
  status: QueueStatus | string;
  size?: "sm" | "md" | "lg";
}

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const sizeClasses = {
    sm: "px-2.5 py-0.5 text-xs font-medium gap-1",
    md: "px-3 py-1 text-xs sm:text-sm font-semibold gap-1.5",
    lg: "px-4 py-1.5 text-sm sm:text-base font-semibold gap-2",
  };

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  switch (status) {
    case "waiting":
      return (
        <span
          className={`inline-flex items-center rounded-full bg-pastel-yellow/70 text-amber-900 border border-amber-200/80 shadow-xs ${sizeClasses[size]}`}
        >
          <Clock className={`${iconSizes[size]} text-amber-700 animate-pulse`} />
          <span>รอคิว</span>
        </span>
      );
    case "in_progress":
      return (
        <span
          className={`inline-flex items-center rounded-full bg-pastel-blue text-blue-900 border border-blue-200 shadow-xs ${sizeClasses[size]}`}
        >
          <PlayCircle className={`${iconSizes[size]} text-blue-600 animate-spin`} />
          <span>กำลังดำเนินการ</span>
        </span>
      );
    case "completed":
      return (
        <span
          className={`inline-flex items-center rounded-full bg-pastel-green text-emerald-900 border border-emerald-200 shadow-xs ${sizeClasses[size]}`}
        >
          <CheckCircle2 className={`${iconSizes[size]} text-emerald-600`} />
          <span>เสร็จแล้ว</span>
        </span>
      );
    case "cancelled":
      return (
        <span
          className={`inline-flex items-center rounded-full bg-red-100 text-rose-800 border border-rose-200 shadow-xs ${sizeClasses[size]}`}
        >
          <XCircle className={`${iconSizes[size]} text-rose-600`} />
          <span>ยกเลิก</span>
        </span>
      );
    default:
      return (
        <span
          className={`inline-flex items-center rounded-full bg-gray-100 text-gray-700 border border-gray-200 ${sizeClasses[size]}`}
        >
          <span>{status}</span>
        </span>
      );
  }
}
