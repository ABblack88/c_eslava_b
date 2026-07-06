// Configuración de Supabase - CLIENTE REAL
const supabaseUrl = 'https://scubijqoifshvyotrlgx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjdWJpanFvaWZzaHZ5b3RybGd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExODczMjcsImV4cCI6MjA5Njc2MzMyN30.w0DalpbHcDboZooz9RtoGcNiYfGe51wx5JSEvqYSXn0';

// Initialize Supabase client
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

// Exportar globalmente
window.supabaseClient = supabaseClient;

// Auth Guard Integrado
document.addEventListener("DOMContentLoaded", async () => {
    const isPublicPage = window.location.pathname.includes('index.html') || 
                         window.location.pathname.endsWith('/');
    
    try {
        const { data, error } = await supabaseClient.auth.getSession();
        
        if (!data.session && !isPublicPage) {
            // No hay sesión en página privada. Redirigir a login.
            window.location.href = '../index.html';
        } else if (data.session && !isPublicPage) {
            // Si hay sesión en página privada, asegurar que exista el rol en la URL
            const userRole = data.session.user?.user_metadata?.role || 'admin';
            const urlParams = new URLSearchParams(window.location.search);
            const urlRole = urlParams.get('role');
            
            if (!urlRole) {
                urlParams.set('role', userRole);
                window.location.search = urlParams.toString();
            }
        }
    } catch (e) {
        console.error('Error de autenticación:', e);
    }
});
