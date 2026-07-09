        // --- GESTIÓN DE CUENTA ---
        async function cargarDatosCuenta() {
            try {
                const { data: { session }, error } = await supabaseClient.auth.getSession();
                if (error || !session) return;
                
                const user = session.user;
                const emailInput = document.getElementById('account-email');
                if (emailInput) emailInput.value = user.email;
                
                const { data: profile } = await supabaseClient.from('profiles').select('*').eq('id', user.id).single();
                if (profile) {
                    const nombreInput = document.getElementById('account-nombre');
                    if (nombreInput) nombreInput.value = profile.full_name || '';
                    
                    const datosInput = document.getElementById('account-datos');
                    if (datosInput) datosInput.value = profile.datos_personales || '';
                }
            } catch (err) {
                console.error("Error al cargar datos de cuenta:", err);
            }
        }

        async function guardarDatosCuenta() {
            try {
                const btn = event.currentTarget;
                const originalText = btn.innerHTML;
                btn.innerHTML = 'Guardando...';
                btn.disabled = true;

                const { data: { session } } = await supabaseClient.auth.getSession();
                if (!session) return;

                const email = document.getElementById('account-email').value;
                const password = document.getElementById('account-password').value;
                const datosPersonales = document.getElementById('account-datos').value;

                // Update auth (email/password)
                let authUpdates = {};
                if (email && email !== session.user.email) authUpdates.email = email;
                if (password) authUpdates.password = password;
                
                if (Object.keys(authUpdates).length > 0) {
                    const { error } = await supabaseClient.auth.updateUser(authUpdates);
                    if (error) throw error;
                }

                // Update profile (datos)
                const { error: profileError } = await supabaseClient.from('profiles')
                    .update({ datos_personales: datosPersonales })
                    .eq('id', session.user.id);
                
                if (profileError) throw profileError;

                alert('Datos de cuenta actualizados correctamente.');
                document.getElementById('account-password').value = '';

                btn.innerHTML = originalText;
                btn.disabled = false;
            } catch (err) {
                console.error("Error al guardar cuenta:", err);
                alert("Error al actualizar la cuenta: " + err.message);
                event.currentTarget.innerHTML = 'Guardar Cambios';
                event.currentTarget.disabled = false;
            }
        }

        document.addEventListener('DOMContentLoaded', () => {
            cargarDatosCuenta();
        });

        // --- CERRAR SESIÓN ---
        async function cerrarSesion() {
            if (!confirm('¿Deseas cerrar sesión?')) return;
            try { await supabaseClient.auth.signOut(); } catch(e) {}
            localStorage.clear();
            sessionStorage.clear();
            window.location.replace('../index.html');
        }

        // Simple toggle simulation for the notification switch
        const toggle = document.querySelector('.relative.inline-flex');
        const knob = toggle.querySelector('span');
        toggle.addEventListener('click', () => {
            toggle.classList.toggle('bg-primary');
            toggle.classList.toggle('bg-outline-variant');
            knob.classList.toggle('translate-x-6');
            knob.classList.toggle('translate-x-1');
        });

        // Hover effect for side nav items
        const navItems = document.querySelectorAll('nav a');
        navItems.forEach(item => {
            item.addEventListener('mouseenter', () => {
                if(!item.classList.contains('text-primary')) {
                    item.style.transform = 'translateX(4px)';
                }
            });
            item.addEventListener('mouseleave', () => {
                item.style.transform = 'translateX(0)';
            });
            item.style.transition = 'all 0.2s ease';
        });
        document.addEventListener('DOMContentLoaded', () => {
            cargarServicios();
            cargarProductos();
            cargarAjustes();
        });

        function cargarAjustes() {
            const meta = localStorage.getItem('metaMensual') || 50000;
            const comisionNacional = localStorage.getItem('comisionPOSNacional') || 4.5;
            const comisionInternacional = localStorage.getItem('comisionPOSInternacional') || 5.5;
            const igv = localStorage.getItem('igvPorcentaje') || 18;
            const horaApertura = localStorage.getItem('horaApertura') || '08:00';
            const horaCierre = localStorage.getItem('horaCierre') || '20:00';
            
            const inputMeta = document.getElementById('setting-meta-mensual');
            const inputComNacional = document.getElementById('setting-comision-pos-nacional');
            const inputComInternacional = document.getElementById('setting-comision-pos-internacional');
            const inputIgv = document.getElementById('setting-igv');
            const inputApertura = document.getElementById('setting-hora-apertura');
            const inputCierre = document.getElementById('setting-hora-cierre');
            
            if (inputMeta) inputMeta.value = meta;
            if (inputComNacional) inputComNacional.value = comisionNacional;
            if (inputComInternacional) inputComInternacional.value = comisionInternacional;
            if (inputIgv) inputIgv.value = igv;
            if (inputApertura) inputApertura.value = horaApertura;
            if (inputCierre) inputCierre.value = horaCierre;
        }

        function guardarAjuste(key, value) {
            localStorage.setItem(key, value);
        }

        function guardarAjustesFinancieros(event) {
            const btn = event.currentTarget;
            const originalText = btn.innerHTML;
            btn.innerHTML = '<span class="material-symbols-outlined text-sm animate-spin">progress_activity</span> Guardando...';
            btn.disabled = true;

            setTimeout(() => {
                const meta = document.getElementById('setting-meta-mensual').value;
                const comNac = document.getElementById('setting-comision-pos-nacional').value;
                const comInt = document.getElementById('setting-comision-pos-internacional').value;
                const igv = document.getElementById('setting-igv').value;

                if(meta !== "") localStorage.setItem('metaMensual', meta);
                if(comNac !== "") localStorage.setItem('comisionPOSNacional', comNac);
                if(comInt !== "") localStorage.setItem('comisionPOSInternacional', comInt);
                if(igv !== "") localStorage.setItem('igvPorcentaje', igv);

                btn.innerHTML = '<span class="material-symbols-outlined text-sm">check</span> Guardado';
                
                setTimeout(() => {
                    btn.innerHTML = originalText;
                    btn.disabled = false;
                }, 2000);
            }, 600);
        }

        // Cargar ajustes financieros al inicio
        function cargarAjustesFinancierosActuales() {
            const meta = localStorage.getItem('metaMensual');
            if (meta) document.getElementById('setting-meta-mensual').value = meta;
            
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
        }

        // Llamamos a la función apenas carga el script
        cargarAjustesFinancierosActuales();

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
                        <p class="font-bold text-sm text-primary">S/. ${parseFloat(p.precio).toFixed(2)}</p>
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
            const stock = parseInt(form.elements['stock'].value);

            const payload = { nombre, descripcion, precio, stock };

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
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('../sw.js').then(registration => {
                    console.log('SW registered: ', registration);
                }).catch(registrationError => {
                    console.log('SW registration failed: ', registrationError);
                });
            });
        }
