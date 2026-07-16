const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://scubijqoifshvyotrlgx.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjdWJpanFvaWZzaHZ5b3RybGd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExODczMjcsImV4cCI6MjA5Njc2MzMyN30.w0DalpbHcDboZooz9RtoGcNiYfGe51wx5JSEvqYSXn0');
async function run() {
    const { data, error } = await supabase.from('citas').select('*, pacientes(*)').eq('id', 'cae474d0-b683-4ff2-b983-005e92b43199').single();
    console.log(JSON.stringify({data, error}, null, 2));
}
run();
