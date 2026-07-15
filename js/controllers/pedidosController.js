
        let catalogoProductos = [];
        let carrito = [];

        async function cargarCatalogo() {
            try {
                const { data: productos, error } = await supabaseClient.from('productos').select('*').order('nombre');
                if (error) throw error;
                catalogoProductos = productos || [];
                renderProductos(catalogoProductos);
                
                // Cargar Pacientes
                const { data: pacientes } = await supabaseClient.from('pacientes').select('id, nombre').order('nombre');
                const selectPac = document.getElementById('pos-paciente');
                if (pacientes) {
                    pacientes.forEach(p => {
                        selectPac.innerHTML += `<option value="${p.id}">${p.nombre}</option>`;
                    });
                }
            } catch (error) {
                console.error("Error cargando catálogo", error);
            }
        }

        function renderProductos(productos) {
            const grid = document.getElementById('productos-grid');
            if (productos.length === 0) {
                grid.innerHTML = '<p class="text-outline col-span-3 text-center py-10">No se encontraron productos o no coinciden con la búsqueda.</p>';
                return;
            }

            grid.innerHTML = productos.map(p => `
                <div class="bg-surface-container-lowest border border-surface-container p-4 rounded-xl flex flex-col hover:border-primary transition-colors cursor-pointer group" onclick="agregarAlCarrito('${p.id}')">
                    <div class="h-24 bg-surface-container-low rounded-lg mb-3 flex items-center justify-center">
                        <span class="material-symbols-outlined text-4xl text-outline-variant group-hover:text-primary transition-colors">medication</span>
                    </div>
                    <h4 class="font-bold text-on-surface text-sm line-clamp-2 flex-1">${p.nombre}</h4>
                    <div class="flex justify-between items-center mt-2">
                        <span class="text-primary font-bold">S/ ${parseFloat(p.precio).toFixed(2)}</span>
                        <span class="text-xs text-outline bg-surface-container px-2 py-1 rounded-md border border-surface-container-high">Stock: ${p.stock}</span>
                    </div>
                </div>
            `).join('');
        }

        function filtrarProductos() {
            const term = document.getElementById('search-product').value.toLowerCase();
            const filtrados = catalogoProductos.filter(p => p.nombre.toLowerCase().includes(term));
            renderProductos(filtrados);
        }

        function agregarAlCarrito(id) {
            const prod = catalogoProductos.find(p => p.id === id);
            if (!prod) return;

            const existing = carrito.find(item => item.id === id);
            if (existing) {
                if (existing.cantidad < prod.stock) {
                    existing.cantidad++;
                } else {
                    showToast("No hay más stock disponible", "error");
                }
            } else {
                if (prod.stock > 0) {
                    carrito.push({ ...prod, cantidad: 1 });
                } else {
                    showToast("Producto sin stock", "error");
                    return;
                }
            }
            renderCarrito();
        }

        function cambiarCantidad(id, delta) {
            const item = carrito.find(i => i.id === id);
            if (!item) return;

            item.cantidad += delta;
            if (item.cantidad <= 0) {
                carrito = carrito.filter(i => i.id !== id);
            } else if (item.cantidad > item.stock) {
                item.cantidad = item.stock;
                showToast("Stock máximo alcanzado", "error");
            }
            renderCarrito();
        }

        function renderCarrito() {
            const container = document.getElementById('cart-items');
            if (carrito.length === 0) {
                container.innerHTML = `
                    <div class="text-center text-outline mt-10">
                        <span class="material-symbols-outlined text-4xl mb-2 opacity-50">shopping_basket</span>
                        <p class="text-sm">El carrito está vacío</p>
                    </div>`;
                actualizarTotales();
                return;
            }

            container.innerHTML = carrito.map(item => `
                <div class="flex items-center justify-between p-3 bg-surface-container-lowest rounded-xl border border-surface-container">
                    <div class="flex-1">
                        <p class="text-sm font-bold text-on-surface line-clamp-1">${item.nombre}</p>
                        <p class="text-xs text-primary font-bold">S/ ${(item.precio * item.cantidad).toFixed(2)}</p>
                    </div>
                    <div class="flex items-center gap-3 bg-surface-container px-2 py-1 rounded-lg">
                        <button onclick="cambiarCantidad('${item.id}', -1)" class="w-6 h-6 flex items-center justify-center rounded-md hover:bg-surface-white text-on-surface-variant font-bold">-</button>
                        <span class="text-sm font-bold w-4 text-center">${item.cantidad}</span>
                        <button onclick="cambiarCantidad('${item.id}', 1)" class="w-6 h-6 flex items-center justify-center rounded-md hover:bg-surface-white text-on-surface-variant font-bold">+</button>
                    </div>
                </div>
            `).join('');

            actualizarTotales();
        }

        function actualizarTotales() {
            const subtotal = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
            document.getElementById('pos-subtotal').textContent = `S/ ${subtotal.toFixed(2)}`;
            document.getElementById('pos-total').textContent = `S/ ${subtotal.toFixed(2)}`;
        }

        async function procesarVenta() {
            if (carrito.length === 0) {
                showToast("El carrito está vacío", "error");
                return;
            }

            const pacienteId = document.getElementById('pos-paciente').value;
            const total = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
            
            const btn = document.querySelector('button[onclick="procesarVenta()"]');
            btn.disabled = true;
            btn.innerHTML = '<span class="material-symbols-outlined animate-spin">sync</span> Procesando...';

            try {
                // Registrar pago
                const descripcion = "Venta Mostrador: " + carrito.map(c => `${c.nombre} (x${c.cantidad})`).join(", ");
                const { error: pagoErr } = await supabaseClient.from('pagos').insert([{
                    paciente_id: pacienteId || null,
                    monto: total,
                    estado: 'Completado',
                    metodo: 'Efectivo',
                    fecha: new Date().toISOString(),
                    descripcion: descripcion
                }]);
                
                if (pagoErr) throw pagoErr;

                // Descontar inventario
                for (const item of carrito) {
                    await supabaseClient.from('productos').update({
                        stock: item.stock - item.cantidad
                    }).eq('id', item.id);
                }

                showToast("¡Venta completada con éxito!", "success");
                carrito = [];
                renderCarrito();
                await cargarCatalogo(); // Recargar stock real
            } catch (error) {
                console.error(error);
                showToast("Error procesando la venta", "error");
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<span class="material-symbols-outlined">payments</span> Cobrar Pedido';
            }
        }

        function showToast(message, type = "success") {
            const toast = document.createElement("div");
            toast.className = `fixed bottom-6 right-6 px-6 py-3 rounded-xl shadow-lg font-bold text-white transition-all transform translate-y-10 opacity-0 z-[100] ${
                type === "success" ? "bg-success" : type === "error" ? "bg-error" : "bg-primary"
            }`;
            toast.textContent = message;
            document.body.appendChild(toast);
            setTimeout(() => toast.classList.remove("translate-y-10", "opacity-0"), 100);
            setTimeout(() => {
                toast.classList.add("translate-y-10", "opacity-0");
                setTimeout(() => toast.remove(), 500);
            }, 3000);
        }

        document.addEventListener("DOMContentLoaded", () => {
            cargarCatalogo();
        });
