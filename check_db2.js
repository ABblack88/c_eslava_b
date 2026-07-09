const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://scubijqoifshvyotrlgx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjdWJpanFvaWZzaHZ5b3RybGd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExODczMjcsImV4cCI6MjA5Njc2MzMyN30.w0DalpbHcDboZooz9RtoGcNiYfGe51wx5JSEvqYSXn0';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data: d1, error: e1 } = await supabase.from('servicios').select('*').limit(1);
  console.log('Servicios:', d1, e1);
  const { data: d2, error: e2 } = await supabase.from('productos').select('*').limit(1);
  console.log('Productos:', d2, e2);
  const { data: d3, error: e3 } = await supabase.from('profiles').select('*').limit(1);
  console.log('Profiles:', d3, e3);
  const { data: d4, error: e4 } = await supabase.from('pagos').select('*').limit(1);
  console.log('Pagos:', d4, e4);
}
test();
