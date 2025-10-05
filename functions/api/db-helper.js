/**
 * 🔧 DATABASE HELPER UTILITY
 * 
 * Centralizes database connection setup with foreign key enforcement.
 * 
 * Usage in any API endpoint:
 * 
 * import { getDB } from './db-helper.js';
 * 
 * export async function onRequestPost(context) {
 *   const db = await getDB(context.env);
 *   const result = await db.prepare('SELECT * FROM products WHERE id = ?')
 *     .bind(productId)
 *     .first();
 * }
 * 
 * ⚠️ This helper ensures foreign keys are ALWAYS enabled for all queries.
 */

export async function getDB(env) {
  // Enable foreign keys for this connection
  await env.DB.exec('PRAGMA foreign_keys = ON;');
  
  return env.DB;
}

/**
 * 🔒 TRANSACTION WRAPPER
 * 
 * Wraps a batch transaction with FK enforcement.
 * 
 * Usage:
 * 
 * const queries = [
 *   db.prepare('UPDATE products SET quantity = ? WHERE id = ?').bind(10, 1),
 *   db.prepare('INSERT INTO orders (total) VALUES (?)').bind(100)
 * ];
 * 
 * const results = await executeTransaction(env, queries);
 */
export async function executeTransaction(env, queries) {
  const db = await getDB(env);
  
  // Prepend FK enforcement to transaction
  const transaction = [
    'PRAGMA foreign_keys = ON;',
    ...queries
  ];
  
  return await db.batch(transaction);
}

/**
 * 📊 HELPER: Safe batch insert with FK checks
 * 
 * Usage:
 * 
 * await safeBatchInsert(env, 'order_items', [
 *   { order_id: 1, product_id: 5, quantity: 2 },
 *   { order_id: 1, product_id: 8, quantity: 1 }
 * ]);
 */
export async function safeBatchInsert(env, tableName, records) {
  const db = await getDB(env);
  
  if (records.length === 0) return [];
  
  const keys = Object.keys(records[0]);
  const placeholders = keys.map(() => '?').join(', ');
  const sql = `INSERT INTO ${tableName} (${keys.join(', ')}) VALUES (${placeholders})`;
  
  const queries = records.map(record => 
    db.prepare(sql).bind(...keys.map(k => record[k]))
  );
  
  return await executeTransaction(env, queries);
}
