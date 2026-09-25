// js/api/pacientesRepository.js
// Responsabilidad: Acceso a la base de datos para Pacientes

class PacientesRepository {
    static async getPacientes(limit = 50, offset = 0, searchQuery = '') {
        let query = window.supabaseClient
            .from('pacientes')
            .select('*, citas(id, estado, fecha, hora, tratamiento, consultorio), pagos(id, estado, cita_id)', { count: 'exact' });

        if (searchQuery) {
            query = query.or(`nombre.ilike.%${searchQuery}%,dni.ilike.%${searchQuery}%`);
        }

        query = query.order('nombre', { ascending: true }).range(offset, offset + limit - 1);

        const { data, count, error } = await query;
        return { data, count, error };
    }
    
    static async getPacientesCount() {
        const { count, error } = await window.supabaseClient
            .from('pacientes')
            .select('*', { count: 'exact', head: true });
        return { count, error };
    }
    
    static async getProximosPacientesProgramados(limit = 10) {
        const today = new Date().toISOString().split('T')[0];
        
        // Consultar directamente las citas futuras para evitar descargar todos los pacientes
        const { data, error } = await window.supabaseClient.from('citas')
            .select('*, pacientes(*)')
            .gte('fecha', today)
            .in('estado', ['Pendiente', 'Sin confirmar', 'Confirmada', 'Confirmado', 'En Progreso'])
            .order('fecha', { ascending: true })
            .order('hora', { ascending: true })
            .limit(limit);
            
        return { data, error };
    }

    static async insertPaciente(payload) {
        if (payload.nombre) payload.nombre = payload.nombre.trim();
        return await window.supabaseClient
            .from('pacientes')
            .insert([payload])
            .select('*');
    }

    static async updatePaciente(id, payload) {
        if (payload.nombre) payload.nombre = payload.nombre.trim();
        return await window.supabaseClient
            .from('pacientes')
            .update(payload)
            .eq('id', id);
    }

    static async deletePaciente(id) {
        return await window.supabaseClient
            .from('pacientes')
            .delete()
            .eq('id', id);
    }

    static async getPacientesParaExportar() {
        let allData = [];
        let limit = 1000;
        let count = 0;
        let maxCount = 10000;
        
        while (count < maxCount) {
            const { data, error } = await window.supabaseClient.from('pacientes').select('*').range(count, count + limit - 1);
            if (error) {
                if (allData.length > 0) return { data: allData, error: null };
                return { data: null, error };
            }
            if (!data || data.length === 0) break;
            
            allData = allData.concat(data);
            if (data.length < limit) break;
            count += limit;
        }
        return { data: allData, error: null };
    }

    static async insertMuchosPacientes(pacientesArray) {
        return await window.supabaseClient
            .from('pacientes')
            .insert(pacientesArray);
    }
}

window.PacientesRepository = PacientesRepository;
