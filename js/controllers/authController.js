// js/controllers/authController.js
// Responsabilidad única: Conectar los eventos de la UI de login con el servicio de Auth

class AuthController {
    static init() {
        window.togglePassword = this.togglePassword.bind(this);
        window.switchTab = this.switchTab.bind(this);
        window.handleResetPassword = this.handleResetPassword.bind(this);
        window.handleLogin = this.handleLogin.bind(this);
        window.handleSignup = this.handleSignup.bind(this);
    }

    static togglePassword(inputId, iconId) {
        const input = document.getElementById(inputId);
        const icon = document.getElementById(iconId);
        if (input.type === 'password') {
            input.type = 'text';
            icon.textContent = 'visibility_off';
        } else {
            input.type = 'password';
            icon.textContent = 'visibility';
        }
    }

    static switchTab(tab) {
        const loginBtn = document.getElementById('tab-login');
        const signupBtn = document.getElementById('tab-signup');
        const loginForm = document.getElementById('form-login');
        const signupForm = document.getElementById('form-signup');
        const errorMsg = document.getElementById('error-message');

        if(errorMsg) errorMsg.classList.add('hidden');

        if (tab === 'login') {
            loginBtn.classList.add('text-primary', 'border-primary');
            loginBtn.classList.remove('text-slate-500', 'border-transparent');
            signupBtn.classList.remove('text-primary', 'border-primary');
            signupBtn.classList.add('text-slate-500', 'border-transparent');
            loginForm.classList.remove('hidden');
            signupForm.classList.add('hidden');
        } else {
            signupBtn.classList.add('text-primary', 'border-primary');
            signupBtn.classList.remove('text-slate-500', 'border-transparent');
            loginBtn.classList.remove('text-primary', 'border-primary');
            loginBtn.classList.add('text-slate-500', 'border-transparent');
            signupForm.classList.remove('hidden');
            loginForm.classList.add('hidden');
        }
    }

    static showError(message) {
        const errorMsg = document.getElementById('error-message');
        errorMsg.className = 'bg-red-50 text-red-600 border border-red-200 p-3 text-xs mt-4';
        errorMsg.textContent = message;
        errorMsg.classList.remove('hidden');
    }

    static showSuccess(message, isHtml = false) {
        const errorMsg = document.getElementById('error-message');
        errorMsg.className = 'bg-blue-50 text-blue-700 border border-blue-200 p-3 text-xs mt-4 flex items-start gap-2';
        if (isHtml) {
            errorMsg.innerHTML = message;
        } else {
            errorMsg.textContent = message;
        }
        errorMsg.classList.remove('hidden');
    }

    static async handleResetPassword(event) {
        event.preventDefault();
        const email = document.getElementById('login-user').value;
        if (!email) {
            this.showError("Por favor, ingresa tu correo electrónico arriba para restablecer la contraseña.");
            return;
        }
        try {
            const { error } = await window.db.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + '/html/calendario_dashboard_desktop.html'
            });
            if (error) throw error;
            const errorMsg = document.getElementById('error-message');
            errorMsg.className = 'bg-green-50 text-green-700 border border-green-200 p-3 text-xs mt-4';
            errorMsg.textContent = "Se ha enviado un enlace de recuperación a tu correo electrónico.";
            errorMsg.classList.remove('hidden');
        } catch (error) {
            this.showError("Error al restablecer contraseña: " + error.message);
        }
    }

    static async handleLogin(event) {
        event.preventDefault();
        const email = document.getElementById('login-user').value;
        const pass = document.getElementById('login-pass').value;

        const submitBtn = event.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Ingresando...';

        try {
            const { data, error } = await window.db.auth.signInWithPassword({
                email: email,
                password: pass,
            });

            if (error) throw error;
            if (data.user && !data.session) throw new Error("Por favor, verifica tu correo electrónico antes de iniciar sesión.");
            
            if (data.user && data.session) {
                const { data: profile } = await window.db.from('profiles').select('status, role').eq('id', data.user.id).single();
                let status = profile?.status || data.user.user_metadata?.status;
                
                if (email === 'qblackx@gmail.com' && status === 'pendiente') {
                    await window.db.from('profiles').update({ status: 'aprobado', role: 'root' }).eq('id', data.user.id);
                    status = 'aprobado';
                }

                if (status === 'pendiente') {
                    await window.db.auth.signOut();
                    throw new Error("Tu cuenta está pendiente de aprobación por un administrador.");
                }
                
                const role = profile?.role || data.user.user_metadata?.role || 'asistente';
                localStorage.setItem('c-eslava-auth-token', JSON.stringify(data.session));
                localStorage.setItem('c-eslava-real-role', role);
                
                setTimeout(() => {
                    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
                    const targetPage = isMobile ? 'html/calendario_dashboard_mobile.html' : 'html/calendario_dashboard_desktop.html';
                    window.location.href = `${targetPage}?role=${role}`;
                }, 500);
            }
        } catch (error) {
            this.showError("Credenciales incorrectas o error de red: " + error.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Acceder al sistema';
        }
    }

    static async handleSignup(event) {
        event.preventDefault();
        const name = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const pass = document.getElementById('signup-pass').value;
        const role = 'pendiente'; // Default to pending until admin assigns a role

        const submitBtn = event.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Creando...';

        try {
            const { data, error } = await window.db.auth.signUp({
                email: email,
                password: pass,
                options: {
                    data: { full_name: name, role: role, status: 'pendiente' }
                }
            });

            if (error) throw error;
            if (!data || !data.user) {
                throw new Error("No se pudo crear el usuario. Es posible que el correo electrónico ya esté registrado.");
            }

            if (data.user) {
                const initialStatus = email === 'qblackx@gmail.com' ? 'aprobado' : 'pendiente';
                const initialRole = email === 'qblackx@gmail.com' ? 'root' : role;
                await window.db.from('profiles').update({ status: initialStatus, role: initialRole }).eq('id', data.user.id);
                
                let message = '';
                if (email === 'qblackx@gmail.com') {
                    message = '<span class="material-symbols-outlined text-[18px]">check_circle</span> <span><strong>Cuenta de desarrollador creada.</strong> Por favor, verifica tu correo e inicia sesión.</span>';
                } else {
                    message = '<span class="material-symbols-outlined text-[18px]">mark_email_unread</span> <span><strong>¡Casi listo!</strong> Te hemos enviado un correo electrónico de confirmación. Por favor, revisa tu bandeja de entrada y verifica tu cuenta. Luego de eso, el administrador aprobará tu acceso.</span>';
                }
                this.showSuccess(message, true);
                document.getElementById('form-signup').reset();
            }
        } catch(error) {
            this.showError("Error al crear la cuenta: " + error.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Crear cuenta';
        }
    }
}

AuthController.init();
