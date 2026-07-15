// js/api/citasRepository.js

class CitasRepository {
    static async getServiciosActivos() {
        return await window.db
            .from('servicios')
            .select('*')
            .eq('estado', 'Activo');
    }

    static async getTodasLasCitas() {
        return await window.db
            .from('citas')
            .select('*, pacientes(nombre)')
            .order('fecha', { ascending: true })
            .order('hora', { ascending: true });
    }

    static async updateEstadoCita(citaId, nuevoEstado) {
        return await window.db
            .from('citas')
            .update({ estado: nuevoEstado })
            .eq('id', citaId);
    }
}

window.CitasRepository = CitasRepository;
