const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres:CentroEslava2026Admin@db.scubijqoifshvyotrlgx.supabase.co:5432/postgres'
});
async function run() {
  await client.connect();
  const res = await client.query(`
    SELECT descripcion, monto 
    FROM pagos 
    WHERE descripcion LIKE 'Productos:%';
  `);
  console.log(res.rows);
  await client.end();
}
run();
