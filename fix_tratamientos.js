const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://scubijqoifshvyotrlgx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjdWJpanFvaWZzaHZ5b3RybGd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExODczMjcsImV4cCI6MjA5Njc2MzMyN30.w0DalpbHcDboZooz9RtoGcNiYfGe51wx5JSEvqYSXn0';
const supabase = createClient(supabaseUrl, supabaseKey);

async function fix() {
    const valid = ['Punción Seca', 'Evaluación Física', 'Sesiones x5', 'Descarga Muscular', 'Sesiones x5 (Continuación)'];
    
    // Fix Citas
    const { data: citas } = await supabase.from('citas').select('*');
    for (const c of citas) {
        if (!valid.includes(c.tratamiento)) {
            let newTrat = 'Punción Seca';
            if (c.tratamiento === 'Láser') newTrat = 'Punción Seca';
            if (c.tratamiento === 'Ondas de Choque') newTrat = 'Evaluación Física';
            if (c.tratamiento === 'Terapia Física') newTrat = 'Descarga Muscular';
            if (c.tratamiento === 'Sesiones x10 (Continuación)') newTrat = 'Sesiones x5 (Continuación)';
            
            console.log(`Actualizando cita ${c.id}: ${c.tratamiento} -> ${newTrat}`);
            await supabase.from('citas').update({ tratamiento: newTrat }).eq('id', c.id);
        }
    }

    // Fix Pagos
    const { data: pagos } = await supabase.from('pagos').select('*');
    for (const p of pagos) {
        if (p.descripcion && !valid.includes(p.descripcion) && p.descripcion !== 'Pago de paquete' && p.descripcion !== 'Pago de deuda') {
            let newDesc = 'Punción Seca';
            if (p.descripcion === 'Láser') newDesc = 'Punción Seca';
            if (p.descripcion === 'Ondas de Choque') newDesc = 'Evaluación Física';
            if (p.descripcion === 'Terapia Física') newDesc = 'Descarga Muscular';
            if (p.descripcion === 'Sesiones x10 (Continuación)') newDesc = 'Sesiones x5 (Continuación)';
            
            console.log(`Actualizando pago ${p.id}: ${p.descripcion} -> ${newDesc}`);
            await supabase.from('pagos').update({ descripcion: newDesc }).eq('id', p.id);
        }
    }
}
fix();
