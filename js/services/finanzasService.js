// js/services/finanzasService.js
// Responsabilidad: Lógica de negocio, cálculos y agrupaciones para Dashboard de Finanzas

class FinanzasService {
    static filterValidPagos(pagos, mesesActivos, busquedaPaciente) {
        let safePagos = pagos || [];

        // Filtro por nombre si aplica
        if (busquedaPaciente) {
            safePagos = safePagos.filter(p => p.pacientes && p.pacientes.nombre.toLowerCase().includes(busquedaPaciente));
        }

        // Filtro por mes (si hay multiples meses)
        safePagos = safePagos.filter(p => {
            if (!p.fecha) return false;
            const pMes = new Date(p.fecha).getMonth();
            return mesesActivos.has(pMes);
        });

        // Filtro: Solo se cuentan si la atención ya se completó o es pago directo
        safePagos = safePagos.filter(p => {
            if (p.citas) {
                const estadoCita = (p.citas.estado || '').toLowerCase();
                return estadoCita.includes('completad') || estadoCita.includes('atendid');
            }
            return true;
        });

        return safePagos;
    }

    static sortPagos(pagos) {
        pagos.sort((a, b) => {
            const dateA = new Date(a.fecha).getTime();
            const dateB = new Date(b.fecha).getTime();
            if (dateA !== dateB) return dateB - dateA;
            
            const timeA = (a.citas && a.citas.created_at) ? new Date(a.citas.created_at).getTime() : 0;
            const timeB = (b.citas && b.citas.created_at) ? new Date(b.citas.created_at).getTime() : 0;
            return timeB - timeA;
        });
        return pagos;
    }

    static procesarEstadosVencidos(pagos) {
        const now = new Date();
        pagos.forEach(p => {
            if (p.estado === 'Pendiente' && p.fecha) {
                const pDate = new Date(p.fecha);
                const diffDays = Math.floor((now - pDate) / (1000 * 60 * 60 * 24));
                if (diffDays > 15) {
                    p.estado = 'Vencido';
                }
            }
        });
        return pagos;
    }

    static calcularMetricas(pagos) {
        const totalIngresos = pagos.filter(p => p.estado === 'Completado').reduce((sum, p) => sum + Number(p.monto), 0);
        const pendientes = pagos.filter(p => p.estado === 'Pendiente');
        const totalPendientes = pendientes.reduce((sum, p) => sum + Number(p.monto), 0);
        const vencidos = pagos.filter(p => p.estado === 'Vencido');
        const totalVencidos = vencidos.reduce((sum, p) => sum + Number(p.monto), 0);

        const pagosTarjeta = pagos.filter(p => p.estado === 'Completado' && p.metodo && (p.metodo.toLowerCase().includes('tarjeta') || p.metodo.toLowerCase().includes('pos') || p.metodo.toLowerCase().includes('transferencia')));
        const totalTarjeta = pagosTarjeta.reduce((sum, p) => sum + Number(p.monto), 0);

        return {
            totalIngresos,
            pendientes,
            totalPendientes,
            vencidos,
            totalVencidos,
            totalTarjeta
        };
    }
}

window.FinanzasService = FinanzasService;
