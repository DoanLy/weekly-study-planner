import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);
const ROW_ID = 'planner';

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS app_data (
      id text PRIMARY KEY,
      data jsonb NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `;
}

export default async function handler(req, res) {
  try {
    await ensureTable();

    if (req.method === 'GET') {
      const rows = await sql`SELECT data FROM app_data WHERE id = ${ROW_ID}`;
      res.status(200).json({ ok: true, data: rows[0]?.data ?? null });
      return;
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (!body || typeof body.data !== 'object' || body.data === null) {
        res.status(400).json({ ok: false, error: 'Missing data' });
        return;
      }

      await sql`
        INSERT INTO app_data (id, data, updated_at)
        VALUES (${ROW_ID}, ${JSON.stringify(body.data)}::jsonb, now())
        ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()
      `;
      res.status(200).json({ ok: true });
      return;
    }

    res.setHeader('Allow', 'GET, POST');
    res.status(405).json({ ok: false, error: 'Method not allowed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, error: 'Server error' });
  }
}
