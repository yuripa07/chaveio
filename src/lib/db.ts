// src/lib/db.ts
import { PrismaClient } from "@/generated/prisma/client"; 
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client"; // <-- Add this import!

export function createPrisma(url?: string) {
  const dbUrl = url ?? process.env.DATABASE_URL;
  if (!dbUrl || dbUrl === "undefined") throw new Error("DATABASE_URL is not set");

  
  // 2. Pass the client to the adapter
  const adapter = new PrismaLibSql({ url: dbUrl });

  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}