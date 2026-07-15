// js/core/auth.js
// Responsabilidad única: Verificar la sesión actual y manejar la autenticación base

class AuthService {
    static async getSession() {
        if (typeof window.db === 'undefined') return null;
        try {
            const { data, error } = await window.db.auth.getSession();
            if (error) throw error;
            return data.session;
        } catch (e) {
            console.error("Error al obtener sesión:", e);
            return null;
        }
    }

    static handleSession(session) {
        const path = window.location.pathname;
        const isPublicPage = path.includes('index.html') || path.endsWith('/') || path === '';

        if (!session && !isPublicPage) {
            console.error('Auth Guard: No se encontró sesión activa.');
            // Only redirect if there's no auth token in local storage at all to avoid flashes
            let foundToken = false;
            for (let i = 0; i < localStorage.length; i++) {
                if (localStorage.key(i).includes('c-eslava-auth-token')) foundToken = true;
            }
            if (!foundToken) {
                window.location.replace('../index.html');
            }
        } else if (session && !isPublicPage) {
            const userRole = session.user?.user_metadata?.role || 'admin';
            const urlParams = new URLSearchParams(window.location.search);
            if (!urlParams.get('role')) {
                urlParams.set('role', userRole);
                window.history.replaceState(null, '', '?' + urlParams.toString());
            }
        }
    }

    static initAuthGuard() {
        document.addEventListener("DOMContentLoaded", async () => {
            const session = await this.getSession();
            this.handleSession(session);

            if (typeof window.db !== 'undefined') {
                window.db.auth.onAuthStateChange((event, newSession) => {
                    const isPublicPage = window.location.pathname.includes('index.html') || window.location.pathname.endsWith('/') || window.location.pathname === '';
                    if (event === 'SIGNED_OUT' && !isPublicPage) {
                        window.location.replace('../index.html');
                    } else if (event === 'SIGNED_IN') {
                        this.handleSession(newSession);
                    }
                });
            }
        });
    }
}

window.Auth = AuthService;
AuthService.initAuthGuard();
