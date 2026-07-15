// js/services/citasService.js

class CitasService {
    static filterActivas(citas) {
        return (citas || []).filter(c => {
            const estado = (c.estado || '').toLowerCase();
            return !estado.includes('completad') && !estado.includes('atendid');
        });
    }

    static formatHora(horaStr) {
        if (!horaStr) return '';
        const [h, m] = horaStr.split(':');
        let hInt = parseInt(h);
        const ampm = hInt >= 12 ? 'PM' : 'AM';
        hInt = hInt % 12 || 12;
        return `${hInt}:${m} ${ampm}`;
    }

    static getBadgeClass(estado) {
        let badgeClass = 'bg-surface-container-high text-outline';
        const estadoLower = (estado || '').toLowerCase();
        
        if (estadoLower.includes('pendiente') || estadoLower.includes('sin confirmar') || estadoLower.includes('por confirmar')) {
            badgeClass = 'bg-warning/10 text-warning-dark';
        } else if (estadoLower.includes('confirmad')) {
            badgeClass = 'bg-success/10 text-success';
        } else if (estadoLower.includes('progreso')) {
            badgeClass = 'bg-primary/10 text-primary';
        } else if (estadoLower.includes('completad') || estadoLower.includes('atendid')) {
            badgeClass = 'bg-surface-variant text-on-surface-variant';
        } else if (estadoLower.includes('reprogramar')) {
            badgeClass = 'bg-[#8b5cf6]/10 text-[#8b5cf6]';
        }
        return badgeClass;
    }
}

window.CitasService = CitasService;
