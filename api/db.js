const { neon } = require('@neondatabase/serverless');

let _sql = null;
function getSql() {
  if (!_sql) _sql = neon(process.env.DATABASE_URL);
  return _sql;
}

const EMPTY = '{"customers":[],"transactions":[],"loans":[]}';

async function init(sql) {
  await sql`CREATE TABLE IF NOT EXISTS store (id INT PRIMARY KEY, data JSONB NOT NULL)`;
  await sql`INSERT INTO store (id, data) VALUES (1, ${EMPTY}::jsonb) ON CONFLICT DO NOTHING`;
  await sql`INSERT INTO store (id, data) VALUES (2, ${EMPTY}::jsonb) ON CONFLICT DO NOTHING`;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const sql = getSql();
    await init(sql);

    const uid = parseInt(req.query.user, 10) === 2 ? 2 : 1;

    if (req.method === 'GET') {
      const rows = await sql`SELECT data FROM store WHERE id = ${uid}`;
      const data = rows[0]?.data || { customers: [], transactions: [], loans: [] };
      return res.status(200).json(data);
    }

    if (req.method === 'PUT') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      await sql`UPDATE store SET data = ${JSON.stringify(body)}::jsonb WHERE id = ${uid}`;
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};
