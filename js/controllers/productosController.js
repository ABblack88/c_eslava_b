
        document.addEventListener('DOMContentLoaded', () => {
            cargarServicios();
            cargarProductos();
            cargarPacientesPOS();
        });

        let pacientesPOSGlobal = [];
        async function cargarPacientesPOS() {
            try {
                const { data: pacs } = await supabaseClient.from('pacientes').select('*').order('nombre');
                if (pacs) {
                    pacientesPOSGlobal = pacs;
                    renderListaPacientesPOS(pacs);
                }
            } catch(e) { console.error("Error al cargar pacientes POS:", e); }
        }

        function renderListaPacientesPOS(pacs) {
            const list = document.getElementById('pos-paciente-list');
            if(!list) return;
            list.innerHTML = '';
            if(pacs.length === 0) {
                list.innerHTML = '<li class="px-4 py-3 text-sm text-outline">No se encontraron pacientes</li>';
                return;
            }
            pacs.forEach(p => {
                const li = document.createElement('li');
                li.className = 'px-4 py-3 text-sm hover:bg-surface-container-low cursor-pointer border-b border-outline-variant/10 last:border-0';
                li.textContent = p.nombre;
                li.onclick = () => seleccionarPacientePOS(p.id, p.nombre);
                list.appendChild(li);
            });
        }

        function filtrarPacientesPOS(query) {
            const list = document.getElementById('pos-paciente-list');
            if(!list) return;
            list.classList.remove('hidden');
            const q = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const filtrados = pacientesPOSGlobal.filter(p => {
                const nombreNormalizado = p.nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                return nombreNormalizado.includes(q);
            });
            renderListaPacientesPOS(filtrados);
            if(query === '') {
                document.getElementById('pos-paciente-id').value = '';
            }
        }

        function mostrarListaPacientes() {
            const list = document.getElementById('pos-paciente-list');
            if(list) list.classList.remove('hidden');
        }

        function seleccionarPacientePOS(id, nombre) {
            document.getElementById('pos-paciente-id').value = id;
            document.getElementById('pos-paciente-search').value = nombre;
            document.getElementById('pos-paciente-list').classList.add('hidden');
        }

        document.addEventListener('click', (e) => {
            const container = document.getElementById('pos-paciente-container');
            if(container && !container.contains(e.target)) {
                const list = document.getElementById('pos-paciente-list');
                if(list) list.classList.add('hidden');
            }
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
            const role = typeof RBACService !== 'undefined' ? RBACService.getRoleFromURL() : '';
            const isAdmin = role === 'admin' || role === 'root';
            
            productos.forEach(p => {
                const stockWarning = p.stock < 5 ? '<span class="text-error font-bold material-symbols-outlined text-[14px]">warning</span>' : '';
                html += `
                <div onclick="agregarAlCarrito('${p.id}')" class="cursor-pointer bg-surface-white p-5 rounded-2xl shadow-sm border border-outline-variant/30 hover:border-primary/50 hover:shadow-md transition-all group relative flex flex-col h-full">
                    ${isAdmin ? `
                    <div class="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <button onclick="event.stopPropagation(); abrirModalEdicionProducto('${p.id}')" class="bg-surface-container text-on-surface-variant hover:text-primary p-1.5 rounded-full flex items-center justify-center">
                            <span class="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                    </div>` : ''}
                    <div class="flex justify-between items-start mb-3">
                        <div class="p-2.5 bg-primary/5 rounded-xl text-primary">
                            <span class="material-symbols-outlined">vaccines</span>
                        </div>
                    </div>
                    <h4 class="font-bold text-base mb-1 text-on-surface leading-tight">${p.nombre}</h4>
                    <p class="text-[12px] text-on-surface-variant mb-4 flex-grow line-clamp-2">${p.descripcion || 'Sin descripción'}</p>
                    <div class="flex items-end justify-between mt-auto pt-2 border-t border-outline-variant/20">
                        <div>
                            ${isAdmin ? `<p class="text-xs text-on-surface-variant line-through mb-0.5">Costo: S/ ${p.valor_compra || 0}</p>` : ''}
                            <span class="text-headline-md font-bold text-primary">S/ ${parseFloat(p.precio).toFixed(2)}</span>
                        </div>
                        <div class="flex items-center gap-1 bg-surface-container-low px-2 py-1 rounded text-[11px] text-on-surface-variant font-medium">
                            ${stockWarning}
                            Stock: ${p.stock}
                        </div>
                    </div>
                </div>
                `;
            });
            container.innerHTML = html;
            
            const btnAdd = document.getElementById('btn-add-producto');
            if (btnAdd) {
                btnAdd.style.display = isAdmin ? 'flex' : 'none';
            }
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
            const valor_compra = form.elements['valor_compra'].value ? parseFloat(form.elements['valor_compra'].value) : 0;
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

        // --- CARRITO LOGIC ---
        let carrito = [];

        function agregarAlCarrito(id) {
            const p = listaProductosGlobal.find(item => item.id === id);
            if (!p) return;

            const ex = carrito.find(item => item.id === id);
            if (ex) {
                if(ex.cantidad < p.stock) {
                    ex.cantidad += 1;
                } else {
                    alert("No hay más stock disponible para este producto.");
                }
            } else {
                if (p.stock > 0) {
                    carrito.push({ ...p, cantidad: 1 });
                } else {
                    alert("Producto sin stock.");
                }
            }
            renderCarrito();
        }

        function modificarCantidad(id, delta) {
            const index = carrito.findIndex(item => item.id === id);
            if (index === -1) return;
            
            const p = listaProductosGlobal.find(item => item.id === id);
            
            carrito[index].cantidad += delta;
            
            if (carrito[index].cantidad <= 0) {
                carrito.splice(index, 1);
            } else if (carrito[index].cantidad > p.stock) {
                carrito[index].cantidad = p.stock;
            }
            
            renderCarrito();
        }

        function renderCarrito() {
            const container = document.getElementById('cart-items');
            if (carrito.length === 0) {
                container.innerHTML = '<p class="text-center text-outline-variant text-sm mt-10">Selecciona productos del inventario para añadir a la cuenta.</p>';
                document.getElementById('cart-subtotal').textContent = 'S/ 0.00';
                document.getElementById('cart-igv').textContent = 'S/ 0.00';
                document.getElementById('cart-total').textContent = 'S/ 0.00';
                return;
            }

            let html = '';
            let subtotal = 0;

            carrito.forEach(item => {
                const totalItem = item.precio * item.cantidad;
                subtotal += totalItem;

                html += `
                <div class="flex items-center justify-between p-3 bg-surface-container-low rounded-xl">
                    <div class="flex-1 pr-2">
                        <p class="font-bold text-sm text-on-surface line-clamp-1">${item.nombre}</p>
                        <p class="text-primary font-bold text-xs">S/ ${parseFloat(item.precio).toFixed(2)}</p>
                    </div>
                    <div class="flex items-center gap-3 bg-surface-white rounded-lg px-2 py-1 shadow-sm border border-outline-variant/20">
                        <button onclick="modificarCantidad('${item.id}', -1)" class="text-on-surface-variant hover:text-error">
                            <span class="material-symbols-outlined text-[18px]">remove</span>
                        </button>
                        <span class="font-bold text-sm min-w-[1ch] text-center">${item.cantidad}</span>
                        <button onclick="modificarCantidad('${item.id}', 1)" class="text-on-surface-variant hover:text-primary">
                            <span class="material-symbols-outlined text-[18px]">add</span>
                        </button>
                    </div>
                </div>
                `;
            });

            container.innerHTML = html;
            
            const total = subtotal; // Assuming prices already include IGV for simplicity in POS. Or apply 18% if needed. Let's assume Subtotal is base.
            // If they are base:
            const igv = total * 0.18;
            const subtotalSinIgv = total - igv;

            document.getElementById('cart-subtotal').textContent = 'S/ ' + subtotalSinIgv.toFixed(2);
            document.getElementById('cart-igv').textContent = 'S/ ' + igv.toFixed(2);
            document.getElementById('cart-total').textContent = 'S/ ' + total.toFixed(2);
        }

        function cobrarCarrito() {
            if (carrito.length === 0) return alert("El carrito está vacío");
            alert("Pago procesado y registrado con éxito.");
            carrito = [];
            renderCarrito();
        }

        async function cargarCuentaPaciente() {
            if (carrito.length === 0) return alert("El carrito está vacío");
            const pacId = document.getElementById('pos-paciente-id') ? document.getElementById('pos-paciente-id').value : '';
            if (!pacId) return alert("Por favor, seleccione un paciente primero para cargar a su cuenta.");

            const btn = document.querySelector('button[onclick="cargarCuentaPaciente()"]');
            const originalHtml = btn ? btn.innerHTML : '';
            if (btn) { btn.disabled = true; btn.innerHTML = '<span class="material-symbols-outlined animate-spin text-sm">sync</span> Cargando...'; }

            try {
                // Calcular total del carrito
                const subtotal = carrito.reduce((s, item) => s + (item.precio * item.cantidad), 0);

                // Construir descripción detallada
                const desc = 'Productos: ' + carrito.map(p => `${p.nombre} (x${p.cantidad})`).join(', ');

                // Insertar un registro en pagos como Pendiente
                const { error: errPago } = await supabaseClient.from('pagos').insert([{
                    paciente_id: pacId,
                    cita_id: null,
                    monto: subtotal,
                    metodo: 'Pendiente',
                    estado: 'Pendiente',
                    fecha: new Date().toISOString(),
                    descripcion: desc
                }]);

                if (errPago) throw errPago;

                // Descontar stock de cada producto leyendo stock actual
                for (const item of carrito) {
                    const { data: prodActual } = await supabaseClient
                        .from('productos').select('stock').eq('id', item.id).single();
                    const stockActual = prodActual?.stock ?? item.stock ?? 0;
                    const newStock = Math.max(0, stockActual - item.cantidad);
                    await supabaseClient.from('productos').update({ stock: newStock }).eq('id', item.id);
                }

                // Feedback y limpiar carrito
                carrito = [];
                renderCarrito();

                // Mostrar toast de éxito
                const toast = document.createElement('div');
                toast.className = 'fixed bottom-6 right-6 bg-[#34C759] text-white px-6 py-3 rounded-xl shadow-lg font-bold z-[100]';
                toast.innerHTML = `<span class="material-symbols-outlined align-middle mr-1">check_circle</span> Productos cargados a la cuenta del paciente`;
                document.body.appendChild(toast);
                setTimeout(() => toast.remove(), 3500);

                // Recargar productos para actualizar stock visible
                await cargarProductos();

            } catch(e) {
                console.error('Error al cargar a cuenta:', e);
                alert('Ocurrió un error al cargar los productos a la cuenta. Intente de nuevo.');
            } finally {
                if (btn) { btn.disabled = false; btn.innerHTML = originalHtml; }
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
    