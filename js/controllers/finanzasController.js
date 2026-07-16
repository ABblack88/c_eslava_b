
        function openModal(id) {
            const el = document.getElementById(id);
            el.classList.remove('hidden');
            setTimeout(() => {
                el.querySelector('div').classList.remove('scale-95', 'opacity-0');
            }, 10);
        }

        function closeModal(id) {
            const el = document.getElementById(id);
            el.querySelector('div').classList.add('scale-95', 'opacity-0');
            setTimeout(() => el.classList.add('hidden'), 300);
        }

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
            try { await supabaseClient.auth.signOut(); } catch(e) {}
            localStorage.clear(); sessionStorage.clear();
            window.location.replace('../index.html');
        }

        // =========================================
        // SISTEMA DE MESES (Book Tabs)
        // =========================================
        const MESES_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                          'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
        const MESES_CORTO = ['Ene','Feb','Mar','Abr','May','Jun',
                             'Jul','Ago','Sep','Oct','Nov','Dic'];

        const hoy = new Date();
        let anioActivo = hoy.getFullYear();
        let mesesActivos = new Set([hoy.getMonth()]);
        let modoAgrupar = false;

        function getMesKey(anio, mes) {
            return `${anio}-${String(mes + 1).padStart(2, '0')}`;
        }

        function getMetaMes(anio, mes) {
            const key = `metaMensual_${getMesKey(anio, mes)}`;
            return parseFloat(localStorage.getItem(key)) || parseFloat(localStorage.getItem('metaMensual')) || 25000;
        }

        function setMetaMes(anio, mes, valor) {
            const key = `metaMensual_${getMesKey(anio, mes)}`;
            localStorage.setItem(key, valor);
            localStorage.setItem('metaMensual', valor); // sync global too
        }

        function toggleAgruparMeses() {
            modoAgrupar = document.getElementById('agrupar-meses-check').checked;
            if (!modoAgrupar && mesesActivos.size > 1) {
                const primero = Array.from(mesesActivos).sort((a,b)=>a-b)[0];
                mesesActivos.clear();
                mesesActivos.add(primero);
            }
            renderBookTabs();
            cargarDatosFinancieros();
        }

        function cambiarAnio(delta) {
            const nuevoAnio = anioActivo + delta;
            if (nuevoAnio > hoy.getFullYear()) return;
            anioActivo = nuevoAnio;
            if (anioActivo === hoy.getFullYear()) {
                const validos = Array.from(mesesActivos).filter(m => m <= hoy.getMonth());
                mesesActivos = new Set(validos);
                if (mesesActivos.size === 0) mesesActivos.add(hoy.getMonth());
            }
            document.getElementById('anio-display').textContent = anioActivo;
            renderBookTabs();
            cargarDatosFinancieros();
        }

        function seleccionarMes(mes) {
            if (anioActivo === hoy.getFullYear() && mes > hoy.getMonth()) return;
            if (modoAgrupar) {
                if (mesesActivos.has(mes)) {
                    if (mesesActivos.size > 1) mesesActivos.delete(mes);
                } else {
                    mesesActivos.add(mes);
                }
            } else {
                mesesActivos.clear();
                mesesActivos.add(mes);
            }
            renderBookTabs();
            cargarDatosFinancieros();
        }

        function renderBookTabs() {
            const container = document.getElementById('bookTabs');
            if (!container) return;
            container.innerHTML = '';
            const esAnioActual = anioActivo === hoy.getFullYear();

            for (let m = 0; m < 12; m++) {
                const esFuturo = esAnioActual && m > hoy.getMonth();
                const esActivo = mesesActivos.has(m);
                const tieneData = !esFuturo; // podría chekear localStorage en el futuro

                const btn = document.createElement('button');
                btn.textContent = MESES_CORTO[m];
                btn.title = MESES_ES[m] + ' ' + anioActivo;
                btn.className = `book-tab ${esActivo ? 'active' : esFuturo ? 'future' : tieneData ? 'past-data' : 'inactive'}`;
                if (!esFuturo) {
                    btn.onclick = () => seleccionarMes(m);
                }
                container.appendChild(btn);
            }
        }

        async function guardarEgreso() {
            const desc = document.getElementById('egreso-descripcion').value.trim();
            const montoVal = parseFloat(document.getElementById('egreso-monto').value);

            if (!desc || isNaN(montoVal) || montoVal <= 0) {
                alert('Por favor ingrese una descripción y un monto válido');
                return;
            }

            try {
                // Guardar como monto negativo para registrar egreso
                const { error } = await FinanzasRepository.insertEgreso(desc, montoVal); /* 
                    descripcion: desc,
                    monto: -montoVal,
                    metodo: 'Egreso',
                    estado: 'Completado',
                    */

                if (error) throw error;

                closeModal('modal-egreso');
                document.getElementById('egreso-descripcion').value = '';
                document.getElementById('egreso-monto').value = '';
                
                await cargarDatosFinancieros();
            } catch (err) {
                console.error(err);
                alert('Error al guardar el egreso');
            }
        }

        async function cargarDatosFinancieros() {
            try {
                let metaMes = 0;
                let tituloMes = "";
                const mesesArr = Array.from(mesesActivos).sort((a,b) => a - b);
                
                mesesArr.forEach(m => metaMes += getMetaMes(anioActivo, m));

                if (mesesArr.length === 1) {
                    tituloMes = `${MESES_ES[mesesArr[0]]} ${anioActivo}`;
                } else {
                    const nombres = mesesArr.map(m => MESES_CORTO[m]).join(', ');
                    tituloMes = `Meses: ${nombres} ${anioActivo}`;
                }

                const igvPorcentaje = parseFloat(localStorage.getItem('igvPorcentaje')) || 18;
                const comisionPOS = parseFloat(localStorage.getItem('comisionPOSNacional')) || 4.5;

                // Actualizar título
                const tituloEl = document.getElementById('mes-titulo');
                if (tituloEl) tituloEl.textContent = `${tituloMes} · Meta: ${formatCurrency(metaMes)}`;
                const anioEl = document.getElementById('anio-display');
                if (anioEl) anioEl.textContent = anioActivo;

                const metaMesEl = document.getElementById('meta-mes');
                if (metaMesEl) metaMesEl.textContent = formatCurrency(metaMes);

                const urlParams = new URLSearchParams(window.location.search);
                const pacienteId = urlParams.get('paciente_id');

                const firstDayISO = new Date(anioActivo, mesesArr[0], 1).toISOString();
                const lastDayISO  = new Date(anioActivo, mesesArr[mesesArr.length-1] + 1, 1).toISOString();

                const { data: pagos, error } = await FinanzasRepository.getPagosPorRangoFecha(firstDayISO, lastDayISO, pacienteId);

                if (error) throw error;

                const { data: productosData } = await FinanzasRepository.getProductos();

                const busquedaPaciente = document.getElementById('filtro-paciente')?.value?.toLowerCase();
                let safePagos = FinanzasService.filterValidPagos(pagos, mesesActivos, !pacienteId ? busquedaPaciente : null);

                safePagos = FinanzasService.sortPagos(safePagos);

                safePagos = FinanzasService.procesarEstadosVencidos(safePagos);

                const { totalIngresos, pendientes, totalPendientes, vencidos, totalVencidos, totalTarjeta } = FinanzasService.calcularMetricas(safePagos);

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
                
                
                const elPos = document.getElementById('total-pos');
                if (elPos) elPos.textContent = formatCurrency(totalTarjeta * (comisionPOS / 100));

                window.todosLosPagos = safePagos;

                renderPagosPendientes(safePagos);
                if (true) {
                    renderTopEstadisticas(safePagos, productosData || []);
                }
                renderActividadReciente(safePagos);
                renderMediosPago(safePagos);
            } catch (error) {
                console.error("Error al cargar datos financieros:", error);
                document.getElementById('pagos-pendientes-container').innerHTML = '<p class="text-error">Error al cargar pagos pendientes.</p>';
                document.getElementById('actividad-reciente-container').innerHTML = '<tr><td colspan="5" class="py-5 text-center text-error">Error al cargar actividad.</td></tr>';
            }
        }

        let mediosPagoChart = null;

        function renderMediosPago(pagos) {
            const metodos = {};
            let totalCompletados = 0;
            let totalIngresos = 0;

            pagos.forEach(p => {
                if (p.estado !== 'Completado') return;
                let metodo = p.metodo || 'No especificado';
                
                // Excluir "Paquete" y "Cortesía" ya que no son métodos de pago que generan ingresos
                if (metodo.toLowerCase().includes('paquete') || metodo.toLowerCase().includes('cortes')) return;
                
                totalCompletados++;
                const monto = Number(p.monto) || 0;
                totalIngresos += monto;
                if (!metodos[metodo]) metodos[metodo] = { count: 0, monto: 0 };
                metodos[metodo].count++;
                metodos[metodo].monto += monto;
            });

            const labels = Object.keys(metodos);
            const dataCounts = labels.map(l => metodos[l].count);
            const dataMontos = labels.map(l => metodos[l].monto);
            const backgroundColors = ['#008097', '#89e4fd', '#ffb877', '#8a4d00', '#6d797d', '#bdc8cd'];

            const ctx = document.getElementById('mediosPagoChart');
            if (!ctx) return;

            if (mediosPagoChart) {
                mediosPagoChart.destroy();
            }
            
            if (totalCompletados === 0) {
                const parent = ctx.parentElement;
                parent.innerHTML = '<p class="text-on-surface-variant text-sm text-center py-4">No hay pagos completados.</p>';
                return;
            }

            mediosPagoChart = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: labels,
                    datasets: [{
                        data: dataMontos, // Mostrar proporción de ingresos en el gráfico
                        backgroundColor: backgroundColors,
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: {
                                font: { size: 10, family: 'Hanken Grotesk' },
                                boxWidth: 10,
                                padding: 10
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const monto = context.parsed;
                                    const pct = totalIngresos > 0 ? ((monto / totalIngresos) * 100).toFixed(1) : 0;
                                    const count = dataCounts[context.dataIndex];
                                    const pctUso = totalCompletados > 0 ? ((count / totalCompletados) * 100).toFixed(1) : 0;
                                    return [
                                        `  S/ ${monto.toFixed(2)} (${pct}% ingresos)`,
                                        `  ${count} uso(s) (${pctUso}% transacciones)`
                                    ];
                                }
                            }
                        }
                    }
                }
            });

            const listContainer = document.getElementById('medios-pago-list');
            if (listContainer) {
                listContainer.innerHTML = labels.map((l, i) => {
                    const count = metodos[l].count;
                    const monto = metodos[l].monto;
                    const pctUso = totalCompletados > 0 ? ((count / totalCompletados) * 100).toFixed(1) : 0;
                    const pctDinero = totalIngresos > 0 ? ((monto / totalIngresos) * 100).toFixed(1) : 0;
                    return `
                    <li class="flex justify-between items-center border-b border-outline-variant/30 py-2 last:border-0 last:pb-0">
                        <span class="flex items-center gap-2"><div class="w-2 h-2 rounded-full" style="background:${backgroundColors[i%backgroundColors.length]}"></div>${l}</span>
                        <div class="text-right">
                            <p class="font-bold text-xs text-on-surface">S/ ${monto.toFixed(2)} <span class="text-primary font-normal">(${pctDinero}%)</span></p>
                            <p class="text-[10px] text-on-surface-variant">${count} usos (${pctUso}%)</p>
                        </div>
                    </li>
                    `;
                }).join('');
            }
        }

        function toggleMediosPagoInfo() {
            const infoBox = document.getElementById('medios-pago-info');
            if (infoBox) {
                infoBox.classList.toggle('hidden');
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
                const { error } = await FinanzasRepository.updatePagoCompletado(pagoId);

                if (error) throw error;
                await cargarDatosFinancieros();
            } catch (error) {
                console.error("Error actualizando pago:", error);
                alert("Hubo un error al marcar el pago como completado.");
            }
        }

        function renderTopEstadisticas(pagos, productos = []) {
            const serviciosStats = {};
            const pacientesStats = {};
            const productosStats = {};

            pagos.forEach(pago => {
                let isServiceRendered = false;
                if (pago.citas) {
                    const estadoCita = (pago.citas.estado || '').toLowerCase();
                    isServiceRendered = estadoCita.includes('completad') || estadoCita.includes('atendid');
                } else {
                    isServiceRendered = pago.estado === 'Completado';
                }

                if (!isServiceRendered) return;
                
                const desc = pago.descripcion || '';
                if (desc.startsWith('Productos:')) {
                    const prodPart = desc.replace('Productos:', '').split('[')[0];
                    const items = prodPart.split(',');
                    items.forEach(item => {
                        const match = item.match(/(.*?)\s*\(x(\d+)\)/);
                        if (match) {
                            const pName = match[1].trim();
                            const qty = parseInt(match[2], 10);
                            
                            if (!productosStats[pName]) {
                                productosStats[pName] = { count: 0, revenue: 0, cost: 0 };
                            }
                            productosStats[pName].count += qty;
                            
                            const pDb = productos.find(p => p.nombre.toLowerCase() === pName.toLowerCase());
                            const pCosto = pDb ? (parseFloat(pDb.valor_compra) || 0) : 0;
                            const pVenta = pDb ? (parseFloat(pDb.precio) || 0) : 0;
                            
                            productosStats[pName].revenue += (pVenta * qty);
                            productosStats[pName].cost += (pCosto * qty);
                        }
                    });
                }

                let motivo = pago.servicio_realizado || (pago.citas ? (pago.citas.tratamiento || 'Consulta') : 'Venta General');
                if (motivo.includes(' (Continuación)')) {
                    motivo = motivo.replace(' (Continuación)', '');
                }
                if (!desc.startsWith('Productos:')) {
                    if (!serviciosStats[motivo]) {
                        serviciosStats[motivo] = { count: 0, revenue: 0 };
                    }
                    serviciosStats[motivo].count += 1;
                    serviciosStats[motivo].revenue += Number(pago.monto);
                }

                // Pacientes
                const paciente = pago.pacientes ? pago.pacientes.nombre : 'Paciente Desconocido';
                if (!pacientesStats[paciente]) {
                    pacientesStats[paciente] = { count: 0, revenue: 0, servicios: {} };
                }
                pacientesStats[paciente].count += 1;
                pacientesStats[paciente].revenue += Number(pago.monto);
                
                if (!pacientesStats[paciente].servicios[motivo]) {
                    pacientesStats[paciente].servicios[motivo] = 0;
                }
                pacientesStats[paciente].servicios[motivo] += 1;
            });

            const topServicios = Object.entries(serviciosStats)
                .sort((a, b) => b[1].count - a[1].count || b[1].revenue - a[1].revenue)
                .slice(0, 5);

            const topPacientes = Object.entries(pacientesStats)
                .sort((a, b) => b[1].count - a[1].count || b[1].revenue - a[1].revenue)
                .slice(0, 5);
                
            const topProductos = Object.entries(productosStats)
                .sort((a, b) => b[1].count - a[1].count || b[1].revenue - a[1].revenue)
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
                containerPacientes.innerHTML = topPacientes.map(p => {
                    const serviciosList = Object.entries(p[1].servicios)
                        .sort((a,b) => b[1] - a[1])
                        .slice(0, 3)
                        .map(s => `<span class="block">• ${s[0]} (${s[1]} veces)</span>`)
                        .join('');
                        
                    return `
                    <div class="flex justify-between items-center border-b border-surface-container pb-2 last:border-0 relative group">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-xs">${getInitials(p[0])}</div>
                            <div>
                                <p class="font-bold text-on-surface truncate max-w-[150px] cursor-default">${p[0]}</p>
                                <p class="text-label-sm text-on-surface-variant">${p[1].count} atenciones</p>
                            </div>
                        </div>
                        <div class="text-right">
                            <p class="font-bold text-success">${formatCurrency(p[1].revenue)}</p>
                        </div>
                        
                        <div class="absolute inset-0 bg-surface-container-high/90 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex flex-col justify-center px-4 py-1">
                            <p class="font-bold text-xs text-primary mb-1">Servicios más usados:</p>
                            <div class="text-[10px] text-on-surface-variant leading-tight">${serviciosList}</div>
                        </div>
                    </div>
                    `;
                }).join('');
            }
            
            const containerProductos = document.getElementById('top-productos-container');
            if (topProductos.length === 0) {
                containerProductos.innerHTML = '<p class="text-outline text-center py-4">No hay datos suficientes.</p>';
            } else {
                containerProductos.innerHTML = topProductos.map(p => {
                    const ganancia = p[1].revenue - p[1].cost;
                    return `
                    <div class="flex justify-between items-center border-b border-surface-container pb-2 last:border-0">
                        <div>
                            <p class="font-bold text-on-surface line-clamp-1" title="${p[0]}">${p[0]} (${p[1].count})</p>
                            <p class="text-label-sm text-on-surface-variant">Rotación: ${p[1].count} und(s)</p>
                        </div>
                        <div class="text-right">
                            <p class="font-bold text-success" title="Ganancia Neta">${formatCurrency(ganancia)} <span class="text-[10px] text-success/70">(G)</span></p>
                        </div>
                    </div>
                    `;
                }).join('');
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
                const descripcion = pago.descripcion || (pago.citas ? (pago.citas.tratamiento || '-') : '-');
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

            csvContent += "\n\nRESUMEN DE MEDIOS DE PAGO (Pagos Completados)\n";
            csvContent += "Metodo;Cantidad;Total Monto (S/)\n";
            const metodosAgrupados = {};
            window.todosLosPagos.forEach(p => {
                if (p.estado === 'Completado') {
                    const m = p.metodo || 'No especificado';
                    if (!metodosAgrupados[m]) metodosAgrupados[m] = { qty: 0, sum: 0 };
                    metodosAgrupados[m].qty++;
                    metodosAgrupados[m].sum += Number(p.monto || 0);
                }
            });
            for (const m in metodosAgrupados) {
                csvContent += `${m};${metodosAgrupados[m].qty};${metodosAgrupados[m].sum.toFixed(2)}\n`;
            }

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
            // Inicializar navegación de meses
            document.getElementById('anio-display').textContent = anioActivo;
            renderBookTabs();
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
                    } else if (tipo === 'Pendientes') {
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

document.addEventListener('DOMContentLoaded', cargarDatosFinancieros);
