// js/controllers/mantenimientoController.js

class MantenimientoController {
    static async normalizePatientNames() {
        try {
            const { data: pacientes, error } = await window.supabaseClient.from('pacientes').select('id, nombre');
            if (error) throw error;

            let updatedCount = 0;
            for (const p of pacientes) {
                if (!p.nombre) continue;
                // Trim and remove double spaces
                let cleanName = p.nombre.trim().replace(/\s+/g, ' ');
                // Simple Title Case
                cleanName = cleanName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

                if (cleanName !== p.nombre) {
                    await window.supabaseClient.from('pacientes').update({ nombre: cleanName }).eq('id', p.id);
                    updatedCount++;
                }
            }
            alert(`Limpieza completada. Se normalizaron ${updatedCount} nombres de pacientes.`);
        } catch (err) {
            console.error('Error normalizando pacientes:', err);
            alert('Error al normalizar nombres de pacientes.');
        }
    }

    static async findAndShowDuplicates() {
        try {
            const { data: pacientes, error } = await window.supabaseClient.from('pacientes').select('id, nombre, dni');
            if (error) throw error;

            const nameMap = {};
            const duplicates = [];

            for (const p of pacientes) {
                if (!p.nombre) continue;
                const cleanName = p.nombre.trim().toLowerCase();
                if (nameMap[cleanName]) {
                    duplicates.push(p);
                } else {
                    nameMap[cleanName] = true;
                }
            }

            if (duplicates.length > 0) {
                alert(`Se encontraron ${duplicates.length} pacientes con nombres posiblemente duplicados. Revise la consola para los IDs.`);
                console.log("Posibles Duplicados:", duplicates);
            } else {
                alert('No se encontraron pacientes duplicados por nombre exacto.');
            }
        } catch (err) {
            console.error('Error buscando duplicados:', err);
            alert('Error al buscar duplicados.');
        }
    }
}

window.MantenimientoController = MantenimientoController;
