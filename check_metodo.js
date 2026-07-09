const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://scubijqoifshvyotrlgx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjdWJpanFvaWZzaHZ5b3RybGd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExODczMjcsImV4cCI6MjA5Njc2MzMyN30.w0DalpbHcDboZooz9RtoGcNiYfGe51wx5JSEvqYSXn0';
const supabase = createClient(supabaseUrl, supabaseKey);
async function check() {
    const { data } = await supabase.from('pagos').select('id, cita_id').limit(1);
    const pId = data[0].id;
    let res = await supabase.from('pagos').update({metodo: 'Yape / Plin'}).eq('id', pId);
    console.log("Res Yape / Plin:", res.error);
    
    let res2 = await supabase.from('pagos').update({metodo: 'Yape'}).eq('id', pId);
    console.log("Res Yape:", res2.error);
    
    let res3 = await supabase.from('pagos').update({metodo: 'Plin'}).eq('id', pId);
    console.log("Res Plin:", res3.error);
}
check();
