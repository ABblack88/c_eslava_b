// Global Application Logic for Modals and Interactivity

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize generic close buttons for modals
    // Any button with data-close-modal="modal-id" will close that modal
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const modalId = btn.getAttribute('data-close-modal');
            closeModal(modalId);
        });
    });

    // 2. Add escape key listener to close modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const openModals = document.querySelectorAll('.modal-overlay:not(.hidden)');
            openModals.forEach(modal => {
                modal.classList.add('hidden');
            });
        }
    });
});

/**
 * Abre un modal por su ID
 * @param {string} modalId 
 */
window.openModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
        // Add minimal animation
        const dialog = modal.querySelector('div');
        if (dialog) {
            dialog.classList.remove('scale-95', 'opacity-0');
            dialog.classList.add('scale-100', 'opacity-100');
        }
    } else {
        console.warn(`Modal con ID ${modalId} no encontrado.`);
    }
};

/**
 * Cierra un modal por su ID
 * @param {string} modalId 
 */
window.closeModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        const dialog = modal.querySelector('div');
        if (dialog) {
            dialog.classList.remove('scale-100', 'opacity-100');
            dialog.classList.add('scale-95', 'opacity-0');
            setTimeout(() => {
                modal.classList.add('hidden');
            }, 150); // wait for animation
        } else {
            modal.classList.add('hidden');
        }
    }
};

/**
 * Muestra una notificación Toast
 * @param {string} message Mensaje a mostrar
 * @param {string} type 'success', 'error', 'info'
 */
window.showToast = function(message, type = 'success') {
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
    
    toast.className = `${bgColors[type]} text-white px-6 py-3 rounded-xl shadow-lg font-bold text-sm transform transition-all duration-300 translate-y-10 opacity-0`;
    toast.textContent = message;

    toastContainer.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
        toast.classList.remove('translate-y-10', 'opacity-0');
    });

    // Remove after 3 seconds
    setTimeout(() => {
        toast.classList.add('translate-y-10', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
};
