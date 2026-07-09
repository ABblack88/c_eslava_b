const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://scubijqoifshvyotrlgx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjdWJpanFvaWZzaHZ5b3RybGd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExODczMjcsImV4cCI6MjA5Njc2MzMyN30.w0DalpbHcDboZooz9RtoGcNiYfGe51wx5JSEvqYSXn0';
const supabase = createClient(supabaseUrl, supabaseKey);
async function check() {
    // Check if there are triggers on pagos
    // Since we don't have direct SQL access to pg_trigger easily via supabase-js without an RPC, let's just attempt to update a payment twice.
    const { data } = await supabase.from('pagos').select('id, cita_id').limit(1);
    const pId = data[0].id;
    console.log("Updating", pId, "first time...");
    let res1 = await supabase.from('pagos').update({estado: 'Completado'}).eq('id', pId);
    console.log("Res1:", res1.error);
    
    console.log("Updating", pId, "second time...");
    let res2 = await supabase.from('pagos').update({estado: 'Completado'}).eq('id', pId);
    console.log("Res2:", res2.error);
}
check();
