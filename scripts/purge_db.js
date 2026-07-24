// scripts/purge_db.js
// Uso: crear un archivo .env con SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY, luego ejecutar:
//    node scripts/purge_db.js
// Este script usa la Service Role Key y debe ejecutarse en entorno seguro (no poner la clave en el frontend).

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Faltan variables de entorno. Crear .env con SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const fetch = global.fetch || require('node-fetch');

// Orden: eliminar hijos primero, luego tablas padre
const tablas = [
  'consultas_medicas',
  'pagos',
  'citas',
  'productos',
  'servicios',
  'dias_feriados',
  // pacientes debe eliminarse después de sus dependientes
  'pacientes'
];

async function deleteAll(table) {
  // PostgREST exige un filtro para las operaciones DELETE. Todos los registros
  // de estas tablas tienen un id no nulo, por lo que este filtro abarca la tabla.
  const url = `${SUPABASE_URL.replace(/\/+$/, '')}/rest/v1/${table}?id=not.is.null`;
  console.log(`-> Borrando tabla: ${table}`);
  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      Prefer: 'return=minimal'
    }
  });

  const body = await res.text();
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText} - ${body}`);
  }
  console.log(`   OK: ${table} borrada (respuesta ${res.status})`);
}

async function deleteProfilesNonRoot() {
  const url = `${SUPABASE_URL.replace(/\/+$/, '')}/rest/v1/profiles?role=not.eq.root`;
  console.log('-> Borrando perfiles no-root (profiles where role != root)');
  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      Prefer: 'return=minimal'
    }
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} - ${body}`);
  console.log(`   OK: profiles no-root borrados (respuesta ${res.status})`);
}

async function main() {
  console.log('Iniciando purga segura de la base de datos (Service Role Key required)');
  try {
    for (const t of tablas) {
      await deleteAll(t);
    }

    // Finalmente, borrar perfiles que no sean root
    await deleteProfilesNonRoot();

    console.log('\nPurge completada. Verifica en Supabase console si todo está correcto.');
  } catch (err) {
    console.error('Error durante la purga:', err.message || err);
    process.exitCode = 2;
  }
}

main();
