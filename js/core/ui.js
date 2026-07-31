// js/core/ui.js
// Responsabilidad única: Proveer utilidades para manejar Modales, Toasts y eventos globales de UI

class UIProvider {
    static openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) {
            console.warn(`Modal con ID ${modalId} no encontrado.`);
            return;
        }
        
        modal.classList.remove('hidden');
        const dialog = modal.querySelector('div');
        if (dialog) {
            dialog.classList.remove('scale-95', 'opacity-0');
            dialog.classList.add('scale-100', 'opacity-100');
        }
    }

    static closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        
        const dialog = modal.querySelector('div');
        if (dialog) {
            dialog.classList.remove('scale-100', 'opacity-100');
            dialog.classList.add('scale-95', 'opacity-0');
            setTimeout(() => {
                modal.classList.add('hidden');
            }, 150);
        } else {
            modal.classList.add('hidden');
        }
    }

    static showToast(message, type = 'success') {
        let toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            toastContainer.className = 'fixed bottom-4 right-4 z-[9999] flex flex-col gap-2';
            document.body.appendChild(toastContainer);
        }

        const toast = document.createElement('div');
        const bgColors = {
            success: 'bg-emerald-500',
            error: 'bg-error',
            info: 'bg-primary'
        };
        
        toast.className = `${bgColors[type] || bgColors.info} text-white px-6 py-3 rounded-xl shadow-lg font-bold text-sm transform transition-all duration-300 translate-y-10 opacity-0`;
        toast.textContent = message;

        toastContainer.appendChild(toast);

        requestAnimationFrame(() => {
            toast.classList.remove('translate-y-10', 'opacity-0');
        });

        setTimeout(() => {
            toast.classList.add('translate-y-10', 'opacity-0');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    static initGlobalListeners() {
        document.querySelectorAll('[data-close-modal]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                UIProvider.closeModal(btn.getAttribute('data-close-modal'));
            });
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal-overlay:not(.hidden)').forEach(modal => {
                    modal.classList.add('hidden');
                });
            }
        });
    }
}

// Global exposure for backward compatibility in HTML onclick attributes
window.openModal = UIProvider.openModal;
window.closeModal = UIProvider.closeModal;
window.showToast = UIProvider.showToast;
window.UI = UIProvider;

document.addEventListener('DOMContentLoaded', () => {
    UIProvider.initGlobalListeners();
    setTimeout(calcularOcupacionSemanalSidebar, 500); // Wait a bit for auth
});

async function calcularOcupacionSemanalSidebar() {
    const pctEl = document.getElementById('sidebar-ocupacion-pct');
    const barEl = document.getElementById('sidebar-ocupacion-bar');
    const msgEl = document.getElementById('sidebar-ocupacion-msg');

    if (!pctEl || !barEl || typeof window.supabaseClient === 'undefined') return;

    try {
        // 1. Calcular fechas de la semana actual (Lunes a Domingo)
        const hoy = new Date();
        const diaSemana = hoy.getDay() === 0 ? 7 : hoy.getDay(); // 1(Lunes) a 7(Domingo)
        
        const lunes = new Date(hoy);
        lunes.setDate(hoy.getDate() - diaSemana + 1);
        lunes.setHours(0, 0, 0, 0);

        const domingo = new Date(lunes);
        domingo.setDate(lunes.getDate() + 6);
        domingo.setHours(23, 59, 59, 999);

        const startStr = lunes.toISOString().split('T')[0];
        const endStr = domingo.toISOString().split('T')[0];

        // 2. Traer citas de la semana
        const { data: citasData, error: citasError } = await window.supabaseClient
            .from('citas')
            .select('estado, tratamiento')
            .gte('fecha', startStr)
            .lte('fecha', endStr);

        if (citasError) throw citasError;

        // 3. Traer servicios para saber duración
        const { data: serviciosData } = await window.supabaseClient.from('servicios').select('nombre, duracion');
        const serviciosMap = {};
        if (serviciosData) {
            serviciosData.forEach(s => serviciosMap[s.nombre] = s.duracion || 60);
        }

        // 4. Calcular minutos ocupados
        let minutosOcupados = 0;
        if (citasData) {
            citasData.forEach(cita => {
                if (cita.estado === 'Completada' || cita.estado === 'Atendida' || cita.estado === 'Confirmada' || cita.estado === 'Pendiente') {
                    minutosOcupados += serviciosMap[cita.tratamiento] || 60;
                }
            });
        }

        // 5. Calcular capacidad
        const aperturaStr = localStorage.getItem('horaApertura') || '08:00';
        const cierreStr = localStorage.getItem('horaCierre') || '20:00';
        
        const hApertura = parseInt(aperturaStr.split(':')[0]);
        const hCierre = parseInt(cierreStr.split(':')[0]);
        let horasPorDia = hCierre - hApertura;
        if (horasPorDia <= 0) horasPorDia = 8; // fallback

        const camillas = 3; // Default
        const diasHabiles = 5; // Lunes a Viernes
        const capacidadMinutos = diasHabiles * horasPorDia * camillas * 60;

        // 6. Porcentaje
        let porcentaje = 0;
        if (capacidadMinutos > 0) {
            porcentaje = (minutosOcupados / capacidadMinutos) * 100;
        }
        porcentaje = Math.min(100, Math.max(0, porcentaje)); // Clamp 0-100

        // 7. Actualizar UI
        const valorEntero = Math.round(porcentaje);
        pctEl.textContent = valorEntero + '%';
        barEl.style.width = valorEntero + '%';

        if (msgEl) {
            if (valorEntero >= 80) {
                msgEl.textContent = 'Optimización alta. Considerar apertura de agenda Sábados.';
            } else if (valorEntero >= 50) {
                msgEl.textContent = 'Ocupación media. Buen flujo de pacientes.';
            } else {
                msgEl.textContent = 'Ocupación baja. Se recomienda lanzar promociones.';
            }
        }
    } catch (err) {
        console.error("Error al calcular ocupación semanal en sidebar:", err);
    }
}
