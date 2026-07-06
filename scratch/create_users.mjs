import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://scubijqoifshvyotrlgx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjdWJpanFvaWZzaHZ5b3RybGd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExODczMjcsImV4cCI6MjA5Njc2MzMyN30.w0DalpbHcDboZooz9RtoGcNiYfGe51wx5JSEvqYSXn0';
const supabase = createClient(supabaseUrl, supabaseKey);

const users = [
    { email: 'asis@test.com', pass: '123456', role: 'asistente', name: 'Asistente Prueba' },
    { email: 'med@test.com', pass: '123456', role: 'medico', name: 'Medico Prueba' },
    { email: 'admin@test.com', pass: '123456', role: 'admin', name: 'Admin Prueba' }
];

async function createUsers() {
    for (const u of users) {
        console.log(`Intentando registrar: ${u.email}...`);
        const { data, error } = await supabase.auth.signUp({
            email: u.email,
            password: u.pass,
            options: {
                data: {
                    full_name: u.name,
                    role: u.role,
                    status: 'aprobado' // Bypass de aprobación para prueba
                }
            }
        });
        
        if (error) {
            console.error('Error con', u.email, error.message);
        } else {
            console.log('Creado exitosamente:', u.email);
            // Intentar actualizar la tabla profiles (puede fallar si no hay triggers/RLS)
            if (data?.user?.id) {
                const { error: profileErr } = await supabase.from('profiles').update({ status: 'aprobado', role: u.role }).eq('id', data.user.id);
                if (profileErr) {
                    console.log('No se pudo auto-aprobar en profile (se usará metadata):', profileErr.message);
                } else {
                    console.log('Aprobado en tabla profiles:', u.email);
                }
            }
        }
    }
}

createUsers();
