const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('js/supabase.js', 'utf8');
const urlMatch = envContent.match(/const supabaseUrl = '(.*?)';/);
const keyMatch = envContent.match(/const supabaseKey = '(.*?)';/);

if (urlMatch && keyMatch) {
    const supabase = createClient(urlMatch[1], keyMatch[1]);
    
    async function check() {
        try {
            const { data: pagos, error } = await supabase.from('pagos').select('*');
            if (error) console.error(error);
            console.log("All pagos:", pagos.map(p => ({ id: p.id, cita_id: p.cita_id, descripcion: p.descripcion, estado: p.estado })));
        } catch(e) { console.error(e); }
    }
    check().then(() => console.log("Done"));
}
