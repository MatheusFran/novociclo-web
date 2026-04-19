import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

const globalForPrisma = globalThis as unknown as { prisma: any };


function createPrismaClient() {
    const adapter = new PrismaMariaDb({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: Number(process.env.DB_PORT),
    });
    return new PrismaClient({ adapter });
}

// export const prisma: any = globalForPrisma.prisma ?? createPrismaClient();


// if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
globalForPrisma.prisma = globalForPrisma.prisma ?? createPrismaClient();
export const prisma = globalForPrisma.prisma;