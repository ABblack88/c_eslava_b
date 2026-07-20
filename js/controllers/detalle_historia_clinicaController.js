
        let currentPatientId = null;

        function jalarAPagar() {
            if (!currentPatientId) return;
            const urlParams = new URLSearchParams(window.location.search);
            const role = urlParams.get('role');
            let dest = `pagos_facturacion_desktop.html?paciente_id=${currentPatientId}`;
            if (role) dest += `&role=${role}`;
            window.location.href = dest;
        }

        document.addEventListener('DOMContentLoaded', async () => {
            const urlParams = new URLSearchParams(window.location.search);
            let id = urlParams.get('id');
            
            if (!id) {
                // Try to get first patient as fallback
                try {
                    const { data: pacs } = await supabaseClient.from('pacientes').select('id').limit(1);
                    if (pacs && pacs.length > 0) {
                        id = pacs[0].id;
                    }
                } catch(e) { console.error(e); }
            }

            if (id) {
                currentPatientId = id;
                cargarDatosPaciente(id);
                cargarDatosLocales(id);
            }

            // Forms setup
            document.getElementById('formEditarRegistro').addEventListener('submit', (e) => {
                e.preventDefault();
                guardarDatosRegistro(currentPatientId);
            });

            document.getElementById('formEditarTratamiento').addEventListener('submit', (e) => {
                e.preventDefault();
                guardarDatosTratamiento(currentPatientId);
            });

            document.getElementById('formNuevaEvolucion').addEventListener('submit', (e) => {
                e.preventDefault();
                guardarNuevaEvolucion(currentPatientId);
            });

            // Hover effects
            const timelineItems = document.querySelectorAll('.group');
            timelineItems.forEach(item => {
                item.addEventListener('mouseenter', () => {
                    item.querySelector('.z-10')?.classList.add('scale-110');
                });
                item.addEventListener('mouseleave', () => {
                    item.querySelector('.z-10')?.classList.remove('scale-110');
                });
            });
        });



        async function cargarDatosPaciente(pacId) {
            try {
                // Fetch patient info
                const { data: pac, error } = await supabaseClient.from('pacientes').select('*').eq('id', pacId).single();
                if (error) throw error;

                if (pac) {
                    document.getElementById('patient-name-card').textContent = pac.nombre;
                    const breadcrumb = document.querySelector('nav.text-on-surface-variant span.text-primary');
                    if (breadcrumb) breadcrumb.textContent = pac.nombre;
                    
                    document.getElementById('patient-id-card').textContent = `ID: ${pac.id.substring(0,8).toUpperCase()}`;
                    
                    // Age calculation
                    if (pac.fecha_nacimiento) {
                        const birthDate = new Date(pac.fecha_nacimiento);
                        const age = new Date().getFullYear() - birthDate.getFullYear();
                        document.getElementById('patient-age-card').textContent = `${age} años`;
                        document.getElementById('inputFechaNac').value = pac.fecha_nacimiento;
                    } else {
                        document.getElementById('patient-age-card').textContent = 'N/A';
                    }
                    
                    document.getElementById('patient-phone-card').textContent = pac.telefono || 'Sin teléfono';
                    document.getElementById('patient-email-card').textContent = pac.email || 'Sin correo';
                }

                // Fetch total pending/overdue and paid balances from 'pagos'
                const { data: pagos } = await supabaseClient
                    .from('pagos')
                    .select('id, monto, estado, descripcion, fecha')
                    .eq('paciente_id', pacId)
                    .order('fecha', { ascending: false });

                const totalPendiente = (pagos || []).filter(p => p.estado === 'Pendiente' || p.estado === 'Vencido').reduce((sum, p) => sum + Number(p.monto), 0);
                const totalPagado = (pagos || []).filter(p => p.estado === 'Completado').reduce((sum, p) => sum + Number(p.monto), 0);
                const totalInversion = totalPendiente + totalPagado;
                
                const pendingEl = document.getElementById('patient-pending-balance');
                if(pendingEl) pendingEl.textContent = `S/. ${totalPendiente.toFixed(2)}`;
                const paidEl = document.getElementById('patient-paid-balance');
                if(paidEl) paidEl.textContent = `S/. ${totalPagado.toFixed(2)}`;
                const inversionEl = document.getElementById('patient-total-inversion');
                if(inversionEl) inversionEl.textContent = `S/. ${totalInversion.toFixed(2)}`;

                const transList = document.getElementById('patient-recent-transactions');
                const modalTbody = document.getElementById('modal-facturacion-tbody');
                
                if(document.getElementById('modal-fact-pagado')) document.getElementById('modal-fact-pagado').textContent = `S/. ${totalPagado.toFixed(2)}`;
                if(document.getElementById('modal-fact-pendiente')) document.getElementById('modal-fact-pendiente').textContent = `S/. ${totalPendiente.toFixed(2)}`;

                if (pagos && pagos.length > 0) {
                    if (transList) {
                        transList.innerHTML = pagos.slice(0, 3).map(p => {
                            const dObj = p.fecha ? new Date(p.fecha) : null;
                            const dStr = dObj ? dObj.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '--';
                            return `
                            <li class="flex justify-between border-b border-outline-variant/10 pb-1">
                                <span class="truncate pr-2" title="${p.descripcion || ''}">${dStr} - ${p.descripcion || 'Sin descripción'}</span>
                                <span class="font-bold ${p.estado === 'Completado' ? 'text-success' : 'text-error'}">S/. ${Number(p.monto).toFixed(2)}</span>
                            </li>
                        `}).join('');
                    }
                    
                    if (modalTbody) {
                        modalTbody.innerHTML = pagos.map(p => {
                            const isCompletado = p.estado === 'Completado';
                            const dObj = p.fecha ? new Date(p.fecha) : null;
                            const dStr = dObj ? dObj.toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '--';
                            const badgeHtml = isCompletado 
                                ? '<span class="bg-success/10 text-success px-3 py-1 rounded-full text-label-sm font-bold">Ingreso</span>'
                                : '<span class="bg-warning/10 text-warning px-3 py-1 rounded-full text-label-sm font-bold">Pendiente</span>';
                            const montoHtml = isCompletado 
                                ? `<p class="text-body-md font-bold text-success">+ S/. ${Number(p.monto).toFixed(2)}</p>`
                                : `<p class="text-body-md font-bold text-on-surface">S/. ${Number(p.monto).toFixed(2)}</p>`;
                            const iconHtml = isCompletado
                                ? '<span class="material-symbols-outlined text-success">check_circle</span>'
                                : '<span class="material-symbols-outlined text-warning">schedule</span>';
                                
                            const checkboxHtml = isCompletado 
                                ? '' 
                                : `<input type="checkbox" class="modal-pago-checkbox rounded border-outline-variant text-primary focus:ring-primary h-4 w-4 cursor-pointer" value="${p.id}" onclick="event.stopPropagation()" />`;
                                
                            return `
                            <tr class="group hover:bg-surface-bright transition-colors cursor-pointer" onclick="const cb = this.querySelector('.modal-pago-checkbox'); if(cb) cb.checked = !cb.checked;">
                                <td class="py-4 pl-2">${checkboxHtml}</td>
                                <td class="py-4"><p class="text-body-md">${dStr}</p></td>
                                <td class="py-4"><p class="text-body-md font-bold">${p.descripcion || 'Servicio General'}</p></td>
                                <td class="py-4">${badgeHtml}</td>
                                <td class="py-4 text-right">${montoHtml}</td>
                                <td class="py-4 text-right">${iconHtml}</td>
                            </tr>
                            `;
                        }).join('');
                    }
                } else {
                    if (transList) transList.innerHTML = '<li class="italic text-outline">Sin transacciones</li>';
                    if (modalTbody) modalTbody.innerHTML = '<tr><td colspan="6" class="py-5 text-center text-outline italic">No hay registros financieros.</td></tr>';
                }

                // Fetch patient's appointments/evolution notes
                const { data: citas } = await supabaseClient
                    .from('citas')
                    .select('*')
                    .eq('paciente_id', pacId)
                    .order('fecha', { ascending: false });
                    
                const frecuenciaEl = document.getElementById('patient-frecuencia');
                const avgEl = document.getElementById('patient-monthly-avg');
                
                if(frecuenciaEl && avgEl) {
                    if (citas && citas.length > 0) {
                        const completadas = citas.filter(c => {
                            const est = (c.estado || '').toLowerCase();
                            return est === 'completada' || est === 'completado' || est === 'atendido' || est === 'atendida';
                        }).length;
                        const firstVisit = citas[citas.length - 1].fecha;
                        const fObj = firstVisit ? new Date(firstVisit + (firstVisit.includes('T') ? '' : 'T12:00:00')) : null;
                        const dStr = fObj ? fObj.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '--';
                        
                        // Calculate Months Since First Visit
                        let monthsDiff = 1;
                        if (fObj) {
                            const today = new Date();
                            monthsDiff = (today.getFullYear() - fObj.getFullYear()) * 12 + (today.getMonth() - fObj.getMonth());
                            if (monthsDiff < 1) monthsDiff = 1; // Prevent division by 0 and assume at least 1 month if very recent
                        }
                        
                        const freqMonthly = completadas / monthsDiff;
                        frecuenciaEl.innerHTML = `${completadas} completadas<br><span class="text-outline font-normal">Desde: ${dStr} (${freqMonthly.toFixed(1)}/mes)</span>`;
                        
                        // Calculate Monthly Average Spending
                        const monthlyAvg = totalPagado / monthsDiff;
                        avgEl.textContent = `S/. ${monthlyAvg.toFixed(2)}`;
                    } else {
                        frecuenciaEl.textContent = '0 citas';
                        avgEl.textContent = 'S/. 0.00';
                    }
                }

                // Render upcoming appointments
                const proxContainer = document.getElementById('proximas-citas-container');
                if (proxContainer) {
                    // Extract local date in YYYY-MM-DD
                    const todayDate = new Date();
                    const year = todayDate.getFullYear();
                    const month = String(todayDate.getMonth() + 1).padStart(2, '0');
                    const day = String(todayDate.getDate()).padStart(2, '0');
                    const todayStr = `${year}-${month}-${day}`;
                    
                    // Filter citas where fecha > todayStr
                    const proximasCitas = (citas || []).filter(c => c.fecha > todayStr).sort((a, b) => a.fecha.localeCompare(b.fecha));
                    
                    if (proximasCitas.length > 0) {
                        proxContainer.innerHTML = proximasCitas.map(c => {
                            const dateObj = new Date(c.fecha + 'T12:00:00');
                            const mesStr = dateObj.toLocaleDateString('es-PE', { month: 'short' });
                            const diaStr = dateObj.toLocaleDateString('es-PE', { day: '2-digit' });
                            return `
                            <div class="flex items-center space-x-4 p-3 bg-surface-container-low rounded-lg border-l-4 border-outline-variant hover:border-primary transition-colors">
                                <div class="text-center min-w-[40px]">
                                    <p class="text-[10px] font-bold text-outline uppercase">${mesStr}</p>
                                    <p class="text-lg font-bold text-on-surface">${diaStr}</p>
                                </div>
                                <div class="flex-1">
                                    <p class="font-label-sm text-label-sm font-bold text-on-surface">${c.tratamiento || 'Cita médica'}</p>
                                    <p class="text-[11px] text-on-surface-variant">${c.hora || 'Por confirmar'}</p>
                                </div>
                            </div>
                            `;
                        }).join('');
                    } else {
                        proxContainer.innerHTML = '<div class="text-center py-4 text-outline italic text-sm">No hay citas futuras programadas.</div>';
                    }
                }

                // Update evolution timeline with real appointments
                const timelineContainer = document.querySelector('.relative.space-y-8');
                if (timelineContainer && citas && citas.length > 0) {
                    let timelineHtml = '';
                    citas.forEach((cita, idx) => {
                        const dateStr = new Date(cita.fecha + 'T' + (cita.hora || '12:00:00')).toLocaleString('es-PE', {
                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                        });
                        
                        const estadoLower = (cita.estado || '').toLowerCase();
                        const isCompletada = estadoLower === 'completada' || estadoLower === 'completado' || estadoLower === 'atendido' || estadoLower === 'atendida';
                        const iconName = isCompletada ? 'task_alt' : 'description';
                        const bgClass = isCompletada ? 'bg-success text-white border-success' : 'bg-primary-container text-on-primary border-surface-white';

                        timelineHtml += `
                        <div class="relative flex items-start group">
                            <div class="absolute left-0 mt-1.5 w-10 h-10 rounded-full ${bgClass} border-4 flex items-center justify-center z-10 transition-transform group-hover:scale-110">
                                <span class="material-symbols-outlined text-[20px]">${iconName}</span>
                            </div>
                            <div class="ml-14 bg-surface-container-lowest p-5 rounded-xl border border-surface-container-high w-full">
                                <div class="flex justify-between mb-2">
                                    <h5 class="font-body-md text-body-md font-bold text-on-surface">${cita.tratamiento || 'Consulta Clínica'}</h5>
                                    <span class="font-label-sm text-label-sm text-outline">${dateStr}</span>
                                </div>
                                <p class="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                                    ${cita.observaciones || 'No se registraron observaciones adicionales para esta sesión.'}
                                </p>
                                <div class="mt-4 flex items-center space-x-2">
                                    <span class="font-label-sm text-label-sm font-bold text-primary">${cita.doctor || 'Dr. Alejandro Eslava'}</span>
                                    <span onclick="window.location.href='atencion_tiempo_real_desktop.html?cita_id=${cita.id}&paciente_id=${cita.paciente_id}'" class="bg-surface-container hover:bg-primary/20 hover:text-primary cursor-pointer px-2 py-0.5 rounded text-[10px] text-outline font-bold uppercase transition-colors shadow-sm" title="Abrir detalle de cita">${cita.estado}</span>
                                </div>
                            </div>
                        </div>
                        `;
                    });
                    timelineContainer.innerHTML = timelineHtml;
                } else if (timelineContainer) {
                    timelineContainer.innerHTML = '<p class="text-outline text-center py-6">No hay notas de evolución disponibles.</p>';
                }

            } catch(e) {
                console.error("Error al cargar datos reales del paciente:", e);
            }
        }

        // Logic to store specific medical info in local storage (since the db schema is unknown)
        function cargarDatosLocales(pacId) {
            const storedRegistro = localStorage.getItem(`paciente_registro_${pacId}`);
            if (storedRegistro) {
                const data = JSON.parse(storedRegistro);

                if (data.altura) { document.getElementById('patient-height-card').textContent = data.altura + ' m'; document.getElementById('inputAltura').value = data.altura; }
                if (data.peso) { document.getElementById('patient-weight-card').textContent = data.peso + ' kg'; document.getElementById('inputPeso').value = data.peso; }
                if (data.ocupacion) { document.getElementById('patient-ocupacion-card').textContent = data.ocupacion; document.getElementById('inputOcupacion').value = data.ocupacion; }
                if (data.emergencia) { document.getElementById('patient-emergencia-card').textContent = data.emergencia; document.getElementById('inputContactoEmergencia').value = data.emergencia; }
                if (data.alergias) {
                    document.getElementById('inputAlergias').value = data.alergias;
                    const container = document.getElementById('patient-alergias-container');
                    container.innerHTML = '';
                    data.alergias.split(',').forEach(alergia => {
                        const trimmed = alergia.trim();
                        if(trimmed) {
                            container.innerHTML += `<span class="bg-error-container text-on-error-container px-3 py-1 rounded-full font-label-sm text-label-sm font-bold">${trimmed}</span>`;
                        }
                    });
                }
            }

            const storedTrat = localStorage.getItem(`paciente_tratamiento_${pacId}`);
            if (storedTrat) {
                const data = JSON.parse(storedTrat);
                
                document.getElementById('inputMotivo').value = data.motivo || '';
                document.getElementById('inputHistorial').value = data.historial || '';
                document.getElementById('inputEstilo').value = data.estilo || '';
                document.getElementById('inputEvaluacion').value = data.evaluacion || '';

                const dashboard = document.getElementById('tratamiento-dashboard-lista');
                dashboard.innerHTML = `
                    <div class="bg-surface-container-low p-4 rounded-xl border-l-4 border-primary">
                        <p class="text-xs text-primary font-bold uppercase mb-1">1. Motivo de Consulta y Antecedentes</p>
                        <p class="font-body-md text-sm text-on-surface-variant whitespace-pre-wrap">${data.motivo || '<span class="text-xs italic">Sin definir - Clic en Editar</span>'}</p>
                    </div>
                    <div class="bg-surface-container-low p-4 rounded-xl border-l-4 border-primary">
                        <p class="text-xs text-primary font-bold uppercase mb-1">2. Historial Médico</p>
                        <p class="font-body-md text-sm text-on-surface-variant whitespace-pre-wrap">${data.historial || '<span class="text-xs italic">Sin definir - Clic en Editar</span>'}</p>
                    </div>
                    <div class="bg-surface-container-low p-4 rounded-xl border-l-4 border-secondary">
                        <p class="text-xs text-secondary font-bold uppercase mb-1">3. Estilo de Vida y Hábitos</p>
                        <p class="font-body-md text-sm text-on-surface-variant whitespace-pre-wrap">${data.estilo || '<span class="text-xs italic">Sin definir - Clic en Editar</span>'}</p>
                    </div>
                    <div class="bg-surface-container-low p-4 rounded-xl border-l-4 border-outline">
                        <p class="text-xs text-outline font-bold uppercase mb-1">4. Evaluación Inicial</p>
                        <p class="font-body-md text-sm text-on-surface-variant whitespace-pre-wrap">${data.evaluacion || '<span class="text-xs italic">Sin definir - Clic en Editar</span>'}</p>
                    </div>
                `;
            }
            
            const storedEvos = localStorage.getItem(`paciente_evoluciones_${pacId}`);
            if (storedEvos) {
                const evos = JSON.parse(storedEvos);
                if (evos.length > 0) {
                    const timeline = document.getElementById('timeline-container');
                    timeline.innerHTML = evos.map(evo => `
                    <div class="relative flex items-start group">
                        <div class="absolute left-0 mt-1.5 w-10 h-10 rounded-full bg-success/20 border-4 border-surface-white flex items-center justify-center text-success z-10 transition-transform group-hover:scale-110">
                            <span class="material-symbols-outlined text-[20px]">task_alt</span>
                        </div>
                        <div class="ml-14 bg-surface-container-lowest p-5 rounded-xl border border-surface-container-high w-full">
                            <div class="flex justify-between mb-2">
                                <h5 class="font-body-md text-body-md font-bold text-on-surface">${evo.headerText}</h5>
                                <span class="font-label-sm text-label-sm text-outline">Hoy, ${evo.timeStr}</span>
                            </div>
                            <p class="font-body-md text-body-md text-on-surface-variant">${evo.notas}</p>
                            ${evo.bulletsHtml}
                            ${evo.imgHtml}
                        </div>
                    </div>`).join('');
                }
            }
        }

        async function guardarDatosRegistro(pacId) {
            const btn = document.querySelector('#formEditarRegistro button[type="submit"]');
            btn.disabled = true;
            btn.innerHTML = '<span class="material-symbols-outlined animate-spin text-sm">progress_activity</span> Guardando...';

            const fechaNac = document.getElementById('inputFechaNac').value;
            const data = {
                altura: document.getElementById('inputAltura').value,
                peso: document.getElementById('inputPeso').value,
                alergias: document.getElementById('inputAlergias').value,
                ocupacion: document.getElementById('inputOcupacion').value,
                emergencia: document.getElementById('inputContactoEmergencia').value
            };

            try {
                if (fechaNac) {
                    await supabaseClient.from('pacientes').update({ fecha_nacimiento: fechaNac }).eq('id', pacId);
                    // update age immediately
                    const birthDate = new Date(fechaNac);
                    const age = new Date().getFullYear() - birthDate.getFullYear();
                    document.getElementById('patient-age-card').textContent = `${age} años`;
                }
            } catch(e) {
                console.error('Error saving fecha de nacimiento:', e);
            }

            localStorage.setItem(`paciente_registro_${pacId}`, JSON.stringify(data));
            cargarDatosLocales(pacId);
            document.getElementById('modalEditarRegistro').close();
            btn.disabled = false;
            btn.textContent = 'Guardar Cambios';
        }

        function guardarDatosTratamiento(pacId) {
            const data = {
                motivo: document.getElementById('inputMotivo').value,
                historial: document.getElementById('inputHistorial').value,
                estilo: document.getElementById('inputEstilo').value,
                evaluacion: document.getElementById('inputEvaluacion').value
            };
            localStorage.setItem(`paciente_tratamiento_${pacId}`, JSON.stringify(data));
            cargarDatosLocales(pacId);
            document.getElementById('modalEditarTratamiento').close();
        }

        function handleFileUpload(event) {
            const files = event.target.files;
            if (!files || files.length === 0) return;
            const container = document.getElementById('medical-files-container');
            
            Array.from(files).forEach(file => {
                const now = new Date();
                const dateStr = now.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
                const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
                
                let fileHtml = '';
                if (file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        const imgUrl = e.target.result;
                        fileHtml = `
                        <div class="group cursor-pointer" onclick="abrirPreviewImagen('${imgUrl}')">
                            <div class="relative h-32 w-full rounded-lg overflow-hidden mb-2 border border-outline-variant/30">
                                <img alt="${file.name}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" src="${imgUrl}"/>
                                <div class="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                                    <span class="material-symbols-outlined text-surface-white text-3xl">visibility</span>
                                </div>
                            </div>
                            <div class="flex justify-between items-start">
                                <div class="overflow-hidden">
                                    <p class="font-label-sm text-label-sm font-bold text-on-surface truncate w-40">${file.name}</p>
                                    <p class="text-[10px] text-outline">${dateStr} • ${sizeMB} MB</p>
                                </div>
                                <button onclick="event.stopPropagation(); this.closest('.group').remove();" class="text-error opacity-0 group-hover:opacity-100 transition-opacity"><span class="material-symbols-outlined text-sm">delete</span></button>
                            </div>
                        </div>`;
                        container.insertAdjacentHTML('afterbegin', fileHtml);
                    };
                    reader.readAsDataURL(file);
                } else if (file.type === 'application/pdf') {
                    fileHtml = `
                    <div class="p-4 rounded-xl bg-surface-container-low border border-surface-container hover:border-primary/30 transition-all cursor-pointer flex items-center space-x-4 relative group">
                        <div class="w-12 h-12 bg-error/10 text-error flex items-center justify-center rounded-lg">
                            <span class="material-symbols-outlined text-2xl" data-weight="fill">picture_as_pdf</span>
                        </div>
                        <div class="flex-1 overflow-hidden">
                            <p class="font-label-sm text-label-sm font-bold text-on-surface truncate">${file.name}</p>
                            <p class="text-[10px] text-outline">${dateStr} • ${sizeMB} MB</p>
                        </div>
                        <button onclick="event.stopPropagation(); this.closest('.p-4').remove();" class="absolute right-4 text-error opacity-0 group-hover:opacity-100 transition-opacity"><span class="material-symbols-outlined text-sm">delete</span></button>
                    </div>`;
                    container.insertAdjacentHTML('afterbegin', fileHtml);
                }
            });
            event.target.value = ''; // Reset
        }

        function agregarAccionEvo(accion) {
            const textarea = document.getElementById('inputAccionesEvo');
            const current = textarea.value.trim();
            textarea.value = current ? current + '\n' + accion : accion;
            textarea.focus();
        }

        function guardarNuevaEvolucion(pacId) {
            const tipo = document.getElementById('inputTipoEvo').value;
            const sesion = document.getElementById('inputNumSesionEvo').value;
            const titulo = document.getElementById('inputTituloEvo').value;
            const notas = document.getElementById('inputNotasEvo').value;
            const rawAcc = document.getElementById('inputAccionesEvo').value;
            const accList = rawAcc.split('\n').map(x=>x.trim()).filter(x=>x);

            let headerText = '';
            if (tipo === 'Sesión') {
                headerText = `Sesión ${sesion}: ${titulo}`;
                // Auto-increment session input for next time
                document.getElementById('inputNumSesionEvo').value = parseInt(sesion) + 1;
            } else {
                headerText = `Procedimiento: ${titulo}`;
            }

            const now = new Date();
            const timeStr = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

            let bulletsHtml = '';
            if (accList.length > 0) {
                bulletsHtml = `<div class="mt-4"><p class="text-xs font-bold text-outline uppercase mb-2">Acciones:</p><ul class="space-y-1">` + 
                    accList.map(a => `<li class="text-sm text-on-surface-variant flex items-center gap-2"><span class="material-symbols-outlined text-[14px] text-success">check</span> ${a}</li>`).join('') +
                `</ul></div>`;
            }

            let imgHtml = '';
            const imgInput = document.getElementById('inputImagenEvo');
            if (imgInput.files && imgInput.files[0]) {
                const imgUrl = URL.createObjectURL(imgInput.files[0]);
                imgHtml = `<div class="mt-4 flex gap-2"><img src="${imgUrl}" class="w-24 h-24 object-cover rounded-lg border border-outline-variant cursor-pointer hover:opacity-80 transition-opacity"></div>`;
            }

            const newEvo = {
                headerText,
                timeStr,
                notas,
                bulletsHtml,
                imgHtml
            };

            let evos = JSON.parse(localStorage.getItem(`paciente_evoluciones_${pacId}`) || '[]');
            evos.unshift(newEvo);
            localStorage.setItem(`paciente_evoluciones_${pacId}`, JSON.stringify(evos));

            cargarDatosLocales(pacId);

            document.getElementById('formNuevaEvolucion').reset();
            document.getElementById('evoImgName').textContent = '';
            document.getElementById('modalNuevaEvolucion').close();
        }
    