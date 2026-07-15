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

document.addEventListener('DOMContentLoaded', UIProvider.initGlobalListeners);
