// js/api/finanzasRepository.js
// Responsabilidad: Acceso a la base de datos para la vista de Finanzas (Dashboard Financiero)

class FinanzasRepository {
    static async insertEgreso(descripcion, monto) {
        return await window.db.from('pagos').insert([{
            descripcion: descripcion,
            monto: -monto, // Egresos se guardan como negativos
            metodo: 'Egreso',
            estado: 'Completado',
            fecha: new Date().toISOString()
        }]);
    }

    static async getPagosPorRangoFecha(startDateISO, endDateISO, pacienteId = null) {
        let query = window.db
            .from('pagos')
            .select(`
                id,
                monto,
                metodo,
                estado,
                fecha,
                descripcion,
                pacientes ( nombre ),
                citas ( tratamiento, created_at, estado )
            `)
            .gte('fecha', startDateISO)
            .lt('fecha', endDateISO)
            .order('fecha', { ascending: false });

        if (pacienteId) {
            query = query.eq('paciente_id', pacienteId);
        }

        return await query;
    }

    static async getProductos() {
        return await window.db.from('productos').select('*');
    }

    static async updatePagoCompletado(pagoId) {
        return await window.db
            .from('pagos')
            .update({ estado: 'Completado', fecha: new Date().toISOString() })
            .eq('id', pagoId);
    }
}

window.FinanzasRepository = FinanzasRepository;
