const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://scubijqoifshvyotrlgx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjdWJpanFvaWZzaHZ5b3RybGd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExODczMjcsImV4cCI6MjA5Njc2MzMyN30.w0DalpbHcDboZooz9RtoGcNiYfGe51wx5JSEvqYSXn0';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data: servicios } = await supabase.from('servicios_medicos').select('*');
    console.log("Servicios médicos:", servicios);
    
    // update all "Láser" to "Fisioterapia" ? We can wait and ask, or just update to something else.
    // the user said: "revisar que mas poaceitnes no tengan fictricios y usen tratamientos ya establecidos"
    
    // Let's get ALL unique tratamientos used in citas
    const { data: citas } = await supabase.from('citas').select('tratamiento');
    const unique = [...new Set(citas.map(c => c.tratamiento))];
    console.log("Tratamientos en citas:", unique);
}
check();
