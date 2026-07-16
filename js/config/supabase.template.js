// js/config/supabase.template.js
// Plantilla para la configuración de Supabase. 
// Cloudflare Pages reemplazará las variables durante el build.

const supabaseUrl = '{{SUPABASE_URL}}';
const supabaseKey = '{{SUPABASE_ANON_KEY}}';

const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: true,
        storageKey: 'c-eslava-auth-token',
        storage: window.localStorage
    }
});

// Exportar globalmente
window.supabaseClient = supabaseClient;
window.db = supabaseClient; // Abstracción preferida
