import { Injectable, OnModuleDestroy, ServiceUnavailableException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private pool: Pool | undefined;

  constructor() {
    // 数据库不可用时仍启动 HTTP，让存活与依赖就绪状态分别可观测。
    if (process.env.DATABASE_URL || process.env.PGPASSWORD) {
      this.pool = new Pool({
        ...(process.env.DATABASE_URL ? { connectionString: process.env.DATABASE_URL } : {
          host: process.env.PGHOST || '127.0.0.1',
          port: Number(process.env.PGPORT || 5432),
          user: process.env.PGUSER || 'demo',
          password: process.env.PGPASSWORD,
          database: process.env.PGDATABASE || 'demo',
        }),
        connectionTimeoutMillis: 3000,
        query_timeout: 5000,
        statement_timeout: 5000,
        idleTimeoutMillis: 10000,
        max: 5,
      });
      this.pool.on('error', () => console.error('DATABASE_IDLE_CONNECTION_FAILED'));
    }
  }

  private configured(): Pool {
    if (!this.pool) throw new ServiceUnavailableException({ errorCode: 'DATABASE_NOT_CONFIGURED' });
    return this.pool;
  }

  async read() {
    const pool = this.configured();
    try {
      const result = await pool.query('SELECT current_database() AS database, CURRENT_TIMESTAMP AS time, 1::int AS probe');
      return { connected: true, read: true, result: result.rows[0] };
    } catch {
      throw new ServiceUnavailableException({ errorCode: 'DATABASE_UNAVAILABLE' });
    }
  }

  async writeRead() {
    const pool = this.configured();
    const client = await pool.connect().catch(() => {
      throw new ServiceUnavailableException({ errorCode: 'DATABASE_UNAVAILABLE' });
    });
    try {
      await client.query('BEGIN');
      await client.query('CREATE TEMPORARY TABLE ops_demo_probe (value text NOT NULL) ON COMMIT DROP');
      const value = randomUUID();
      await client.query('INSERT INTO ops_demo_probe (value) VALUES ($1)', [value]);
      const result = await client.query('SELECT value FROM ops_demo_probe');
      if (result.rows.length !== 1 || result.rows[0].value !== value) throw new Error('PROBE_MISMATCH');
      await client.query('ROLLBACK');
      return { connected: true, write: true, read: true, rolledBack: true };
    } catch {
      await client.query('ROLLBACK').catch(() => undefined);
      throw new ServiceUnavailableException({ errorCode: 'DATABASE_WRITE_READ_FAILED' });
    } finally {
      client.release();
    }
  }

  async onModuleDestroy() { await this.pool?.end(); }
}
