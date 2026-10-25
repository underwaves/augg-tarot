import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "./prisma";
import { PERMISSION_KEYS, PermissionKey, SessionUser } from "./types";

export const COOKIE_NAME = "tarot_admin_session";

/**
 * Validates and retrieves the JWT secret key from environment variables.
 * Fails fast with a configuration error if missing or shorter than 32 characters.
 * Never outputs the actual secret value to logs or responses.
 */
export function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || typeof secret !== "string" || secret.trim().length < 32) {
    const errorMsg = "Configuration error: JWT_SECRET environment variable is missing or shorter than 32 characters.";
    console.error(`[AUTH CONFIG ERROR] ${errorMsg}`);
    throw new Error(errorMsg);
  }
  return new TextEncoder().encode(secret.trim());
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Creates an active session in the database and returns a signed JWT containing
 * both user ID (`sub`) and session ID (`sid`).
 */
export async function createSessionToken(userId: string): Promise<string> {
  const secretKey = getJwtSecret();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const session = await prisma.session.create({
    data: {
      userId,
      expiresAt,
    },
  });

  return new SignJWT({ sub: userId, sid: session.id })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey);
}

export async function verifySessionToken(token: string): Promise<{ sub: string; sid?: string } | null> {
  const secretKey = getJwtSecret();
  try {
    const { payload } = await jwtVerify(token, secretKey);
    if (!payload.sub) return null;
    return { sub: payload.sub as string, sid: payload.sid as string | undefined };
  } catch {
    return null;
  }
}

/**
 * Revokes a single session by its session ID.
 */
export async function revokeSession(sessionId: string): Promise<void> {
  await prisma.session.updateMany({
    where: { id: sessionId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/**
 * Revokes all active sessions for a user (used after password change/reset or account deactivation).
 */
export async function revokeAllUserSessions(userId: string): Promise<void> {
  await prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function setSessionCookie(userId: string): Promise<string> {
  const token = await createSessionToken(userId);
  try {
    const cookieStore = cookies();
    cookieStore.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
  } catch {
    // Running in context where cookies() write is unavailable (e.g. tests)
  }
  return token;
}

export async function clearSessionCookie(tokenOrReq?: string | NextRequest): Promise<void> {
  try {
    let token: string | undefined;
    if (typeof tokenOrReq === "string") {
      token = tokenOrReq;
    } else if (tokenOrReq && typeof tokenOrReq === "object") {
      if ("cookies" in tokenOrReq && typeof (tokenOrReq as any).cookies?.get === "function") {
        token = (tokenOrReq as any).cookies.get(COOKIE_NAME)?.value;
      }
      if (!token && "headers" in tokenOrReq && typeof (tokenOrReq as any).headers?.get === "function") {
        const auth = (tokenOrReq as any).headers.get("authorization");
        if (auth) token = auth.replace(/^Bearer\s+/i, "");
      }
    }

    if (!token) {
      try {
        const cookieStore = cookies();
        token = cookieStore.get(COOKIE_NAME)?.value;
      } catch {
        // ignore
      }
    }

    if (token) {
      const verified = await verifySessionToken(token);
      if (verified?.sid) {
        await revokeSession(verified.sid);
      }
    }
  } catch {
    // Ignore error in non-request contexts
  }

  try {
    const cookieStore = cookies();
    cookieStore.set(COOKIE_NAME, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
  } catch {
    // Ignore error in non-request contexts
  }
}

export async function getCurrentUser(tokenOrReq?: string | NextRequest): Promise<SessionUser | null> {
  try {
    let token: string | undefined;
    if (typeof tokenOrReq === "string") {
      token = tokenOrReq;
    } else if (tokenOrReq && typeof tokenOrReq === "object") {
      if ("cookies" in tokenOrReq && typeof (tokenOrReq as any).cookies?.get === "function") {
        token = (tokenOrReq as any).cookies.get(COOKIE_NAME)?.value;
      }
      if (!token && "headers" in tokenOrReq && typeof (tokenOrReq as any).headers?.get === "function") {
        const auth = (tokenOrReq as any).headers.get("authorization");
        if (auth) token = auth.replace(/^Bearer\s+/i, "");
      }
    }

    if (!token) {
      try {
        const cookieStore = cookies();
        token = cookieStore.get(COOKIE_NAME)?.value;
      } catch {
        // cookies() is unavailable outside Next.js request context
      }
    }

    if (!token) return null;

    const verified = await verifySessionToken(token);
    if (!verified) return null;

    // Check active session in database
    if (verified.sid) {
      const session = await prisma.session.findUnique({
        where: { id: verified.sid },
        include: {
          user: {
            include: { permissions: true },
          },
        },
      });

      if (!session || session.revokedAt || session.expiresAt < new Date()) {
        return null;
      }

      const profile = session.user;
      if (!profile || !profile.isActive) {
        return null;
      }

      const permissions =
        profile.role === "owner"
          ? ([...PERMISSION_KEYS] as PermissionKey[])
          : (profile.permissions.map((p) => p.permissionKey) as PermissionKey[]);

      return {
        id: profile.id,
        email: profile.email,
        displayName: profile.displayName,
        role: profile.role as "owner" | "admin",
        isActive: profile.isActive,
        permissions,
      };
    }

    return null;
  } catch (err: any) {
    if (err instanceof Error && err.message.startsWith("Configuration error:")) {
      throw err;
    }
    return null;
  }
}

export async function requireAuth(
  requiredPermission?: PermissionKey,
  tokenOrReq?: string | NextRequest
): Promise<{ user: SessionUser }> {
  const user = await getCurrentUser(tokenOrReq);
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
