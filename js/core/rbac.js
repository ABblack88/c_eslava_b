// js/core/rbac.js
// Responsabilidad única: Reglas de acceso basadas en roles y modificación de la interfaz según permisos

class RBACService {
    static getRoleFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('role') || 'developer';
    }

    static getAccessLevel(role) {
        if (['developer', 'root'].includes(role)) return 1;
        if (['admin'].includes(role)) return 2;
        if (['cajero'].includes(role)) return 3;
        if (['medico', 'tratante', 'asistente', 'especialista'].includes(role)) return 4;
        return 4; // Default to most restricted
    }

    static applyUI_Restrictions() {
        const role = this.getRoleFromURL();
        const level = this.getAccessLevel(role);
        let restrictedHrefs = [];

        if (level >= 3) {
            restrictedHrefs.push('gestion_pacientes_', 'pagos_facturacion_', 'master_root');
            const adminSettings = document.getElementById("admin-settings-section");
            if (adminSettings) adminSettings.style.display = 'none';

            const btnCobrarInmediato = document.getElementById("btn-cobrar-inmediato");
            if (btnCobrarInmediato) btnCobrarInmediato.style.display = 'none';
        }
        
        if (level === 4) {
            restrictedHrefs.push('tratamientos_', 'cobrar_');
        }

        if (restrictedHrefs.length > 0) {
            document.querySelectorAll('a').forEach(link => {
                const href = link.getAttribute('href') || '';
                if (restrictedHrefs.some(r => href.includes(r))) {
                    link.style.display = 'none';
                }
            });

            const resumenCuentaCard = document.getElementById("resumen-cuenta-card");
            if (resumenCuentaCard) resumenCuentaCard.style.display = 'none';
        }

        // Panel Master injection for level 1
        if (level === 1) {
            const navBar = document.querySelector('nav');
            if (navBar && !document.getElementById('nav-link-master')) {
                const masterLink = document.createElement('a');
                masterLink.id = 'nav-link-master';
                masterLink.className = 'flex items-center px-4 py-3 font-body-md text-body-md text-error hover:bg-error/10 transition-colors duration-200 group mt-auto border-t border-surface-container mt-4';
                masterLink.href = `master_root.html?role=${role}`;
                masterLink.innerHTML = `
                    <span class="material-symbols-outlined mr-3">admin_panel_settings</span>
                    <span class="font-bold">Panel Master (DB)</span>
                `;
                navBar.appendChild(masterLink);
            }
        }

        // Dashboard specific modifications
        const financialCard = document.getElementById("financial-insight-card");
        if (financialCard && level === 4) {
            financialCard.innerHTML = `
                <div class="relative z-10 flex flex-col justify-between h-full">
                    <div>
                        <h3 class="font-headline-md text-headline-md text-on-surface mb-2">Resumen Clínico Semanal</h3>
                        <p class="text-on-surface-variant font-body-md mb-6">Estadísticas operativas de terapias</p>
                    </div>
                    <div class="grid grid-cols-4 gap-4 text-center">
                        <div class="bg-primary/5 rounded-2xl p-4 border border-primary/10">
                            <span class="material-symbols-outlined text-primary text-3xl mb-1">groups</span>
                            <div class="text-2xl font-bold text-on-surface">48</div>
                            <div class="text-xs text-on-surface-variant">Atendidos esta semana</div>
                        </div>
                        <div class="bg-primary/5 rounded-2xl p-4 border border-primary/10">
                            <span class="material-symbols-outlined text-primary text-3xl mb-1">clinical_notes</span>
                            <div class="text-2xl font-bold text-on-surface">12</div>
                            <div class="text-xs text-on-surface-variant">Sesiones Pendientes</div>
                        </div>
                        <div class="bg-primary/5 rounded-2xl p-4 border border-primary/10">
                            <span class="material-symbols-outlined text-primary text-3xl mb-1">healing</span>
                            <div class="text-2xl font-bold text-on-surface">60%</div>
                            <div class="text-xs text-on-surface-variant">Ondas de Choque</div>
                        </div>
                        <div class="bg-primary/5 rounded-2xl p-4 border border-primary/10">
                            <span class="material-symbols-outlined text-primary text-3xl mb-1">thumb_up</span>
                            <div class="text-2xl font-bold text-on-surface">94%</div>
                            <div class="text-xs text-on-surface-variant">Tasa de Recuperación</div>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    static preserveRoleInLinks() {
        const role = this.getRoleFromURL();
        if (!role) return;
        
        document.querySelectorAll('a').forEach(link => {
            const href = link.getAttribute('href');
            if (href && !href.startsWith('http') && !href.startsWith('#')) {
                if (!href.includes('role=')) {
                    const separator = href.includes('?') ? '&' : '?';
                    link.setAttribute('href', `${href}${separator}role=${role}`);
                }
            }
        });
    }

    static async displayCurrentUser() {
        try {
            if (typeof window.db === 'undefined') return;
            
            const { data: { session }, error } = await window.db.auth.getSession();
            if (error || !session) return;
            
            const user = session.user;
            const { data: profile } = await window.db.from('profiles').select('*').eq('id', user.id).single();
            
            const name = profile?.full_name || user.email.split('@')[0];
            const realRole = profile?.role || 'Usuario';
            const simulatedRole = this.getRoleFromURL() || realRole;
            
            const desktopHeaderRight = document.querySelector('header div.flex.items-center.gap-6');
            if (desktopHeaderRight) {
                const existing = document.getElementById('global-desktop-user-widget');
                if (existing) existing.remove();
                
                const isRealAdmin = ['root', 'admin'].includes(realRole);
                let simulatorHtml = '';
                
                const rolesMap = {
                    'root': 'Root (Propietario)',
                    'admin': 'Administrador',
                    'cajero': 'Cajero',
                    'medico': 'Médico',
                    'especialista': 'Especialista',
                    'asistente': 'Asistente',
                    'developer': 'Desarrollador'
                };
                const displayRole = rolesMap[simulatedRole] || simulatedRole;
                
                if (isRealAdmin) {
                    // Create global function for changing role safely
                    window.simularRol = function(val) {
                        const u = new URL(window.location.href);
                        u.searchParams.set('role', val);
                        window.location.assign(u.toString());
                    };
                    
                    const roles = [
                        {val: 'root', label: 'Root (Propietario)'},
                        {val: 'admin', label: 'Administrador'},
                        {val: 'cajero', label: 'Cajero'},
                        {val: 'medico', label: 'Médico'},
                        {val: 'especialista', label: 'Especialista'},
                        {val: 'asistente', label: 'Asistente'}
                    ];
                    const optionsHtml = roles.map(r => `<option value="${r.val}" ${r.val === simulatedRole ? 'selected' : ''}>Simular: ${r.label}</option>`).join('');
                    simulatorHtml = `
                        <select onchange="window.simularRol(this.value)" class="ml-4 px-2 py-1 text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 rounded-md outline-none cursor-pointer">
                            ${optionsHtml}
                        </select>
                    `;
                }

                const widget = document.createElement('div');
                widget.id = 'global-desktop-user-widget';
                widget.className = 'flex items-center gap-3 pl-6 border-l border-outline-variant/30 ml-4';
                widget.innerHTML = `
                    ${simulatorHtml}
                    <div class="flex flex-col text-right">
                        <span class="font-bold text-sm text-on-surface leading-tight">${name}</span>
                        <span class="text-[10px] uppercase tracking-wider text-primary font-bold">${displayRole}</span>
                    </div>
                    <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shadow-sm">
                        ${name.charAt(0).toUpperCase()}
                    </div>
                `;
                desktopHeaderRight.appendChild(widget);
            }
            
            const mobileDrawerProfile = document.querySelector('nav.fixed.left-0.top-0 div.flex.items-center.gap-4');
            if (mobileDrawerProfile) {
                mobileDrawerProfile.innerHTML = `
                    <div class="w-12 h-12 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center overflow-hidden shrink-0 font-bold text-xl">
                        ${name.charAt(0).toUpperCase()}
                    </div>
                    <div class="flex flex-col">
                        <span class="font-label-sm text-label-sm text-primary font-bold truncate max-w-[150px]">${name}</span>
                        <div class="flex items-center gap-2 mt-0.5">
                            <span class="text-[10px] text-outline uppercase tracking-wider font-semibold">${typeof displayRole !== 'undefined' ? displayRole : simulatedRole}</span>
                            ${typeof simulatorHtml !== 'undefined' ? simulatorHtml : ''}
                        </div>
                    </div>
                `;
            }
            
            const accountHeaderName = document.querySelector('div.flex.items-center.gap-4.py-2 p.font-bold.text-on-surface');
            if (accountHeaderName && accountHeaderName.textContent.includes('Eslava')) {
                 accountHeaderName.textContent = name;
                 if (accountHeaderName.nextElementSibling) {
                     accountHeaderName.nextElementSibling.textContent = typeof displayRole !== 'undefined' ? displayRole : simulatedRole;
                 }
            }
        } catch (e) {
            console.error("Error displaying current user:", e);
        }
    }

    static handleDeviceRedirection() {
        const path = window.location.pathname;
        if (path.includes('index.html') || path.includes('master_root.html') || path === '/' || path.endsWith('/c_eslava_b/')) return;
        
        const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
        const isDesktopPage = path.includes('_desktop');
        const isMobilePage = path.includes('_mobile');

        if (isMobileDevice && isDesktopPage) {
            window.location.replace(window.location.href.replace('_desktop', '_mobile'));
        } else if (!isMobileDevice && isMobilePage) {
            window.location.replace(window.location.href.replace('_mobile', '_desktop'));
        }
    }

    static init() {
        // Prevent FOUC by injecting CSS to hide restricted links immediately
        const role = this.getRoleFromURL();
        const level = this.getAccessLevel(role);
        let restrictedHrefs = [];

        if (level >= 3) {
            restrictedHrefs.push('gestion_pacientes_', 'pagos_facturacion_', 'master_root');
        }
        if (level === 4) {
            restrictedHrefs.push('tratamientos_', 'cobrar_');
        }

        const foucStyle = document.createElement('style');
        foucStyle.id = 'rbac-fouc-style';
        let cssRules = `aside nav a, nav.fixed.bottom-0 a { opacity: 0; transition: none !important; }`;
        if (restrictedHrefs.length > 0) {
            cssRules += `\n` + restrictedHrefs.map(r => `a[href*="${r}"] { display: none !important; }`).join('\n');
            cssRules += `\n#resumen-cuenta-card { display: none !important; }`;
        }
        if (level >= 4) {
            cssRules += `\n#ventas-totales, #ingresos-section, #metodos-pago-section { display: none !important; }`;
        }
        if (level >= 3) {
            cssRules += `\n#admin-settings-section, #btn-cobrar-inmediato { display: none !important; }`;
        }
        foucStyle.innerHTML = cssRules;
        document.head.appendChild(foucStyle);

        this.handleDeviceRedirection();
        document.addEventListener('DOMContentLoaded', () => {
            this.applyUI_Restrictions();
            this.preserveRoleInLinks();
            this.displayCurrentUser();
            
            // Reveal links after applying restrictions
            const styleEl = document.getElementById('rbac-fouc-style');
            if (styleEl) styleEl.remove();
        });
        
        window.addEventListener('pageshow', (event) => {
            if (event.persisted) {
                window.location.reload();
            }
        });
    }
}

window.RBAC = RBACService;
RBACService.init();
