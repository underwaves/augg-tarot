export type UserRole = "owner" | "admin";

export type QueueStatus = "waiting" | "in_progress" | "completed" | "cancelled";

export const PERMISSION_KEYS = [
  "view_queues",
  "create_queue",
  "edit_queue",
  "change_status",
  "reorder_queue",
  "cancel_queue",
  "view_history",
  "create_tracking_token",
  "manage_users",
  "view_audit_logs",
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  view_queues: "ดูรายการคิว (View Queues)",
  create_queue: "เพิ่มคิวใหม่ (Create Queue)",
  edit_queue: "แก้ไขข้อมูลคิว (Edit Queue)",
  change_status: "เปลี่ยนสถานะคิว (Change Status)",
  reorder_queue: "เลื่อน/ลัดคิว (Reorder / Jump Queue)",
  cancel_queue: "ยกเลิกคิว (Cancel Queue)",
  view_history: "ดูประวัติคิวเก่า (View History)",
  create_tracking_token: "สร้างลิงก์ติดตามคิว (Create Tracking Link)",
  manage_users: "จัดการบัญชีแอดมิน (Manage Users)",
  view_audit_logs: "ดูประวัติระบบ Audit Log (View Audit Logs)",
};

export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  isActive: boolean;
  permissions: PermissionKey[];
}
