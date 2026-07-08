        // Subtle scroll behavior for the Top Bar
        window.addEventListener('scroll', () => {
            const header = document.querySelector('header');
            if (window.scrollY > 20) {
                header.classList.add('shadow-md');
                header.classList.remove('shadow-sm');
            } else {
                header.classList.remove('shadow-md');
                header.classList.add('shadow-sm');
            }
        });

        // Helper function to format currency
        function formatCurrency(amount) {
            return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(amount);
        }

        function getInitials(name) {
            if (!name) return '??';
            const parts = name.split(' ');
            if (parts.length >= 2) {
                return (parts[0][0] + parts[1][0]).toUpperCase();
            }
            return name.substring(0, 2).toUpperCase();
        }

        async function cargarDatosFinancieros() {
            try {
                const { data: pagos, error } = await supabaseClient
                    .from('pagos')
                    .select(`id, monto, metodo, estado, fecha, pacientes ( nombre ), citas ( tratamiento )`)
                    .order('fecha', { ascending: false });

                if (error) throw error;

                const safePagos = pagos || [];
                const now = new Date();
                const mesActual = now.getMonth();
                const anioActual = now.getFullYear();

                const pagosDelMes = safePagos.filter(p => {
                    const f = new Date(p.fecha);
                    return f.getMonth() === mesActual && f.getFullYear() === anioActual;
                });

                const totalIngresos = pagosDelMes.filter(p => p.estado === 'Completado').reduce((sum, p) => sum + Number(p.monto), 0);
                const pendientes = safePagos.filter(p => p.estado === 'Pendiente');
                const totalPendientes = pendientes.reduce((sum, p) => sum + Number(p.monto), 0);

                // Meta dinámica
                const meta = parseFloat(localStorage.getItem('metaMensual') || 50000);
                const progresoPct = meta > 0 ? Math.min(100, Math.round((totalIngresos / meta) * 100)) : 0;

                const elIngresos = document.getElementById('total-ingresos');
                const elMeta = document.getElementById('meta-mensual-display');
                const elProgresoPct = document.getElementById('progreso-pct');
                const elProgresoBar = document.getElementById('progreso-bar');
                const elReclamos = document.getElementById('total-reclamos');
                const elReclamosCount = document.getElementById('count-reclamos');
                const elVencidos = document.getElementById('total-vencidos');
                const elVencidosCount = document.getElementById('count-vencidos');
                const elMontoPromedio = document.getElementById('monto-promedio-vencidos');

                if (elIngresos) elIngresos.textContent = formatCurrency(totalIngresos);
                if (elMeta) elMeta.textContent = `S/ ${meta.toLocaleString('es-PE')}`;
                if (elProgresoPct) elProgresoPct.textContent = `${progresoPct}%`;
                if (elProgresoBar) elProgresoBar.style.width = `${progresoPct}%`;
                if (elReclamos) elReclamos.textContent = formatCurrency(totalPendientes);
                if (elReclamosCount) elReclamosCount.textContent = `${pendientes.length} expedientes abiertos`;
                if (elVencidos) elVencidos.textContent = formatCurrency(totalPendientes);
                if (elVencidosCount) elVencidosCount.textContent = pendientes.length.toString();
                if (elMontoPromedio) elMontoPromedio.textContent = pendientes.length > 0 ? formatCurrency(totalPendientes / pendientes.length) : 'S/ 0';

                window.todosLosPagos = safePagos;
                window.pagosPendientesGlobal = pendientes;

                renderPagosPendientes(safePagos);
                renderActividadReciente(safePagos);
            } catch (error) {
                console.error("Error al cargar datos financieros:", error);
                document.getElementById('pagos-pendientes-container').innerHTML = '<p class="text-error">Error al cargar pagos pendientes.</p>';
                document.getElementById('actividad-reciente-container').innerHTML = '<tr><td colspan="5" class="py-5 text-center text-error">Error al cargar actividad.</td></tr>';
            }
        }

        // Datos globales para modal cuentas por cobrar
        let cuentasCobrarGlobal = [];

        async function abrirModalCuentasCobrar() {
            document.getElementById('modalCuentasCobrar').showModal();
            const lista = document.getElementById('lista-cuentas-cobrar');
            lista.innerHTML = '<div class="flex justify-center py-8"><span class="material-symbols-outlined animate-spin text-primary">sync</span></div>';

            try {
                const { data, error } = await supabaseClient
                    .from('pagos')
                    .select('id, monto, fecha, descripcion, pacientes(nombre), citas(tratamiento)')
                    .eq('estado', 'Pendiente')
                    .order('fecha', { ascending: true });

                if (error) throw error;

                // Agrupar por paciente
                const porPaciente = {};
                (data || []).forEach(p => {
                    const nombre = p.pacientes?.nombre || 'Sin nombre';
                    if (!porPaciente[nombre]) porPaciente[nombre] = { items: [], total: 0 };
                    porPaciente[nombre].items.push(p);
                    porPaciente[nombre].total += Number(p.monto);
                });

                cuentasCobrarGlobal = porPaciente;
                const totalGeneral = Object.values(porPaciente).reduce((s, v) => s + v.total, 0);
                document.getElementById('modal-total-cobrar').textContent = formatCurrency(totalGeneral);

                renderCuentasCobrar(porPaciente);
            } catch(e) {
                lista.innerHTML = '<p class="text-error text-center py-4">Error al cargar cuentas.</p>';
            }
        }

        function renderCuentasCobrar(porPaciente) {
            const lista = document.getElementById('lista-cuentas-cobrar');
            const keys = Object.keys(porPaciente);
            if (keys.length === 0) {
                lista.innerHTML = '<p class="text-outline text-center py-8">No hay cuentas pendientes. ✓</p>';
                return;
            }
            let html = '';
            keys.forEach(nombre => {
                const { items, total } = porPaciente[nombre];
                html += `
                <div class="bg-surface-container-lowest rounded-2xl border border-surface-container overflow-hidden">
                    <div class="flex items-center justify-between p-4 bg-surface-container-low">
                        <div class="flex items-center gap-3">
                            <div class="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">${getInitials(nombre)}</div>
                            <div>
                                <p class="font-bold text-sm text-on-surface">${nombre}</p>
                                <p class="text-xs text-on-surface-variant">${items.length} pago${items.length > 1 ? 's' : ''} pendiente${items.length > 1 ? 's' : ''}</p>
                            </div>
                        </div>
                        <span class="font-bold text-warning">${formatCurrency(total)}</span>
                    </div>
                    <div class="divide-y divide-surface-container">
                        ${items.map(it => {
                            const fecha = new Date(it.fecha).toLocaleDateString('es-PE', {day:'2-digit', month:'short', year:'numeric'});
                            return `<div class="flex justify-between items-center px-4 py-3 text-sm">
                                <div>
                                    <p class="text-on-surface">${it.descripcion || (it.citas && it.citas.tratamiento) || 'Servicio médico'}</p>
                                    <p class="text-xs text-on-surface-variant">${fecha}</p>
                                </div>
                                <span class="font-bold text-on-surface">${formatCurrency(it.monto)}</span>
                            </div>`;
                        }).join('')}
                    </div>
                </div>`;
            });
            lista.innerHTML = html;
        }

        function filtrarCuentas() {
            const q = document.getElementById('filtro-cuentas').value.toLowerCase();
            const filtrado = {};
            Object.keys(cuentasCobrarGlobal).forEach(k => {
                if (k.toLowerCase().includes(q)) filtrado[k] = cuentasCobrarGlobal[k];
            });
            renderCuentasCobrar(filtrado);
        }

        function renderPagosPendientes(pagos) {
            const container = document.getElementById('pagos-pendientes-container');
            const pagosPendientes = pagos.filter(p => p.estado === 'Pendiente' || p.estado === 'Vencido');

            if (pagosPendientes.length === 0) {
                container.innerHTML = '<p class="text-outline text-center py-4">No hay pagos pendientes.</p>';
                return;
            }

            let html = '';
            pagosPendientes.forEach(pago => {
                const pacienteNombre = pago.pacientes ? pago.pacientes.nombre : 'Paciente Desconocido';
                const iniciales = getInitials(pacienteNombre);
                const motivo = pago.citas ? (pago.citas.tratamiento || 'Consulta') : 'Consulta';
                
                // Color logic based on status
                let stateText = pago.estado === 'Vencido' ? 'Vencido' : 'Pendiente';
                let stateClass = pago.estado === 'Vencido' ? 'text-error' : 'text-on-surface-variant';
                
                let avatarColor = 'bg-secondary-container text-on-secondary-container';
                
                html += `
                <div class="flex items-center justify-between p-4 bg-surface-container-lowest rounded-lg group hover:bg-surface-container-low transition-colors">
                    <div class="flex items-center gap-4">
                        <div class="w-10 h-10 rounded-full ${avatarColor} flex items-center justify-center font-bold">${iniciales}</div>
                        <div>
                            <p class="text-body-md font-bold text-on-surface">${pacienteNombre}</p>
                            <p class="text-label-sm text-on-surface-variant">${motivo}</p>
                        </div>
                    </div>
                    <div class="text-right flex items-center gap-2">
                        <div class="mr-4">
                            <p class="text-body-md font-bold text-on-surface">${formatCurrency(pago.monto)}</p>
                            <p class="text-label-sm ${stateClass}">${stateText}</p>
                        </div>
                        <button onclick="marcarComoPagado('${pago.id}')" class="bg-success text-white px-4 py-2 rounded-full text-label-sm font-bold hover:opacity-90 transition-all flex items-center gap-2">
                            <span class="material-symbols-outlined text-sm">check</span>
                            Pagado
                        </button>
                    </div>
                </div>
                `;
            });
            container.innerHTML = html;
            attachRecordatorioListeners();
        }

        function renderActividadReciente(pagos) {
            const container = document.getElementById('actividad-reciente-container');
            if (!container) return;
            const isTable = container.tagName.toLowerCase() === 'tbody';

            if (pagos.length === 0) {
                if (isTable) {
                    container.innerHTML = '<tr><td colspan="5" class="py-5 text-center text-outline">No hay actividad reciente.</td></tr>';
                } else {
                    container.innerHTML = '<p class="text-center text-outline">No hay actividad reciente.</p>';
                }
                return;
            }

            let html = '';
            pagos.slice(0, 50).forEach(pago => {
                const pacienteNombre = pago.pacientes ? pago.pacientes.nombre : 'Desconocido';
                const fecha = new Date(pago.fecha).toLocaleString('es-PE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
                const isCompletado = pago.estado === 'Completado';
                
                let badgeHtml = isCompletado 
                    ? '<span class="bg-success/10 text-success px-3 py-1 rounded-full text-label-sm font-bold">Ingreso</span>'
                    : '<span class="bg-warning/10 text-warning px-3 py-1 rounded-full text-label-sm font-bold">Pendiente</span>';

                let montoHtml = isCompletado 
                    ? `<p class="text-body-md font-bold text-success">+ ${formatCurrency(pago.monto)}</p>`
                    : `<p class="text-body-md font-bold">${formatCurrency(pago.monto)}</p>`;

                let iconHtml = isCompletado
                    ? '<span class="material-symbols-outlined text-success">check_circle</span>'
                    : '<span class="material-symbols-outlined text-warning">schedule</span>';

                if (isTable) {
                    html += `
                    <tr class="group hover:bg-surface-bright transition-colors">
                        <td class="py-5">
                            <p class="text-body-md font-bold">${fecha}</p>
                            <p class="text-label-sm text-on-surface-variant">ID: ${pago.id.substring(0,8).toUpperCase()}</p>
                        </td>
                        <td class="py-5">
                            <p class="text-body-md font-bold">Pago ${pago.estado} - ${pacienteNombre}</p>
                            <p class="text-label-sm text-on-surface-variant">${pago.metodo || 'No especificado'}</p>
                        </td>
                        <td class="py-5">${badgeHtml}</td>
                        <td class="py-5 text-right">${montoHtml}</td>
                        <td class="py-5 text-right">${iconHtml}</td>
                    </tr>
                    `;
                } else {
                    html += `
                    <div class="flex items-center justify-between p-4 bg-surface-container-lowest rounded-xl border border-surface-container">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-full ${isCompletado ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'} flex items-center justify-center">
                                ${iconHtml}
                            </div>
                            <div>
                                <p class="text-sm font-bold text-on-surface">Pago ${pago.estado} - ${pacienteNombre}</p>
                                <p class="text-xs text-on-surface-variant">${fecha} • ${pago.metodo || 'No especificado'}</p>
                            </div>
                        </div>
                        <div class="text-right">
                            ${montoHtml}
                            <div class="mt-1">${badgeHtml}</div>
                        </div>
                    </div>
                    `;
                }
            });
            container.innerHTML = html;
        }

        function attachRecordatorioListeners() {
            document.querySelectorAll('.recordatorio-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const originalContent = this.innerHTML;
                    this.innerHTML = '<span class="material-symbols-outlined text-sm">done</span> Enviado';
                    this.classList.add('bg-success', 'text-white');
                    this.classList.remove('bg-surface-container');
                    
                    setTimeout(() => {
                        this.innerHTML = originalContent;
                        this.classList.remove('bg-success', 'text-white');
                        this.classList.add('bg-surface-container');
                    }, 2000);
                });
            });
        }

        async function marcarComoPagado(pagoId) {
            try {
                const { error } = await supabaseClient
                    .from('pagos')
                    .update({ estado: 'Completado', fecha: new Date().toISOString() })
                    .eq('id', pagoId);

                if (error) throw error;
                await cargarDatosFinancieros();
            } catch (error) {
                console.error("Error actualizando pago:", error);
                alert("Hubo un error al marcar el pago como completado.");
            }
        }

        function showToast(message, type = "success") {
            const toast = document.createElement("div");
            toast.className = `fixed bottom-6 right-6 px-6 py-3 rounded-xl shadow-lg font-bold text-white transition-all transform translate-y-10 opacity-0 z-[100] ${
                type === "success" ? "bg-success" : type === "error" ? "bg-error" : "bg-primary"
            }`;
            toast.textContent = message;
            document.body.appendChild(toast);
            
            // Trigger transition
            setTimeout(() => {
                toast.classList.remove("translate-y-10", "opacity-0");
            }, 100);
            
            // Remove after 3 seconds
            setTimeout(() => {
                toast.classList.add("translate-y-10", "opacity-0");
                setTimeout(() => toast.remove(), 500);
            }, 3000);
        }

        let globalPacientes = [];
        let globalServicios = [];
        let globalProductos = [];
        let globalMedicos = [];
        let selectedProductos = [];

        async function abrirModalNuevaFactura() {
            const dialog = document.getElementById('modalNuevaFactura');
            dialog.showModal();

            // Load patients if not loaded
            if (globalPacientes.length === 0) {
                try {
                    const { data: pacs } = await supabaseClient.from('pacientes').select('*').order('nombre');
                    globalPacientes = pacs || [];
                    const selectPac = document.getElementById('invoice-paciente');
                    selectPac.innerHTML = '<option value="">Seleccione Paciente</option>';
                    globalPacientes.forEach(p => {
                        selectPac.innerHTML += `<option value="${p.id}">${p.nombre}</option>`;
                    });
                } catch(e) { console.error(e); }
            }

            // Load services if not loaded
            if (globalServicios.length === 0) {
                try {
                    const { data: servs } = await supabaseClient.from('servicios').select('*').order('nombre');
                    globalServicios = servs || [];
                    const selectServ = document.getElementById('invoice-servicio');
                    selectServ.innerHTML = '<option value="" data-precio="0">Ninguno (Solo Venta)</option>';
                    globalServicios.forEach(s => {
                        selectServ.innerHTML += `<option value="${s.nombre}" data-precio="${s.precio}" data-aplica-convenio="${s.aplica_convenio}" data-precio-convenio="${s.precio_convenio}">${s.nombre} (S/. ${parseFloat(s.precio).toFixed(2)})</option>`;
                    });
                } catch(e) { console.error(e); }
            }

            // Load products if not loaded
            if (globalProductos.length === 0) {
                try {
                    const { data: prods } = await supabaseClient.from('productos').select('*').order('nombre');
                    globalProductos = prods || [];
                    const selectProd = document.getElementById('invoice-producto-select');
                    selectProd.innerHTML = '<option value="" data-precio="0">Seleccionar Producto...</option>';
                    globalProductos.forEach(p => {
                        selectProd.innerHTML += `<option value="${p.id}" data-precio="${p.precio}">${p.nombre} (S/. ${parseFloat(p.precio).toFixed(2)})</option>`;
                    });
                } catch(e) { console.error(e); }
            }

            // Load tratantes if not loaded
            if (globalTratantes.length === 0) {
                try {
                    const { data: meds } = await supabaseClient.from('profiles').select('*').eq('role', 'tratante').order('full_name');
                    globalTratantes = meds || [];
                    const selectMed = document.getElementById('invoice-tratante');
                    selectMed.innerHTML = '<option value="">Sin Tratante (No aplica comisión)</option>';
                    globalTratantes.forEach(m => {
                        selectMed.innerHTML += `<option value="${m.id}">${m.full_name || m.email}</option>`;
                    });
                } catch(e) { console.error(e); }
            }

            // Reset selected products
            selectedProductos = [];
            renderSelectedProductos();
            
            // Check for URL parameters
            const urlParams = new URLSearchParams(window.location.search);
            const pacId = urlParams.get('paciente_id');
            const citaId = urlParams.get('cita_id');

            if (pacId) {
                setTimeout(() => {
                    document.getElementById('invoice-paciente').value = pacId;
                }, 300);
            }

            if (citaId) {
                try {
                    const { data: cita } = await supabaseClient.from('citas').select('*').eq('id', citaId).single();
                    if (cita) {
                        // Pre-fill service and cost
                        setTimeout(() => {
                            document.getElementById('invoice-servicio').value = cita.tratamiento || '';
                            document.getElementById('invoice-servicio-precio').value = parseFloat(cita.costo || 150.00).toFixed(2);
                            calcularTotalesFactura();
                        }, 400);
                    }
                } catch(e) { console.error(e); }
            }
            
            const fromPos = urlParams.get('from_pos');
            if (fromPos) {
                try {
                    const cartData = JSON.parse(localStorage.getItem('temp_pos_cart') || '[]');
                    if(cartData.length > 0) {
                        selectedProductos = cartData;
                        renderSelectedProductos();
                        localStorage.removeItem('temp_pos_cart');
                    }
                } catch(e) { console.error(e); }
            }

            calcularTotalesFactura();
        }

        function seleccionarServicioPrecio() {
            const select = document.getElementById('invoice-servicio');
            const selectedOption = select.options[select.selectedIndex];
            const precio = selectedOption.getAttribute('data-precio') || '0';
            document.getElementById('invoice-servicio-precio').value = parseFloat(precio).toFixed(2);
            calcularTotalesFactura();
        }

        function agregarProductoAFactura() {
            const select = document.getElementById('invoice-producto-select');
            const productId = select.value;
            if (!productId) return;

            const prod = globalProductos.find(p => p.id === productId);
            if (!prod) return;

            // Check if already added
            const existing = selectedProductos.find(p => p.id === productId);
            if (existing) {
                existing.cantidad += 1;
            } else {
                selectedProductos.push({ ...prod, cantidad: 1 });
            }

            renderSelectedProductos();
            calcularTotalesFactura();
        }

        function eliminarProductoDeFactura(productId) {
            selectedProductos = selectedProductos.filter(p => p.id !== productId);
            renderSelectedProductos();
            calcularTotalesFactura();
        }

        function renderSelectedProductos() {
            const container = document.getElementById('invoice-productos-list');
            if (!container) return;
            
            if (selectedProductos.length === 0) {
                container.innerHTML = '<p class="text-outline text-xs text-center py-2">Ningún producto agregado.</p>';
                return;
            }

            let html = '';
            selectedProductos.forEach(p => {
                html += `
                <div class="flex items-center justify-between p-2 bg-surface-container-low rounded-xl text-xs">
                    <div>
                        <span class="font-bold text-on-surface">${p.nombre}</span>
                        <span class="text-outline ml-2">x${p.cantidad}</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="font-bold text-primary">S/. ${(p.precio * p.cantidad).toFixed(2)}</span>
                        <button type="button" onclick="eliminarProductoDeFactura('${p.id}')" class="text-error hover:bg-error/10 p-1 rounded-full">
                            <span class="material-symbols-outlined text-sm">delete</span>
                        </button>
                    </div>
                </div>
                `;
            });
            container.innerHTML = html;
        }
        let pendientesDelPaciente = [];

        async function cargarPendientesPaciente(id) {
            const listContainer = document.getElementById('invoice-pendientes-list');
            if(!listContainer) return;
            listContainer.innerHTML = '<div class="flex justify-center p-4"><span class="material-symbols-outlined animate-spin text-primary">sync</span></div>';
            
            try {
                const { data, error } = await supabaseClient
                    .from('pagos')
                    .select('*, citas(tratamiento)')
                    .eq('paciente_id', id)
                    .in('estado', ['Pendiente', 'Vencido'])
                    .order('fecha', { ascending: true });
                    
                if (error) throw error;
                
                if (globalServicios.length === 0) {
                    const { data: servs } = await supabaseClient.from('servicios').select('*').order('nombre');
                    globalServicios = servs || [];
                }

                pendientesDelPaciente = (data || []).map(pago => {
                    const tratamientoNombre = pago.descripcion || (pago.citas && pago.citas.tratamiento) || '';
                    
                    const tratamientos = tratamientoNombre.split(',').map(t => t.trim()).filter(t => t);
                    
                    let totalRegular = 0;
                    let totalConvenio = 0;
                    let allMatched = true;

                    if (tratamientos.length > 0) {
                        tratamientos.forEach(tName => {
                            const servicioMatch = globalServicios.find(s => s.nombre.toLowerCase() === tName.toLowerCase());
                            if (servicioMatch) {
                                totalRegular += parseFloat(servicioMatch.precio);
                                totalConvenio += parseFloat(servicioMatch.precio_convenio || servicioMatch.precio);
                            } else {
                                allMatched = false;
                            }
                        });
                    } else {
                        allMatched = false;
                    }

                    if (allMatched && tratamientos.length > 0) {
                        pago.precio_regular = totalRegular;
                        pago.precio_convenio = totalConvenio;
                    }
                    return pago;
                });
                
                if (pendientesDelPaciente.length === 0) {
                    listContainer.innerHTML = '<p class="text-outline text-sm py-2">Este paciente no tiene ítems pendientes de cobro.</p>';
                } else {
                    const urlParams = new URLSearchParams(window.location.search);
                    const pagosIdsStr = urlParams.get('pagos_ids');
                    const pagosIds = pagosIdsStr ? pagosIdsStr.split(',') : null;
                    
                    listContainer.innerHTML = pendientesDelPaciente.map((pago) => {
                        const fecha = new Date(pago.fecha).toLocaleDateString('es-PE');
                        const isChecked = pagosIds ? pagosIds.includes(pago.id.toString()) : true;
                        return `
                        <div class="flex items-start gap-3 p-3 bg-surface-container-lowest rounded-xl border border-surface-container-low mb-2 hover:bg-surface-container transition-colors">
                            <input type="checkbox" id="pend_${pago.id}" class="mt-1 rounded border-outline-variant text-primary focus:ring-primary h-4 w-4" ${isChecked ? 'checked' : ''} onchange="calcularTotalesFactura()">
                            <div class="flex-1">
                                <label for="pend_${pago.id}" class="font-bold text-sm text-on-surface cursor-pointer block">${pago.descripcion || (pago.citas && pago.citas.tratamiento) || 'Cobro Pendiente'}</label>
                                <p class="text-xs text-on-surface-variant">${fecha}</p>
                            </div>
                            <div class="text-right pend-precio-container" data-id="${pago.id}">
                                <span class="font-bold text-primary text-sm pend-precio">S/. ${parseFloat(pago.monto).toFixed(2)}</span>
                            </div>
                        </div>
                        `;
                    }).join('');
                }
                
                calcularTotalesFactura();
                
            } catch(e) {
                console.error(e);
                listContainer.innerHTML = '<p class="text-error text-sm py-2">Error al cargar ítems pendientes.</p>';
            }
        }

        function calcularTotalesFactura() {
            let subtotal = 0;
            let descuentoMonto = 0;
            const selectMetodo = document.getElementById('invoice-metodo');
            const metodo = selectMetodo ? selectMetodo.value : '';
            const esTarjeta = (metodo === 'Tarjeta');
            
            // Sumar los pendientes seleccionados
            pendientesDelPaciente.forEach(pago => {
                const checkbox = document.getElementById(`pend_${pago.id}`);
                if (checkbox && checkbox.checked) {
                    let precioCobrar = parseFloat(pago.monto) || 0;
                    let mostrarDescuento = false;
                    
                    // Lógica para quitar convenio si se usa Tarjeta o el toggle de convenio no está marcado
                    const convenioToggle = document.getElementById('invoice-convenio-toggle');
                    const aplicaConvenio = convenioToggle ? convenioToggle.checked : false;

                    if (pago.precio_regular) {
                        let basePrecio = parseFloat(pago.precio_regular);
                        let convenioPrecio = pago.precio_convenio ? parseFloat(pago.precio_convenio) : basePrecio;
                        
                        // Si el monto original (ej. digitado manualmente) es menor que el convenio, respetarlo como tarifa especial
                        if (parseFloat(pago.monto) < convenioPrecio) {
                            convenioPrecio = parseFloat(pago.monto);
                        }

                        if (esTarjeta || !aplicaConvenio) {
                            precioCobrar = basePrecio;
                        } else if (basePrecio > convenioPrecio) {
                            precioCobrar = convenioPrecio;
                            mostrarDescuento = true;
                        }
                    }

                    // Actualizar el DOM para reflejar el precio exacto
                    const containerPrecio = document.querySelector(`.pend-precio-container[data-id="${pago.id}"]`);
                    if (containerPrecio) {
                        if (mostrarDescuento) {
                            containerPrecio.innerHTML = `
                                <div class="text-xs text-on-surface-variant line-through">S/. ${parseFloat(pago.precio_regular).toFixed(2)}</div>
                                <div class="font-bold text-tertiary text-sm">S/. ${precioCobrar.toFixed(2)}</div>
                                <div class="text-[10px] text-tertiary bg-tertiary/10 px-1 rounded inline-block mt-1">Convenio</div>
                            `;
                            descuentoMonto += (parseFloat(pago.precio_regular) - precioCobrar);
                        } else if (pago.precio_regular && parseFloat(pago.precio_regular) > precioCobrar && esTarjeta) {
                            containerPrecio.innerHTML = `
                                <div class="font-bold text-primary text-sm">S/. ${precioCobrar.toFixed(2)}</div>
                                <div class="text-[10px] text-error bg-error/10 px-1 rounded inline-block mt-1">Tarifa Regular (POS)</div>
                            `;
                        } else if (pago.precio_regular && parseFloat(pago.precio_regular) === precioCobrar && (!aplicaConvenio && pago.precio_convenio && parseFloat(pago.precio_regular) > parseFloat(pago.precio_convenio))) {
                            containerPrecio.innerHTML = `
                                <div class="font-bold text-primary text-sm">S/. ${precioCobrar.toFixed(2)}</div>
                                <div class="text-[10px] text-warning bg-warning/10 px-1 rounded inline-block mt-1">Tarifa Regular</div>
                            `;
                        } else {
                            containerPrecio.innerHTML = `<span class="font-bold text-primary text-sm pend-precio">S/. ${precioCobrar.toFixed(2)}</span>`;
                        }
                    }

                    subtotal += (precioCobrar + (mostrarDescuento ? (parseFloat(pago.precio_regular) - precioCobrar) : 0));
                }
            });
            
            const subtotalDespuesDescuento = subtotal - descuentoMonto;

            // Extra charge for Card Commission
            let comisionTarjeta = 0;
            if (esTarjeta) {
                const tipoTarjetaSelect = document.getElementById('invoice-tipo-tarjeta');
                const tipoTarjeta = tipoTarjetaSelect ? tipoTarjetaSelect.value : 'Nacional';
                let posCommissionPct = 4.5;
                if (tipoTarjeta === 'Nacional') {
                    posCommissionPct = parseFloat(localStorage.getItem('comisionPOSNacional') || 4.5);
                } else if (tipoTarjeta === 'Internacional') {
                    posCommissionPct = parseFloat(localStorage.getItem('comisionPOSInternacional') || 5.5);
                }
                comisionTarjeta = subtotalDespuesDescuento * (posCommissionPct / 100);
            }

            // Total before IGV extraction (Commission included)
            const total = subtotalDespuesDescuento;

            // IGV is INCLUDED in the price, so we just extract it for display
            const igvToggle = document.getElementById('invoice-igv-toggle');
            const conIgv = igvToggle ? igvToggle.checked : false;
            const igvPct = parseFloat(localStorage.getItem('igvPorcentaje') || 18);
            let igv = 0;
            
            if (conIgv) {
                // Formula: Total = SubtotalReal + SubtotalReal * 18%
                // IGV = Total - Total / 1.18
                igv = total - (total / (1 + (igvPct / 100)));
            }
            
            const elSubtotal = document.getElementById('invoice-subtotal');
            if(elSubtotal) elSubtotal.textContent = `S/. ${subtotal.toFixed(2)}`;
            
            // Re-use descuento container for both Descuento and Comisión
            const elDescuento = document.getElementById('invoice-descuento');
            if(elDescuento) {
                if (descuentoMonto > 0) {
                    elDescuento.textContent = `- S/. ${descuentoMonto.toFixed(2)}`;
                    elDescuento.className = 'font-bold text-success';
                    elDescuento.previousElementSibling.textContent = 'Descuento:';
                } else {
                    elDescuento.textContent = `S/. 0.00`;
                    elDescuento.className = 'font-bold';
                    elDescuento.previousElementSibling.textContent = 'Descuento:';
                }
            }

            const labelIgv = document.getElementById('label-igv');
            if (labelIgv) labelIgv.innerHTML = conIgv ? `IGV Incluido (${igvPct}%):` : 'IGV (No aplica):';
            
            const elIgv = document.getElementById('invoice-igv');
            if(elIgv) elIgv.textContent = conIgv ? `S/. ${igv.toFixed(2)}` : 'S/. 0.00';
            
            const elTotal = document.getElementById('invoice-total');
            if(elTotal) elTotal.textContent = `S/. ${total.toFixed(2)}`;
        }

        window.onMetodoPagoChange = function() {
            const metodo = document.getElementById('invoice-metodo').value;
            const containerTarjeta = document.getElementById('container-tipo-tarjeta');
            const convenioToggle = document.getElementById('invoice-convenio-toggle');
            
            if (containerTarjeta) {
                if (metodo === 'Tarjeta') {
                    containerTarjeta.classList.remove('hidden');
                } else {
                    containerTarjeta.classList.add('hidden');
                }
            }

            if (convenioToggle) {
                if (metodo === 'Tarjeta') {
                    convenioToggle.checked = false;
                    convenioToggle.disabled = true;
                } else {
                    convenioToggle.disabled = false;
                }
            }

            calcularTotalesFactura();
        };

        // Form Submission
        const formElement = document.getElementById('formNuevaFactura');
        if (formElement) {
            formElement.addEventListener('submit', async (e) => {
                e.preventDefault();
                const pacId = document.getElementById('invoice-paciente').value;
                const totalText = document.getElementById('invoice-total').textContent;
                const total = parseFloat(totalText.replace('S/. ', '').replace(',', ''));
                const nroOperacion = document.getElementById('invoice-nro-operacion') ? document.getElementById('invoice-nro-operacion').value : '';
                let metodo = document.getElementById('invoice-metodo') ? document.getElementById('invoice-metodo').value : '';
                const tipoTarjeta = document.getElementById('invoice-tipo-tarjeta') ? document.getElementById('invoice-tipo-tarjeta').value : null;
                const medicoId = document.getElementById('invoice-tratante') ? document.getElementById('invoice-tratante').value : null;

                if (!pacId) {
                    alert("Seleccione un paciente.");
                    return;
                }

                // Obtener los pendientes seleccionados
                const pagosAPagar = pendientesDelPaciente.filter(pago => {
                    const cb = document.getElementById(`pend_${pago.id}`);
                    return cb && cb.checked;
                });

                if (pagosAPagar.length === 0) {
                    alert("No hay ítems pendientes seleccionados para cobrar.");
                    return;
                }

                try {
                    let posCommissionPct = 0;
                    if (metodo === 'Tarjeta') {
                        if (tipoTarjeta === 'Nacional') {
                            posCommissionPct = parseFloat(localStorage.getItem('comisionPOSNacional') || 4.5);
                        } else if (tipoTarjeta === 'Internacional') {
                            posCommissionPct = parseFloat(localStorage.getItem('comisionPOSInternacional') || 5.5);
                        }
                        metodo = `Tarjeta ${tipoTarjeta}`;
                    }

                    // Actualizar cada pago pendiente
                    for (const pago of pagosAPagar) {
                        let desc = pago.descripcion || (pago.citas && pago.citas.tratamiento) || 'Servicio';
                        let finalMonto = parseFloat(pago.monto) || 0;
                        const convenioToggle = document.getElementById('invoice-convenio-toggle');
                        const aplicaConvenio = convenioToggle ? convenioToggle.checked : false;

                        if (pago.precio_regular) {
                            let basePrecio = parseFloat(pago.precio_regular);
                            let convenioPrecio = pago.precio_convenio ? parseFloat(pago.precio_convenio) : basePrecio;
                            
                            if (parseFloat(pago.monto) < convenioPrecio) {
                                convenioPrecio = parseFloat(pago.monto);
                            }

                            if (metodo.startsWith('Tarjeta') || !aplicaConvenio) {
                                finalMonto = basePrecio;
                                if (parseFloat(pago.monto) < basePrecio) {
                                    desc += ` [Tarifa Regular]`;
                                }
                            } else if (basePrecio > convenioPrecio) {
                                finalMonto = convenioPrecio;
                                desc += ` [Convenio Aplicado]`;
                            }
                        }

                        if (posCommissionPct > 0) {
                            const posCommissionMonto = finalMonto * (posCommissionPct / 100);
                            desc += ` [Comisión POS: S/. ${posCommissionMonto.toFixed(2)} Incluida]`;
                            // finalMonto does not increase because commission is included
                        }

                        if (nroOperacion && nroOperacion.trim() !== '') {
                            desc += ` [Operación: ${nroOperacion}]`;
                        }

                        const updatePayload = {
                            estado: 'Completado',
                            metodo: metodo,
                            fecha: new Date().toISOString(),
                            descripcion: desc,
                            monto: finalMonto
                        };

                        if (medicoId) {
                            updatePayload.medico_id = medicoId;
                            updatePayload.comision_monto = finalMonto * 0.30; // 30% base commission on final collected amount
                        }

                        const { error } = await supabaseClient.from('pagos').update(updatePayload).eq('id', pago.id);
                        if (error) throw error;

                        // Si el pago estaba asociado a una cita, marcarla como completada si aplica
                        if (pago.cita_id) {
                            await supabaseClient.from('citas').update({ estado: 'Completado' }).eq('id', pago.cita_id);
                        }
                    }

                    if (document.getElementById('modalNuevaFactura')) {
                        document.getElementById('modalNuevaFactura').close();
                    }
                    
                    showToast("Cobro procesado exitosamente", "success");
                    
                    // Keep the role query parameter when reloading
                    const currentUrl = new URL(window.location.href);
                    const role = currentUrl.searchParams.get('role');
                    const newPath = role ? `${window.location.pathname}?role=${role}` : window.location.pathname;
                    
                    window.history.replaceState({}, document.title, newPath);
                    
                    if (window.location.pathname.includes('cobrar_desktop.html') || window.location.pathname.includes('cobrar_mobile.html') || window.location.pathname.includes('pagos_facturacion')) {
                        setTimeout(() => {
                            window.location.reload();
                        }, 1000);
                    } else {
                        await cargarDatosFinancieros();
                    }
                } catch (err) {
                    console.error("Error al registrar el cobro:", err);
                    alert("Hubo un error al guardar. Revise la consola.");
                }
            });
        }

        function imprimirReciboFactura() {
            const selectPaciente = document.getElementById('invoice-paciente');
            const pacienteNombre = selectPaciente.options[selectPaciente.selectedIndex]?.text || 'Paciente General';
            
            const selectConvenio = document.getElementById('invoice-convenio').value;
            const servicio = document.getElementById('invoice-servicio').value || 'Venta de Productos';
            const subtotal = document.getElementById('invoice-subtotal').textContent;
            const descuento = document.getElementById('invoice-descuento').textContent;
            const igv = document.getElementById('invoice-igv-monto').textContent;
            const total = document.getElementById('invoice-total').textContent;
            const metodo = document.getElementById('invoice-metodo').value;

            const prtContent = `
                <html>
                <head>
                    <title>Recibo Centro Eslava</title>
                    <style>
                        body { font-family: sans-serif; padding: 40px; color: #333; }
                        .header { text-align: center; border-bottom: 2px solid #006578; padding-bottom: 20px; margin-bottom: 30px; }
                        .header h1 { margin: 0; color: #006578; }
                        .details { margin-bottom: 30px; line-height: 1.6; }
                        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
                        th { background-color: #f2f8f9; }
                        .totals { float: right; width: 300px; line-height: 2; font-weight: bold; }
                        .footer { margin-top: 100px; text-align: center; font-size: 12px; color: #777; border-top: 1px dashed #ccc; padding-top: 20px; }
                    \x3C/style>
                <' + '/head>
                <body>
                    <div class="header">
                        <h1>CENTRO ESLAVA</h1>
                        <p>Clínica de Fisioterapia y Terapia Física</p>
                    </div>
                    <div class="details">
                        <p><strong>Paciente:</strong> ${pacienteNombre}</p>
                        <p><strong>Fecha:</strong> ${new Date().toLocaleDateString('es-PE')}</p>
                        <p><strong>Convenio:</strong> ${selectConvenio}</p>
                        <p><strong>Método de Pago:</strong> ${metodo}</p>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>Concepto</th>
                                <th style="text-align: right;">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>${servicio}</td>
                                <td style="text-align: right;">${subtotal}</td>
                            </tr>
                        </tbody>
                    </table>
                    <div class="totals">
                        <div style="display:flex; justify-content:space-between"><span>Subtotal:</span> <span>${subtotal}</span></div>
                        <div style="display:flex; justify-content:space-between; color:green"><span>Descuento:</span> <span>${descuento}</span></div>
                        <div style="display:flex; justify-content:space-between"><span>IGV:</span> <span>${igv}</span></div>
                        <div style="display:flex; justify-content:space-between; font-size:1.2em; color:#006578; border-top:1px solid #333; padding-top:5px;"><span>TOTAL:</span> <span>${total}</span></div>
                    </div>
                    <div style="clear:both"></div>
                    <div class="footer">
                        <p>Gracias por confiar en el Centro Eslava.</p>
                        <p>Este documento es un comprobante de atención clínica simplificado.</p>
                    </div>
                <' + '/body>
                <' + '/html>
            `;
            const WinPrint = window.open('', '', 'width=900,height=650');
            WinPrint.document.write(prtContent);
            WinPrint.document.close();
            WinPrint.focus();
            WinPrint.print();
        }

        async function exportarLibroTransacciones() {
            if (!window.supabaseClient) {
                alert("Error de conexión. Intente recargar la página.");
                return;
            }
            try {
                // Obtener todos los pagos, ordenados por fecha
                const { data, error } = await window.supabaseClient
                    .from('pagos')
                    .select('*, pacientes(nombre)')
                    .order('fecha_emision', { ascending: false });

                if (error) throw error;
                if (!data || data.length === 0) {
                    alert("No hay transacciones para exportar.");
                    return;
                }

                let csvContent = "data:text/csv;charset=utf-8,";
                // Añadir cabeceras
                csvContent += "ID Transaccion,Fecha,Paciente,Servicio,Estado,Monto Subtotal,Descuento,IGV,Total\n";

                // Formatear filas
                data.forEach(pago => {
                    const row = [
                        pago.id,
                        new Date(pago.fecha_emision).toLocaleString(),
                        `"${pago.pacientes?.nombre || 'Paciente Desconocido'}"`,
                        `"${pago.servicio_realizado || '-'}"`,
                        pago.estado_pago,
                        pago.monto_subtotal || '0.00',
                        pago.descuento_aplicado || '0.00',
                        pago.monto_igv || '0.00',
                        pago.monto_total || '0.00'
                    ].join(",");
                    csvContent += row + "\n";
                });

                // Crear enlace invisible para forzar descarga
                const encodedUri = encodeURI(csvContent);
                const link = document.createElement("a");
                link.setAttribute("href", encodedUri);
                link.setAttribute("download", `Libro_Transacciones_Eslava_${new Date().toISOString().split('T')[0]}.csv`);
                document.body.appendChild(link); // Requerido en Firefox
                link.click();
                document.body.removeChild(link);
            } catch (err) {
                console.error("Error al exportar libro:", err);
                alert("Ocurrió un error al intentar exportar el reporte.");
            }
        }

        // Autocomplete Factura
        function filtrarPacientesFactura() {
            const searchInput = document.getElementById('invoice-paciente-search');
            const dropdown = document.getElementById('invoice-paciente-dropdown');
            if(!searchInput || !dropdown) return;
            const filter = searchInput.value.toLowerCase();
            
            if (filter.length < 1) {
                dropdown.classList.add('hidden');
                return;
            }
            
            const filtered = globalPacientes.filter(p => (p.nombre || '').toLowerCase().includes(filter));
            
            if (filtered.length === 0) {
                dropdown.innerHTML = '<div class="p-3 text-sm text-on-surface-variant">No se encontraron pacientes.</div>';
            } else {
                dropdown.innerHTML = filtered.map(p => `
                    <div onclick="seleccionarPacienteFactura('${p.id}', '${p.nombre.replace(/'/g, "\\'")}')" class="p-3 hover:bg-surface-container-low cursor-pointer text-sm border-b border-surface-container-low last:border-0">
                        ${p.nombre}
                    </div>
                `).join('');
            }
            dropdown.classList.remove('hidden');
        }

        function seleccionarPacienteFactura(id, nombre) {
            document.getElementById('invoice-paciente').value = id;
            document.getElementById('invoice-paciente-search').value = nombre;
            document.getElementById('invoice-paciente-dropdown').classList.add('hidden');
            
            // Cargar los pendientes de cobro cuando se selecciona un paciente
            if (typeof cargarPendientesPaciente === 'function') {
                cargarPendientesPaciente(id);
            }
        }

        document.addEventListener('click', function(e) {
            const dropdown = document.getElementById('invoice-paciente-dropdown');
            if (dropdown && !dropdown.contains(e.target) && e.target.id !== 'invoice-paciente-search') {
                dropdown.classList.add('hidden');
            }
        });

        async function cargarDashboardCobros() {
            const container = document.getElementById('dashboard-cobros-pendientes');
            if (!container) return;

            try {
                const { data: pendientes, error } = await supabaseClient
                    .from('pagos')
                    .select('id, monto, fecha, descripcion, pacientes(id, nombre), citas(tratamiento)')
                    .eq('estado', 'Pendiente')
                    .order('fecha', { ascending: true }); // Removed limit to aggregate all pendings

                if (error) throw error;

                if (!pendientes || pendientes.length === 0) {
                    container.innerHTML = '<div class="col-span-5 w-full text-center py-4 text-on-surface-variant text-sm">No hay cobros pendientes en todo el sistema.</div>';
                    return;
                }

                // Group by patient
                const agregados = {};
                pendientes.forEach(p => {
                    const pacId = p.pacientes ? p.pacientes.id : 'desconocido';
                    if (!agregados[pacId]) {
                        agregados[pacId] = {
                            pacId: pacId,
                            pacName: p.pacientes ? p.pacientes.nombre : 'Desconocido',
                            montoTotal: 0,
                            fechaMasAntigua: p.fecha,
                            cantidad: 0,
                            descripciones: []
                        };
                    }
                    agregados[pacId].montoTotal += parseFloat(p.monto || 0);
                    agregados[pacId].cantidad += 1;
                    const desc = p.descripcion || (p.citas && p.citas.tratamiento);
                    if (desc && !agregados[pacId].descripciones.includes(desc)) {
                        agregados[pacId].descripciones.push(desc);
                    }
                });

                // Convert to array and sort by newest date
                const listaAgrupada = Object.values(agregados)
                    .sort((a, b) => new Date(b.fechaMasAntigua) - new Date(a.fechaMasAntigua))
                    .slice(0, 30); // Show top 30 pending users

                container.innerHTML = '';
                listaAgrupada.forEach(ag => {
                    const dateObj = new Date(ag.fechaMasAntigua);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const isOverdue = dateObj < today;
                    
                    let descText = ag.descripciones[0] || 'Servicio pendiente';
                    if (ag.cantidad > 1) {
                        descText = `${ag.cantidad} cobros pendientes`;
                    }

                    const card = document.createElement('div');
                    card.className = `min-w-[200px] snap-center bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-4 cursor-pointer hover:shadow-md transition-all hover:border-primary/30 group ${isOverdue ? 'border-error/50 bg-error/5' : ''}`;
                    card.onclick = () => {
                        if (ag.pacId && ag.pacId !== 'desconocido') {
                            seleccionarPacienteFactura(ag.pacId, ag.pacName);
                            window.scrollTo({ top: document.getElementById('formNuevaFactura').offsetTop - 100, behavior: 'smooth' });
                        }
                    };
                    
                    card.innerHTML = `
                        <div class="flex justify-between items-start mb-2">
                            <span class="text-xs font-bold ${isOverdue ? 'text-error' : 'text-on-surface-variant'}">${dateObj.toLocaleDateString('es-PE')}</span>
                            <span class="material-symbols-outlined text-primary/50 group-hover:text-primary transition-colors text-sm">arrow_forward</span>
                        </div>
                        <h4 class="font-bold text-sm text-on-surface line-clamp-1">${ag.pacName}</h4>
                        <div class="text-[11px] text-on-surface-variant mb-2 line-clamp-1">${descText}</div>
                        <div class="font-bold text-primary text-base">S/. ${ag.montoTotal.toFixed(2)}</div>
                    `;
                    container.appendChild(card);
                });

            } catch (err) {
                console.error("Error al cargar dashboard de cobros pendientes:", err);
                container.innerHTML = '<div class="col-span-5 w-full text-center py-4 text-error text-sm">Error al cargar</div>';
            }
        }

        async function inicializarPuntoCobro() { console.log("INICIALIZAR PUNTO COBRO EJECUTADO");
            // Load patients
            if (globalPacientes.length === 0) {
                try {
                    const { data: pacs } = await supabaseClient.from('pacientes').select('*').order('nombre');
                    globalPacientes = pacs || [];
                } catch(e) { console.error(e); }
            }

            // Load services
            if (globalServicios.length === 0) {
                try {
                    const { data: servs } = await supabaseClient.from('servicios').select('*').order('nombre');
                    globalServicios = servs || [];
                    const selectServ = document.getElementById('invoice-servicio');
                    if (selectServ) {
                        selectServ.innerHTML = '<option value="" data-precio="0">Ninguno (Solo Venta)</option>';
                        globalServicios.forEach(s => {
                            selectServ.innerHTML += `<option value="${s.nombre}" data-precio="${s.precio}" data-aplica-convenio="${s.aplica_convenio}" data-precio-convenio="${s.precio_convenio}">${s.nombre} (S/. ${parseFloat(s.precio).toFixed(2)})</option>`;
                        });
                    }
                } catch(e) { console.error(e); }
            }

            // Load products
            if (globalProductos.length === 0) {
                try {
                    const { data: prods } = await supabaseClient.from('productos').select('*').order('nombre');
                    globalProductos = prods || [];
                    const selectProd = document.getElementById('invoice-producto-select');
                    if (selectProd) {
                        selectProd.innerHTML = '<option value="" data-precio="0">Seleccionar Producto...</option>';
                        globalProductos.forEach(p => {
                            selectProd.innerHTML += `<option value="${p.id}" data-precio="${p.precio}">${p.nombre} (S/. ${parseFloat(p.precio).toFixed(2)})</option>`;
                        });
                    }
                } catch(e) { console.error(e); }
            }

            // Load tratantes
            if (globalMedicos.length === 0) {
                try {
                    const { data: meds } = await supabaseClient.from('profiles').select('*').eq('role', 'tratante').order('full_name');
                    if (meds) globalMedicos = meds;
                    const selectMed = document.getElementById('invoice-tratante');
                    if (selectMed) {
                        selectMed.innerHTML = '<option value="">Sin Tratante (No aplica comisión)</option>';
                        globalMedicos.forEach(m => {
                            selectMed.innerHTML += `<option value="${m.id}">${m.full_name || m.email}</option>`;
                        });
                    }
                } catch(e) { console.error(e); }
            }

            selectedProductos = [];
            renderSelectedProductos();
            
            console.log("CARGANDO DASHBOARD COBROS"); await cargarDashboardCobros(); console.log("DASHBOARD CARGADO");
            
            const urlParams = new URLSearchParams(window.location.search);
            const pacId = urlParams.get('paciente_id');
            const citaId = urlParams.get('cita_id');

            if (pacId) {
                setTimeout(() => {
                    const pac = globalPacientes.find(p => p.id === pacId);
                    if (pac) seleccionarPacienteFactura(pac.id, pac.nombre);
                }, 300);
            }

            if (citaId) {
                try {
                    const { data: cita } = await supabaseClient.from('citas').select('*').eq('id', citaId).single();
                    if (cita) {
                        setTimeout(() => {
                            const servSelect = document.getElementById('invoice-servicio');
                            if(servSelect) servSelect.value = cita.tratamiento || '';
                            const costInput = document.getElementById('invoice-servicio-precio');
                            if(costInput) costInput.value = parseFloat(cita.costo || 150.00).toFixed(2);
                            calcularTotalesFactura();
                        }, 400);
                    }
                } catch(e) { console.error(e); }
            }
            
            const fromPos = urlParams.get('from_pos');
            if (fromPos) {
                try {
                    const cartData = JSON.parse(localStorage.getItem('temp_pos_cart') || '[]');
                    if(cartData.length > 0) {
                        selectedProductos = cartData;
                        renderSelectedProductos();
                        localStorage.removeItem('temp_pos_cart');
                    }
                } catch(e) { console.error(e); }
            }
        }

        document.addEventListener("DOMContentLoaded", async () => {
            const path = window.location.pathname;
            if (path.includes('cobrar_desktop') || path.includes('cobrar_mobile')) {
                inicializarPuntoCobro();
            } else {
                await cargarDatosFinancieros();
            }
            
            // Re-apply event listeners just in case
            const metodoSelect = document.getElementById('invoice-metodo');
            if(metodoSelect) {
                metodoSelect.addEventListener('change', window.calcularTotalesFactura);
            }
            
            // Check if there are active parameters to open modal automatically
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('paciente_id') || urlParams.get('cita_id') || urlParams.get('from_pos') === 'true') {
                if (typeof abrirModalNuevaFactura === 'function' && document.getElementById('modalNuevaFactura')) {
                    abrirModalNuevaFactura();
                }
            }

            // Filtrado del Libro de Transacciones
            const filtroSelect = document.getElementById('filtro-tipo-transaccion');
            if (filtroSelect) {
                filtroSelect.addEventListener('change', (e) => {
                    const tipo = e.target.value;
                    let pagosFiltrados = window.todosLosPagos || [];
                    if (tipo === 'Pagos') {
                        pagosFiltrados = pagosFiltrados.filter(p => p.estado === 'Completado');
                    } else if (tipo === 'Facturas') {
                        pagosFiltrados = pagosFiltrados.filter(p => p.estado === 'Pendiente' || p.estado === 'Vencido');
                    }
                    renderActividadReciente(pagosFiltrados);
                });
            }
        });
