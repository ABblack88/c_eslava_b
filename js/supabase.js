// Configuración de Supabase - MOCK OFFLINE
// Este archivo reemplaza el cliente real de Supabase por una versión
// que utiliza localStorage, permitiendo que el simulador funcione
// 100% offline y de manera dinámica.

const createOfflineMock = () => {
    const getStorage = (table) => JSON.parse(localStorage.getItem(`mock_${table}`) || "[]");
    const setStorage = (table, data) => localStorage.setItem(`mock_${table}`, JSON.stringify(data));

    // Datos iniciales de prueba
    if (!localStorage.getItem('mock_servicios')) {
        setStorage('mock_servicios', [
            { id: 1, nombre: 'Consulta General', descripcion: 'Evaluación médica básica', duracion: 30, precio: 50 },
            { id: 2, nombre: 'Control', descripcion: 'Cita de seguimiento', duracion: 15, precio: 30 },
            { id: 3, nombre: 'Terapia Física', descripcion: 'Sesión de rehabilitación', duracion: 60, precio: 80 }
        ]);
    }
    if (!localStorage.getItem('mock_pacientes')) {
        setStorage('mock_pacientes', [
            { id: 1, first_name: 'Juan', last_name: 'Pérez', email: 'juan@example.com', phone: '123456789', date_of_birth: '1980-05-15', gender: 'Masculino', address: 'Calle Falsa 123', created_at: new Date().toISOString() },
            { id: 2, first_name: 'María', last_name: 'Gómez', email: 'maria@example.com', phone: '987654321', date_of_birth: '1992-10-20', gender: 'Femenino', address: 'Av. Siempre Viva 742', created_at: new Date().toISOString() }
        ]);
    }
    if (!localStorage.getItem('mock_citas')) {
        setStorage('mock_citas', []);
    }
    if (!localStorage.getItem('mock_pagos')) {
        setStorage('mock_pagos', []);
    }

    return {
        auth: {
            getSession: async () => {
                const session = localStorage.getItem('mock_session');
                return { data: { session: session ? JSON.parse(session) : null }, error: null };
            },
            signInWithPassword: async ({email, password}) => {
                // Simulación de login
                const session = { user: { email, user_metadata: { role: 'admin' } } };
                localStorage.setItem('mock_session', JSON.stringify(session));
                return { data: session, error: null };
            },
            signUp: async ({email, password}) => {
                return { data: {}, error: null };
            },
            signOut: async () => {
                localStorage.removeItem('mock_session');
                return { error: null };
            },
            onAuthStateChange: (cb) => {
                return { data: { subscription: { unsubscribe: () => {} } } };
            }
        },
        from: (table) => {
            let query = getStorage(table);
            let isCount = false;
            let isSingle = false;
            
            const chain = {
                select: (fields, options) => {
                    if (options && options.count) isCount = true;
                    return chain;
                },
                insert: (data) => {
                    const arrayData = Array.isArray(data) ? data : [data];
                    const newData = arrayData.map(d => ({...d, id: Date.now() + Math.floor(Math.random() * 1000), created_at: new Date().toISOString()}));
                    const current = getStorage(table);
                    setStorage(table, [...current, ...newData]);
                    query = newData;
                    return chain;
                },
                update: (data) => {
                    chain._updateData = data;
                    return chain;
                },
                delete: () => {
                    chain._delete = true;
                    return chain;
                },
                eq: (field, value) => {
                    if (chain._updateData) {
                        const current = getStorage(table);
                        const updated = current.map(item => item[field] == value ? {...item, ...chain._updateData} : item);
                        setStorage(table, updated);
                        query = updated.filter(item => item[field] == value);
                        chain._updateData = null; // reset
                    } else if (chain._delete) {
                        const current = getStorage(table);
                        const filtered = current.filter(item => item[field] != value);
                        setStorage(table, filtered);
                        query = current.filter(item => item[field] == value);
                        chain._delete = false; // reset
                    } else {
                        query = query.filter(item => item[field] == value);
                    }
                    return chain;
                },
                ilike: (field, value) => {
                    const cleanValue = value.replace(/%/g, '').toLowerCase();
                    query = query.filter(item => item[field] && String(item[field]).toLowerCase().includes(cleanValue));
                    return chain;
                },
                or: (condition) => {
                    // Implementación básica de OR ("first_name.ilike.%val%,last_name.ilike.%val%")
                    const parts = condition.split(',');
                    query = query.filter(item => {
                        return parts.some(part => {
                            const [f, op, v] = part.split('.');
                            if (op === 'ilike') {
                                const cleanV = v.replace(/%/g, '').toLowerCase();
                                return item[f] && String(item[f]).toLowerCase().includes(cleanV);
                            }
                            return false;
                        });
                    });
                    return chain;
                },
                order: (field, {ascending = true} = {}) => {
                    query.sort((a, b) => {
                        if (a[field] < b[field]) return ascending ? -1 : 1;
                        if (a[field] > b[field]) return ascending ? 1 : -1;
                        return 0;
                    });
                    return chain;
                },
                gte: (field, value) => {
                    query = query.filter(item => item[field] >= value);
                    return chain;
                },
                lte: (field, value) => {
                    query = query.filter(item => item[field] <= value);
                    return chain;
                },
                single: () => {
                    isSingle = true;
                    return chain;
                },
                then: (resolve) => {
                    let resultData = isSingle ? (query.length > 0 ? query[0] : null) : query;
                    let result = { data: resultData, error: null };
                    if (isCount) {
                        result.count = query.length;
                    }
                    resolve(result);
                }
            };
            
            return chain;
        }
    };
};

const supabaseClient = createOfflineMock();

// Exportar globalmente si se usa sin módulos
window.supabaseClient = supabaseClient;

// Auth Guard Integrado
document.addEventListener("DOMContentLoaded", async () => {
    const isPublicPage = window.location.pathname.includes('login.html') || 
                         window.location.pathname.endsWith('/') || 
                         window.location.pathname.endsWith('index.html');
    
    try {
        const { data, error } = await supabaseClient.auth.getSession();
        
        if (!data.session && !isPublicPage) {
            // No hay sesión en página privada. 
            // Validar si existe el parámetro de rol por URL para acceso rápido temporal del simulador
            const urlParams = new URLSearchParams(window.location.search);
            if (!urlParams.get('role')) {
                window.location.href = 'login.html';
            }
        } else if (data.session && !isPublicPage) {
            // Si hay sesión en página privada, asegurar que exista el rol en la URL
            const userRole = data.session.user?.user_metadata?.role || 'admin';
            const urlParams = new URLSearchParams(window.location.search);
            const urlRole = urlParams.get('role');
            
            // Para el simulador, solo forzamos el rol si NO hay uno en la URL, 
            // así permitimos probar cambiando ?role= manualmente.
            if (!urlRole) {
                urlParams.set('role', userRole);
                window.location.search = urlParams.toString();
            }
        }
    } catch (e) {
        console.error('Error de autenticación:', e);
    }
});
