const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://scubijqoifshvyotrlgx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjdWJpanFvaWZzaHZ5b3RybGd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExODczMjcsImV4cCI6MjA5Njc2MzMyN30.w0DalpbHcDboZooz9RtoGcNiYfGe51wx5JSEvqYSXn0';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data: pagos, error } = await supabase.from('pagos').select('*').limit(5);
    if (error) {
        console.error("Error:", error);
        return;
    }
    console.log("Pagos:");
    pagos.forEach(p => console.log(`${p.id} | ${p.paciente_id} | ${p.descripcion} | ${p.monto}`));
}
run();
