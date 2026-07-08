import { neon } from '@neondatabase/serverless';

const SHEETS_ENDPOINT =
  'https://script.google.com/macros/s/AKfycbzVKJPjWGsQpMdF_LKW4Ix_md92kYfLJXafupLl3d8laqdxZo2vbaF4afmSkSuetZ5P/exec';

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set. Run with --env-file=.env.local');
  }

  const response = await fetch(`${SHEETS_ENDPOINT}?action=load`);
  const payload = await response.json();
  if (!payload.data || Object.keys(payload.data).length === 0) {
    throw new Error('No data returned from Google Sheets endpoint');
  }

  const sql = neon(process.env.DATABASE_URL);
  await sql`
    CREATE TABLE IF NOT EXISTS app_data (
      id text PRIMARY KEY,
      data jsonb NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  await sql`
    INSERT INTO app_data (id, data, updated_at)
    VALUES ('planner', ${JSON.stringify(payload.data)}::jsonb, now())
    ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()
  `;

  const rows = await sql`SELECT data FROM app_data WHERE id = 'planner'`;
  console.log('Migrated. Keys stored:', Object.keys(rows[0].data));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
