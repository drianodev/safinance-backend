import { PrismaClient } from '../../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { Pool } from 'pg';
import { env, isDevelopment } from '../config/env.js';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

const isMysql = env.DATABASE_URL.startsWith('mysql');

function createPrismaClient(): PrismaClient {
  if (isMysql) {
    // MariaDB/MySQL Driver Adapter for Hostinger hPanel
    const adapter = new PrismaMariaDb(env.DATABASE_URL);
    return new PrismaClient({
      adapter,
      log: isDevelopment ? ['query', 'error', 'warn'] : ['error'],
    });
  }

  // PostgreSQL connection with adapter-pg (Upstream standard)
  const pool = new Pool({
    connectionString: env.DATABASE_URL,
  });
  
  const adapter = new PrismaPg(pool);
  
  return new PrismaClient({
    adapter,
    log: isDevelopment ? ['query', 'error', 'warn'] : ['error'],
  });
}

// Prevent multiple instances in development (hot reloading)
export const prisma = globalThis.__prisma ?? createPrismaClient();

if (isDevelopment) {
  globalThis.__prisma = prisma;
}

export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    // Set timezone to UTC-3 (America/Sao_Paulo)
    if (isMysql) {
      await prisma.$executeRaw`SET time_zone = '-03:00'`;
    } else {
      await prisma.$executeRaw`SET timezone = 'America/Sao_Paulo'`;
    }
    console.log(`✅ Database connected (${isMysql ? 'MySQL' : 'PostgreSQL'}, timezone: UTC-3)`);
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    // Don't exit - allow server to start for health checks
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  console.log('📴 Database disconnected');
}
