const { Client } = require('pg');

const connectionString = 'postgresql://postgres:CentroEslava2026Admin@db.scubijqoifshvyotrlgx.supabase.co:5432/postgres';

const client = new Client({
  connectionString: connectionString,
});

async function run() {
  try {
    await client.connect();
    console.log('Connected to DB');

    // 1. Add valor_compra to productos
    await client.query(`
      ALTER TABLE public.productos 
      ADD COLUMN IF NOT EXISTS valor_compra numeric DEFAULT 0;
    `);
    console.log('Added valor_compra to productos');

    const tables = ['citas', 'pacientes', 'pagos', 'productos', 'servicios', 'profiles'];

    for (const table of tables) {
      // 2. Enable RLS
      await client.query(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;`);
      
      // 3. Drop existing policies if they exist (to recreate them cleanly)
      await client.query(`DROP POLICY IF EXISTS "Allow authenticated users to do everything" ON public.${table};`);
      
      // 4. Create Policy
      await client.query(`
        CREATE POLICY "Allow authenticated users to do everything" 
        ON public.${table} 
        FOR ALL 
        TO authenticated 
        USING (true) 
        WITH CHECK (true);
      `);
      console.log(`Enabled RLS and policy for ${table}`);
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

run();
