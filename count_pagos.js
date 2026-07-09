const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://scubijqoifshvyotrlgx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjdWJpanFvaWZzaHZ5b3RybGd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExODczMjcsImV4cCI6MjA5Njc2MzMyN30.w0DalpbHcDboZooz9RtoGcNiYfGe51wx5JSEvqYSXn0';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { count: countPendientes } = await supabase.from('pagos').select('*', { count: 'exact', head: true }).eq('estado', 'Pendiente');
  console.log('Pendientes count:', countPendientes);
  
  const { count: countTotal } = await supabase.from('pagos').select('*', { count: 'exact', head: true });
  console.log('Total pagos count:', countTotal);
}
test();
