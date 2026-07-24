// js/controllers/citasController.js

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

        


        document.addEventListener("DOMContentLoaded", async () => {
            await cargarServicios();
            cargarCitas();
        });

        let allCitas = [];
        let estadoFiltro = 'Todos';

        async function cargarServicios() {
            try {
                const { data, error } = await CitasRepository.getServiciosActivos();
                if (!error && data) {
                    window.serviciosActivos = data;
                }
            } catch (err) {
                console.error("Error al cargar servicios:", err);
            }
        }

        function filtrarPorEstado(estado, btnElement) {
            estadoFiltro = estado;
            const filterBtns = document.querySelectorAll('.bg-surface-container-low button');
            filterBtns.forEach(b => {
                b.classList.remove('bg-surface-white', 'shadow-sm', 'text-primary');
                b.classList.add('text-on-surface-variant', 'hover:bg-surface-container-high');
            });
            btnElement.classList.add('bg-surface-white', 'shadow-sm', 'text-primary');
            btnElement.classList.remove('text-on-surface-variant', 'hover:bg-surface-container-high');
            
            filtrarCitas();
        }

        function filtrarCitas() {
            const searchInput = document.getElementById('searchInput');
            const query = searchInput ? searchInput.value.toLowerCase() : '';
            
            const filtrados = allCitas.filter(c => {
                const nombrePaciente = c.pacientes ? c.pacientes.nombre.toLowerCase() : '';
                const matchTexto = nombrePaciente.includes(query) || (c.tratamiento && c.tratamiento.toLowerCase().includes(query));
                
                let matchEstado = false;
                if (estadoFiltro === 'Todos') matchEstado = true;
                else if (estadoFiltro === 'Activo' && (c.estado === 'Pendiente' || c.estado === 'En Progreso' || c.estado === 'Confirmada' || c.estado === 'Confirmado')) matchEstado = true;
                else if (estadoFiltro === 'Inactivo' && (c.estado === 'Completada' || c.estado === 'Cancelada')) matchEstado = true;
                
                return matchTexto && matchEstado;
            });

            renderCitas(filtrados);
        }

        async function cargarCitas() {
            const tbody = document.getElementById('pacientes-tbody');
            tbody.innerHTML = '<tr><td colspan="6" class="px-8 py-4 text-center">Cargando citas...</td></tr>';
            
            const { data, error } = await CitasRepository.getTodasLasCitas();
            
            if (error) {
                console.error("Error al cargar citas:", error);
                tbody.innerHTML = '<tr><td colspan="6" class="px-8 py-4 text-center text-error">Error al cargar datos</td></tr>';
                return;
            }

            allCitas = CitasService.filterActivas(data);
            
            const totalBadge = document.getElementById('total-citas-badge');
            if(totalBadge) totalBadge.textContent = allCitas.length;
            const mostrandoText = document.getElementById('mostrando-citas-text');
            if(mostrandoText) mostrandoText.textContent = `Mostrando ${allCitas.length} citas activas`;

            filtrarCitas();
        }

        

        function renderCitas(data) {
            const tbody = document.getElementById('pacientes-tbody');
            tbody.innerHTML = '';

            data.forEach(cita => {
                let badgeClass = CitasService.getBadgeClass(cita.estado);
                
                const nombrePaciente = cita.pacientes ? cita.pacientes.nombre : 'Paciente Desconocido';
                
                let sessionStr = '<span class="bg-surface-container text-outline text-xs px-2 py-1 rounded font-bold">Cita Única</span>';
                if (cita.tratamiento) {
                    const baseTrat = cita.tratamiento.replace('(Continuación)', '').trim();
                    const servicioObj = window.serviciosActivos ? window.serviciosActivos.find(s => s.nombre === baseTrat) : null;
                    
                    if (servicioObj && servicioObj.duracion && servicioObj.duracion > 1) {
                        const prevOccurrences = allCitas.filter(c => 
                            c.paciente_id === cita.paciente_id && 
                            c.tratamiento && 
                            c.tratamiento.includes(baseTrat) && 
                            c.estado !== 'Cancelada' &&
                            (c.fecha < cita.fecha || (c.fecha === cita.fecha && (c.hora || '') <= (cita.hora || '')))
                        );
                        
                        const totalOccurrences = allCitas.filter(c => c.paciente_id === cita.paciente_id && c.tratamiento && c.tratamiento.includes(baseTrat) && c.estado !== 'Cancelada').length;
                        
                        if (cita.tratamiento.includes('(Continuación)') || totalOccurrences > 1 || prevOccurrences.length > 0) {
                            const occurrenceNumber = prevOccurrences.length || 1;
                            const currentSessionNum = ((occurrenceNumber - 1) % servicioObj.duracion) + 1;
                            sessionStr = `<span class="bg-primary/10 text-primary text-xs px-2 py-1 rounded font-bold">Sesión ${currentSessionNum} de ${servicioObj.duracion}</span>`;
                        }
                    }
                }
                
                const tr = document.createElement('tr');
                tr.className = 'hover:bg-surface-bright transition-colors cursor-pointer group';
                tr.onclick = () => {
                    const role = new URLSearchParams(window.location.search).get('role') || 'admin';
                    window.location.href = `atencion_tiempo_real_desktop.html?cita_id=${cita.id}&role=${role}`;
                };
                
                tr.innerHTML = `
                    <td class="px-4 md:px-8 py-4">
                        <div class="flex items-center gap-3">
                            <div class="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white font-bold flex-shrink-0">
                                ${nombrePaciente.charAt(0)}
                            </div>
                            <div class="flex flex-col">
                                <span class="font-bold text-on-surface group-hover:text-primary transition-colors">${nombrePaciente}</span>
                                <span class="text-xs text-on-surface-variant md:hidden">${cita.fecha} • ${CitasService.formatHora(cita.hora)}</span>
                            </div>
                        </div>
                    </td>
                    <td class="px-4 md:px-8 py-4" onclick="event.stopPropagation()">
                        <select 
                            class="px-2.5 py-1 ${badgeClass} rounded-full text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/30 ${cita.estado === 'En Progreso' || cita.estado === 'Completada' ? 'cursor-not-allowed opacity-90' : 'cursor-pointer'} border-none"
                            onchange="actualizarEstado(${cita.id}, this.value)"
                            ${cita.estado === 'En Progreso' || cita.estado === 'Completada' ? 'disabled' : ''}
                        >
                            <option value="Por Confirmar" ${cita.estado === 'Pendiente' || cita.estado === 'Por Confirmar' ? 'selected' : ''} class="bg-surface-white text-on-surface">Por Confirmar</option>
                            <option value="Confirmada" ${cita.estado === 'Confirmada' ? 'selected' : ''} class="bg-surface-white text-on-surface">Confirmada</option>
                            <option value="En Progreso" ${cita.estado === 'En Progreso' ? 'selected' : ''} class="bg-surface-white text-on-surface">En Progreso</option>
                            ${cita.estado === 'Completada' ? `<option value="Completada" selected class="bg-surface-white text-on-surface">Completada</option>` : ''}
                            <option value="Por Reprogramar" ${cita.estado === 'Por Reprogramar' ? 'selected' : ''} class="bg-surface-white text-on-surface">Por Reprogramar</option>
                        </select>
                    </td>
                    <td class="px-8 py-4 text-sm font-bold text-on-surface hidden md:table-cell">${sessionStr}</td>
                    <td class="px-8 py-4 text-sm text-on-surface-variant hidden md:table-cell">${cita.fecha} <br> <span class="text-xs text-outline">${CitasService.formatHora(cita.hora)}</span></td>
                    <td class="px-8 py-4 text-right hidden md:table-cell">
                        <span class="material-symbols-outlined text-outline group-hover:text-primary">arrow_forward</span>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }

        async function actualizarEstado(citaId, nuevoEstado) {
            try {
                // Notificación visual de carga (opcional)
                const trElement = document.querySelector(`select[onchange="actualizarEstado(${citaId}, this.value)"]`).closest('tr');
                trElement.style.opacity = '0.5';

                const { error } = await CitasRepository.updateEstadoCita(citaId, nuevoEstado);

                if (error) throw error;
                
                // Actualizar array local
                const index = allCitas.findIndex(c => c.id === citaId);
                if (index !== -1) {
                    allCitas[index].estado = nuevoEstado;
                }
                
                // Re-renderizar lista para actualizar colores
                filtrarCitas();
            } catch (error) {
                console.error("Error actualizando estado:", error);
                alert("Hubo un error al actualizar el estado de la cita.");
                // Revertir a la vista original si falla
                filtrarCitas();
            }
        }
