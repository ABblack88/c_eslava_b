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
            
            // Debugging total de localStorage en pantalla
            let lsDump = '';
            let foundToken = null;
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.includes('auth-token')) foundToken = localStorage.getItem(key);
                lsDump += key + ': ' + localStorage.getItem(key).substring(0, 30) + '...<br>';
            }

            if (!foundToken) {
                // Dibujar en pantalla para depurar
                document.body.innerHTML += `
                <div style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(255,0,0,0.9);color:white;z-index:999999;padding:20px;overflow:auto;">
                    <h2>ERROR CRÍTICO: No se guardó la sesión</h2>
                    <p>El almacenamiento local del navegador está vacío o el login no guardó el token.</p>
                    <h3>Contenido de LocalStorage:</h3>
                    <p style="font-family:monospace; font-size:12px;">${lsDump || 'Vacio!'}</p>
                    <br><br>
                    <button onclick="window.location.href='../index.html'" style="padding:10px 20px; background:white; color:red; font-weight:bold; border-radius:8px;">Volver al Login</button>
                </div>
                `;
                return;
            } else {
                console.warn('Hay token pero la sesión es nula. Forzando paso.');
                return; // Let the app run so we don't block them if there's a token
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
