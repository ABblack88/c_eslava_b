const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('js/supabase.js', 'utf8');
const urlMatch = envContent.match(/const supabaseUrl = '(.*?)';/);
const keyMatch = envContent.match(/const supabaseKey = '(.*?)';/);

if (urlMatch && keyMatch) {
    const supabase = createClient(urlMatch[1], keyMatch[1]);
    
    async function check() {
        try {
            const { data, error } = await supabase.from('citas').select('id, paciente_id, pacientes(nombre), fecha, tratamiento').eq('estado', 'Completada');
            if (error) console.error(error);
            
            for (let cita of data || []) {
                const { data: pago } = await supabase.from('pagos').select('*').eq('cita_id', cita.id);
                console.log("CITA ID:", cita.id, "Pago for", cita.pacientes?.nombre, "-", cita.tratamiento, ":", pago.map(p => ({ id: p.id, monto: p.monto, estado: p.estado })));
            }
        } catch(e) { console.error(e); }
    }
    check().then(() => console.log("Done"));
}
