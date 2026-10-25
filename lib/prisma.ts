import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const defaultPrisma =
  global.prisma ||
  new PrismaClient({
    datasources: process.env.DATABASE_URL
      ? { db: { url: process.env.DATABASE_URL } }
      : undefined,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.prisma = defaultPrisma;
}

/**
 * Proxy wrapper ensuring any override on global.prisma (such as isolated test databases)
 * is immediately reflected across all application modules without stale references.
 */
export const prisma = new Proxy(defaultPrisma, {
  get(target, prop, receiver) {
    const active = global.prisma || target;
    const value = Reflect.get(active, prop, receiver);
    if (typeof value === "function") {
      return value.bind(active);
    }
    return value;
  },
});
