const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://scubijqoifshvyotrlgx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjdWJpanFvaWZzaHZ5b3RybGd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExODczMjcsImV4cCI6MjA5Njc2MzMyN30.w0DalpbHcDboZooz9RtoGcNiYfGe51wx5JSEvqYSXn0';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const pid = '83ccb703-1620-485b-a917-3c44f5130cc3';

    console.log("Deleting history for Augusto Black...");

    // First delete from pagos
    const { error: errPagos } = await supabase.from('pagos').delete().eq('paciente_id', pid);
    if (errPagos) console.error("Error deleting pagos:", errPagos);
    
    // Then delete from citas
    const { error: errCitas } = await supabase.from('citas').delete().eq('paciente_id', pid);
    if (errCitas) console.error("Error deleting citas:", errCitas);
    
    console.log("Successfully deleted history.");
}

run();
