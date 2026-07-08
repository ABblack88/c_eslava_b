const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://scubijqoifshvyotrlgx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjdWJpanFvaWZzaHZ5b3RybGd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExODczMjcsImV4cCI6MjA5Njc2MzMyN30.w0DalpbHcDboZooz9RtoGcNiYfGe51wx5JSEvqYSXn0';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const idsToDelete = [
        'f6c0febf-35df-4bce-8659-d207b289c64e' // Carlos Eslava Test
    ];

    console.log("Deleting Carlos Eslava Test...");

    // First delete from pagos
    for (const pid of idsToDelete) {
        const { error } = await supabase.from('pagos').delete().eq('paciente_id', pid);
        if (error) console.error("Error deleting pagos for", pid, error);
    }
    
    // Then delete from citas
    for (const pid of idsToDelete) {
        const { error } = await supabase.from('citas').delete().eq('paciente_id', pid);
        if (error) console.error("Error deleting citas for", pid, error);
    }
    
    // Finally delete from pacientes
    const { error } = await supabase.from('pacientes').delete().in('id', idsToDelete);
    if (error) {
        console.error("Error deleting pacientes:", error);
    } else {
        console.log("Successfully deleted Carlos Eslava Test.");
    }
    
    console.log("Remaining patients:");
    const { data: remaining } = await supabase.from('pacientes').select('*');
    remaining.forEach(p => console.log(`${p.id} | ${p.nombre}`));
}

run();
