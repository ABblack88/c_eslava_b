// js/api/pacientesRepository.js
// Responsabilidad: Acceso a la base de datos para Pacientes

class PacientesRepository {
    static async getPacientes() {
        let allData = [];
        let limit = 1000;
        let count = 0;
        let maxCount = 10000;
        
        while (count < maxCount) {
            const { data, error } = await window.supabaseClient.from('pacientes').select('*, citas(id, estado, fecha, hora, tratamiento, consultorio), pagos(id, estado, cita_id)').order('nombre', { ascending: true }).range(count, count + limit - 1);
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
