// js/controllers/calendarioController.js


    function verProximaCita() {
        if (!window.proximasCitas || window.proximasCitas.length === 0) {
            alert('No tienes citas pendientes para el resto del día.');
            return;
        }
        const proxima = window.proximasCitas[0];
        let horaFormat = proxima.hora;
        if (proxima.hora) {
            const [h, m] = proxima.hora.split(':');
            const hInt = parseInt(h);
            const ampm = hInt >= 12 ? 'PM' : 'AM';
            const h12 = hInt % 12 || 12;
            horaFormat = `${h12}:${m} ${ampm}`;
        }
        alert(`Tu próxima cita es hoy a las ${horaFormat} con ${proxima.pacientes?.nombre || 'Paciente'}\nTratamiento: ${proxima.tratamiento}\nTratante: ${proxima.consultorio}`);
    }

    // Set today's date as default in date input if it exists
    const apptDateEl = document.getElementById('appt-date');
    if (apptDateEl) apptDateEl.value = new Date().toISOString().split('T')[0];

    // Enforce role-based element locking/hiding inside the page

    function populateTimeOptions() {
        const selectTime = document.getElementById('appt-time');
        const selectTimeEnd = document.getElementById('appt-time-end');
        if (!selectTime) return;
        
        const dateInput = document.getElementById('appt-date')?.value;
        const todayStr = new Date().toISOString().split('T')[0];
        const isToday = (dateInput === todayStr) || (!dateInput); // Fallback to today
        
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        
        const isEditMode = !!window.editingCitaId;
        
        const opening = localStorage.getItem('horaApertura') || '08:00';
        const closing = localStorage.getItem('horaCierre') || '20:00';
        
        const openHour = parseInt(opening.split(':')[0]);
        const closeHour = parseInt(closing.split(':')[0]);
        
        const prevValue = selectTime.value;
        let prevEndValue = selectTimeEnd ? selectTimeEnd.value : null;
        
        selectTime.innerHTML = '';
        if (selectTimeEnd) selectTimeEnd.innerHTML = '<option value="">(Sin definir)</option>';
        
        let hasOptions = false;
        
        for (let i = openHour; i < closeHour; i++) {
            let h12 = i % 12 || 12;
            let ampm = i >= 12 ? 'PM' : 'AM';
            let formattedH = h12.toString().padStart(2, '0');
            
            const val00 = `${formattedH}:00 ${ampm}`;
            const val30 = `${formattedH}:30 ${ampm}`;
            
            if (!isToday || isEditMode || i > currentHour) {
                selectTime.innerHTML += `<option value="${val00}">${val00}</option>`;
                if (selectTimeEnd) selectTimeEnd.innerHTML += `<option value="${val00}">${val00}</option>`;
                hasOptions = true;
            }
            if (!isToday || isEditMode || i > currentHour || (i === currentHour && currentMinute <= 30)) {
                selectTime.innerHTML += `<option value="${val30}">${val30}</option>`;
                if (selectTimeEnd) selectTimeEnd.innerHTML += `<option value="${val30}">${val30}</option>`;
                hasOptions = true;
            }
        }
        
        if (!hasOptions) {
             selectTime.innerHTML = `<option value="">No hay horarios disponibles hoy</option>`;
             if (selectTimeEnd) selectTimeEnd.innerHTML = `<option value="">No hay horarios disponibles hoy</option>`;
        }
        if (prevValue && selectTime.querySelector(`option[value="${prevValue}"]`)) {
            selectTime.value = prevValue;
        }
        if (selectTimeEnd && prevEndValue && selectTimeEnd.querySelector(`option[value="${prevEndValue}"]`)) {
            selectTimeEnd.value = prevEndValue;
        }
    }

    // Modal Control Functions
    function openAppointmentModal(fecha = null, hora = null) {
        document.getElementById("new-appointment-modal").classList.remove("hidden");

        window.editingCitaId = null;
        const modalTitle = document.querySelector('#new-appointment-modal h3');
        if (modalTitle) modalTitle.textContent = 'Agendar Nueva Cita';
        const submitBtn = document.querySelector('#new-appointment-form button[type="submit"]');
        if (submitBtn) submitBtn.textContent = 'Guardar Cita';

        if (fecha) document.getElementById('appt-date').value = fecha;
        populateTimeOptions();
        if (hora) document.getElementById('appt-time').value = hora;
    }

    function closeAppointmentModal() {
        document.getElementById("new-appointment-modal").classList.add("hidden");
        document.getElementById("new-appointment-form").reset();
        document.getElementById('appt-date').value = new Date().toISOString().split('T')[0];
        populateTimeOptions();
    }

    function closeSuccessModal() {
        document.getElementById("success-confirmation-modal").classList.add("hidden");
    }

    async function abrirOpcionesCita(citaId) {
        const dialog = document.getElementById('modalOpcionesCita');
        dialog.showModal();
        
        try {
            const { data: cita, error } = await CalendarioRepository.getCitaConPaciente(citaId);
                
            if (error) throw error;
            
            window.currentCitaId = citaId;
            document.getElementById('opt-paciente-nombre').textContent = cita.pacientes?.nombre || 'Desconocido';
            document.getElementById('opt-tratamiento').textContent = cita.tratamiento || 'Procedimiento general';
            document.getElementById('opt-fecha-hora').textContent = `Fecha: ${cita.fecha} • ${cita.hora}`;
            document.getElementById('opt-consultorio').textContent = `Tratante: ${cita.consultorio}`;
            document.getElementById('opt-estado').textContent = `Estado: ${cita.estado}`;
            
            const selectEstado = document.getElementById('select-opt-estado');
            if (selectEstado) {
                let estadoNormalized = cita.estado;
                if (estadoNormalized === 'Pendiente') estadoNormalized = 'Por Confirmar';
                if (estadoNormalized === 'Cancelado' || estadoNormalized === 'Cancelada') estadoNormalized = 'Por Confirmar';
                
                const hasCompletada = Array.from(selectEstado.options).some(opt => opt.value === 'Completada');
                if (estadoNormalized === 'Completada' && !hasCompletada) {
                    const opt = document.createElement('option');
                    opt.value = 'Completada';
                    opt.text = 'Completada';
                    selectEstado.add(opt);
                } else if (estadoNormalized !== 'Completada' && hasCompletada) {
                    Array.from(selectEstado.options).forEach(opt => {
                        if (opt.value === 'Completada') opt.remove();
                    });
                }

                selectEstado.value = estadoNormalized;
                
                if (estadoNormalized === 'En Progreso' || estadoNormalized === 'Completada') {
                    selectEstado.disabled = true;
                    selectEstado.classList.add('opacity-70', 'cursor-not-allowed');
                    selectEstado.classList.remove('cursor-pointer');
                } else {
                    selectEstado.disabled = false;
                    selectEstado.classList.remove('opacity-70', 'cursor-not-allowed');
                    selectEstado.classList.add('cursor-pointer');
                }
            }
            
            // Set up button actions
            const role = new URLSearchParams(window.location.search).get('role') || 'admin';
            
            const btnAtender = document.getElementById('btn-opt-atender');
            if (cita.estado === 'Completado' || cita.estado === 'Completada') {
                btnAtender.innerHTML = `<span class="material-symbols-outlined">edit_document</span> Editar Cita`;
            } else {
                
            if (cita.estado === 'Completada' || cita.estado === 'Completado') {
                btnAtender.innerHTML = `<span class="material-symbols-outlined text-lg">edit_document</span> Editar Procedimiento`;
            } else {
                btnAtender.innerHTML = `<span class="material-symbols-outlined text-lg">clinical_notes</span> Atender Cita`;
            }

            }

            
            const btnEditar = document.getElementById('btn-opt-editar');
            if (btnEditar) {
                btnEditar.onclick = () => {
                    dialog.close();
                    document.getElementById('appt-patient-name').value = cita.pacientes?.nombre || '';
                    document.getElementById('appt-patient-email').value = cita.pacientes?.email || '';
                    document.getElementById('appt-patient-phone').value = cita.pacientes?.telefono || '';
                    document.getElementById('appt-date').value = cita.fecha;
                    
                    // Tratamiento y doctor
                    let tr = cita.tratamiento || 'Por Definir en Cita';
                    if (tr.includes('(Continuación)')) tr = tr.replace(' (Continuación)', '');
                    document.getElementById('appt-treatment').value = tr;
                    if (cita.consultorio) document.getElementById('appt-doctor').value = cita.consultorio;
                    
                    document.getElementById('appt-notes').value = cita.notas || '';
                    
                    window.editingCitaId = cita.id;
                    // Populate time options first
                    populateTimeOptions();
                    
                    // Match time
                    let th = cita.hora.split(':');
                    let h = parseInt(th[0], 10);
                    let m = th[1];
                    let ampm = h >= 12 ? 'PM' : 'AM';
                    let h12 = h % 12 || 12;
                    let displayTime = `${h12.toString().padStart(2, '0')}:${m} ${ampm}`;
                    
                    const timeSelect = document.getElementById('appt-time');
                    if (timeSelect) timeSelect.value = displayTime;
                    
                    // Match end time
                    const timeEndSelect = document.getElementById('appt-time-end');
                    if (timeEndSelect && cita.hora_fin) {
                        let teh = cita.hora_fin.split(':');
                        let eh = parseInt(teh[0], 10);
                        let em = teh[1];
                        let eampm = eh >= 12 ? 'PM' : 'AM';
                        let eh12 = eh % 12 || 12;
                        timeEndSelect.value = `${eh12.toString().padStart(2, '0')}:${em} ${eampm}`;
                    }
                    
                    // Update Modal Title & Button
                    const modalTitle = document.querySelector('#new-appointment-modal h3');
                    if (modalTitle) modalTitle.textContent = 'Editar Cita';
                    const submitBtn = document.querySelector('#new-appointment-form button[type="submit"]');
                    if (submitBtn) submitBtn.textContent = 'Actualizar Cita';
                    
                    document.getElementById('new-appointment-modal').classList.remove('hidden');
                };
            }

            btnAtender.onclick = () => {
                window.location.href = `atencion_tiempo_real_desktop.html?cita_id=${cita.id}&role=${role}`;
            };
            
            document.getElementById('btn-opt-facturar').onclick = () => {
                window.location.href = `pagos_facturacion_desktop.html?paciente_id=${cita.pacientes?.id}&cita_id=${cita.id}&role=${role}`;
            };
            
            document.getElementById('btn-opt-historial').onclick = () => {
                window.location.href = `detalle_historia_clinica_desktop.html?id=${cita.pacientes?.id}&role=${role}`;
            };
            
            document.getElementById('btn-opt-cancelar').onclick = async () => {
                if (confirm('¿Estás seguro de que deseas cancelar esta cita?')) {
                    const { error: cancelError } = await CalendarioRepository.updateCita(cita.id, { estado: 'Cancelado' });
                        
                    if (cancelError) {
                        alert('Error al cancelar la cita.');
                    } else {
                        dialog.close();
                        await cargarCitas();
                    }
                }
            };
            
        } catch (err) {
            console.error("Error al abrir opciones de cita:", err);
            dialog.close();
        }
    }

    async function cambiarEstadoCitaLocal(nuevoEstado) {
        if (!window.currentCitaId) return;
        try {
            const { error } = await CalendarioRepository.updateCita(window.currentCitaId, { estado: nuevoEstado });
            
            if (error) throw error;
            document.getElementById('opt-estado').textContent = `Estado: ${nuevoEstado}`;
            await cargarCitas();
        } catch (err) {
            console.error('Error al cambiar estado:', err);
            alert('Hubo un problema al cambiar el estado.');
        }
    }

    window.serviciosActivos = [];
    window.pacientesList = [];

    async function cargarPacientesSelect() {
        try {
            const { data, error } = await CalendarioRepository.getPacientes();
            if (error) throw error;
            window.pacientesList = data || [];
            
            const datalist = document.getElementById('pacientes-list');
            if (datalist) {
                datalist.innerHTML = data.map(p => `<option value="${p.nombre}">${p.email || ''}</option>`).join('');
            }
        } catch(error) {
            console.error('Error al cargar pacientes para el select:', error);
        }
    }

    function autofillPatientInfo() {
        const nameInput = document.getElementById('appt-patient-name').value;
        const emailInput = document.getElementById('appt-patient-email');
        const statusEl = document.getElementById('patient-status');
        
        if (!nameInput.trim()) {
            statusEl.classList.add('hidden');
            return;
        }

        const matched = window.pacientesList.find(p => p.nombre.toLowerCase() === nameInput.trim().toLowerCase());
        statusEl.classList.remove('hidden');

        if (matched) {
            if (matched.email) emailInput.value = matched.email;
            statusEl.innerHTML = `<span class="text-success font-semibold flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">check_circle</span> Paciente Existente seleccionado</span>`;
            verificarSesionesPaciente();
        } else {
            statusEl.innerHTML = `
            <div class="flex items-center justify-between w-full">
                <span class="text-warning font-semibold flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">person_add</span> Se registrará rápido</span>
                <button type="button" onclick="abrirModalFichaPaciente()" class="text-xs bg-primary text-on-primary px-3 py-1.5 rounded-lg hover:opacity-90 transition-all font-bold shadow-sm">Abrir Ficha Completa</button>
            </div>`;
            // Clear email if it's a new patient and it was previously filled by another name
            if(emailInput.value && !document.activeElement.isEqualNode(emailInput)) {
                emailInput.value = '';
            }
            document.getElementById('info-sesiones-alerta').classList.add('hidden');
        }
    }

    async function verificarSesionesPaciente() {
        const nameInput = document.getElementById('appt-patient-name').value;
        const baseTreatment = document.getElementById("appt-treatment").value;
        const chk = document.getElementById("appt-continuacion");
        const alertEl = document.getElementById('info-sesiones-alerta');
        const textEl = document.getElementById('info-sesiones-texto');

        if (!nameInput.trim() || !baseTreatment) {
            alertEl.classList.add('hidden');
            if (chk) { chk.checked = false; chk.disabled = true; }
            return;
        }

        const matched = window.pacientesList.find(p => p.nombre.toLowerCase() === nameInput.trim().toLowerCase());
        if (!matched) {
            alertEl.classList.add('hidden');
            if (chk) { chk.checked = false; chk.disabled = true; }
            return;
        }

        const servicioObj = window.serviciosActivos ? window.serviciosActivos.find(s => s.nombre === baseTreatment) : null;
        if (!servicioObj || !servicioObj.duracion || servicioObj.duracion <= 1) {
            alertEl.classList.add('hidden');
            if (chk) { chk.checked = false; chk.disabled = true; }
            return;
        }

        const totalSesiones = servicioObj.duracion;

        try {
            const { data: citas, error } = await supabaseClient
                .from('citas')
                .select('tratamiento')
                .eq('paciente_id', matched.id)
                .neq('estado', 'Cancelado');

            if (error) throw error;

            let totalConsumidas = 0;
            if (citas) {
                citas.forEach(c => {
                    if (c.tratamiento && c.tratamiento.includes(baseTreatment)) {
                        totalConsumidas++;
                    }
                });
            }

            if (totalConsumidas === 0) {
                if (chk) { chk.checked = false; chk.disabled = true; }
            } else {
                if (chk) chk.disabled = false;
            }

            const resto = totalConsumidas % totalSesiones;

            alertEl.classList.remove('hidden');
            if (resto === 0) {
                textEl.innerHTML = `<b>Nuevo Paquete:</b> Se iniciará un nuevo paquete de ${totalSesiones} sesiones. Se generará un cobro único de S/. ${parseFloat(servicioObj.precio).toFixed(2)}.`;
                if (chk) { chk.checked = false; chk.disabled = true; }
            } else {
                const sesionActual = resto + 1;
                textEl.innerHTML = `<b>Sesión de Paquete:</b> El paciente consumirá la sesión ${sesionActual} de ${totalSesiones}. <b>No se generará cobro</b> (ya comprado).`;
                if (chk) { chk.checked = true; chk.disabled = true; }
            }
        } catch (err) {
            console.error('Error al verificar sesiones:', err);
            alertEl.classList.add('hidden');
        }
    }

    function abrirModalFichaPaciente() {
        const currentName = document.getElementById('appt-patient-name').value;
        const currentEmail = document.getElementById('appt-patient-email').value;
        
        document.getElementById('full-patient-name').value = currentName;
        document.getElementById('full-patient-email').value = currentEmail;
        document.getElementById('full-patient-phone').value = '';
        document.getElementById('full-patient-dob').value = '';
        
        document.getElementById('modalNuevoPaciente').showModal();
    }

    async function saveFullPatient(event) {
        event.preventDefault();
        
        const btn = document.getElementById('btnSubmitFullPaciente');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<span class="material-symbols-outlined animate-spin">progress_activity</span> Guardando...';
        btn.disabled = true;

        const nombre = document.getElementById('full-patient-name').value;
        const dni = document.getElementById('full-patient-dni').value;
        const telefono = document.getElementById('full-patient-phone').value;
        const fecha_nacimiento = document.getElementById('full-patient-dob').value || null;
        const email = document.getElementById('full-patient-email').value;
        
        try {
            const { data, error } = await CalendarioRepository.insertPaciente({ nombre, dni, telefono, fecha_nacimiento, email, estado: 'Activo' });
                
            if (error) throw error;
            
            // Reload pacientes list
            await cargarPacientesSelect();
            
            // Populate main form
            document.getElementById('appt-patient-name').value = nombre;
            document.getElementById('appt-patient-email').value = email;
            autofillPatientInfo(); 
            
            document.getElementById('modalNuevoPaciente').close();
        } catch (error) {
            console.error('Error guardando paciente completo:', error);
            alert('Hubo un error al guardar el paciente.');
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }

    async function cargarServicios() {
        try {
            const { data, error } = await CalendarioRepository.getServiciosActivos();
            if (error) throw error;
            window.serviciosActivos = data;
            
            const selectTratamiento = document.getElementById('appt-treatment');
            if (selectTratamiento && selectTratamiento.tagName === 'SELECT') {
                selectTratamiento.innerHTML = '<option value="Por Definir en Cita">Por Definir en Cita</option>';
                data.forEach(s => {
                    const option = document.createElement('option');
                    option.value = s.nombre;
                    
                    let label = s.nombre;
                    if (s.duracion && s.duracion > 1) {
                        label += ` (${s.duracion} Sesiones)`;
                    } else {
                        label += ` (Cita Única)`;
                    }
                    
                    option.textContent = label;
                    selectTratamiento.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error al cargar servicios:', error);
        }
    }

    async function cargarEstadisticas() {
        try {
            const d = new Date();
            const today = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
            const tomorrowDate = new Date();
            tomorrowDate.setDate(tomorrowDate.getDate() + 1);
            const tomorrow = tomorrowDate.getFullYear() + '-' + String(tomorrowDate.getMonth() + 1).padStart(2, '0') + '-' + String(tomorrowDate.getDate()).padStart(2, '0');
            
            // Citas for today
            const { data: citasHoy, error: errorCitas } = await CalendarioRepository.getCitasActivas(today);
                
            // Citas for tomorrow
            const { data: citasManana, error: errorCitasM } = await CalendarioRepository.getCitasActivas(tomorrow);

            if (errorCitas || errorCitasM) throw new Error("Error fetching stats");

            const now = new Date();
            const filterFn = (c) => {
                const estado = (c.estado || '').toLowerCase();
                if (c.fecha && c.hora) {
                    const [year, month, day] = c.fecha.split('-');
                    const [hour, minute] = c.hora.split(':');
                    const citaDate = new Date(year, month - 1, day, hour, minute);
                    if (citaDate < now && estado.includes('cancelad')) {
                        return false;
                    }
                }
                return true;
            };

            const citasHoyFiltradas = citasHoy ? citasHoy.filter(filterFn) : [];
            const countCitasHoy = citasHoyFiltradas.length;
            const countCompletadas = citasHoyFiltradas.filter(c => (c.estado || '').toLowerCase().includes('completad')).length;
            const countCitasPendientesHoy = countCitasHoy - countCompletadas;
            const countPorConfirmar = citasHoyFiltradas.filter(c => c.estado === 'Pendiente').length; 
            const countCitasManana = citasManana ? citasManana.filter(filterFn).length : 0;

            const elCitasHoy = document.getElementById('stat-citas-hoy');
            if (elCitasHoy) elCitasHoy.textContent = countCitasPendientesHoy;
            const elCitasHoyTotal = document.getElementById('stat-citas-hoy-total');
            if (elCitasHoyTotal) elCitasHoyTotal.textContent = `De ${countCitasHoy} citas programadas`;
            
            const elCitasConfirmar = document.getElementById('stat-citas-confirmar');
            if (elCitasConfirmar) elCitasConfirmar.textContent = countPorConfirmar;
            
            const elCitasManana = document.getElementById('stat-citas-manana');
            if (elCitasManana) elCitasManana.textContent = countCitasManana;

        } catch (error) {
            console.error('Error al cargar estadísticas:', error);
        }
    }

    function getInitials(name) {
        if (!name) return '??';
        const parts = name.split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    }

    async function saveAppointment(event) {
        event.preventDefault();
        
        const name = document.getElementById("appt-patient-name").value;
        const email = document.getElementById("appt-patient-email").value;
        const phone = document.getElementById("appt-patient-phone").value;
        const baseTreatment = document.getElementById("appt-treatment").value;
        const isCont = document.getElementById("appt-continuacion")?.checked;
        const treatment = isCont ? baseTreatment + ' (Continuación)' : baseTreatment;
        const doctor = document.getElementById("appt-doctor").value;
        const date = document.getElementById("appt-date").value;
        
        let time = document.getElementById("appt-time").value;
        let time24 = time;
        if (time.includes('AM') || time.includes('PM')) {
            const [timeStr, modifier] = time.split(' ');
            let [hours, minutes] = timeStr.split(':');
            if (hours === '12') hours = '00';
            if (modifier === 'PM') hours = (parseInt(hours, 10) + 12).toString();
            time24 = `${hours.padStart(2, '0')}:${minutes}:00`;
        }

        let timeEnd = document.getElementById("appt-time-end")?.value;
        let timeEnd24 = null;
        if (timeEnd && timeEnd !== '') {
            if (timeEnd.includes('AM') || timeEnd.includes('PM')) {
                const [timeStr, modifier] = timeEnd.split(' ');
                let [hours, minutes] = timeStr.split(':');
                if (hours === '12') hours = '00';
                if (modifier === 'PM') hours = (parseInt(hours, 10) + 12).toString();
                timeEnd24 = `${hours.padStart(2, '0')}:${minutes}:00`;
            } else {
                timeEnd24 = timeEnd;
            }
        }
        
        const notes = document.getElementById("appt-notes").value;

        try {
            // Check if patient exists or create new
            let paciente_id = null;
            const { data: existingPacientes, error: searchError } = await CalendarioRepository.searchPacientePorNombreExacto(name);
            
            if (searchError) throw searchError;

            if (existingPacientes && existingPacientes.length > 0) {
                paciente_id = existingPacientes[0].id;
            } else {
                const { data: newPaciente, error: insertError } = await CalendarioRepository.insertPaciente({ nombre: name, email: email, telefono: phone, estado: 'Activo' });
                
                if (insertError) throw insertError;
                if (newPaciente && newPaciente.length > 0) {
                    paciente_id = newPaciente[0].id;
                }
            }

            let cita_id = null;

            if (window.editingCitaId) {
                const { error: updateError } = await CalendarioRepository.updateCita(window.editingCitaId, {
                        paciente_id: paciente_id,
                        fecha: date,
                        hora: time24,
                        hora_fin: timeEnd24,
                        notas: notes,
                        tratamiento: treatment,
                        consultorio: doctor
                    });
                
                if (updateError) throw updateError;
                cita_id = window.editingCitaId;
            } else {
                const { data: newCita, error: apptError } = await CalendarioRepository.insertCita({
                        paciente_id: paciente_id,
                        fecha: date,
                        hora: time24,
                        hora_fin: timeEnd24,
                        estado: 'Pendiente',
                        notas: notes,
                        tratamiento: treatment,
                        consultorio: doctor
                    });
                
                if (apptError) throw apptError;
                cita_id = newCita && newCita.length > 0 ? newCita[0].id : null;
            }


            // Encontrar el precio del tratamiento y si es por sesiones
            const servicioObj = window.serviciosActivos ? window.serviciosActivos.find(s => s.nombre === baseTreatment) : null;
            let montoPago = servicioObj ? servicioObj.precio : 0.00;

            if (servicioObj && servicioObj.duracion && servicioObj.duracion > 1 && paciente_id) {
                const totalSesiones = servicioObj.duracion;
                // Contamos las citas anteriores para ver si es una sesión gratuita (de consumo de paquete)
                // Custom fetch replaced in service or kept as is if not abstracted.
const { data: citasPrevias, error: countError } = await window.db.from('citas').select('id').eq('paciente_id', paciente_id).eq('tratamiento', treatment).neq('estado', 'Cancelado').neq('estado', 'Cancelada');

                if (!countError && citasPrevias) {
                    const totalConsumidas = citasPrevias.length; // Incluye la recién creada
                    if ((totalConsumidas - 1) % totalSesiones !== 0) {
                        montoPago = 0.00;
                    }
                }
            }

            if (cita_id) {
                // Crear pago pendiente asociado
                const { error: pagoError } = await CalendarioRepository.insertPagoCita({
                        paciente_id: paciente_id,
                        cita_id: cita_id,
                        monto: montoPago,
                        estado: montoPago === 0 ? 'Completado' : 'Pendiente',
                        metodo: montoPago === 0 ? 'Paquete' : 'Efectivo', 
                        fecha: date,
                        descripcion: treatment
                    });
                if (pagoError) console.error("Error creating payment:", pagoError);
            }

            const appt = { name, email, treatment, doctor, date, time, notes };

            // Generate sync link and set it on the success modal button
            const gcalUrl = CalendarioService.generateGoogleCalendarUrl(appt);
            const gcalBtn = document.getElementById("sync-gcal-btn");
            if (gcalBtn) {
                gcalBtn.setAttribute("href", gcalUrl);
            }

            // Sincronizar automáticamente abriendo Google Calendar
            window.open(gcalUrl, '_blank');

            // Hide form modal and open success modal
            closeAppointmentModal();
            document.getElementById("success-confirmation-modal").classList.remove("hidden");
            
            // Reload dashboard data
            cargarCitas();
            cargarEstadisticas();

        } catch (error) {
            console.error('Error al guardar cita:', error);
            alert('Hubo un error al guardar la cita. Verifica la consola para más detalles.');
        }
    }

    let fullCalendarInstance = null;

    async function cargarCitas() {
        try {
            const calendarEl = document.getElementById('calendar');
            const proximosContainer = document.getElementById('proximos-pacientes-list');
            if (!calendarEl) return;
            
            const d = new Date();
            const today = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

            let { data, error } = await CalendarioRepository.getCitasPorRangoOpciones();
                
            if (error) throw error;

            const now = new Date();
            data = data.filter(c => {
                const estado = (c.estado || '').toLowerCase();
                if (c.fecha && c.hora) {
                    const [year, month, day] = c.fecha.split('-');
                    const [hour, minute] = c.hora.split(':');
                    const citaDate = new Date(year, month - 1, day, hour, minute);
                    if (citaDate < now && estado.includes('cancelad')) {
                        return false;
                    }
                }
                return true;
            });

            const events = data.filter(c => !((c.estado || '').toLowerCase().includes('cancelad'))).map(c => CalendarioService.mapCitaToCalendarEvent(c, data, window.serviciosActivos));

            if (!fullCalendarInstance) {
                fullCalendarInstance = new FullCalendar.Calendar(calendarEl, {
                    nowIndicator: true,
                    initialView: window.innerWidth < 768 ? 'timeGridDay' : 'timeGridWeek',
                    headerToolbar: {
                        left: 'prev,next today',
                        center: 'title',
                        right: window.innerWidth < 768 ? 'timeGridDay,listWeek' : 'timeGridDay,timeGridWeek,dayGridMonth'
                    },
                    buttonText: {
                        today: 'Hoy',
                        month: 'Mes',
                        week: 'Semana',
                        day: 'Día',
                        list: 'Agenda'
                    },
                    events: events,
                    locale: 'es',
                    firstDay: 1,
                    selectable: true,
                    select: function(info) {
                        const d = info.start;
                        const year = d.getFullYear();
                        const month = String(d.getMonth() + 1).padStart(2, '0');
                        const day = String(d.getDate()).padStart(2, '0');
                        const fecha = `${year}-${month}-${day}`;
                        
                        let h24 = d.getHours();
                        let mins = String(d.getMinutes()).padStart(2, '0');
                        let ampm = h24 >= 12 ? 'PM' : 'AM';
                        let h12 = h24 % 12 || 12;
                        let horaSelect = `${String(h12).padStart(2, '0')}:${mins} ${ampm}`;
                        
                        openAppointmentModal(fecha, horaSelect);
                    },
                    slotMinTime: (localStorage.getItem('horaApertura') || '08:00') + ':00',
                    slotMaxTime: (localStorage.getItem('horaCierre') || '20:00') + ':00',
                    slotEventOverlap: false,
                    allDaySlot: false,
                    height: '100%',
                    dayMaxEvents: 3, // Ocultar si hay más de 3 en la vista mes
                    moreLinkText: 'más',
                    eventClick: function(info) {
                        abrirOpcionesCita(info.event.id);
                    },
                    eventContent: function(arg) {
                        const isMonth = arg.view.type === 'dayGridMonth';
                        if (isMonth) {
                            return {
                                html: `<div class="px-1 py-0.5 overflow-hidden text-xs truncate" style="white-space: nowrap;">
                                    <span class="font-bold">${arg.timeText}</span> ${arg.event.title}
                                </div>`
                            };
                        }
                        return {
                            html: `<div class="p-1 overflow-y-auto no-scrollbar" style="height: 100%; white-space: normal;">
                                <div class="text-xs font-bold">${arg.timeText}</div>
                                <div class="font-bold text-sm leading-tight mb-1">${arg.event.title}</div>
                                <div class="text-[10px] font-bold bg-black/20 rounded px-1 inline-block mb-1">${arg.event.extendedProps.sessionStr}</div>
                                <div class="text-xs opacity-90 leading-tight">${arg.event.extendedProps.tratamiento}</div>
                            </div>`
                        };
                    }
                });
                fullCalendarInstance.render();
            } else {
                fullCalendarInstance.removeAllEvents();
                fullCalendarInstance.addEventSource(events);
            }
            
            // Render upcoming patients
            if (proximosContainer) {
                const proximos = data.filter(c => {
                    const st = (c.estado || '').toLowerCase();
                    const isUpcoming = st.includes('agendad') || st.includes('confirmad') || st.includes('pendient') || st.includes('sala');
                    return isUpcoming && c.fecha === today;
                }).sort((a,b) => (a.hora || '').localeCompare(b.hora || ''));
                window.proximasCitas = proximos;
                
                const top3 = proximos.slice(0, 3);
                if (top3.length === 0) {
                    proximosContainer.innerHTML = '<p class="text-outline text-center py-4">No hay pacientes próximos para hoy.</p>';
                } else {
                    let html = '';
                    top3.forEach(c => {
                        const pacienteNombre = c.pacientes ? c.pacientes.nombre : 'Desconocido';
                        const iniciales = getInitials(pacienteNombre);
                        
                        let horaFormat = c.hora;
                        if (c.hora) {
                            const [h, m] = c.hora.split(':');
                            const hInt = parseInt(h);
                            const ampm = hInt >= 12 ? 'PM' : 'AM';
                            const h12 = hInt % 12 || 12;
                            horaFormat = `${h12}:${m} ${ampm}`;
                        }

                        html += `
                        <div class="flex items-center gap-4 mb-4 last:mb-0 cursor-pointer hover:bg-surface-container-lowest p-2 -mx-2 rounded-xl transition-colors" onclick="abrirOpcionesCita('${c.id}')">
                            <div class="w-12 h-12 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-bold">${iniciales}</div>
                            <div class="flex-1">
                                <p class="font-bold text-on-surface">${pacienteNombre}</p>
                                <p class="text-xs text-on-surface-variant">${horaFormat}${c.consultorio ? ' • ' + c.consultorio : ''} • ${c.tratamiento || 'Procedimiento General'}</p>
                                <div class="text-[10px] mt-1 font-bold bg-surface-container text-outline px-2 py-0.5 rounded inline-block">${c.sessionStr || 'Cita Única'}</div>
                            </div>
                            <span class="material-symbols-outlined text-outline-variant" data-icon="chevron_right">chevron_right</span>
                        </div>`;
                    });
                    proximosContainer.innerHTML = html;
                }
            }

            // Render Tareas Pendientes
            const tareasContainer = document.getElementById('tareas-pendientes-list');
            if (tareasContainer) {
                const tomorrowDate = new Date();
                tomorrowDate.setDate(tomorrowDate.getDate() + 1);
                const tomorrow = tomorrowDate.getFullYear() + '-' + String(tomorrowDate.getMonth() + 1).padStart(2, '0') + '-' + String(tomorrowDate.getDate()).padStart(2, '0');

                // Filtrar todas las citas pendientes, por confirmar o por reprogramar, sin importar la fecha
                const tareas = data.filter(c => {
                    const est = c.estado || '';
                    return est === 'Pendiente' || est === 'Por Confirmar' || est === 'Por Reprogramar' || est === 'Sin Confirmar' || est === 'Agendado';
                }).sort((a, b) => a.fecha.localeCompare(b.fecha) || a.hora.localeCompare(b.hora));
                
                if (tareas.length === 0) {
                    tareasContainer.innerHTML = '<p class="text-outline text-center py-4">No hay tareas pendientes para agendar o confirmar.</p>';
                } else {
                    let html = '';
                    tareas.slice(0, 6).forEach(c => {
                        const pacienteNombre = c.pacientes ? c.pacientes.nombre : 'Desconocido';
                        const telefono = c.pacientes ? c.pacientes.telefono : '';
                        const iniciales = getInitials(pacienteNombre);
                        const isTomorrow = c.fecha === tomorrow;
                        
                        let actionText = "";
                        let waMessage = "";
                        if (c.estado === 'Por Reprogramar') {
                            actionText = "<span class='text-primary font-bold'>Contactar para Reprogramar Cita</span>";
                            waMessage = `Hola ${pacienteNombre}, somos del Centro Eslava. Nos comunicamos para reprogramar su cita. ¿Qué fecha y hora le vendría mejor?`;
                        } else {
                            actionText = isTomorrow ? "Pendiente confirmar asistencia para mañana" : "Pendiente confirmar asistencia";
                            waMessage = `Hola ${pacienteNombre}, somos del Centro Eslava. Le escribimos para confirmar su cita ${isTomorrow ? 'de mañana' : 'pendiente'}. ¿Podría confirmarnos su asistencia por favor?`;
                        }

                        let waUrl = "#";
                        let btnContent = "Gestionar";
                        let btnOnClick = `abrirOpcionesCita('${c.id}')`;
                        
                        if (telefono) {
                            let cleanPhone = telefono.replace(/\D/g, '');
                            if (cleanPhone.length === 9) cleanPhone = "51" + cleanPhone; // Perú code by default
                            waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(waMessage)}`;
                            btnOnClick = `window.open('${waUrl}', '_blank')`;
                            btnContent = `<span class="flex items-center gap-1">Gestionar</span>`;
                        }
                        
                        html += `
                        <div class="flex items-center justify-between p-4 bg-surface-container-lowest border border-outline-variant rounded-2xl group hover:border-primary transition-colors">
                            <div class="flex items-center gap-4">
                                <div class="w-10 h-10 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-bold">${iniciales}</div>
                                <div>
                                    <p class="font-bold text-on-surface">${pacienteNombre}</p>
                                    <p class="text-xs text-on-surface-variant">${actionText}</p>
                                </div>
                            </div>
                            <button onclick="${btnOnClick}" class="px-4 py-2 border border-outline-variant text-on-surface font-bold rounded-xl hover:bg-surface-container-low transition-all text-sm whitespace-nowrap">${btnContent}</button>
                        </div>`;
                    });
                    tareasContainer.innerHTML = html;
                }
            }

        } catch (error) {
            console.error('Error al cargar citas:', error);
        }
    }

    // Initialize logic
    document.addEventListener("DOMContentLoaded", async () => {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('action') === 'new_appointment') {
            openAppointmentModal();
        }
        
        populateTimeOptions();
        await cargarServicios();
        await cargarPacientesSelect();
        cargarCitas();
        cargarEstadisticas();

        // Micro-interactions for the calendar cards
        document.querySelectorAll('.group').forEach(card => {
            card.addEventListener('mouseenter', () => {
                card.style.transform = 'translateY(-4px)';
            });
            card.addEventListener('mouseleave', () => {
                card.style.transform = 'translateY(0px)';
            });
        });
    });

