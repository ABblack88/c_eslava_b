const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://scubijqoifshvyotrlgx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjdWJpanFvaWZzaHZ5b3RybGd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExODczMjcsImV4cCI6MjA5Njc2MzMyN30.w0DalpbHcDboZooz9RtoGcNiYfGe51wx5JSEvqYSXn0';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data: citas } = await supabase.from('citas').select('*').ilike('tratamiento', '%Laser%');
    console.log("Citas con Laser:", citas);
    const { data: citas2 } = await supabase.from('citas').select('*').ilike('tratamiento', '%Láser%');
    console.log("Citas con Láser:", citas2);
    
    const { data: pagos } = await supabase.from('pagos').select('*').ilike('descripcion', '%Laser%');
    console.log("Pagos con Laser:", pagos);
    const { data: pagos2 } = await supabase.from('pagos').select('*').ilike('descripcion', '%Láser%');
    console.log("Pagos con Láser:", pagos2);
}
check();
