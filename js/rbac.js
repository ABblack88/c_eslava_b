// rbac.js - Global Role-Based Access Control & Navigation Logic

function getRoleFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('role') || 'developer';
}

function applyRBACRules() {
    const role = getRoleFromURL();

    if (role === 'tratante' || role === 'medico' || role === 'asistente') {
        // Hide all navigation links to restricted modules (desktop sidebar, mobile drawer, mobile bottom bar)
        const restrictedHrefs = ['tratamientos_', 'cobrar_', 'pagos_facturacion_'];
        document.querySelectorAll('a').forEach(link => {
            const href = link.getAttribute('href') || '';
            if (restrictedHrefs.some(r => href.includes(r))) {
                link.style.display = 'none';
            }
        });
        
        // Hide summary card for both roles
        const resumenCuentaCard = document.getElementById("resumen-cuenta-card");
        if (resumenCuentaCard) resumenCuentaCard.style.display = 'none';

        // Hide non-account settings in Ajustes
        const adminSettings = document.getElementById("admin-settings-section");
        if (adminSettings) adminSettings.style.display = 'none';
    }

    // 2. Inyectar botón de Master Root o Admin en el SideNavBar
    if (role === 'root' || role === 'admin') {
        const navBar = document.querySelector('nav');
        if (navBar && !document.getElementById('nav-link-master')) {
            const masterLink = document.createElement('a');
            masterLink.id = 'nav-link-master';
            masterLink.className = 'flex items-center px-4 py-3 font-body-md text-body-md text-error hover:bg-error/10 transition-colors duration-200 group mt-auto border-t border-surface-container mt-4';
            masterLink.href = `master_root.html?role=${role}`;
            masterLink.innerHTML = `
                <span class="material-symbols-outlined mr-3">admin_panel_settings</span>
                <span class="font-bold">${role === 'root' ? 'Panel Master' : 'Panel de Usuarios'}</span>
            `;
            navBar.appendChild(masterLink);
        }
    }

    // 3. Dashboard Specific Rules (calendario_dashboard)
    const financialCard = document.getElementById("financial-insight-card");
    if (financialCard && (role === 'tratante' || role === 'asistente')) {
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

function preserveRoleInLinks() {
    const role = getRoleFromURL();
    if (role) {
        document.querySelectorAll('a').forEach(link => {
            const href = link.getAttribute('href');
            // Only modify internal relative links
            if (href && !href.startsWith('http') && !href.startsWith('#')) {
                // If the link already has parameters, append with &, else ?
                if (!href.includes('role=')) {
                    const separator = href.includes('?') ? '&' : '?';
                    link.setAttribute('href', `${href}${separator}role=${role}`);
                }
            }
        });
    }
}

async function displayCurrentUser() {
    try {
        if (typeof supabaseClient === 'undefined') return;
        
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        if (error || !session) return;
        
        const user = session.user;
        const { data: profile } = await supabaseClient.from('profiles').select('*').eq('id', user.id).single();
        
        const name = profile?.full_name || user.email.split('@')[0];
        const role = profile?.role || getRoleFromURL() || 'Usuario';
        
        // Desktop Header Widget
        const desktopHeaderRight = document.querySelector('header div.flex.items-center.gap-6');
        if (desktopHeaderRight) {
            const existing = document.getElementById('global-desktop-user-widget');
            if (existing) existing.remove();
            
            const widget = document.createElement('div');
            widget.id = 'global-desktop-user-widget';
            widget.className = 'flex items-center gap-3 pl-6 border-l border-outline-variant/30 ml-4';
            widget.innerHTML = `
                <div class="flex flex-col text-right">
                    <span class="font-bold text-sm text-on-surface leading-tight">${name}</span>
                    <span class="text-[10px] uppercase tracking-wider text-primary font-bold">${role}</span>
                </div>
                <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shadow-sm">
                    ${name.charAt(0).toUpperCase()}
                </div>
            `;
            desktopHeaderRight.appendChild(widget);
        }
        
        // Mobile Sidebar / Drawer Widget
        const mobileDrawerProfile = document.querySelector('nav.fixed.left-0.top-0 div.flex.items-center.gap-4');
        if (mobileDrawerProfile) {
            mobileDrawerProfile.innerHTML = `
                <div class="w-12 h-12 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center overflow-hidden shrink-0 font-bold text-xl">
                    ${name.charAt(0).toUpperCase()}
                </div>
                <div class="flex flex-col">
                    <span class="font-label-sm text-label-sm text-primary font-bold truncate max-w-[150px]">${name}</span>
                    <span class="text-[10px] text-outline mt-0.5 uppercase tracking-wider font-semibold">${role}</span>
                </div>
            `;
        }
        
        // Settings page specific text update
        const accountHeaderName = document.querySelector('div.flex.items-center.gap-4.py-2 p.font-bold.text-on-surface');
        if (accountHeaderName && accountHeaderName.textContent.includes('Eslava')) {
             accountHeaderName.textContent = name;
             if (accountHeaderName.nextElementSibling) {
                 accountHeaderName.nextElementSibling.textContent = role;
             }
        }

    } catch (e) {
        console.error("Error displaying current user:", e);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    applyRBACRules();
    preserveRoleInLinks();
    displayCurrentUser();
});
