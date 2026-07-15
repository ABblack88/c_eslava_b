// js/services/cajaService.js
// Responsabilidad única: Lógica de negocio, cálculos financieros y agrupaciones

class CajaService {
    static filterValidPagos(pagos) {
        return (pagos || []).filter(p => {
            if (p.estado === 'Completado') return true;
            if (p.citas) {
                const estadoCita = (p.citas.estado || '').toLowerCase();
                return estadoCita.includes('completad') || estadoCita.includes('atendid');
            }
            return true;
        });
    }

    static calculateDashboardStats(safePagos) {
        const now = new Date();
        const mesActual = now.getMonth();
        const anioActual = now.getFullYear();

        const pagosDelMes = safePagos.filter(p => {
            const f = new Date(p.fecha);
            return f.getMonth() === mesActual && f.getFullYear() === anioActual;
        });

        const totalIngresos = pagosDelMes.filter(p => p.estado === 'Completado').reduce((sum, p) => sum + Number(p.monto), 0);
        const pendientes = safePagos.filter(p => p.estado === 'Pendiente');
        const totalPendientes = pendientes.reduce((sum, p) => sum + Number(p.monto), 0);
        
        const vencidos = pendientes.filter(p => {
            const diffDays = Math.floor((now - new Date(p.fecha)) / (1000 * 60 * 60 * 24));
            return diffDays > 15;
        });
        const totalVencidos = vencidos.reduce((sum, p) => sum + Number(p.monto), 0);

        const meta = parseFloat(localStorage.getItem('metaMensual') || 50000);
        const progresoPct = meta > 0 ? Math.min(100, Math.round((totalIngresos / meta) * 100)) : 0;

        return { totalIngresos, pendientes, totalPendientes, vencidos, totalVencidos, meta, progresoPct };
    }

    static groupCuentasCobrarPorPaciente(pagosFiltrados) {
        const porPaciente = {};
        pagosFiltrados.forEach(p => {
            const nombre = p.pacientes?.nombre || 'Sin nombre';
            if (!porPaciente[nombre]) porPaciente[nombre] = { items: [], total: 0 };
            porPaciente[nombre].items.push(p);
            porPaciente[nombre].total += Number(p.monto);
        });
        return porPaciente;
    }

    static processPendientesConConvenio(pagosPendientes, globalServicios) {
        return pagosPendientes.map(pago => {
            const tratamientoNombre = pago.descripcion || (pago.citas && pago.citas.tratamiento) || '';
            const tratamientos = tratamientoNombre.split(',').map(t => t.trim()).filter(t => t);
            
            let totalRegular = 0;
            let totalConvenio = 0;
            let allMatched = true;

            if (tratamientos.length > 0) {
                tratamientos.forEach(tName => {
                    const servicioMatch = globalServicios.find(s => s.nombre.toLowerCase() === tName.toLowerCase());
                    if (servicioMatch) {
                        totalRegular += parseFloat(servicioMatch.precio);
                        totalConvenio += parseFloat(servicioMatch.precio_convenio || servicioMatch.precio);
                    } else {
                        allMatched = false;
                    }
                });
            } else {
                allMatched = false;
            }

            if (allMatched && tratamientos.length > 0) {
                pago.precio_regular = totalRegular;
                pago.precio_convenio = totalConvenio;
            }
            return pago;
        });
    }

    static calculateFacturaTotales(pendientesSeleccionados, aplicaConvenio, esTarjeta, tipoTarjeta, igvIncluido) {
        let subtotal = 0;
        let descuentoMonto = 0;

        pendientesSeleccionados.forEach(pago => {
            let precioCobrar = parseFloat(pago.monto) || 0;
            let mostrarDescuento = false;

            if (pago.precio_regular) {
                let basePrecio = parseFloat(pago.precio_regular);
                let convenioPrecio = pago.precio_convenio ? parseFloat(pago.precio_convenio) : basePrecio;
                
                if (parseFloat(pago.monto) < convenioPrecio) {
                    convenioPrecio = parseFloat(pago.monto);
                }

                if (esTarjeta || !aplicaConvenio) {
                    precioCobrar = basePrecio;
                } else if (basePrecio > convenioPrecio) {
                    precioCobrar = convenioPrecio;
                    mostrarDescuento = true;
                }
            }
            subtotal += (precioCobrar + (mostrarDescuento ? (parseFloat(pago.precio_regular) - precioCobrar) : 0));
            if (mostrarDescuento) {
                descuentoMonto += (parseFloat(pago.precio_regular) - precioCobrar);
            }
        });

        const subtotalDespuesDescuento = subtotal - descuentoMonto;

        let comisionTarjeta = 0;
        let posCommissionPct = 0;
        if (esTarjeta) {
            posCommissionPct = tipoTarjeta === 'Nacional' ? parseFloat(localStorage.getItem('comisionPOSNacional') || 4.5) : parseFloat(localStorage.getItem('comisionPOSInternacional') || 5.5);
            comisionTarjeta = subtotalDespuesDescuento * (posCommissionPct / 100);
        }

        const total = subtotalDespuesDescuento;
        const igvPct = parseFloat(localStorage.getItem('igvPorcentaje') || 18);
        let igv = 0;
        if (igvIncluido) {
            igv = total - (total / (1 + (igvPct / 100)));
        }

        return { subtotal, descuentoMonto, comisionTarjeta, total, igv, igvPct };
    }
}

window.CajaService = CajaService;
