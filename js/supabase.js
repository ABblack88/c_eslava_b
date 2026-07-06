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
                         window.location.pathname.endsWith('/') || 
                         window.location.pathname === '';
    
    // Función centralizada para manejar la sesión
    const handleSession = (session) => {
        if (!session && !isPublicPage) {
            console.error('Auth Guard: No se encontró sesión.');
            const rawToken = localStorage.getItem('sb-scubijqoifshvyotrlgx-auth-token');
            if (!rawToken) {
                alert('Sesión expirada o no iniciada. Redirigiendo al inicio...');
                window.location.replace('../index.html');
            } else {
                console.warn('Hay token en localStorage pero la sesión es nula.');
                // Forzar lectura del token
                try {
                    const parsed = JSON.parse(rawToken);
                    if (parsed && parsed.access_token) {
                        console.log('Token recuperado manualmente. No redirigimos aún.');
                        return;
                    }
                } catch(e) {}
                alert('Tu sesión es inválida. Redirigiendo al inicio...');
                window.location.replace('../index.html');
            }
        } else if (session && !isPublicPage) {
            const userRole = session.user?.user_metadata?.role || 'admin';
            const urlParams = new URLSearchParams(window.location.search);
            const urlRole = urlParams.get('role');
            
            if (!urlRole) {
                urlParams.set('role', userRole);
                window.location.search = urlParams.toString();
            }
        }
    };

    try {
        // 1. Revisar estado inicial
        const { data, error } = await supabaseClient.auth.getSession();
        if (error) console.error("Error al obtener sesión:", error);
        
        handleSession(data.session);

        // 2. Suscribirse a cambios de sesión para reaccionar inmediatamente
        supabaseClient.auth.onAuthStateChange((event, session) => {
            console.log("Auth event:", event);
            if (event === 'SIGNED_OUT' && !isPublicPage) {
                window.location.replace('../index.html');
            } else if (event === 'SIGNED_IN') {
                handleSession(session);
            }
        });

    } catch (e) {
        console.error('Error de autenticación:', e);
    }
});
