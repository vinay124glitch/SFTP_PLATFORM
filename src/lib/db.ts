import { PrismaClient } from '@prisma/client';

// Extend BigInt to allow seamless JSON serialization in API responses
declare global {
  interface BigInt {
    toJSON(): string;
  }
}

// Polyfill BigInt.prototype.toJSON once
if (typeof BigInt.prototype.toJSON !== 'function') {
  BigInt.prototype.toJSON = function () {
    return this.toString();
  };
}

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
