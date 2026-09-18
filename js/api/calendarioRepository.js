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
        let allData = [];
        let limit = 1000;
        let count = 0;
        let maxCount = 10000;
        
        while (count < maxCount) {
            const { data, error } = await window.db.from('pacientes').select('*').order('id', { ascending: false }).range(count, count + limit - 1);
            if (error) {
                if (allData.length > 0) return { data: allData, error: null }; // Return what we have
                return { data: null, error };
            }
            if (!data || data.length === 0) break;
            
            allData = allData.concat(data);
            if (data.length < limit) break; // Reached the end
            count += limit;
        }
        return { data: allData, error: null };
    }

    static async insertPaciente(payload) {
        if (payload.nombre) payload.nombre = payload.nombre.trim();
        return await window.db
            .from('pacientes')
            .insert([payload])
            .select('id');
    }

    static async searchPacientePorNombreExacto(nombre) {
        const cleanNombre = nombre ? nombre.trim() : '';
        return await window.db
            .from('pacientes')
            .select('id')
            .ilike('nombre', cleanNombre)
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
