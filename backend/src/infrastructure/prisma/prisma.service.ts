import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

/**
 * Prisma client bound to the Nest lifecycle.
 *
 * Uses the `pg` driver adapter (a real connection pool) rather than Prisma's
 * default engine connection, and ties connect/disconnect to module
 * init/destroy so connections are opened on boot and cleanly released on
 * shutdown.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const adapter = new PrismaPg(pool);
    super({ adapter });
  }

  /** Open the database connection once the module is ready. */
  async onModuleInit() {
    await this.$connect();
  }

  /** Release the connection pool on graceful shutdown. */
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
