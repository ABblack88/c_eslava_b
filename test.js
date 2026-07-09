        


        // Subtle scroll behavior for the Top Bar
        window.addEventListener('scroll', () => {
            const header = document.querySelector('header');
            if (window.scrollY > 20) {
                header.classList.add('shadow-md');
                header.classList.remove('shadow-sm');
            } else {
                header.classList.remove('shadow-md');
                header.classList.add('shadow-sm');
            }
        });

        // Helper function to format currency
        function formatCurrency(amount) {
            return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(amount);
        }

        function getInitials(name) {
            if (!name) return '??';
            const parts = name.split(' ');
            if (parts.length >= 2) {
                return (parts[0][0] + parts[1][0]).toUpperCase();
            }
            return name.substring(0, 2).toUpperCase();
        }

        // --- CERRAR SESIÓN ---
        async function cerrarSesion() {
            const confirmado = confirm('¿Deseas cerrar sesión?');
            if (!confirmado) return;
            try {
                await supabaseClient.auth.signOut();
            } catch(e) {}
            localStorage.clear();
            sessionStorage.clear();
            window.location.replace('../index.html');
        }

        async function cargarDatosFinancieros() {
            try {
                // Fetch settings from localStorage FIRST to ensure UI updates even if DB fails
                const metaMes = parseFloat(localStorage.getItem('metaMensual')) || 25000;
                const igvPorcentaje = parseFloat(localStorage.getItem('igvPorcentaje')) || 18;
                const comisionPOS = parseFloat(localStorage.getItem('comisionPOSNacional')) || 4.5;
                
                const metaMesEl = document.getElementById('meta-mes');
                if (metaMesEl) metaMesEl.textContent = formatCurrency(metaMes);

                const urlParams = new URLSearchParams(window.location.search);
                const pacienteId = urlParams.get('paciente_id');
                
                let query = supabaseClient
                    .from('pagos')
                    .select(`
                        id,
                        monto,
                        metodo,
                        estado,
                        fecha,
                        descripcion,
                        pacientes ( nombre ),
                        citas ( tratamiento, motivo )
                    `)
                    .order('fecha', { ascending: false });

                const mes = document.getElementById('filtro-mes')?.value;
                const fechaInicio = document.getElementById('filtro-fecha-inicio')?.value;
                const fechaFin = document.getElementById('filtro-fecha-fin')?.value;

                if (fechaInicio) {
                    query = query.gte('fecha', fechaInicio + 'T00:00:00');
                }
                if (fechaFin) {
                    query = query.lte('fecha', fechaFin + 'T23:59:59');
                } else if (mes && !fechaInicio && !fechaFin) {
                    const firstDay = new Date(mes + '-01').toISOString();
                    const nextMonth = new Date(new Date(mes + '-01').setMonth(new Date(mes + '-01').getMonth() + 1)).toISOString();
                    query = query.gte('fecha', firstDay).lt('fecha', nextMonth);
                }

                if (pacienteId) {
                    query = query.eq('paciente_id', pacienteId);
                }

                const { data: pagos, error } = await query;

                if (error) throw error;

                // Filter locally by patient name if no patientId but name is typed
                let safePagos = pagos || [];
                const busquedaPaciente = document.getElementById('filtro-paciente')?.value?.toLowerCase();
                if (busquedaPaciente && !pacienteId) {
                    safePagos = safePagos.filter(p => p.pacientes && p.pacientes.nombre.toLowerCase().includes(busquedaPaciente));
                }

                const totalIngresos = safePagos.filter(p => p.estado === 'Completado').reduce((sum, p) => sum + Number(p.monto), 0);
                const pendientes = safePagos.filter(p => p.estado === 'Pendiente');
                const totalPendientes = pendientes.reduce((sum, p) => sum + Number(p.monto), 0);
                const vencidos = safePagos.filter(p => p.estado === 'Vencido');
                const totalVencidos = vencidos.reduce((sum, p) => sum + Number(p.monto), 0);

                // Actualizar titulo si es por paciente
                if (pacienteId && safePagos.length > 0 && safePagos[0].pacientes) {
                    const titleEl = document.querySelector('h2.font-display-lg');
                    if (titleEl) titleEl.textContent = 'Facturación: ' + safePagos[0].pacientes.nombre;
                    
                    const labelIngresos = document.querySelector('p.text-primary.uppercase');
                    if (labelIngresos) labelIngresos.textContent = 'Total Pagado por Paciente';
                    
                    const topPacientesDiv = document.getElementById('top-pacientes-container')?.parentElement;
                    if (topPacientesDiv) topPacientesDiv.style.display = 'none';
                    
                    const topServiciosDiv = document.getElementById('top-servicios-container')?.parentElement;
                    if (topServiciosDiv) {
                        topServiciosDiv.classList.remove('col-span-1', 'col-span-6');
                        topServiciosDiv.classList.add('col-span-12');
                    }
                }

                // Actualizar UI
                const elIngresos = document.getElementById('total-ingresos');
                const elReclamos = document.getElementById('total-reclamos');
                const elReclamosCount = document.getElementById('count-reclamos');
                const elVencidos = document.getElementById('total-vencidos');
                const elVencidosCount = document.getElementById('count-vencidos');
                
                const porcentajeMeta = Math.min((totalIngresos / metaMes) * 100, 100).toFixed(1);

                if (elIngresos) elIngresos.textContent = formatCurrency(totalIngresos);
                if (elReclamos) elReclamos.textContent = formatCurrency(totalPendientes);
                if (elReclamosCount) elReclamosCount.textContent = `${pendientes.length} pagos pendientes`;
                if (elVencidos) elVencidos.textContent = formatCurrency(totalVencidos);
                if (elVencidosCount) elVencidosCount.textContent = vencidos.length.toString();
                
                const progresoEl = document.getElementById('progreso-meta');
                if (progresoEl) progresoEl.textContent = `${porcentajeMeta}%`;
                const barraEl = document.getElementById('barra-progreso');
                if (barraEl) barraEl.style.width = `${porcentajeMeta}%`;
                
                const elIgv = document.getElementById('total-igv');
                if (elIgv) elIgv.textContent = formatCurrency(totalIngresos * (igvPorcentaje / 100));
                
                const igvTitle = document.getElementById('igv-header-title');
                if (igvTitle) igvTitle.textContent = `Impuestos Estimados (IGV ${igvPorcentaje}%)`;
                
                const pagosTarjeta = safePagos.filter(p => p.estado === 'Completado' && (p.metodo === 'Tarjeta' || p.metodo === 'Transferencia'));
                const totalTarjeta = pagosTarjeta.reduce((sum, p) => sum + Number(p.monto), 0);
                const elPos = document.getElementById('total-pos');
                if (elPos) elPos.textContent = formatCurrency(totalTarjeta * (comisionPOS / 100));

                window.todosLosPagos = safePagos;

                renderPagosPendientes(safePagos);
                renderActividadReciente(safePagos);
                renderTopEstadisticas(safePagos);
            } catch (error) {
                console.error("Error al cargar datos financieros:", error);
                document.getElementById('pagos-pendientes-container').innerHTML = '<p class="text-error">Error al cargar pagos pendientes.</p>';
                document.getElementById('actividad-reciente-container').innerHTML = '<tr><td colspan="5" class="py-5 text-center text-error">Error al cargar actividad.</td></tr>';
            }
        }

        function renderPagosPendientes(pagos) {
            const container = document.getElementById('pagos-pendientes-container');
            const pagosPendientes = pagos.filter(p => p.estado === 'Pendiente' || p.estado === 'Vencido');

            if (pagosPendientes.length === 0) {
                container.innerHTML = '<p class="text-outline text-center py-4">No hay pagos pendientes.</p>';
                return;
            }

            // Agrupar por paciente (Ranking de deuda)
            const deudaPorPaciente = {};
            pagosPendientes.forEach(p => {
                const pacienteNombre = p.pacientes ? p.pacientes.nombre : 'Paciente Desconocido';
                if (!deudaPorPaciente[pacienteNombre]) {
                    deudaPorPaciente[pacienteNombre] = { monto: 0, items: [] };
                }
                deudaPorPaciente[pacienteNombre].monto += Number(p.monto);
                deudaPorPaciente[pacienteNombre].items.push(p);
            });

            // Ordenar por el que debe más
            const rankingDeuda = Object.entries(deudaPorPaciente).sort((a, b) => b[1].monto - a[1].monto);

            let html = '';
            rankingDeuda.forEach(([pacienteNombre, info]) => {
                const iniciales = getInitials(pacienteNombre);
                const hasVencidos = info.items.some(p => p.estado === 'Vencido');
                let stateClass = hasVencidos ? 'text-error' : 'text-on-surface-variant';
                let stateText = hasVencidos ? 'Contiene vencidos' : 'Pagos Pendientes';
                
                let avatarColor = hasVencidos ? 'bg-error-container text-on-error-container' : 'bg-secondary-container text-on-secondary-container';
                
                html += `
                <div class="flex items-center justify-between p-4 bg-surface-container-lowest border border-surface-container rounded-lg group hover:shadow-sm transition-all mb-3">
                    <div class="flex items-center gap-4">
                        <div class="w-10 h-10 rounded-full ${avatarColor} flex items-center justify-center font-bold">${iniciales}</div>
                        <div>
                            <p class="text-body-md font-bold text-on-surface">${pacienteNombre}</p>
                            <p class="text-label-sm text-on-surface-variant">${info.items.length} servicios sin cobrar</p>
                        </div>
                    </div>
                    <div class="text-right flex items-center gap-2">
                        <div class="mr-4">
                            <p class="text-body-md font-bold text-on-surface">${formatCurrency(info.monto)}</p>
                            <p class="text-label-sm ${stateClass}">${stateText}</p>
                        </div>
                        <button onclick="window.open('https://wa.me/?text=Hola%20${encodeURIComponent(pacienteNombre)},%20tienes%20pagos%20pendientes%20por%20un%20total%20de%20${formatCurrency(info.monto)}%20en%20el%20Centro%20Eslava.', '_blank')" class="recordatorio-btn bg-surface-container px-4 py-2 rounded-full text-label-sm font-bold text-on-surface hover:bg-primary hover:text-on-primary transition-all flex items-center gap-2">
                            <span class="material-symbols-outlined text-sm">mail</span>
                            Recordatorio Total
                        </button>
                    </div>
                </div>
                `;
            });
            container.innerHTML = html;
            attachRecordatorioListeners();
        }

        function renderActividadReciente(pagos) {
            const container = document.getElementById('actividad-reciente-container');
            if (pagos.length === 0) {
                container.innerHTML = '<tr><td colspan="5" class="py-5 text-center text-outline">No hay actividad reciente.</td></tr>';
                return;
            }

            let html = '';
            // Limitar a los ultimos 10 pagos
            pagos.slice(0, 10).forEach(pago => {
                const pacienteNombre = pago.pacientes ? pago.pacientes.nombre : 'Desconocido';
                const fecha = new Date(pago.fecha).toLocaleString('es-PE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
                const isCompletado = pago.estado === 'Completado';
                
                let badgeHtml = isCompletado 
                    ? '<span class="bg-success/10 text-success px-3 py-1 rounded-full text-label-sm font-bold">Ingreso</span>'
                    : '<span class="bg-warning/10 text-warning px-3 py-1 rounded-full text-label-sm font-bold">Pendiente</span>';

                let montoHtml = isCompletado 
                    ? `<p class="text-body-md font-bold text-success">+ ${formatCurrency(pago.monto)}</p>`
                    : `<p class="text-body-md font-bold">${formatCurrency(pago.monto)}</p>`;

                let iconHtml = isCompletado
                    ? '<span class="material-symbols-outlined text-success">check_circle</span>'
                    : '<span class="material-symbols-outlined text-warning">schedule</span>';

                html += `
                <tr class="group hover:bg-surface-bright transition-colors">
                    <td class="py-5">
                        <p class="text-body-md font-bold">${fecha}</p>
                        <p class="text-label-sm text-on-surface-variant">ID: ${pago.id.substring(0,8).toUpperCase()}</p>
                    </td>
                    <td class="py-5">
                        <p class="text-body-md font-bold">Pago ${pago.estado} - ${pacienteNombre}</p>
                        <p class="text-label-sm text-on-surface-variant">${pago.metodo || 'No especificado'}</p>
                    </td>
                    <td class="py-5">${badgeHtml}</td>
                    <td class="py-5 text-right">${montoHtml}</td>
                    <td class="py-5 text-right">${iconHtml}</td>
                </tr>
                `;
            });
            container.innerHTML = html;
        }

        function attachRecordatorioListeners() {
            document.querySelectorAll('.recordatorio-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const originalContent = this.innerHTML;
                    this.innerHTML = '<span class="material-symbols-outlined text-sm">done</span> Enviado';
                    this.classList.add('bg-success', 'text-white');
                    this.classList.remove('bg-surface-container');
                    
                    setTimeout(() => {
                        this.innerHTML = originalContent;
                        this.classList.remove('bg-success', 'text-white');
                        this.classList.add('bg-surface-container');
                    }, 2000);
                });
            });
        }

        async function marcarComoPagado(pagoId) {
            try {
                const { error } = await supabaseClient
                    .from('pagos')
                    .update({ estado: 'Completado', fecha: new Date().toISOString() })
                    .eq('id', pagoId);

                if (error) throw error;
                await cargarDatosFinancieros();
            } catch (error) {
                console.error("Error actualizando pago:", error);
                alert("Hubo un error al marcar el pago como completado.");
            }
        }

        function renderTopEstadisticas(pagos) {
            const serviciosStats = {};
            const pacientesStats = {};

            pagos.forEach(pago => {
                if (pago.estado !== 'Completado') return; // Solo contamos ingresos reales
                
                // Servicios
                const motivo = pago.servicio_realizado || (pago.citas ? (pago.citas.tratamiento || pago.citas.motivo || 'Consulta') : 'Venta General');
                if (!serviciosStats[motivo]) {
                    serviciosStats[motivo] = { count: 0, revenue: 0 };
                }
                serviciosStats[motivo].count += 1;
                serviciosStats[motivo].revenue += Number(pago.monto);

                // Pacientes
                const paciente = pago.pacientes ? pago.pacientes.nombre : 'Paciente Desconocido';
                if (!pacientesStats[paciente]) {
                    pacientesStats[paciente] = { count: 0, revenue: 0 };
                }
                pacientesStats[paciente].count += 1;
                pacientesStats[paciente].revenue += Number(pago.monto);
            });

            const topServicios = Object.entries(serviciosStats)
                .sort((a, b) => b[1].revenue - a[1].revenue)
                .slice(0, 5);

            const topPacientes = Object.entries(pacientesStats)
                .sort((a, b) => b[1].revenue - a[1].revenue)
                .slice(0, 5);

            const containerServicios = document.getElementById('top-servicios-container');
            if (topServicios.length === 0) {
                containerServicios.innerHTML = '<p class="text-outline text-center py-4">No hay datos suficientes.</p>';
            } else {
                containerServicios.innerHTML = topServicios.map(s => `
                    <div class="flex justify-between items-center border-b border-surface-container pb-2 last:border-0">
                        <div>
                            <p class="font-bold text-on-surface">${s[0]}</p>
                            <p class="text-label-sm text-on-surface-variant">${s[1].count} veces realizado</p>
                        </div>
                        <div class="text-right">
                            <p class="font-bold text-success">${formatCurrency(s[1].revenue)}</p>
                        </div>
                    </div>
                `).join('');
            }

            const containerPacientes = document.getElementById('top-pacientes-container');
            if (topPacientes.length === 0) {
                containerPacientes.innerHTML = '<p class="text-outline text-center py-4">No hay datos suficientes.</p>';
            } else {
                containerPacientes.innerHTML = topPacientes.map(p => `
                    <div class="flex justify-between items-center border-b border-surface-container pb-2 last:border-0">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-xs">${getInitials(p[0])}</div>
                            <div>
                                <p class="font-bold text-on-surface truncate max-w-[150px]">${p[0]}</p>
                                <p class="text-label-sm text-on-surface-variant">${p[1].count} atenciones</p>
                            </div>
                        </div>
                        <div class="text-right">
                            <p class="font-bold text-success">${formatCurrency(p[1].revenue)}</p>
                        </div>
                    </div>
                `).join('');
            }
        }

        function showToast(message, type = "success") {
            const toast = document.createElement("div");
            toast.className = `fixed bottom-6 right-6 px-6 py-3 rounded-xl shadow-lg font-bold text-white transition-all transform translate-y-10 opacity-0 z-[100] ${
                type === "success" ? "bg-success" : type === "error" ? "bg-error" : "bg-primary"
            }`;
            toast.textContent = message;
            document.body.appendChild(toast);
            
            // Trigger transition
            setTimeout(() => {
                toast.classList.remove("translate-y-10", "opacity-0");
            }, 100);
            
            // Remove after 3 seconds
            setTimeout(() => {
                toast.classList.add("translate-y-10", "opacity-0");
                setTimeout(() => toast.remove(), 500);
            }, 3000);
        }

        // Global vars for POS removed
        // POS functions removed as they are in cobrar_desktop.html

        function exportarLibroTransacciones() {
            if (!window.todosLosPagos || window.todosLosPagos.length === 0) {
                showToast("No hay transacciones para exportar con los filtros actuales.", "error");
                return;
            }

            let csvContent = "\uFEFF"; // BOM for Excel UTF-8
            csvContent += "ID Transaccion;Fecha;Paciente;Servicio;Metodo;Estado;Monto\n";

            window.todosLosPagos.forEach(pago => {
                const pacienteNombre = pago.pacientes ? pago.pacientes.nombre : 'Desconocido';
                const descripcion = pago.descripcion || (pago.citas ? (pago.citas.tratamiento || pago.citas.motivo || '-') : '-');
                const fechaFormat = new Date(pago.fecha).toLocaleString('es-PE');
                
                const row = [
                    pago.id,
                    fechaFormat,
                    `"${pacienteNombre}"`,
                    `"${descripcion}"`,
                    pago.metodo || '-',
                    pago.estado,
                    Number(pago.monto || 0).toFixed(2)
                ].join(";");
                csvContent += row + "\n";
            });

            // Create invisible link to force download
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", `Reporte_Financiero_Eslava_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }


        document.addEventListener("DOMContentLoaded", async () => {
            await cargarDatosFinancieros();
            
            // URL Param handling removed from Finanzas

            // Filtrado del Libro de Transacciones
            const filtroSelect = document.getElementById('filtro-tipo-transaccion');
            if (filtroSelect) {
                filtroSelect.addEventListener('change', (e) => {
                    const tipo = e.target.value;
                    let pagosFiltrados = window.todosLosPagos || [];
                    if (tipo === 'Pagos') {
                        pagosFiltrados = pagosFiltrados.filter(p => p.estado === 'Completado');
                    } else if (tipo === 'Facturas') {
                        pagosFiltrados = pagosFiltrados.filter(p => p.estado === 'Pendiente' || p.estado === 'Vencido');
                    }
                    renderActividadReciente(pagosFiltrados);
                });
            }
        });
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('../sw.js').then(registration => {
                    console.log('SW registered: ', registration);
                }).catch(registrationError => {
                    console.log('SW registration failed: ', registrationError);
                });
            });
        }
