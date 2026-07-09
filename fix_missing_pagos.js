const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('js/supabase.js', 'utf8');
const urlMatch = envContent.match(/const supabaseUrl = '(.*?)';/);
const keyMatch = envContent.match(/const supabaseKey = '(.*?)';/);

if (urlMatch && keyMatch) {
    const supabase = createClient(urlMatch[1], keyMatch[1]);
    
    async function fix() {
        try {
            // Obtener todas las citas
            const { data: citas, error: citasError } = await supabase.from('citas').select('id, paciente_id, tratamiento, consultorio, estado').neq('estado', 'Cancelada');
            if (citasError) throw citasError;

            // Obtener todos los pagos
            const { data: pagos, error: pagosError } = await supabase.from('pagos').select('cita_id');
            if (pagosError) throw pagosError;
            
            const pagosCitaIds = new Set(pagos.map(p => p.cita_id));
            
            // Citas sin pago
            const missing = citas.filter(c => !pagosCitaIds.has(c.id));
            console.log(`Found ${missing.length} citas without payment.`);
            
            for (let cita of missing) {
                const isPackage = cita.tratamiento && cita.tratamiento.includes('Continuación');
                const monto = isPackage ? 0 : 50; // Just default to 50 if not package, or we can look up service price.
                const estado = isPackage ? 'Completado' : 'Pendiente';
                const metodo = isPackage ? 'Paquete' : 'Efectivo';
                
                const { error: insError } = await supabase.from('pagos').insert([{
                    paciente_id: cita.paciente_id,
                    cita_id: cita.id,
                    monto: monto,
                    estado: estado,
                    metodo: metodo,
                    fecha: new Date().toISOString(),
                    descripcion: cita.tratamiento || 'Procedimiento Médico',
                    medico_id: cita.consultorio
                }]);
                if (insError) {
                    console.error("Error inserting for cita", cita.id, insError);
                } else {
                    console.log(`Inserted payment for cita ${cita.id} (${cita.tratamiento})`);
                }
            }
        } catch(e) { console.error(e); }
    }
    fix().then(() => console.log("Done"));
}
