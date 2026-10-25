import { prisma } from "./prisma";

export interface LogAuditParams {
  actorId?: string | null;
  actorName?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  details?: string | null;
}

// Sanitize sensitive fields before persisting to audit logs
function sanitizeData(data?: Record<string, unknown> | null): string | null {
  if (!data) return null;
  const sanitized = { ...data };
  const sensitiveKeys = ["password", "passwordHash", "token", "tokenHash", "secret"];
  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.some((s) => key.toLowerCase().includes(s.toLowerCase()))) {
      sanitized[key] = "[REDACTED]";
    }
  }
  return JSON.stringify(sanitized);
}

export async function logAudit({
  actorId,
  actorName,
  action,
  entityType,
  entityId,
  oldValues,
  newValues,
  details,
}: LogAuditParams) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: actorId || null,
        actorName: actorName || "System",
        action,
        entityType,
        entityId,
        oldValues: sanitizeData(oldValues),
        newValues: sanitizeData(newValues),
        details: details || null,
      },
    });
  } catch (error) {
    console.error("Failed to write audit log:", error);
  }
}
