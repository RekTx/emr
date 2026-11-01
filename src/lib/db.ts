import mysql from 'mysql2/promise';

// ─── Minimal connection architecture for shared hosting ───
// Enforces process limits across the account.
// Each MySQL connection = 1 process. To stay well under the limit:
//   • connectionLimit: 2 per pool (max 4 total DB connections)
//   • maxIdle: 0 — close connections immediately when not in use
//   • idleTimeout: 10s — aggressive cleanup
//   • Pools are cached on globalThis to survive Next.js module reloads
//   • Secondary branch pool is created LAZILY — only when someone actually uses it

interface CustomGlobal {
  __poolMain?: mysql.Pool;
  __poolBranch2?: mysql.Pool;
}

const g = globalThis as unknown as CustomGlobal;

const commonConfig: mysql.PoolOptions = {
  host: process.env.DB_HOST,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT || 3306),
  waitForConnections: true,
  connectionLimit: 2,      // Only 2 connections per pool (4 total max)
  maxIdle: 0,              // Don't keep idle connections open at all
  idleTimeout: 10000,      // Close idle connections after 10 seconds
  queueLimit: 0,
  enableKeepAlive: false,  // Don't send keep-alive packets
};

// Main pool — always created (it holds shared tables: users, master_*, letter_templates)
export const poolMain: mysql.Pool = g.__poolMain || mysql.createPool({
  ...commonConfig,
  user: process.env.DB_USER_MAIN || process.env.DB_USER || 'db_user',
  database: process.env.DB_NAME_MAIN || process.env.DB_NAME || 'emr_database',
});
g.__poolMain = poolMain;

// Secondary branch pool — created LAZILY on first access
function getBranch2Pool(): mysql.Pool {
  if (!g.__poolBranch2) {
    g.__poolBranch2 = mysql.createPool({
      ...commonConfig,
      user: process.env.DB_USER_BRANCH_2 || 'db_user_branch',
      database: process.env.DB_NAME_BRANCH_2 || 'emr_database_branch',
    });
  }
  return g.__poolBranch2;
}

// Helper to resolve the correct clinical table connection pool
export function getPool(branch?: string): mysql.Pool {
  if (branch === 'branch-2') {
    return getBranch2Pool();
  }
  return poolMain;
}

// Backward-compatible named export (lazy getter)
export const poolBranch2 = new Proxy({} as mysql.Pool, {
  get(_target, prop) {
    return (getBranch2Pool() as any)[prop];
  },
});

const pool = poolMain;
export default pool;
