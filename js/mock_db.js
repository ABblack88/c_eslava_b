const MockDB = {
    pacientes: [
        { id: 1, nombre: "Juan Pérez", edad: 45, telefono: "555-0101", ultimaCita: "2023-10-15", condicion: "Lumbalgia", estado: "activo" },
        { id: 2, nombre: "María García", edad: 32, telefono: "555-0202", ultimaCita: "2023-10-20", condicion: "Tendinitis", estado: "activo" },
        { id: 3, nombre: "Carlos López", edad: 58, telefono: "555-0303", ultimaCita: "2023-10-25", condicion: "Artrosis", estado: "inactivo" }
    ],
    citas: [
        { id: 1, pacienteId: 1, fecha: new Date().toISOString().split('T')[0], hora: "09:00", tipo: "Ondas de Choque", estado: "completada" },
        { id: 2, pacienteId: 2, fecha: new Date().toISOString().split('T')[0], hora: "11:30", tipo: "Fisioterapia", estado: "pendiente" },
        { id: 3, pacienteId: 3, fecha: new Date(Date.now() + 86400000).toISOString().split('T')[0], hora: "15:00", tipo: "Evaluación", estado: "pendiente" }
    ],
    
    getPacientes() {
        return this.pacientes;
    },
    
    getCitasHoy() {
        const hoy = new Date().toISOString().split('T')[0];
        return this.citas.filter(cita => cita.fecha === hoy);
    },
    
    addPaciente(nuevoPaciente) {
        nuevoPaciente.id = this.pacientes.length > 0 ? Math.max(...this.pacientes.map(p => p.id)) + 1 : 1;
        this.pacientes.push(nuevoPaciente);
        return nuevoPaciente;
    },
    
    addCita(nuevaCita) {
        nuevaCita.id = this.citas.length > 0 ? Math.max(...this.citas.map(c => c.id)) + 1 : 1;
        this.citas.push(nuevaCita);
        return nuevaCita;
    }
};

// Simulate async network request
window.simularPeticion = function(callback, delay = 500) {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(callback());
        }, delay);
    });
};
