// js/api/calendarioRepository.js
// Responsabilidad: Acceso a la base de datos para el Calendario

class CalendarioRepository {
    static async getCitasActivas(fecha) {
        let query = window.db
            .from('citas')
            .select('*, pacientes(nombre, telefono)')
            .neq('estado', 'Cancelado')
            .neq('estado', 'Cancelada');
            
        if (fecha) {
            query = query.eq('fecha', fecha);
        }
        return await query;
    }

    static async getCitasPorRangoOpciones() {
        return await window.db
            .from('citas')
            .select('*, pacientes(nombre, telefono)');
    }

    static async getCitaConPaciente(citaId) {
        return await window.db
            .from('citas')
            .select('*, pacientes(*)')
            .eq('id', citaId)
            .single();
    }

    static async updateCita(citaId, payload) {
        return await window.db
            .from('citas')
            .update(payload)
            .eq('id', citaId);
    }

    static async insertCita(payload) {
        return await window.db
            .from('citas')
            .insert([payload])
            .select('id');
    }

    static async getPacientes() {
        return await window.db.from('pacientes').select('*');
    }

    static async insertPaciente(payload) {
        return await window.db
            .from('pacientes')
            .insert([payload])
            .select('id');
    }

    static async searchPacientePorNombreExacto(nombre) {
        return await window.db
            .from('pacientes')
            .select('id')
            .ilike('nombre', nombre)
            .limit(1);
    }

    static async getServiciosActivos() {
        return await window.db
            .from('servicios')
            .select('*')
            .eq('estado', 'Activo');
    }

    static async insertPagoCita(payload) {
        return await window.db
            .from('pagos')
            .insert([payload]);
    }
}

window.CalendarioRepository = CalendarioRepository;
