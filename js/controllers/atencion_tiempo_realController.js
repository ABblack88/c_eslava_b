
        const urlParams = new URLSearchParams(window.location.search);
        const citaId = urlParams.get('cita_id');
        let currentCita = null;
        let currentPaciente = null;

        document.addEventListener("DOMContentLoaded", async () => {
            if (!citaId) {
                alert("ID de cita inválido.");
                window.history.back();
                return;
            }
            await cargarDatosCita();
        });

        function agregarAccionEvo(accion) {
            const textarea = document.getElementById('inputAccionesEvo');
            const current = textarea.value.trim();
            textarea.value = current ? current + '\n' + accion : accion;
            textarea.focus();
        }

        async function cargarServicios() {
            try {
                const { data: servicios, error } = await supabaseClient
                    .from('servicios')
                    .select('*')
                    .order('nombre', { ascending: true });

                if (error) throw error;

                const container = document.getElementById('tratamientosContainer');
                container.innerHTML = '';

                let tratamientosSeleccionados = [];
                if (currentCita && currentCita.tratamiento) {
                    const isCont = currentCita.tratamiento.includes('(Continuación)');
                    if (isCont) {
                        setTimeout(() => { 
                            const chk = document.getElementById('esContinuacionCheckbox');
                            if(chk) chk.checked = true; 
                        }, 50);
                    }
                    tratamientosSeleccionados = currentCita.tratamiento.split(',').map(t => t.trim().replace(' (Continuación)', ''));
                }

                if (servicios && servicios.length > 0) {
                    servicios.forEach(srv => {
                        const isChecked = tratamientosSeleccionados.includes(srv.nombre) ? 'checked' : '';
                        
                        container.innerHTML += `
                            <label class="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-surface-container transition-colors border border-transparent hover:border-outline-variant/30">
                                <input type="checkbox" name="tratamientoCobrado" onchange="calcularSesionesPrevias(); calcularFraccionamiento();" value="${srv.nombre}" data-precio="${srv.precio}" data-duracion="${srv.duracion || 1}" ${isChecked} class="mt-0.5 rounded border-outline-variant text-primary focus:ring-primary h-4 w-4">
                                <div class="flex-1 text-sm leading-tight">
                                    <span class="block font-bold text-on-surface">${srv.nombre}</span>
                                    <span class="block text-xs text-primary font-semibold mt-1">S/. ${parseFloat(srv.precio).toFixed(2)}</span>
                                </div>
                            </label>
                        `;
                    });
                } else {
                    container.innerHTML = '<p class="text-xs text-outline italic col-span-full">Sin servicios disponibles</p>';
                }

                setTimeout(() => calcularSesionesPrevias(), 500);
            } catch (err) {
                console.error("Error cargando servicios:", err);
            }
        }

        
        function toggleFraccionamiento() {
            const container = document.getElementById('fraccionamientoContainer');
            const checkbox = document.getElementById('fraccionarCheckbox');
            if (checkbox && checkbox.checked) {
                if (container) container.classList.remove('hidden');
            } else {
                if (container) container.classList.add('hidden');
            }
            calcularFraccionamiento();
        }

        function calcularFraccionamiento() {
            const resumen = document.getElementById('resumenFraccionamiento');
            if (!resumen) return;
            const checkbox = document.getElementById('fraccionarCheckbox');
            if (!checkbox || !checkbox.checked) {
                resumen.innerHTML = '';
                return;
            }

            // Get total ignoring fractional UI
            const checkboxes = document.querySelectorAll('input[name="tratamientoCobrado"]:checked');
            const isCont = document.getElementById('esContinuacionCheckbox') ? document.getElementById('esContinuacionCheckbox').checked : false;
            let montoTotal = 0;
            checkboxes.forEach(cb => {
                if (!isCont) {
                    montoTotal += parseFloat(cb.getAttribute('data-precio') || 0);
                }
            });

            const inicialInput = parseFloat(document.getElementById('cobroInicial').value) || 0;
            const cuotasInput = parseInt(document.getElementById('numCuotas').value) || 1;

            if (montoTotal <= 0) {
                resumen.innerHTML = 'El costo de la sesión es S/. 0. No se puede fraccionar.';
                return;
            }
            if (inicialInput > montoTotal) {
                resumen.innerHTML = 'El cobro inicial no puede ser mayor al total (S/. ' + montoTotal + ').';
                return;
            }
            const restante = montoTotal - inicialInput;
            const montoPorCuota = restante / cuotasInput;
            resumen.innerHTML = `Total: S/. ${montoTotal.toFixed(2)} | Inicial: S/. ${inicialInput.toFixed(2)} | Resto: ${cuotasInput} cuota(s) de S/. ${montoPorCuota.toFixed(2)}`;
        }

        function getTratamientosSeleccionados() {
            const checkboxes = document.querySelectorAll('input[name="tratamientoCobrado"]:checked');
            const isCont = document.getElementById('esContinuacionCheckbox') ? document.getElementById('esContinuacionCheckbox').checked : false;
            
            let seleccionados = [];
            let montoTotal = 0;
            
            checkboxes.forEach(cb => {
                let name = cb.value;
                if (isCont) {
                    name += ' (Continuación)';
                } else {
                    montoTotal += parseFloat(cb.getAttribute('data-precio') || 0);
                }
                seleccionados.push(name);
            });
            
            let pagosGenerados = [];
            const fraccCheckbox = document.getElementById('fraccionarCheckbox');
            if (fraccCheckbox && fraccCheckbox.checked && !isCont && montoTotal > 0) {
                const inicial = parseFloat(document.getElementById('cobroInicial').value) || 0;
                const cuotas = parseInt(document.getElementById('numCuotas').value) || 1;
                
                if (inicial > 0) {
                    pagosGenerados.push({
                        descripcion: seleccionados.join(', ') + ' (Cobro Inicial)',
                        monto: inicial
                    });
                }
                
                const restante = montoTotal - inicial;
                if (restante > 0) {
                    const montoPorCuota = restante / cuotas;
                    for (let i = 1; i <= cuotas; i++) {
                        pagosGenerados.push({
                            descripcion: seleccionados.join(', ') + ` (Cuota ${i}/${cuotas})`,
                            monto: montoPorCuota
                        });
                    }
                }
            } else {
                pagosGenerados.push({
                    descripcion: seleccionados.join(', '),
                    monto: montoTotal
                });
            }

            return { tratamientos: seleccionados.join(', '), montoTotal, pagosGenerados };
        }

        async function syncPagos(citaId, currentPaciente, currentCita, tratData) {
            if (!currentPaciente) return;
            const { data: pagosExistentes } = await supabaseClient
                .from('pagos')
                .select('id, estado, monto')
                .eq('cita_id', citaId);

            const hasCompletedPagos = pagosExistentes && pagosExistentes.some(p => p.estado === 'Completado' && p.monto > 0);

            if (!hasCompletedPagos) {
                if (pagosExistentes && pagosExistentes.length > 0) {
                    const pendingIds = pagosExistentes.filter(p => p.estado === 'Pendiente' || p.monto === 0).map(p => p.id);
                    if (pendingIds.length > 0) {
                        await supabaseClient.from('pagos').delete().in('id', pendingIds);
                    }
                }
                
                const pagosToInsert = tratData.pagosGenerados.map(pg => ({
                    paciente_id: currentPaciente.id,
                    cita_id: citaId,
                    monto: pg.monto,
                    estado: pg.monto === 0 ? 'Completado' : 'Pendiente',
                    metodo: pg.monto === 0 ? 'Paquete' : 'Efectivo',
                    fecha: new Date().toISOString(),
                    descripcion: pg.descripcion,
                    medico_id: currentCita ? currentCita.consultorio : null
                }));
                
                if (pagosToInsert.length > 0) {
                    await supabaseClient.from('pagos').insert(pagosToInsert);
                }
            }
        }

        async function calcularSesionesPrevias() {
            if (!currentPaciente) return;
            const checkboxes = document.querySelectorAll('input[name="tratamientoCobrado"]:checked');
            const counterText = document.getElementById('sesiones-counter-text');
            const chkContinuacion = document.getElementById('esContinuacionCheckbox');
            if (!counterText) return;

            if (checkboxes.length === 0) {
                counterText.classList.add('hidden');
                if (chkContinuacion) { chkContinuacion.checked = false; chkContinuacion.disabled = true; }
                return;
            }
            
            const selectedCb = checkboxes[0];
            const tratSeleccionado = selectedCb.value;
            const duracion = parseInt(selectedCb.getAttribute('data-duracion')) || 1;
            
            try {
                counterText.classList.remove('hidden');
                counterText.innerHTML = `Calculando historial de "${tratSeleccionado}"...`;
                
                const { data: pastCitas } = await supabaseClient
                    .from('citas')
                    .select('tratamiento')
                    .eq('paciente_id', currentPaciente.id)
                    .neq('estado', 'Cancelada');
                    
                let count = 0;
                if (pastCitas) {
                    pastCitas.forEach(c => {
                        // Buscamos ocurrencias del tratamiento en el historial (incluyendo los que tienen '(Continuación)')
                        if (c.tratamiento && c.tratamiento.includes(tratSeleccionado)) {
                            count++;
                        }
                    });
                }
                
                // Si la cita actual ya tiene este tratamiento guardado, no sumamos +1 a la sesión actual porque 'count' ya lo incluye.
                // Verificamos si en la base actual (currentCita) ya está este tratamiento:
                let isAlreadySavedInThisCita = false;
                if (currentCita && currentCita.tratamiento && currentCita.tratamiento.includes(tratSeleccionado)) {
                    isAlreadySavedInThisCita = true;
                }

                // La sesión actual es:
                // Si ya está guardada en esta cita, la sesión actual es (count % duracion) o duracion.
                // Si NO está guardada, al guardarla será la count + 1.
                let sessionNum = isAlreadySavedInThisCita ? count : count + 1;
                
                // Calculamos en qué número de paquete/ciclo vamos
                let cycleSession = sessionNum % duracion;
                if (cycleSession === 0) cycleSession = duracion; // si es múltiplo exacto, es la última sesión del paquete

                let totalText = duracion > 1 ? (cycleSession === 1 ? `Sesión Inicial (1 de ${duracion})` : `Continuación de Sesión ${cycleSession} de ${duracion}`) : `Cita Única`;
                window.currentSessionText = totalText;
                
                // Logic for Continuación Checkbox
                if (chkContinuacion) {
                    if (duracion <= 1) {
                        // Not a package, cannot be a continuation
                        chkContinuacion.checked = false;
                        chkContinuacion.disabled = true;
                    } else {
                        // It's a package
                        if (sessionNum % duracion === 1) {
                            chkContinuacion.checked = false;
                            chkContinuacion.disabled = true; // First session must be paid
                        } else {
                            chkContinuacion.checked = true; // Auto-check for sessions 2,3,4,5...
                            chkContinuacion.disabled = true; // Force it to be a continuation
                        }
                    }
                }
                
                // Trigger recalculation of totals in case checkbox state changed
                if (typeof calcularFraccionamiento === 'function') calcularFraccionamiento();

                counterText.innerHTML = `
                    <div class="mt-2 bg-secondary-container text-on-secondary-container px-3 py-2 rounded-lg inline-flex items-center gap-2">
                        <span class="material-symbols-outlined text-lg">history</span>
                        <span>
                            Historial: <strong>${count} citas</strong> previas. <br>
                            Esta es la <strong>${totalText}</strong> de este tratamiento.
                        </span>
                    </div>
                `;
            } catch (err) {
                console.error("Error al contar sesiones previas:", err);
                counterText.classList.add('hidden');
            }
        }

        async function cargarDatosCita() {
            try {
                // Fetch cita details with patient
                const { data: cita, error } = await supabaseClient
                    .from('citas')
                    .select('*, pacientes(*)')
                    .eq('id', citaId)
                    .single();

                if (error) throw error;
                currentCita = cita;
                currentPaciente = cita.pacientes;

                await cargarServicios();

                if (currentPaciente) {
                    const elName = document.getElementById('patient-name');
                    if (elName) elName.textContent = currentPaciente.nombre;
                    
                    const elId = document.getElementById('patient-id');
                    if (elId) elId.textContent = 'ID: #' + currentPaciente.id.substring(0,8).toUpperCase();
                    
                    const elPhone = document.getElementById('patient-phone');
                    if (elPhone) elPhone.textContent = currentPaciente.telefono || '--';
                    
                    const elEmail = document.getElementById('patient-email');
                    if (elEmail) elEmail.textContent = currentPaciente.email || '--';
                    
                    const elStatus = document.getElementById('patient-status');
                    if (elStatus) elStatus.textContent = currentPaciente.estado || 'Activo';
                    
                    const elInit = document.getElementById('patient-initials');
                    if (elInit) elInit.textContent = currentPaciente.nombre.charAt(0).toUpperCase();
                    
                    const storedRegistro = localStorage.getItem(`paciente_registro_${currentPaciente.id}`);
                    let alergiasLocal = '';
                    if (storedRegistro) {
                        const parsed = JSON.parse(storedRegistro);
                        if (parsed.alergias) alergiasLocal = parsed.alergias;
                    }
                    const elAllergies = document.getElementById('patient-allergies');
                    if (elAllergies) elAllergies.textContent = alergiasLocal || currentPaciente.notas_medicas || 'Sin alergias o riesgos reportados.';
                }

                const elTrat = document.getElementById('appt-treatment');
                if (elTrat) elTrat.textContent = cita.tratamiento || 'Procedimiento general';
                
                const elTime = document.getElementById('appt-time');
                if (elTime) elTime.textContent = `${cita.fecha} • ${cita.hora}`;

                if (cita.notas) {
                    const notas = cita.notas;
                    const sMatch = notas.match(/\[S\] Subjetivo:\n([\s\S]*?)(?=\n\n\[O\]|\n\nRecomendaciones:|$)/);
                    const oMatch = notas.match(/\[O\] Objetivo:\n([\s\S]*?)(?=\n\n\[A\]|$)/);
                    const aMatch = notas.match(/\[A\] Análisis:\n([\s\S]*?)(?=\n\n\[P\]|$)/);
                    const pMatch = notas.match(/\[P\] Plan:\n([\s\S]*?)$/);

                    if (sMatch || oMatch || aMatch || pMatch) {
                        if (sMatch) document.getElementById('soap_s').value = sMatch[1];
                        if (oMatch) document.getElementById('soap_o').value = oMatch[1];
                        if (aMatch) document.getElementById('soap_a').value = aMatch[1];
                        if (pMatch) document.getElementById('soap_p').value = pMatch[1];
                    } else {
                        // Fallback for old notes
                        document.getElementById('soap_s').value = notas;
                    }
                }

                // Load Treatment Dashboard info
                if (currentPaciente) {
                    const storedTrat = localStorage.getItem(`paciente_tratamiento_${currentPaciente.id}`);
                    if (storedTrat) {
                        const data = JSON.parse(storedTrat);
                        document.getElementById('plan-dashboard-card').classList.remove('hidden');
                        document.getElementById('plan-dashboard-actual').textContent = data.actual || 'Sin definir';
                        document.getElementById('plan-dashboard-siguiente').textContent = data.siguiente || 'Sin definir';
                    }
                }

                if (cita.estado === 'Completada' || cita.estado === 'Completado') {
                    const btnComplete = document.getElementById('btn-complete');
                    btnComplete.innerHTML = `<span class="material-symbols-outlined text-sm">edit_document</span> Guardar Edición`;
                    btnComplete.onclick = editarProcedimiento;
                    
                    const btnSaveDraft = document.getElementById('btn-save-draft');
                    btnSaveDraft.style.display = 'none'; // Hide draft button if already completed
                }
            } catch (err) {
                console.error("Error cargando cita:", err);
                alert("Error al obtener la información de la cita de Supabase.");
            }
        }

        async function guardarBorrador() {
            const s = document.getElementById('soap_s').value;
            const o = document.getElementById('soap_o').value;
            const a = document.getElementById('soap_a').value;
            const p = document.getElementById('soap_p').value;
            const fullObs = `[S] Subjetivo:\n${s}\n\n[O] Objetivo:\n${o}\n\n[A] Análisis:\n${a}\n\n[P] Plan:\n${p}`;
            const tratData = getTratamientosSeleccionados();

            const btn = document.getElementById('btn-save-draft');
            btn.disabled = true;
            btn.textContent = 'Guardando...';

            try {
                const { error } = await supabaseClient
                    .from('citas')
                    .update({ 
                        notas: fullObs,
                        estado: 'En Progreso', // Update state to En Progreso if saving draft
                        tratamiento: tratData.tratamientos
                    })
                    .eq('id', citaId);

                if (error) throw error;
                
                await syncPagos(citaId, currentPaciente, currentCita, tratData);

                document.getElementById('save-status').innerHTML = '<span class="material-symbols-outlined text-sm text-success">cloud_done</span> Borrador guardado exitosamente';
                showToast("Borrador guardado exitosamente", "success");
            } catch (err) {
                console.error("Error al guardar borrador:", err);
                alert("Hubo un error al guardar las observaciones.");
            } finally {
                btn.disabled = false;
                btn.textContent = 'Guardar Borrador';
            }
        }
        async function culminarProcedimiento() {
            const s = document.getElementById('soap_s').value;
            const o = document.getElementById('soap_o').value;
            const a = document.getElementById('soap_a').value;
            const p = document.getElementById('soap_p').value;
            
            const fullObs = `[S] Subjetivo:\n${s}\n\n[O] Objetivo:\n${o}\n\n[A] Análisis:\n${a}\n\n[P] Plan:\n${p}`;

            if (!s.trim() || !o.trim() || !a.trim() || !p.trim()) {
                alert("Por favor complete todos los campos del formato SOAP antes de culminar el procedimiento.");
                return;
            }

            const btn = document.getElementById('btn-complete');
            btn.disabled = true;
            btn.textContent = 'Procesando...';

            try {
                // Prepare notes for the timeline
                const rawAcc = document.getElementById('inputAccionesEvo').value;
                const accList = rawAcc.split('\n').map(x => x.trim()).filter(x => x);

                const now = new Date();
                const timeStr = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

                let bulletsHtml = '';
                if (accList.length > 0) {
                    bulletsHtml = `<div class="mt-4"><p class="text-xs font-bold text-outline uppercase mb-2">Acciones:</p><ul class="space-y-1">` + 
                        accList.map(a => `<li class="text-sm text-on-surface-variant flex items-center gap-2"><span class="material-symbols-outlined text-[14px] text-success">check</span> ${a}</li>`).join('') +
                    `</ul></div>`;
                }

                // Add to LocalStorage timeline history and update Treatment Plan
                if (currentPaciente) {
                    const sessionInfo = window.currentSessionText && window.currentSessionText !== 'Cita Única' ? ` - ${window.currentSessionText}` : '';
                        const metaInfo = ` | Cód. Cita: ${citaId.substring(0,8).toUpperCase()} | Cód. Paciente: ${currentPaciente.id.substring(0,8).toUpperCase()}`;
                        const finalHeader = `Procedimiento: ${currentCita ? currentCita.tratamiento : 'General'}${sessionInfo}${metaInfo}`;
                        
                        const newEvo = {
                            headerText: finalHeader,
                        timeStr: timeStr,
                        notas: fullObs,
                        bulletsHtml: bulletsHtml,
                        imgHtml: '' // In real app, we'd process the images
                    };

                    let evos = JSON.parse(localStorage.getItem(`paciente_evoluciones_${currentPaciente.id}`) || '[]');
                    evos.unshift(newEvo);
                    localStorage.setItem(`paciente_evoluciones_${currentPaciente.id}`, JSON.stringify(evos));

                // Shift Treatment Dashboard (Using SOAP fields)
                if (currentPaciente) {
                    const storedTrat = localStorage.getItem(`paciente_tratamiento_${currentPaciente.id}`);
                    if (storedTrat) {
                        const tratData = JSON.parse(storedTrat);
                        tratData.anterior = s; // Lo referido (diagnostico principal/dolor)
                        tratData.actual = o + "\\n" + a; // Lo observado y analizado
                        tratData.siguiente = p; // Plan
                        localStorage.setItem(`paciente_tratamiento_${currentPaciente.id}`, JSON.stringify(tratData));
                    }
                }
                
                // Insert into consultas_medicas
                const { error: errorEvolucion } = await supabaseClient.from('consultas_medicas').insert([{
                    paciente_id: currentPaciente.id,
                    cita_id: citaId,
                    subjetivo: s,
                    objetivo: o,
                    apreciacion: a,
                    plan: p,
                    medico_tratante: 'Profesional (Atención)' // Or real professional name if available
                }]);
                
                if (errorEvolucion) throw errorEvolucion;

                // Update appointment state to Completado and save final notes
                const tratData = getTratamientosSeleccionados();

                const { error } = await supabaseClient
                    .from('citas')
                    .update({
                        notas: fullObs,
                        estado: 'Completada',
                        tratamiento: tratData.tratamientos
                    })
                    .eq('id', citaId);

                if (error) throw error;

                await syncPagos(citaId, currentPaciente, currentCita, tratData);

                // Enviar a facturación redireccionando
                showToast("Procedimiento culminado. Redirigiendo al calendario...", "success");
                
                setTimeout(() => {
                    const role = new URLSearchParams(window.location.search).get('role') || 'admin';
                    window.location.href = `calendario_dashboard_desktop.html?role=${role}`;
                }, 1500);

            } catch (err) {
                console.error("Error al culminar procedimiento:", err);
                alert("Hubo un error al culminar el procedimiento.");
                btn.disabled = false;
                btn.textContent = 'Culminar Procedimiento';
            }
        }

        async function editarProcedimiento() {
            const s = document.getElementById('soap_s').value;
            const o = document.getElementById('soap_o').value;
            const a = document.getElementById('soap_a').value;
            const p = document.getElementById('soap_p').value;
            const fullObs = `[S] Subjetivo:\n${s}\n\n[O] Objetivo:\n${o}\n\n[A] Análisis:\n${a}\n\n[P] Plan:\n${p}`;
            const tratData = getTratamientosSeleccionados();

            if (!s.trim() || !o.trim() || !a.trim() || !p.trim()) {
                alert("Por favor complete todos los campos del formato SOAP antes de guardar la edición.");
                return;
            }

            const btn = document.getElementById('btn-complete');
            btn.disabled = true;
            btn.innerHTML = `<span class="material-symbols-outlined text-sm">hourglass_empty</span> Guardando...`;

            try {
                const { error } = await supabaseClient
                    .from('citas')
                    .update({
                        notas: fullObs,
                        tratamiento: tratData.tratamientos
                        // no cambiamos el estado, ya es Completado
                    })
                    .eq('id', citaId);

                if (error) throw error;
                
                // Update consultas_medicas
                if (currentPaciente) {
                    await supabaseClient.from('consultas_medicas').update({
                        subjetivo: s,
                        objetivo: o,
                        apreciacion: a,
                        plan: p
                    }).eq('cita_id', citaId);
                }

                await syncPagos(citaId, currentPaciente, currentCita, tratData);

                showToast("Procedimiento actualizado correctamente.", "success");
                setTimeout(() => {
                    const role = new URLSearchParams(window.location.search).get('role') || 'admin';
                    window.location.href = `calendario_dashboard_desktop.html?role=${role}`;
                }, 1500);

            } catch (err) {
                console.error("Error actualizando procedimiento:", err);
                alert("Hubo un error al actualizar el procedimiento.");
            } finally {
                btn.disabled = false;
                btn.innerHTML = `<span class="material-symbols-outlined text-sm">edit_document</span> Guardar Edición`;
            }
        }

        function previewImageDesktop(event) {
            const files = event.target.files;
            const container = document.getElementById('image-preview-container-desktop');
            
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const reader = new FileReader();
                reader.onload = function(e) {
                    const imgDiv = document.createElement('div');
                    imgDiv.className = 'relative min-w-[100px] w-24 h-24 rounded-xl overflow-hidden border border-outline-variant shadow-sm shrink-0 group';
                    imgDiv.innerHTML = `
                        <img src="${e.target.result}" class="w-full h-full object-cover">
                        <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button type="button" onclick="this.closest('.relative').remove()" class="bg-error text-white rounded-full w-8 h-8 flex items-center justify-center shadow-md hover:scale-110 transition-transform">
                                <span class="material-symbols-outlined text-[16px]">delete</span>
                            </button>
                        </div>
                    `;
                    container.appendChild(imgDiv);
                };
                reader.readAsDataURL(file);
            }
            // Reset input so the same files can be selected again if needed
            event.target.value = '';
        }
    