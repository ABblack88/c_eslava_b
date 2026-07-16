
        // Micro-interaction: Active tab logic
        const navLinks = document.querySelectorAll('aside nav a');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                navLinks.forEach(l => {
                    l.classList.remove('text-primary', 'border-r-4', 'border-primary', 'font-bold', 'bg-surface-container-low');
                    l.classList.add('text-on-surface-variant', 'hover:bg-surface-container-low');
                });
                link.classList.add('text-primary', 'border-r-4', 'border-primary', 'font-bold', 'bg-surface-container-low');
                link.classList.remove('text-on-surface-variant', 'hover:bg-surface-container-low');
            });
        });

        // Filter button interaction
        const filterBtns = document.querySelectorAll('.bg-surface-container-low button');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filterBtns.forEach(b => {
                    b.classList.remove('bg-surface-white', 'shadow-sm', 'text-primary');
                    b.classList.add('text-on-surface-variant', 'hover:bg-surface-container-high');
                });
                btn.classList.add('bg-surface-white', 'shadow-sm', 'text-primary');
                btn.classList.remove('text-on-surface-variant', 'hover:bg-surface-container-high');
            });
        });

        


        async function cargarServicios() {
            try {
                const { data, error } = await window.supabaseClient
                    .from('servicios')
                    .select('*')
                    .eq('estado', 'Activo');
                if (!error && data) {
                    window.serviciosActivos = data;
                }
            } catch (err) {
                console.error("Error al cargar servicios:", err);
            }
        }

        document.addEventListener("DOMContentLoaded", async () => {
            await cargarServicios();
            cargarPacientes();
        });

        function abrirModalNuevoPaciente() {
            document.getElementById('formNuevoPaciente').reset();
            document.getElementById('pacienteId').value = '';
            document.getElementById('modalTitlePaciente').textContent = 'Registrar Paciente';
            document.getElementById('btnEliminarPaciente').classList.add('hidden');
            document.getElementById('modalNuevoPaciente').showModal();
        }

        function abrirModalEdicionPaciente(id, nombre, email, telefono, fecha_nacimiento, notas_medicas, estado) {
            document.getElementById('formNuevoPaciente').reset();
            document.getElementById('pacienteId').value = id;
            document.getElementById('modalTitlePaciente').textContent = 'Editar Perfil y Notas';
            document.getElementById('btnEliminarPaciente').classList.remove('hidden');
            
            const form = document.getElementById('formNuevoPaciente');
            form.elements['nombre'].value = nombre;
            form.elements['email'].value = email || '';
            form.elements['telefono'].value = telefono || '';
            form.elements['fecha_nacimiento'].value = fecha_nacimiento || '';
            form.elements['estado'].value = estado || 'Activo';
            
            const stored = localStorage.getItem(`paciente_registro_${id}`);
            if (stored) {
                const parsed = JSON.parse(stored);
                form.elements['alergias'].value = parsed.alergias || '';
            } else {
                form.elements['alergias'].value = '';
            }
            
            document.getElementById('modalNuevoPaciente').showModal();
        }

        async function eliminarPaciente() {
            const id = document.getElementById('pacienteId').value;
            if (!id) return;
            
            if (!confirm('¿Estás seguro de que deseas eliminar a este paciente? Todas sus citas y pagos asociados podrían verse afectados.')) return;
            
            const btnSubmit = document.getElementById('btnSubmitPaciente');
            const spinner = document.getElementById('spinnerSubmitPaciente');
            const btnEliminar = document.getElementById('btnEliminarPaciente');
            
            btnSubmit.disabled = true;
            btnEliminar.disabled = true;
            spinner.classList.remove('hidden');

            try {
                const { error } = await window.supabaseClient
                    .from('pacientes')
                    .delete()
                    .eq('id', id);

                if (error) throw error;

                document.getElementById('modalNuevoPaciente').close();
                await cargarPacientes();
            } catch (err) {
                console.error("Error al eliminar paciente:", err);
                alert("Hubo un error al eliminar el paciente.");
            } finally {
                btnSubmit.disabled = false;
                btnEliminar.disabled = false;
                spinner.classList.add('hidden');
            }
        }

        document.getElementById('formNuevoPaciente').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const btnSubmit = document.getElementById('btnSubmitPaciente');
            const spinner = document.getElementById('spinnerSubmitPaciente');
            
            btnSubmit.disabled = true;
            spinner.classList.remove('hidden');

            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());

            const payload = {
                nombre: data.nombre,
                email: data.email || null,
                telefono: data.telefono || null,
                fecha_nacimiento: data.fecha_nacimiento || null,
                notas_medicas: data.notas_medicas || null,
                estado: data.estado || 'Activo'
            };

            try {
                let error;
                if (data.id) {
                    const res = await window.supabaseClient
                        .from('pacientes')
                        .update(payload)
                        .eq('id', data.id);
                    error = res.error;
                    if (!error) {
                        let stored = localStorage.getItem(`paciente_registro_${data.id}`);
                        let pData = stored ? JSON.parse(stored) : {};
                        pData.alergias = data.alergias || '';
                        localStorage.setItem(`paciente_registro_${data.id}`, JSON.stringify(pData));
                    }
                } else {
                    const res = await window.supabaseClient
                        .from('pacientes')
                        .insert([payload])
                        .select();
                    error = res.error;
                    if (!error && res.data && res.data.length > 0) {
                        const newId = res.data[0].id;
                        let stored = localStorage.getItem(`paciente_registro_${newId}`);
                        let pData = stored ? JSON.parse(stored) : {};
                        pData.alergias = data.alergias || '';
                        localStorage.setItem(`paciente_registro_${newId}`, JSON.stringify(pData));
                    }
                }

                if (error) throw error;

                document.getElementById('modalNuevoPaciente').close();
                e.target.reset();
                await cargarPacientes();
            } catch (err) {
                console.error("Error al guardar paciente:", err);
                alert("Hubo un error al guardar el paciente. Inténtelo de nuevo.");
            } finally {
                btnSubmit.disabled = false;
                spinner.classList.add('hidden');
            }
        });

        let allPacientes = [];
        let estadoFiltro = 'Todos';

        function filtrarPorEstado(estado, btnElement) {
            estadoFiltro = estado;
            // Estilos de botones
            const filterBtns = document.querySelectorAll('.bg-surface-container-low > button');
            filterBtns.forEach(b => {
                b.classList.remove('bg-surface-white', 'shadow-sm', 'text-primary');
                b.classList.add('text-on-surface-variant', 'hover:bg-surface-container-high');
            });
            btnElement.classList.add('bg-surface-white', 'shadow-sm', 'text-primary');
            btnElement.classList.remove('text-on-surface-variant', 'hover:bg-surface-container-high');
            
            filtrarPacientes();
        }

        function filtrarPacientes() {
            const searchInput = document.getElementById('searchInput');
            const query = searchInput ? searchInput.value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : '';
            
            const filtrados = allPacientes.filter(p => {
                const nombreNormalizado = p.nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                const matchTexto = 
                    nombreNormalizado.includes(query) || 
                    (p.id && p.id.toLowerCase().includes(query)) ||
                    (p.telefono && p.telefono.includes(query));
                
                const matchEstado = (estadoFiltro === 'Todos') || (p.estado === estadoFiltro);
                
                return matchTexto && matchEstado;
            });

            renderPacientes(filtrados);
            const countSpan = document.getElementById('pacientes-count');
            if (countSpan) {
                countSpan.textContent = `Mostrando ${filtrados.length} de ${allPacientes.length} pacientes`;
            }
        }

        async function cargarPacientes() {
            const tbody = document.getElementById('pacientes-tbody');
            tbody.innerHTML = '<tr><td colspan="6" class="px-8 py-4 text-center">Cargando pacientes...</td></tr>';
            
            const { data, error } = await window.supabaseClient.from('pacientes').select('*, citas(id, estado, fecha, hora, tratamiento, consultorio), pagos(id, estado, cita_id)').order('created_at', { ascending: false });
            
            if (error) {
                console.error("Error al cargar pacientes:", error);
                tbody.innerHTML = '<tr><td colspan="6" class="px-8 py-4 text-center text-error">Error al cargar datos</td></tr>';
                return;
            }

            allPacientes = data || [];
            
            // Actualizar estadísticas simples
            const total = allPacientes.length;
            const statElement = document.getElementById('stat-total-pacientes');
            if (statElement) {
                statElement.textContent = total;
            }

            filtrarPacientes(); // Usamos la función de filtrar para inicializar
            renderPacientesHoy(allPacientes);
        }

        function renderPacientesHoy(data) {
            const gridContainer = document.getElementById('pacientes-grid');
            gridContainer.innerHTML = '';
            
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const today = `${year}-${month}-${day}`;
            
            const pacientesProximos = [];
            data.forEach(p => {
                if (!p.citas) return;
                const citasFuturas = p.citas.filter(c => c.fecha >= today && (c.estado === 'Pendiente' || c.estado === 'Sin confirmar' || c.estado === 'Confirmada' || c.estado === 'Confirmado' || c.estado === 'En Progreso'));
                
                citasFuturas.forEach(cita => {
                    pacientesProximos.push({ paciente: p, cita: cita });
                });
            });

            pacientesProximos.sort((a, b) => {
                if (a.cita.fecha === b.cita.fecha) {
                    return a.cita.hora.localeCompare(b.cita.hora);
                }
                return a.cita.fecha.localeCompare(b.cita.fecha);
            });

            const pacientesHoy = [];
            for (const item of pacientesProximos) {
                if (item.cita.fecha === today) {
                    pacientesHoy.push(item);
                } else if (pacientesHoy.length < 3) {
                    pacientesHoy.push(item);
                } else {
                    break;
                }
            }

            if (pacientesHoy.length === 0) {
                gridContainer.innerHTML = '<p class="text-on-surface-variant col-span-full py-2 italic text-sm">No hay citas pendientes de atención próximas.</p>';
                return;
            }

            pacientesHoy.forEach(item => {
                const { paciente, cita } = item;
                
                let horaFormat = cita.hora;
                if (cita.hora) {
                    const [h, m] = cita.hora.split(':');
                    const hInt = parseInt(h);
                    const ampm = hInt >= 12 ? 'PM' : 'AM';
                    const h12 = hInt > 12 ? hInt - 12 : (hInt === 0 ? 12 : hInt);
                    horaFormat = `${h12.toString().padStart(2, '0')}:${m} ${ampm}`;
                }
                
                let dateLabel = '';
                if (cita.fecha === today) {
                    dateLabel = `Hoy, ${horaFormat}`;
                } else {
                    const [y, m, d] = cita.fecha.split('-');
                    dateLabel = `${d}/${m}, ${horaFormat}`;
                }

                const card = document.createElement('div');
                card.className = 'bg-surface-white p-5 rounded-3xl shadow-sm hover:shadow-md transition-all group cursor-pointer border border-surface-container hover:border-primary/30 flex flex-col';
                card.onclick = () => {
                    const role = new URLSearchParams(window.location.search).get('role') || 'admin';
                    window.location.href = `atencion_tiempo_real_desktop.html?cita_id=${cita.id}&role=${role}`;
                };
                card.innerHTML = `
                <div class="flex justify-between items-start mb-4">
                    <div class="flex gap-4">
                        <div class="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                            ${paciente.nombre.charAt(0)}
                        </div>
                        <div class="overflow-hidden">
                            <h3 class="font-headline-md text-base font-bold text-on-surface truncate pr-2">${paciente.nombre}</h3>
                            <p class="text-label-sm text-primary">${dateLabel} • ${cita.tratamiento || 'Procedimiento'}</p>
                        </div>
                    </div>
                </div>
                <div class="mt-auto flex justify-between items-center">
                    <span class="bg-warning/10 text-warning-dark px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">${cita.estado}</span>
                    <span class="text-primary font-bold text-xs flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                        Atender <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </span>
                </div>`;
                gridContainer.appendChild(card);
            });
        }

        function renderPacientes(data) {
            const tbody = document.getElementById('pacientes-tbody');
            tbody.innerHTML = '';

            data.forEach(paciente => {
                const esActivo = paciente.estado === 'Activo';
                const badgeClass = esActivo ? 'bg-success/10 text-success' : 'bg-surface-container-high text-outline';
                
                // Calculando indicadores
                let allCitasPac = paciente.citas || [];
                let sesionesHTML = '';

                if (allCitasPac.length === 0) {
                    sesionesHTML = `<span class="text-outline text-xs">-</span>`;
                } else {
                    allCitasPac.sort((a,b) => {
                        if (a.fecha === b.fecha) return (b.hora || '').localeCompare(a.hora || '');
                        return (b.fecha || '').localeCompare(a.fecha || '');
                    });
                    
                    const pendingCitas = allCitasPac.filter(c => c.estado === 'Pendiente' || c.estado === 'En Progreso' || c.estado === 'Confirmada');
                    pendingCitas.sort((a,b) => {
                        if (a.fecha === b.fecha) return (a.hora || '').localeCompare(b.hora || '');
                        return (a.fecha || '').localeCompare(b.fecha || '');
                    });
                    
                    const nextCita = pendingCitas.length > 0 ? pendingCitas[0] : null;
                    const latestCita = allCitasPac[0];
                    const targetCita = nextCita || latestCita;
                    
                    let isPackage = false;
                    let currentSessionNum = 1;
                    let totalSessions = 1;
                    
                    if (targetCita.tratamiento) {
                        const baseTrat = targetCita.tratamiento.replace('(Continuación)', '').trim();
                        const servicioObj = window.serviciosActivos ? window.serviciosActivos.find(s => s.nombre === baseTrat) : null;
                        
                        if (servicioObj && servicioObj.duracion && servicioObj.duracion > 1) {
                            isPackage = true;
                            totalSessions = servicioObj.duracion;
                            
                            const prevOccurrences = allCitasPac.filter(c => 
                                c.tratamiento && 
                                c.tratamiento.includes(baseTrat) && 
                                c.estado !== 'Cancelada' &&
                                (c.fecha < targetCita.fecha || (c.fecha === targetCita.fecha && (c.hora || '') <= (targetCita.hora || '')))
                            );
                            
                            const totalOccurrences = allCitasPac.filter(c => c.tratamiento && c.tratamiento.includes(baseTrat) && c.estado !== 'Cancelada').length;
                            
                            if (targetCita.tratamiento.includes('(Continuación)') || totalOccurrences > 1 || prevOccurrences.length > 0) {
                                currentSessionNum = prevOccurrences.length > 0 ? prevOccurrences.length : 1;
                            }
                        }
                    }
                    
                    function formatDate(c) {
                        if (!c || !c.fecha) return '';
                        const [y,m,d] = c.fecha.split('-');
                        let hStr = '';
                        if (c.hora) {
                            const [h, min] = c.hora.split(':');
                            hStr = ` ${h}:${min}`;
                        }
                        return `${d}/${m}${hStr}`;
                    }
                    
                    let sessionText = '';
                    let prefix = nextCita ? 'Próx. Cita' : 'Última Cita';
                    let dateToShow = formatDate(targetCita);
                    
                    if (isPackage) {
                        sessionText = `${prefix} ${dateToShow} - Sesión ${currentSessionNum} de ${totalSessions}`;
                    } else {
                        sessionText = `${prefix}: ${dateToShow}`;
                    }
                    
                    sesionesHTML = `<button onclick="event.stopPropagation(); const role = new URLSearchParams(window.location.search).get('role') || 'admin'; window.location.href='atencion_tiempo_real_desktop.html?cita_id=${targetCita.id}&role=' + role" class="bg-primary/10 text-primary px-2 py-1 rounded-md text-[10px] font-bold hover:bg-primary/20 transition-colors cursor-pointer text-left" title="Ir a la cita">${sessionText}</button>`;
                }

                // Solo cuenta como deuda si el pago es Pendiente/Vencido
                // y corresponde a una cita ya completada, o si está Vencido sin importar el estado
                const pagosPend = (paciente.pagos || []).filter(p => {
                    if (p.estado === 'Vencido') return true;
                    if (p.estado === 'Pendiente') {
                        // Si el pago tiene cita_id, verificar si esa cita está completada
                        if (p.cita_id) {
                            const citaAsociada = (paciente.citas || []).find(c => c.id === p.cita_id);
                            if (citaAsociada) {
                                const st = (citaAsociada.estado || '').toLowerCase();
                                return st.includes('completad') || st.includes('atendid');
                            }
                        }
                        // Si no tiene cita_id, también es deuda real
                        return !p.cita_id;
                    }
                    return false;
                }).length;
                let pagosHTML = '';
                if (pagosPend > 0) {
                    pagosHTML = `<span class="bg-error/10 text-error px-2 py-1 rounded-md text-[10px] font-bold" title="Cuentas por cobrar">${pagosPend} Deudas</span>`;
                } else {
                    pagosHTML = `<span class="text-outline text-xs">Al día</span>`;
                }
                
                // --- Renderear fila en tabla ---
                const safeName = paciente.nombre.replace(/'/g, "&#39;").replace(/"/g, "&quot;");
                const safeEmail = (paciente.email || '').replace(/'/g, "&#39;").replace(/"/g, "&quot;");
                const safeTelefono = (paciente.telefono || '').replace(/'/g, "&#39;").replace(/"/g, "&quot;");
                const safeNotas = (paciente.notas_medicas || '').replace(/'/g, "&#39;").replace(/"/g, "&quot;");
                const safeEstado = paciente.estado.replace(/'/g, "&#39;").replace(/"/g, "&quot;");
                const fnac = paciente.fecha_nacimiento || '';

                const tr = document.createElement('tr');
                tr.className = 'hover:bg-surface-bright transition-colors cursor-pointer group';
                tr.onclick = () => {
                    const role = new URLSearchParams(window.location.search).get('role') || 'admin';
                    window.location.href = `detalle_historia_clinica_desktop.html?id=${paciente.id}&role=${role}`;
                };
                tr.innerHTML = `
                    <td class="px-8 py-4">
                        <div class="flex items-center gap-3">
                            <div class="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white font-bold">
                                ${paciente.nombre.charAt(0)}
                            </div>
                            <span class="font-bold text-on-surface group-hover:text-primary transition-colors">${paciente.nombre}</span>
                        </div>
                    </td>
                    <td class="px-8 py-4">
                        <span class="px-2.5 py-0.5 ${badgeClass} rounded-full text-xs font-bold whitespace-nowrap">${paciente.estado || 'Activo'}</span>
                    </td>
                    <td class="px-8 py-4 text-sm text-on-surface-variant">${sesionesHTML}</td>
                    <td class="px-8 py-4 text-sm text-on-surface-variant">${pagosHTML}</td>
                    <td class="px-8 py-4 text-right">
                        <button onclick="event.stopPropagation(); abrirModalEdicionPaciente('${paciente.id}', '${safeName}', '${safeEmail}', '${safeTelefono}', '${fnac}', '${safeNotas}', '${safeEstado}')" class="p-2 text-outline hover:text-primary transition-colors">
                            <span class="material-symbols-outlined">edit</span>
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }
        
        // ==========================================
        // EXPORTAR E IMPORTAR DATOS (CSV)
        // ==========================================
        async function exportarPacientesCSV() {
            try {
                const { data: pacientes, error } = await supabaseClient
                    .from('pacientes')
                    .select('*');
                if (error) throw error;
                
                if (!pacientes || pacientes.length === 0) {
                    alert('No hay pacientes para exportar.');
                    return;
                }

                // Generar headers
                const headers = Object.keys(pacientes[0]).join(';');
                // Generar filas
                const csvRows = pacientes.map(p => {
                    return Object.values(p).map(val => {
                        let str = val === null ? '' : String(val);
                        // Escapar comillas y saltos de linea
                        if (str.includes(';') || str.includes('"') || str.includes('\n')) {
                            str = '"' + str.replace(/"/g, '""') + '"';
                        }
                        return str;
                    }).join(';');
                });
                
                // Añadir BOM (\uFEFF) para que Excel detecte correctamente UTF-8
                const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + headers + "\n" + csvRows.join('\n');
                const encodedUri = encodeURI(csvContent);
                const link = document.createElement("a");
                link.setAttribute("href", encodedUri);
                link.setAttribute("download", `pacientes_export_${new Date().toISOString().split('T')[0]}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } catch (err) {
                console.error('Error al exportar pacientes CSV:', err);
                alert('Error al exportar los pacientes.');
            }
        }

        function triggerImportarCSV() {
            document.getElementById('csvFileInput').click();
        }

        async function importarPacientesCSV(event) {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async function(e) {
                try {
                    const text = e.target.result;
                    const lines = text.split('\n').filter(line => line.trim().length > 0);
                    if (lines.length < 2) {
                        alert('El archivo CSV está vacío o no tiene el formato correcto.');
                        return;
                    }
                    
                    const headers = lines[0].split(';').map(h => h.trim().replace(/(^"|"$)/g, ''));
                    const pacientesAImportar = [];
                    
                    for (let i = 1; i < lines.length; i++) {
                        // Separar usando un simple split (nota: esto falla si hay ';' dentro de textos entre comillas)
                        // Para simplificar asuminos un CSV basico.
                        const row = lines[i].split(';');
                        let obj = {};
                        headers.forEach((header, index) => {
                            let val = row[index] ? row[index].trim().replace(/(^"|"$)/g, '').replace(/""/g, '"') : null;
                            if (val === "") val = null;
                            // Excluir columnas auto-generadas por supabase
                            if (header !== 'id' && header !== 'created_at') {
                                obj[header] = val;
                            }
                        });
                        pacientesAImportar.push(obj);
                    }
                    
                    if (pacientesAImportar.length > 0) {
                        const confirmacion = confirm(`¿Estás seguro de que deseas importar ${pacientesAImportar.length} pacientes?`);
                        if (!confirmacion) return;

                        const btn = document.querySelector('button[onclick="triggerImportarCSV()"]');
                        const originalText = btn.innerHTML;
                        btn.innerHTML = '<span class="material-symbols-outlined animate-spin text-[20px]">sync</span> Importando...';

                        const { error } = await supabaseClient
                            .from('pacientes')
                            .insert(pacientesAImportar);
                            
                        if (error) throw error;
                        
                        alert(`¡Se importaron ${pacientesAImportar.length} pacientes correctamente!`);
                        cargarPacientes();
                        btn.innerHTML = originalText;
                    }
                } catch (err) {
                    console.error('Error importando CSV:', err);
                    alert('Hubo un problema al importar. Verifica que las columnas coincidan con la base de datos (nombre, telefono, email, etc) y estén separadas por punto y coma (;).');
                } finally {
                    event.target.value = ''; // reset
                }
            };
            reader.readAsText(file);
        }
    