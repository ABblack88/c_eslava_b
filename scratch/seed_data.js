const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://scubijqoifshvyotrlgx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjdWJpanFvaWZzaHZ5b3RybGd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExODczMjcsImV4cCI6MjA5Njc2MzMyN30.w0DalpbHcDboZooz9RtoGcNiYfGe51wx5JSEvqYSXn0';
const supabase = createClient(supabaseUrl, supabaseKey);

const nombres = [
    "Lucía Fernández", "Mateo Silva", "Valeria Castro", "Diego Morales", 
    "Sofía Rojas", "Joaquín Vargas", "Camila Ortiz", "Santiago Ríos", 
    "Martina Núñez", "Sebastián Peña", "Elena Cruz", "Nicolás Herrera", 
    "Isabella Domínguez", "Emilio Cabrera", "Paula Navarro"
];

const tratamientos = [
    "Evaluación Física", "Descarga Muscular", "Ondas de Choque", 
    "Punción Seca", "Láser", "Sesiones x5 (Continuación)", "Sesiones x10 (Continuación)", "Terapia Física"
];

const estados = ["Pendiente", "Confirmada", "Por Confirmar"];
const horas = ["09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00", "18:00"];

async function run() {
    console.log("Seeding 15 pacientes...");
    
    // Insert pacientes
    const pacientesToInsert = nombres.map((nombre, i) => ({
        nombre: nombre,
        email: `${nombre.toLowerCase().replace(/ /g, '.')}@ejemplo.com`,
        telefono: `999${Math.floor(100000 + Math.random() * 900000)}`
    }));

    const { data: newPacientes, error: errPac } = await supabase
        .from('pacientes')
        .insert(pacientesToInsert)
        .select();

    if (errPac || !newPacientes) {
        console.error("Error inserting pacientes:", errPac);
        return;
    }

    console.log(`Insertados ${newPacientes.length} pacientes.`);

    console.log("Seeding 30 citas...");
    
    // Generate dates for the next 7 days, starting tomorrow
    const today = new Date();
    const dates = [];
    for (let i = 1; i <= 7; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        // format YYYY-MM-DD
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        dates.push(`${yyyy}-${mm}-${dd}`);
    }

    const citasToInsert = [];
    for (let i = 0; i < 30; i++) {
        const paciente = newPacientes[Math.floor(Math.random() * newPacientes.length)];
        const fecha = dates[Math.floor(Math.random() * dates.length)];
        const hora = horas[Math.floor(Math.random() * horas.length)];
        const tratamiento = tratamientos[Math.floor(Math.random() * tratamientos.length)];
        const estado = estados[Math.floor(Math.random() * estados.length)];
        
        citasToInsert.push({
            paciente_id: paciente.id,
            fecha: fecha,
            hora: hora,
            tratamiento: tratamiento,
            estado: estado,
            doctor: 'Dr. Alejandro Eslava',
            observaciones: 'Cita de prueba programada automáticamente.'
        });
    }

    const { error: errCitas } = await supabase.from('citas').insert(citasToInsert);
    if (errCitas) {
        console.error("Error inserting citas:", errCitas);
        return;
    }

    console.log("Successfully seeded 30 citas.");
}

run();
