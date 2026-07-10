const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres:CentroEslava2026Admin@db.scubijqoifshvyotrlgx.supabase.co:5432/postgres'
});
async function run() {
  await client.connect();
  try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS dias_feriados (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            fecha DATE NOT NULL UNIQUE,
            descripcion TEXT
        );
        ALTER TABLE dias_feriados ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Enable all for all" ON dias_feriados;
        CREATE POLICY "Enable all for all" ON dias_feriados FOR ALL USING (true) WITH CHECK (true);
      `);
      console.log("Table dias_feriados created successfully.");
  } catch (e) {
      console.error(e);
  }
  await client.end();
}
run();
