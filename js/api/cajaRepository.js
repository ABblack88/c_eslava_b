// js/api/cajaRepository.js
// Responsabilidad única: Acceso a la base de datos para temas de facturación y pagos

class CajaRepository {
    static async getPagos() {
        return await window.db
            .from('pagos')
            .select(`id, monto, metodo, estado, fecha, pacientes ( nombre ), citas ( tratamiento, estado )`)
            .order('fecha', { ascending: false });
    }

    static async getCuentasPorCobrar() {
        return await window.db
            .from('pagos')
            .select('id, monto, fecha, descripcion, pacientes(nombre), citas(tratamiento, estado)')
            .eq('estado', 'Pendiente')
            .order('fecha', { ascending: true });
    }

    static async getCobrosPendientesPorPaciente(pacienteId) {
        return await window.db
            .from('pagos')
            .select('*, citas(tratamiento, estado)')
            .eq('paciente_id', pacienteId)
            .in('estado', ['Pendiente', 'Vencido'])
            .order('fecha', { ascending: true });
    }

    static async updatePagoEstado(id, updatePayload) {
        return await window.db.from('pagos').update(updatePayload).eq('id', id);
    }

    static async updateCitaEstado(id, estado) {
        return await window.db.from('citas').update({ estado }).eq('id', id);
    }

    static async getPacientes() {
        return await window.db.from('pacientes').select('*').order('nombre');
    }

    static async getServicios() {
        return await window.db.from('servicios').select('*').order('nombre');
    }

    static async getProductos() {
        return await window.db.from('productos').select('*').order('nombre');
    }

    static async getTratantes() {
        return await window.db.from('profiles').select('*').eq('role', 'tratante').order('full_name');
    }

    static async getCita(id) {
        return await window.db.from('citas').select('*').eq('id', id).single();
    }

    static async getAllPagosExport() {
        return await window.db
            .from('pagos')
            .select('*, pacientes(nombre)')
            .order('fecha_emision', { ascending: false });
    }

    static async getCobrosPendientesGlobal() {
        return await window.db
            .from('pagos')
            .select('id, monto, fecha, descripcion, pacientes(id, nombre), citas(tratamiento, estado)')
            .eq('estado', 'Pendiente')
            .order('fecha', { ascending: false });
    }
}

window.CajaRepository = CajaRepository;
