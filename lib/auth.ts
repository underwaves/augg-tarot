import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "./prisma";
import { PermissionKey, SessionUser } from "./types";

const JWT_SECRET_STRING = process.env.JWT_SECRET || "fallback_super_secret_magical_pastel_tarot_key_at_least_32_chars";
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_STRING);
const COOKIE_NAME = "tarot_admin_session";

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

export async function verifySessionToken(token: string): Promise<{ sub: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (!payload.sub) return null;
    return { sub: payload.sub as string };
  } catch {
    return null;
  }
}

export async function setSessionCookie(userId: string) {
  const token = await createSessionToken(userId);
  const cookieStore = cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function clearSessionCookie() {
  const cookieStore = cookies();
  cookieStore.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const verified = await verifySessionToken(token);
    if (!verified) return null;

    const profile = await prisma.profile.findUnique({
      where: { id: verified.sub },
      include: {
        permissions: true,
      },
    });

    if (!profile || !profile.isActive) {
      return null;
    }

    const permissions =
      profile.role === "owner"
        ? [
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
          ] as PermissionKey[]
        : (profile.permissions.map((p) => p.permissionKey) as PermissionKey[]);

    return {
      id: profile.id,
      email: profile.email,
      displayName: profile.displayName,
      role: profile.role as "owner" | "admin",
      isActive: profile.isActive,
      permissions,
    };
  } catch {
    return null;
  }
}

export async function requireAuth(requiredPermission?: PermissionKey): Promise<{ user: SessionUser }> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }

  if (requiredPermission && user.role !== "owner") {
    if (!user.permissions.includes(requiredPermission)) {
      throw new Error("FORBIDDEN");
    }
  }

  return { user };
}
