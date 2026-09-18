
        document.addEventListener('DOMContentLoaded', () => {
            cargarServicios();
            cargarProductos();
            cargarAjustes();
            cargarUsuariosPendientes();
            cargarUsuariosActivos();
            initToggleRecordatorios();
        });

        async function cargarUsuariosPendientes() {
            try {
                const { data: usuarios, error } = await supabaseClient
                    .from('profiles')
                    .select('*')
                    .eq('status', 'pendiente')
                    .order('created_at', { ascending: false });

                if (error) throw error;

                const container = document.getElementById('usuarios-pendientes-list');
                if(!container) return;
                
                if (usuarios.length === 0) {
                    container.innerHTML = '<p class="text-outline text-xs text-center py-4">No hay usuarios pendientes de aprobación.</p>';
                    return;
                }

                let html = '';
                usuarios.forEach(u => {
                    html += `
                    <div class="flex items-center justify-between p-3 bg-surface-container-low rounded-2xl border border-surface-variant/50">
                        <div class="flex-1 min-w-0">
                            <p class="font-bold text-sm text-on-surface truncate">${u.full_name || 'Sin nombre'}</p>
                            <p class="text-[11px] text-outline truncate">${u.email} • ${new Date(u.created_at).toLocaleDateString()}</p>
                        </div>
                        <div class="flex items-center gap-3 ml-4">
                            <select id="rol-aprobacion-${u.id}" class="bg-surface-container text-on-surface text-xs rounded border border-outline-variant px-2 py-1 outline-none">
                                <option value="asistente">Asistente Clínico</option>
                                <option value="tratante">Tratante / Especialista</option>
                                <option value="cajero">Cajero</option>
                                <option value="admin">Administrador</option>
                            </select>
                            <button onclick="rechazarUsuario('${u.id}')" class="p-2 text-error hover:bg-error/10 rounded-lg transition-colors" title="Rechazar">
                                <span class="material-symbols-outlined text-[20px]">close</span>
                            </button>
                            <button onclick="aprobarUsuario('${u.id}')" class="p-2 text-success bg-success/10 hover:bg-success/20 rounded-lg transition-colors font-bold" title="Aprobar y Asignar Rol">
                                <span class="material-symbols-outlined text-[20px]">check</span>
                            </button>
                        </div>
                    </div>
                    `;
                });
                container.innerHTML = html;
            } catch (err) {
                console.error("Error cargando usuarios pendientes:", err);
                const container = document.getElementById('usuarios-pendientes-list');
                if(container) container.innerHTML = '<p class="text-error text-[11px] text-center">Error al cargar datos.</p>';
            }
        }

        async function aprobarUsuario(id) {
            const selectElement = document.getElementById(`rol-aprobacion-${id}`);
            const selectedRole = selectElement ? selectElement.value : 'asistente';
            
            if(!confirm(`¿Aprobar el acceso de este usuario con el rol de ${selectedRole}?`)) return;
            try {
                const { error } = await supabaseClient.from('profiles').update({ status: 'aprobado', role: selectedRole }).eq('id', id);
                if (error) throw error;
                cargarUsuariosPendientes();
                cargarUsuariosActivos(); // Refresh also the active list just in case
            } catch (err) {
                console.error("Error al aprobar:", err);
                alert("Error al aprobar: " + err.message);
            }
        }

        async function cargarUsuariosActivos() {
            try {
                const { data: usuarios, error } = await supabaseClient
                    .from('profiles')
                    .select('*')
                    .neq('status', 'pendiente')
                    .order('created_at', { ascending: false });

                if (error) throw error;
                const container = document.getElementById('usuarios-activos-list');
                if (!container) return;
                
                if (!usuarios || usuarios.length === 0) {
                    container.innerHTML = '<p class="text-outline text-[11px] text-center">No hay usuarios activos.</p>';
                    return;
                }

                let html = '';
                usuarios.forEach(u => {
                    const selectedAsistente = u.role === 'asistente' ? 'selected' : '';
                    const selectedTratante = u.role === 'tratante' ? 'selected' : '';
                    const selectedCajero = u.role === 'cajero' ? 'selected' : '';
                    const selectedAdmin = u.role === 'admin' ? 'selected' : '';
                    const selectedRoot = u.role === 'root' ? 'selected' : '';

                    html += `
                    <div class="flex items-center justify-between p-3 bg-surface-container-low rounded-2xl border border-surface-variant/50">
                        <div class="flex-1 min-w-0">
                            <p class="font-bold text-sm text-on-surface truncate">${u.full_name || 'Sin nombre'}</p>
                            <p class="text-[11px] text-outline truncate">${u.email || ''} • Nivel: ${u.role}</p>
                        </div>
                        <div class="flex items-center gap-3 ml-4">
                            <select id="rol-activo-${u.id}" class="bg-surface-container text-on-surface text-xs rounded border border-outline-variant px-2 py-1 outline-none">
                                <option value="asistente" ${selectedAsistente}>Asistente Clínico</option>
                                <option value="tratante" ${selectedTratante}>Tratante / Especialista</option>
                                <option value="cajero" ${selectedCajero}>Cajero</option>
                                <option value="admin" ${selectedAdmin}>Administrador</option>
                            </select>
                            <button onclick="actualizarRolUsuarioActivo('${u.id}')" class="p-2 text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors font-bold" title="Guardar Rol">
                                <span class="material-symbols-outlined text-[20px]">save</span>
                            </button>
                            <button onclick="eliminarUsuarioActivo('${u.id}')" class="p-2 text-error bg-error/10 hover:bg-error/20 rounded-lg transition-colors font-bold" title="Eliminar Usuario">
                                <span class="material-symbols-outlined text-[20px]">delete</span>
                            </button>
                        </div>
                    </div>
                    `;
                });
                container.innerHTML = html;
            } catch (err) {
                console.error("Error cargando usuarios activos:", err);
                const container = document.getElementById('usuarios-activos-list');
                if(container) container.innerHTML = '<p class="text-error text-[11px] text-center">Error al cargar datos.</p>';
            }
        }

        async function actualizarRolUsuarioActivo(id) {
            const selectElement = document.getElementById(`rol-activo-${id}`);
            if(!selectElement) return;
            const newRole = selectElement.value;
            
            if(!confirm(`¿Cambiar el rol de este usuario a ${newRole}?`)) return;
            try {
                const { error } = await supabaseClient.from('profiles').update({ role: newRole }).eq('id', id);
                if (error) throw error;
                alert('Rol actualizado correctamente.');
                cargarUsuariosActivos();
            } catch (err) {
                console.error("Error al actualizar rol:", err);
                alert("Error al actualizar el rol: " + err.message);
            }
        }

        async function eliminarUsuarioActivo(id) {
            if(!confirm("¿Estás seguro de que deseas eliminar permanentemente a este usuario activo? Perderá el acceso al sistema.")) return;
            try {
                // Para una eliminación real de auth, se requeriría supabase.auth.admin.deleteUser (que necesita Service Key).
                // Eliminar el registro en profiles quitará el acceso dentro de nuestra lógica de roles.
                const { error } = await supabaseClient.from('profiles').delete().eq('id', id);
                if (error) throw error;
                alert('Usuario eliminado correctamente.');
                cargarUsuariosActivos();
            } catch (err) {
                console.error(err);
                alert("Error al eliminar usuario.");
            }
        }

        async function rechazarUsuario(id) {
            if(!confirm("¿Estás seguro de rechazar (y eliminar permanentemente) a este usuario?")) return;
            try {
                const { error } = await supabaseClient.from('profiles').delete().eq('id', id);
                if (error) throw error;
                cargarUsuariosPendientes();
            } catch (err) {
                console.error(err);
                alert("Error al rechazar usuario.");
            }
        }

        function cargarAjustes() {
            const comisionNacional = localStorage.getItem('comisionPOSNacional') || 4.5;
            const comisionInternacional = localStorage.getItem('comisionPOSInternacional') || 5.5;
            const igv = localStorage.getItem('igvPorcentaje') || 18;
            
            const wp = document.getElementById('setting-empresa-whatsapp');
            const em = document.getElementById('setting-empresa-email');
            if(wp) wp.value = localStorage.getItem('cfg_whatsapp') || '';
            if(em) em.value = localStorage.getItem('cfg_gcalendar') || '';

            const inputComNacional = document.getElementById('setting-comision-pos-nacional');
            const inputComInternacional = document.getElementById('setting-comision-pos-internacional');
            const inputIgv = document.getElementById('setting-igv');
            const inputApertura = document.getElementById('setting-hora-apertura');
            const inputCierre = document.getElementById('setting-hora-cierre');

            if (inputComNacional) inputComNacional.value = comisionNacional;
            if (inputComInternacional) inputComInternacional.value = comisionInternacional;
            if (inputIgv) inputIgv.value = igv;
            
            if (inputApertura) inputApertura.value = localStorage.getItem('horaApertura') || '08:00';
            if (inputCierre) inputCierre.value = localStorage.getItem('horaCierre') || '20:00';
        }

        window.guardarAjuste = function(key, value, showAlert = false) {
            localStorage.setItem(key, value);
            if (showAlert) {
                const toast = document.createElement('div');
                toast.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50 text-sm font-bold';
                toast.textContent = 'Ajuste guardado';
                document.body.appendChild(toast);
                setTimeout(() => toast.remove(), 2000);
            }
        };

        function toggleRecordatorios() {
            const toggle = document.getElementById('toggle-recordatorios');
            const dot = document.getElementById('toggle-recordatorios-dot');
            if (!toggle || !dot) return;
            
            const isEnabled = localStorage.getItem('recordatoriosSMS') !== 'false';
            if (isEnabled) {
                // Turn off
                localStorage.setItem('recordatoriosSMS', 'false');
                toggle.classList.remove('bg-primary');
                toggle.classList.add('bg-outline-variant');
                dot.classList.remove('translate-x-6');
                dot.classList.add('translate-x-1');
            } else {
                // Turn on
                localStorage.setItem('recordatoriosSMS', 'true');
                toggle.classList.add('bg-primary');
                toggle.classList.remove('bg-outline-variant');
                dot.classList.add('translate-x-6');
                dot.classList.remove('translate-x-1');
            }
        }

        function initToggleRecordatorios() {
            const toggle = document.getElementById('toggle-recordatorios');
            const dot = document.getElementById('toggle-recordatorios-dot');
            if (!toggle || !dot) return;
            
            const isEnabled = localStorage.getItem('recordatoriosSMS') !== 'false';
            if (!isEnabled) {
                toggle.classList.remove('bg-primary');
                toggle.classList.add('bg-outline-variant');
                dot.classList.remove('translate-x-6');
                dot.classList.add('translate-x-1');
            }
        }

        function guardarAjustesFinancieros(event) {
            const btn = event.currentTarget;
            const originalText = btn.innerHTML;
            btn.innerHTML = '<span class="material-symbols-outlined text-sm animate-spin">progress_activity</span> Guardando...';
            btn.disabled = true;

            setTimeout(() => {
                const comNac = document.getElementById('setting-comision-pos-nacional').value;
                const comInt = document.getElementById('setting-comision-pos-internacional').value;
                const igv = document.getElementById('setting-igv').value;

                if(comNac !== "") localStorage.setItem('comisionPOSNacional', comNac);
                if(comInt !== "") localStorage.setItem('comisionPOSInternacional', comInt);
                if(igv !== "") localStorage.setItem('igvPorcentaje', igv);

                // Guardar las metas mensuales del grid
                for(let i = 0; i < 12; i++) {
                    const val = document.getElementById(`input-meta-${i}`).value;
                    if(val !== "") {
                        const key = `metaMensual_${anioMetas}-${String(i + 1).padStart(2, '0')}`;
                        localStorage.setItem(key, val);
                    }
                }
                
                // Set global meta just in case for fallbacks
                const currentMonthMeta = document.getElementById(`input-meta-${new Date().getMonth()}`).value;
                if(currentMonthMeta) {
                    localStorage.setItem('metaMensual', currentMonthMeta);
                }

                btn.innerHTML = '<span class="material-symbols-outlined text-sm">check</span> Guardado';
                
                setTimeout(() => {
                    btn.innerHTML = originalText;
                    btn.disabled = false;
                }, 2000);
            }, 600);
        }

        // --- SISTEMA DE METAS POR MES ---
        let anioMetas = new Date().getFullYear();
        const MESES_CORTO = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

        function renderMetasGrid() {
            const lbl = document.getElementById('metas-anio-label');
            if(lbl) lbl.textContent = anioMetas;
            
            const container = document.getElementById('grid-metas-mensuales');
            if(!container) return;
            container.innerHTML = '';
            
            for(let i = 0; i < 12; i++) {
                const key = `metaMensual_${anioMetas}-${String(i + 1).padStart(2, '0')}`;
                const globalMeta = parseFloat(localStorage.getItem('metaMensual')) || 25000;
                let valor = localStorage.getItem(key);
                if (valor === null) valor = globalMeta;

                container.innerHTML += `
                    <div class="bg-surface-white border border-outline-variant rounded-xl p-2.5 shadow-sm">
                        <label class="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">${MESES_CORTO[i]}</label>
                        <input type="number" id="input-meta-${i}" value="${valor}" class="w-full text-sm font-bold text-primary rounded-lg bg-surface-container-lowest border border-outline-variant/50 px-2 py-1.5 focus:ring-2 focus:ring-primary focus:outline-none transition-all">
                    </div>
                `;
            }
        }

        function cambiarAnioMetas(delta) {
            anioMetas += delta;
            renderMetasGrid();
        }

        // Cargar ajustes financieros al inicio
        function cargarAjustesFinancierosActuales() {
            const comNac = localStorage.getItem('comisionPOSNacional');
            if (comNac) document.getElementById('setting-comision-pos-nacional').value = comNac;
            
            const comInt = localStorage.getItem('comisionPOSInternacional');
            if (comInt) document.getElementById('setting-comision-pos-internacional').value = comInt;
            
            const igv = localStorage.getItem('igvPorcentaje');
            if (igv) document.getElementById('setting-igv').value = igv;
            
            const apertura = localStorage.getItem('horaApertura');
            if (apertura) document.getElementById('setting-hora-apertura').value = apertura;
            
            const cierre = localStorage.getItem('horaCierre');
            if (cierre) document.getElementById('setting-hora-cierre').value = cierre;

            renderMetasGrid();
        }

        // Llamamos a la función apenas carga el script
        cargarAjustesFinancierosActuales();

        // --- SISTEMA DE FERIADOS ---
        let anioFeriados = new Date().getFullYear();
        
        async function cargarFeriados() {
            const lbl = document.getElementById('feriados-anio-label');
            if(lbl) lbl.textContent = anioFeriados;
            
            const container = document.getElementById('lista-feriados');
            if(!container) return;
            
            container.innerHTML = '<p class="text-xs text-outline text-center py-2">Cargando...</p>';
            
            try {
                const primerDia = `${anioFeriados}-01-01`;
                const ultimoDia = `${anioFeriados}-12-31`;
                
                const { data, error } = await supabaseClient
                    .from('dias_feriados')
                    .select('*')
                    .gte('fecha', primerDia)
                    .lte('fecha', ultimoDia)
                    .order('fecha', { ascending: true });
                    
                if (error) throw error;
                
                if (!data || data.length === 0) {
                    container.innerHTML = '<p class="text-xs text-outline text-center py-2">No hay feriados registrados este año.</p>';
                    return;
                }
                
                container.innerHTML = data.map(f => {
                    const d = new Date(f.fecha);
                    // Adjust to local to prevent off-by-one errors due to timezone
                    const localDate = new Date(d.getTime() + d.getTimezoneOffset() * 60000);
                    return `
                        <div class="flex items-center justify-between bg-surface-white border border-outline-variant/30 px-3 py-2 rounded-lg">
                            <div class="flex flex-col">
                                <span class="text-sm font-bold text-on-surface">${localDate.toLocaleDateString('es-PE', { day: 'numeric', month: 'long' })}</span>
                                <span class="text-[11px] text-on-surface-variant">${f.descripcion || 'Feriado'}</span>
                            </div>
                            <button onclick="eliminarFeriado('${f.id}')" class="text-error hover:bg-error/10 w-7 h-7 flex items-center justify-center rounded-md transition-colors"><span class="material-symbols-outlined text-[16px]">delete</span></button>
                        </div>
                    `;
                }).join('');
                
            } catch (err) {
                console.error("Error loading feriados", err);
                container.innerHTML = '<p class="text-xs text-error text-center py-2">Error al cargar.</p>';
            }
        }
        
        async function agregarFeriado() {
            const fechaInput = document.getElementById('nuevo-feriado-fecha');
            const descInput = document.getElementById('nuevo-feriado-desc');
            if (!fechaInput.value) return alert('Por favor, selecciona una fecha.');
            
            try {
                const { error } = await supabaseClient
                    .from('dias_feriados')
                    .insert([{ fecha: fechaInput.value, descripcion: descInput.value }]);
                if (error) throw error;
                
                fechaInput.value = '';
                descInput.value = '';
                cargarFeriados();
                
            } catch (err) {
                console.error("Error", err);
                alert("No se pudo agregar. Revisa si ya existe.");
            }
        }
        
        async function eliminarFeriado(id) {
            if (!confirm('¿Eliminar feriado?')) return;
            try {
                const { error } = await supabaseClient.from('dias_feriados').delete().eq('id', id);
                if (error) throw error;
                cargarFeriados();
            } catch (err) {
                console.error(err);
                alert("Error al eliminar.");
            }
        }
        
        function cambiarAnioFeriados(delta) {
            anioFeriados += delta;
            cargarFeriados();
        }
        
        document.addEventListener('DOMContentLoaded', () => {
            cargarFeriados();
        });

        // ==========================================
        // GESTIÓN DE PRODUCTOS
        // ==========================================
        let listaProductosGlobal = [];

        async function cargarProductos() {
            try {
                const { data, error } = await supabaseClient
                    .from('productos')
                    .select('*')
                    .order('nombre', { ascending: true });

                if (error) throw error;
                listaProductosGlobal = data || [];
                renderProductos(listaProductosGlobal);
            } catch (err) {
                console.error("Error al cargar productos:", err);
                document.getElementById('productos-list').innerHTML = 
                    '<p class="text-error text-xs text-center">Error al cargar productos.</p>';
            }
        }

        function renderProductos(productos) {
            const container = document.getElementById('productos-list');
            if (productos.length === 0) {
                container.innerHTML = '<p class="text-outline text-xs text-center py-4">No hay productos registrados.</p>';
                return;
            }

            let html = '';
            productos.forEach(p => {
                html += `
                <div onclick="abrirModalEdicionProducto('${p.id}')" class="flex items-center justify-between p-3 bg-surface-container-low rounded-2xl cursor-pointer hover:bg-surface-container transition-colors group">
                    <div class="flex-1 min-w-0">
                        <p class="font-bold text-sm text-on-surface truncate">${p.nombre}</p>
                        <p class="text-[11px] text-outline truncate">${p.descripcion || 'Sin descripción'}</p>
                    </div>
                    <div class="text-right ml-4">
                        <p class="font-bold text-sm text-primary">Venta: S/. ${parseFloat(p.precio).toFixed(2)}</p>
                        <p class="text-[10px] text-on-surface-variant line-through">Costo: S/. ${p.valor_compra || 0}</p>
                        <p class="text-[10px] text-outline">Stock: ${p.stock}</p>
                    </div>
                </div>
                `;
            });
            container.innerHTML = html;
        }

        function abrirModalNuevoProducto() {
            document.getElementById('formNuevoProducto').reset();
            document.getElementById('productoId').value = '';
            document.getElementById('modalProductTitle').textContent = 'Nuevo Producto';
            document.getElementById('btnEliminarProducto').classList.add('hidden');
            document.getElementById('modalNuevoProducto').showModal();
        }

        function abrirModalEdicionProducto(id) {
            const p = listaProductosGlobal.find(item => item.id === id);
            if (!p) return;

            document.getElementById('productoId').value = p.id;
            const form = document.getElementById('formNuevoProducto');
            form.elements['nombre'].value = p.nombre;
            form.elements['descripcion'].value = p.descripcion || '';
            form.elements['precio'].value = p.precio;
            form.elements['valor_compra'].value = p.valor_compra || 0;
            form.elements['stock'].value = p.stock;

            document.getElementById('modalProductTitle').textContent = 'Editar Producto';
            document.getElementById('btnEliminarProducto').classList.remove('hidden');
            document.getElementById('modalNuevoProducto').showModal();
        }

        document.getElementById('formNuevoProducto').addEventListener('submit', async (e) => {
            e.preventDefault();
            const form = e.target;
            const id = document.getElementById('productoId').value;
            const nombre = form.elements['nombre'].value;
            const descripcion = form.elements['descripcion'].value;
            const precio = parseFloat(form.elements['precio'].value);
            const valor_compra = parseFloat(form.elements['valor_compra'].value) || 0;
            const stock = parseInt(form.elements['stock'].value);

            const payload = { nombre, descripcion, precio, valor_compra, stock };

            try {
                if (id) {
                    const { error } = await supabaseClient.from('productos').update(payload).eq('id', id);
                    if (error) throw error;
                } else {
                    const { error } = await supabaseClient.from('productos').insert([payload]);
                    if (error) throw error;
                }
                document.getElementById('modalNuevoProducto').close();
                await cargarProductos();
            } catch (err) {
                console.error("Error al guardar producto:", err);
                alert("Error al guardar el producto.");
            }
        });

        async function eliminarProducto() {
            const id = document.getElementById('productoId').value;
            if (!id) return;

            if (confirm("¿Estás seguro de que deseas eliminar este producto?")) {
                try {
                    const { error } = await supabaseClient.from('productos').delete().eq('id', id);
                    if (error) throw error;
                    document.getElementById('modalNuevoProducto').close();
                    await cargarProductos();
                } catch (err) {
                    console.error("Error al eliminar producto:", err);
                    alert("Error al eliminar el producto.");
                }
            }
        }


        function abrirModalNuevo() {
            document.getElementById('formNuevoServicio').reset();
            document.getElementById('servicioId').value = '';
            document.getElementById('modalTitle').textContent = 'Nuevo Servicio';
            document.getElementById('btnEliminarServicio').classList.add('hidden');
            
            const form = document.getElementById('formNuevoServicio');
            form.elements['duracion'].value = '1';

            document.getElementById('modalNuevoServicio').showModal();
        }

        function abrirModalNuevoPack() {
            abrirModalNuevo();
            document.getElementById('modalTitle').textContent = 'Nuevo Paquete (Sesiones)';
            const form = document.getElementById('formNuevoServicio');
            form.elements['duracion'].value = '10'; // Predefinimos 10 sesiones
            form.elements['nombre'].placeholder = 'ej. Pack 10 Sesiones de Fisioterapia';
        }

        function abrirModalEdicionDesdeElemento(el) {
            const id = el.getAttribute('data-id');
            const nombre = el.getAttribute('data-nombre');
            const descripcion = el.getAttribute('data-descripcion');
            const duracion = parseInt(el.getAttribute('data-duracion'));
            const precio = parseFloat(el.getAttribute('data-precio'));
            const estado = el.getAttribute('data-estado');
            const icono = el.getAttribute('data-icono');
            
            abrirModalEdicion(id, nombre, descripcion, duracion, precio, estado, icono);
        }

        function abrirModalEdicion(id, nombre, descripcion, duracion, precio, estado, icono) {
            document.getElementById('formNuevoServicio').reset();
            document.getElementById('servicioId').value = id;
            document.getElementById('modalTitle').textContent = 'Editar Servicio';
            document.getElementById('btnEliminarServicio').classList.remove('hidden');
            
            const form = document.getElementById('formNuevoServicio');
            form.elements['nombre'].value = nombre;
            form.elements['descripcion'].value = descripcion || '';
            form.elements['duracion'].value = duracion;
            form.elements['precio'].value = precio;
            form.elements['estado'].value = estado;
            form.elements['icono'].value = icono || 'healing';
            
            document.getElementById('modalNuevoServicio').showModal();
        }

        async function eliminarServicio() {
            const id = document.getElementById('servicioId').value;
            if (!id) return;
            
            if (!confirm('¿Estás seguro de que deseas eliminar este servicio? Esta acción no se puede deshacer.')) return;
            
            const btnSubmit = document.getElementById('btnSubmitServicio');
            const spinner = document.getElementById('spinnerSubmitServicio');
            const btnEliminar = document.getElementById('btnEliminarServicio');
            
            btnSubmit.disabled = true;
            btnEliminar.disabled = true;
            spinner.classList.remove('hidden');

            try {
                const { error } = await supabaseClient
                    .from('servicios')
                    .delete()
                    .eq('id', id);

                if (error) throw error;

                document.getElementById('modalNuevoServicio').close();
                await cargarServicios();
            } catch (err) {
                console.error("Error al eliminar servicio:", err);
                alert("Hubo un error al eliminar el servicio.");
            } finally {
                btnSubmit.disabled = false;
                btnEliminar.disabled = false;
                spinner.classList.add('hidden');
            }
        }

        document.getElementById('formNuevoServicio').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const btnSubmit = document.getElementById('btnSubmitServicio');
            const spinner = document.getElementById('spinnerSubmitServicio');
            
            btnSubmit.disabled = true;
            spinner.classList.remove('hidden');

            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());

            const payload = {
                nombre: data.nombre,
                descripcion: data.descripcion,
                duracion: parseInt(data.duracion),
                precio: parseFloat(data.precio),
                estado: data.estado,
                icono: data.icono
            };

            try {
                let error;
                if (data.id) {
                    const res = await supabaseClient
                        .from('servicios')
                        .update(payload)
                        .eq('id', data.id);
                    error = res.error;
                } else {
                    const res = await supabaseClient
                        .from('servicios')
                        .insert([payload]);
                    error = res.error;
                }

                if (error) throw error;

                // Close modal, reset form and reload services
                document.getElementById('modalNuevoServicio').close();
                e.target.reset();
                await cargarServicios();

            } catch (err) {
                console.error("Error al crear servicio:", err);
                alert("Hubo un error al crear el servicio. Inténtelo de nuevo.");
            } finally {
                btnSubmit.disabled = false;
                spinner.classList.add('hidden');
            }
        });

        async function cargarServicios() {
            try {
                const grid = document.getElementById('serviciosGrid');
                if (!grid) return;
                
                grid.innerHTML = '<div class="col-span-full text-center py-8"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div><p class="text-on-surface-variant mt-4 font-label-sm">Cargando servicios...</p></div>';

                const { data: servicios, error } = await supabaseClient
                    .from('servicios')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (error) throw error;
                
                grid.innerHTML = '';
                
                if (servicios.length === 0) {
                    grid.innerHTML = `
                        <div class="col-span-full text-center py-12 bg-surface-white rounded-2xl border border-dashed border-outline-variant">
                            <span class="material-symbols-outlined text-4xl text-outline mb-3">medical_services</span>
                            <p class="font-body-md text-on-surface">No hay servicios configurados</p>
                        </div>
                    `;
                    return;
                }

                servicios.forEach((servicio) => {
                    const iconName = servicio.icono || 'healing';
                    
                    const isActive = servicio.estado === 'Activo';
                    const badgeClass = isActive ? 'bg-success/10 text-success uppercase' : 'bg-outline-variant/20 text-on-surface-variant uppercase';
                    const badgeText = isActive ? 'Activo' : servicio.estado;
                    
                    const safeDesc = (servicio.descripcion || '').replace(/'/g, "&#39;").replace(/"/g, "&quot;");
                    const safeNombre = servicio.nombre.replace(/'/g, "&#39;").replace(/"/g, "&quot;");
                    const safeIcono = iconName.replace(/'/g, "&#39;").replace(/"/g, "&quot;");

                    const cardHTML = `
                        <div data-id="${servicio.id}" 
                             data-nombre="${safeNombre}" 
                             data-descripcion="${(servicio.descripcion || '').replace(/"/g, '&quot;')}" 
                             data-duracion="${servicio.duracion}" 
                             data-precio="${servicio.precio}" 
                             data-estado="${servicio.estado}" 
                             data-icono="${safeIcono}"
                             onclick="abrirModalEdicionDesdeElemento(this)"
                             class="cursor-pointer bg-surface-white p-6 rounded-2xl shadow-[0px_10px_30px_rgba(0,0,0,0.04)] border border-transparent hover:border-primary/20 transition-all group relative">
                            <div class="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <span class="material-symbols-outlined text-outline-variant hover:text-primary">edit</span>
                            </div>
                            <div class="flex justify-between items-start mb-4">
                                <div class="p-3 bg-primary/5 rounded-xl text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                                    <span class="material-symbols-outlined">${iconName}</span>
                                </div>
                                <span class="text-headline-md font-bold text-on-surface">S/. ${parseFloat(servicio.precio).toFixed(2)}</span>
                            </div>
                            <h4 class="font-bold text-lg mb-1">${servicio.nombre}</h4>
                            <p class="text-sm text-on-surface-variant mb-4">${safeDesc}</p>
                            <div class="flex items-center gap-2">
                                <span class="px-2 py-1 bg-surface-container-high rounded text-[11px] font-bold text-on-surface-variant">${servicio.duracion} ${servicio.duracion === 1 ? 'Sesión' : 'Sesiones'}</span>
                                <span class="px-2 py-1 rounded text-[11px] font-bold ${badgeClass}">${badgeText}</span>
                            </div>
                        </div>
                    `;
                    grid.insertAdjacentHTML('beforeend', cardHTML);
                });

            } catch (err) {
                console.error("Error cargando servicios:", err);
                const grid = document.getElementById('serviciosGrid');
                if (grid) {
                    grid.innerHTML = '<div class="col-span-full text-center text-error">Error al cargar datos. Verifica la conexión.</div>';
                }
            }
        }
    