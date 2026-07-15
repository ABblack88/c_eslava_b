
        const MESES_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
        const MESES_CORTO = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
        
        let anioActivo = new Date().getFullYear();
        let mesActivo = new Date().getMonth();
        let chartInstance = null;

        function cambiarAnio(delta) {
            anioActivo += delta;
            document.getElementById('anio-display').textContent = anioActivo;
            renderBookTabs();
            cargarDatosEstrategicos();
        }

        function seleccionarMes(mes) {
            mesActivo = mes;
            renderBookTabs();
            cargarDatosEstrategicos();
        }

        function renderBookTabs() {
            const container = document.getElementById('bookTabs');
            if (!container) return;
            container.innerHTML = '';
            for (let m = 0; m < 12; m++) {
                const btn = document.createElement('button');
                btn.textContent = MESES_CORTO[m];
                btn.className = `book-tab ${m === mesActivo ? 'active' : 'inactive'}`;
                btn.onclick = () => seleccionarMes(m);
                container.appendChild(btn);
            }
            document.getElementById('mes-titulo').textContent = `${MESES_ES[mesActivo]} ${anioActivo}`;
        }

        async function cargarDatosEstrategicos() {
            try {
                // Fechas para el mes actual
                const startMes = new Date(anioActivo, mesActivo, 1).toISOString();
                const endMes = new Date(anioActivo, mesActivo + 1, 1).toISOString();
                
                // Fechas para segmentación (últimos 3 meses desde el final del mes activo)
                const endMesDate = new Date(anioActivo, mesActivo + 1, 0);
                const start3Meses = new Date(anioActivo, mesActivo - 2, 1).toISOString();
                
                // 1. Obtener Citas (para ocupación, no-shows, inactividad)
                const { data: citasData, error: citasError } = await supabaseClient
                    .from('citas')
                    .select('id, paciente_id, fecha, estado, tratamiento');
                
                // 2. Obtener Servicios (para duración y precio)
                const { data: serviciosData } = await supabaseClient.from('servicios').select('*');
                const serviciosMap = {};
                serviciosData.forEach(s => serviciosMap[s.nombre] = s);

                // 3. Obtener Pagos (para tickets promedio)
                const { data: pagosData } = await supabaseClient
                    .from('pagos')
                    .select('id, paciente_id, monto, estado, fecha')
                    .eq('estado', 'Completado');

                // 4. Obtener Pacientes
                const { data: pacientesData } = await supabaseClient.from('pacientes').select('id, nombre, telefono');

                // 5. Obtener Feriados del Mes
                const { data: feriadosData } = await supabaseClient
                    .from('dias_feriados')
                    .select('fecha')
                    .gte('fecha', startMes.substring(0,10))
                    .lt('fecha', endMes.substring(0,10));

                if (citasError) throw citasError;

                // --- MÓDULO 1: Ocupación ---
                const citasDelMes = citasData.filter(c => c.fecha >= startMes.substring(0,10) && c.fecha <= endMes.substring(0,10));
                
                let minutosOcupados = 0;
                let perdidaNoShow = 0;
                
                citasDelMes.forEach(cita => {
                    const serv = serviciosMap[cita.tratamiento];
                    const duracion = serv ? (serv.duracion || 60) : 60; // default 60min
                    const precio = serv ? (Number(serv.precio) || 0) : 0;
                    
                    if (cita.estado === 'Completada' || cita.estado === 'Atendida') {
                        minutosOcupados += duracion;
                    } else if (cita.estado === 'Cancelada' || cita.estado === 'No Asistió') {
                        perdidaNoShow += precio;
                    }
                });

                const horasOcupadas = minutosOcupados / 60;
                const camillas = Number(document.getElementById('input-camillas').value) || 3;
                
                // Calcular feriados reales desde BD
                let feriados = 0;
                if (feriadosData) {
                    feriados = feriadosData.length;
                    document.getElementById('input-feriados').value = feriados;
                }
                
                // Capacidad: Asumimos (22 - feriados) días hábiles x 8 horas x camillas
                const diasHabiles = Math.max(0, 22 - feriados);
                const capacidadEstimada = diasHabiles * 8 * camillas;
                const ocupacionPerc = capacidadEstimada > 0 ? (horasOcupadas / capacidadEstimada) * 100 : 0;
                
                // Costo fijo estimado (dinámico desde input)
                const costoFijoHora = Number(document.getElementById('input-costo-fijo').value) || 0;
                const horasVacias = Math.max(0, capacidadEstimada - horasOcupadas);
                const costoOcupacionVacia = horasVacias * costoFijoHora;

                document.getElementById('horas-ocupadas').textContent = horasOcupadas.toFixed(1) + ' h';
                document.getElementById('capacidad-total').textContent = capacidadEstimada + ' h';
                document.getElementById('porcentaje-ocupacion').textContent = ocupacionPerc.toFixed(1) + '%';
                document.getElementById('costo-vacia').textContent = 'S/ ' + costoOcupacionVacia.toFixed(2);
                document.getElementById('perdida-noshow').textContent = 'S/ ' + perdidaNoShow.toFixed(2);

                // --- MÓDULO 3: Pacientes en Riesgo (>45 días) ---
                const hoy = new Date();
                const pacientesMap = {};
                pacientesData.forEach(p => pacientesMap[p.id] = p);
                window.pacientesMapLocal = pacientesMap;
                
                const ultimaCitaPorPaciente = {};
                citasData.filter(c => c.estado === 'Completada' || c.estado === 'Atendida').forEach(c => {
                    const f = new Date(c.fecha);
                    if (!ultimaCitaPorPaciente[c.paciente_id] || f > ultimaCitaPorPaciente[c.paciente_id].fechaObj) {
                        ultimaCitaPorPaciente[c.paciente_id] = { fecha: c.fecha, fechaObj: f, tratamiento: c.tratamiento };
                    }
                });

                const enRiesgo = [];
                for (const pid in ultimaCitaPorPaciente) {
                    const diffDays = (hoy - ultimaCitaPorPaciente[pid].fechaObj) / (1000 * 60 * 60 * 24);
                    if (diffDays > 45) {
                        enRiesgo.push({
                            paciente: pacientesMap[pid],
                            dias: Math.floor(diffDays),
                            ultima: ultimaCitaPorPaciente[pid]
                        });
                    }
                }
                
                enRiesgo.sort((a,b) => b.dias - a.dias);
                document.getElementById('total-riesgo').textContent = enRiesgo.length;
                
                const listaHtml = enRiesgo.slice(0, 20).map(r => `
                    <div class="border-b border-surface-container pb-2">
                        <p class="font-bold text-sm">${r.paciente?.nombre || 'Desconocido'}</p>
                        <p class="text-xs text-error">Hace ${r.dias} días - ${r.ultima.tratamiento}</p>
                    </div>
                `).join('');
                document.getElementById('lista-riesgo').innerHTML = listaHtml || '<p class="text-sm">No hay pacientes en riesgo.</p>';

                // --- MÓDULO 2: Segmentación (Últimos 3 meses) ---
                const citas3Meses = citasData.filter(c => c.fecha >= start3Meses.substring(0,10) && c.fecha <= endMesDate.toISOString().substring(0,10) && (c.estado === 'Completada' || c.estado === 'Atendida'));
                
                const conteoPorPaciente = {};
                citas3Meses.forEach(c => {
                    conteoPorPaciente[c.paciente_id] = (conteoPorPaciente[c.paciente_id] || 0) + 1;
                });

                const segmentos = {
                    'Semanal (4+ en 30d)': { count: 0, ids: new Set() },
                    'Quincenal (2-3 en 30d)': { count: 0, ids: new Set() },
                    'Mensual (1 en 30d)': { count: 0, ids: new Set() },
                    'Esporádico': { count: 0, ids: new Set() }
                };

                for (const pid in conteoPorPaciente) {
                    const freq = conteoPorPaciente[pid];
                    // Normalizado a 3 meses: Semanal > 12, Quincenal > 6, Mensual > 3
                    if (freq >= 12) { segmentos['Semanal (4+ en 30d)'].count++; segmentos['Semanal (4+ en 30d)'].ids.add(pid); }
                    else if (freq >= 6) { segmentos['Quincenal (2-3 en 30d)'].count++; segmentos['Quincenal (2-3 en 30d)'].ids.add(pid); }
                    else if (freq >= 3) { segmentos['Mensual (1 en 30d)'].count++; segmentos['Mensual (1 en 30d)'].ids.add(pid); }
                    else { segmentos['Esporádico'].count++; segmentos['Esporádico'].ids.add(pid); }
                }

                // Calcular Ticket Promedio por Segmento
                const pagosMap = {}; // pid -> totalPagado
                pagosData.forEach(p => {
                    pagosMap[p.paciente_id] = (pagosMap[p.paciente_id] || 0) + Number(p.monto);
                });

                window.segmentosDataLocal = segmentos;
                let tablaHtml = '';
                const chartLabels = [];
                const chartData = [];

                for (const seg in segmentos) {
                    chartLabels.push(seg);
                    chartData.push(segmentos[seg].count);
                    
                    let totalIngresoSeg = 0;
                    segmentos[seg].ids.forEach(pid => {
                        totalIngresoSeg += (pagosMap[pid] || 0);
                    });
                    
                    const ticketPromedio = segmentos[seg].count > 0 ? totalIngresoSeg / segmentos[seg].count : 0;
                    // LTV mensual estimado: Semanal(x4), Quincenal(x2), Mensual(x1), Espo(x0.33)
                    let multiplier = 0.33;
                    if(seg.includes('Semanal')) multiplier = 4;
                    else if(seg.includes('Quincenal')) multiplier = 2;
                    else if(seg.includes('Mensual')) multiplier = 1;
                    
                    const ltv = ticketPromedio * multiplier;

                    tablaHtml += `
                        <tr class="text-sm">
                            <td class="py-3 font-semibold">${seg}</td>
                            <td class="py-3"><button class="text-primary hover:underline font-semibold" onclick="verPacientesSegmento('${seg}')" title="Ver pacientes">${segmentos[seg].count}</button></td>
                            <td class="py-3 text-right text-primary">S/ ${ticketPromedio.toFixed(2)}</td>
                            <td class="py-3 text-right font-bold">S/ ${ltv.toFixed(2)}</td>
                        </tr>
                    `;
                }
                
                document.getElementById('tabla-segmentos').innerHTML = tablaHtml;

                // --- MÓDULO 4: Top Servicios ---
                const statsServicios = {};
                let totalIngresos3Meses = 0;

                citas3Meses.forEach(c => {
                    const serv = c.tratamiento;
                    if (!statsServicios[serv]) {
                        statsServicios[serv] = { pacientes: new Set(), ingresos: 0 };
                    }
                    statsServicios[serv].pacientes.add(c.paciente_id);
                    const servInfo = serviciosMap[serv];
                    const precioServ = servInfo ? Number(servInfo.precio) || 0 : 0;
                    statsServicios[serv].ingresos += precioServ;
                    totalIngresos3Meses += precioServ;
                });

                window.statsServiciosLocal = statsServicios;
                const topServiciosArray = Object.keys(statsServicios).map(k => {
                    const st = statsServicios[k];
                    return {
                        nombre: k,
                        pacientes: st.pacientes.size,
                        ingresos: st.ingresos,
                        porcentaje: totalIngresos3Meses > 0 ? (st.ingresos / totalIngresos3Meses) * 100 : 0,
                        ticketPromedio: st.pacientes.size > 0 ? st.ingresos / st.pacientes.size : 0,
                        vvcEstimado: (st.ingresos / 3) // Extrapolado a 1 mes
                    };
                }).sort((a,b) => b.ingresos - a.ingresos);

                let tablaTopServiciosHtml = '';
                topServiciosArray.forEach(s => {
                    tablaTopServiciosHtml += `
                        <tr class="text-sm hover:bg-surface-container-low transition-colors">
                            <td class="py-4 font-semibold">${s.nombre}</td>
                            <td class="py-4"><button class="text-primary hover:underline font-semibold" onclick="verPacientesServicio('${s.nombre}')" title="Ver pacientes">${s.pacientes}</button></td>
                            <td class="py-4">
                                <div class="flex items-center">
                                    <span class="w-10 inline-block">${s.porcentaje.toFixed(1)}%</span>
                                    <div class="w-20 h-2 bg-surface-container rounded-full ml-2 overflow-hidden">
                                        <div class="h-full bg-indigo-500 rounded-full" style="width: ${s.porcentaje}%"></div>
                                    </div>
                                </div>
                            </td>
                            <td class="py-4 text-right text-primary">S/ ${s.ticketPromedio.toFixed(2)}</td>
                            <td class="py-4 text-right font-bold">S/ ${s.vvcEstimado.toFixed(2)}</td>
                        </tr>
                    `;
                });
                if(topServiciosArray.length === 0) {
                    tablaTopServiciosHtml = '<tr><td colspan="5" class="py-4 text-center">No hay datos suficientes</td></tr>';
                }
                
                const tableTopServiciosEl = document.getElementById('tabla-top-servicios');
                if (tableTopServiciosEl) tableTopServiciosEl.innerHTML = tablaTopServiciosHtml;

                // Render Chart
                if (chartInstance) chartInstance.destroy();
                const ctx = document.getElementById('segmentacionChart').getContext('2d');
                chartInstance = new Chart(ctx, {
                    type: 'doughnut',
                    data: {
                        labels: chartLabels,
                        datasets: [{
                            data: chartData,
                            backgroundColor: ['#006578', '#66d5f1', '#ffb877', '#bdc8cd']
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { position: 'bottom' } }
                    }
                });

            } catch (err) {
                console.error("Error cargando dashboard:", err);
            }
        }

        function verPacientesSegmento(segmento) {
            const data = window.segmentosDataLocal[segmento];
            if (!data) return;
            mostrarModalPacientes(`Pacientes: ${segmento}`, data.ids);
        }

        function verPacientesServicio(servicio) {
            const data = window.statsServiciosLocal[servicio];
            if (!data) return;
            mostrarModalPacientes(`Pacientes de: ${servicio}`, data.pacientes);
        }

        function mostrarModalPacientes(titulo, idsSet) {
            document.getElementById('modalPacientesTitle').textContent = titulo;
            let html = '';
            if (!idsSet || idsSet.size === 0) {
                html = '<p class="text-sm text-on-surface-variant">No hay pacientes.</p>';
            } else {
                idsSet.forEach(id => {
                    const pac = window.pacientesMapLocal[id];
                    const nombre = pac ? pac.nombre : 'Desconocido';
                    const telefono = pac && pac.telefono ? pac.telefono : '';
                    html += `<div class="border-b border-surface-container pb-2 flex justify-between items-center">
                                <span class="font-bold text-sm">${nombre}</span>
                                <span class="text-xs text-on-surface-variant">${telefono}</span>
                             </div>`;
                });
            }
            document.getElementById('modalPacientesContent').innerHTML = html;
            document.getElementById('modalPacientesList').showModal();
        }

        document.addEventListener("DOMContentLoaded", () => {
            document.getElementById('anio-display').textContent = anioActivo;
            renderBookTabs();
            cargarDatosEstrategicos();
        });
    