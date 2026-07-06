// rbac.js - Global Role-Based Access Control & Navigation Logic

function getRoleFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('role') || 'developer';
}

function applyRBACRules() {
    const role = getRoleFromURL();

    // 1. Hide tabs/links based on role
    const linkFinanzas = document.getElementById("nav-link-finanzas");
    const linkAjustes = document.getElementById("nav-link-ajustes");
    const resumenCuentaCard = document.getElementById("resumen-cuenta-card");

    if (role === 'medico') {
        if (linkFinanzas) linkFinanzas.style.display = 'none';
        if (resumenCuentaCard) resumenCuentaCard.style.display = 'none';
    } else if (role === 'asistente') {
        if (linkFinanzas) linkFinanzas.style.display = 'none';
        if (linkAjustes) linkAjustes.style.display = 'none';
        if (resumenCuentaCard) resumenCuentaCard.style.display = 'none';
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
    if (financialCard && (role === 'medico' || role === 'asistente')) {
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

document.addEventListener('DOMContentLoaded', () => {
    applyRBACRules();
    preserveRoleInLinks();
});
