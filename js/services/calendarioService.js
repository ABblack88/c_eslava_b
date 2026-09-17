// js/services/calendarioService.js
// Responsabilidad: Lógica de negocio para Calendario

class CalendarioService {
    static formatHoraAmPm(horaStr) {
        if (!horaStr) return '';
        const [h, m] = horaStr.split(':');
        const hInt = parseInt(h);
        const ampm = hInt >= 12 ? 'PM' : 'AM';
        const h12 = hInt % 12 || 12;
        return `${h12}:${m} ${ampm}`;
    }

    static mapCitaToCalendarEvent(c, data, serviciosActivos) {
        let color = '#3b82f6'; // default blue
        let classNames = [];
        let hasCustomColor = false;
        
        if (c.notas) {
            if (c.notas.includes('[Azul]')) { color = '#3b82f6'; hasCustomColor = true; }
            else if (c.notas.includes('[Amarillo]')) { color = '#eab308'; hasCustomColor = true; }
            else if (c.notas.includes('[Rojo]')) { color = '#ef4444'; hasCustomColor = true; }
            else if (c.notas.includes('[Verde]')) { color = '#22c55e'; hasCustomColor = true; }
        }
        
        const estadoLower = (c.estado || '').toLowerCase();
        
        if (!hasCustomColor) {
            if (estadoLower.includes('pendiente') || estadoLower.includes('sin confirmar') || estadoLower.includes('por confirmar')) {
                color = '#f59e0b'; // yellow (Por confirmar)
            } else if (estadoLower.includes('confirmad')) {
                color = '#10b981'; // green (Confirmada)
            } else if (estadoLower.includes('progreso')) {
                color = '#3b82f6'; // blue (En procedimiento)
            } else if (estadoLower.includes('reprogramar')) {
                color = '#8b5cf6'; // purple (Reprogramar)
            }
        }

        if (estadoLower.includes('completad') || estadoLower.includes('atendida')) {
            if (!hasCustomColor) color = '#9ca3af'; // gray (Completada)
            classNames.push('opacity-50');
        }

        let sessionStr = 'Cita Única';
        if (c.tratamiento) {
            const baseTrat = c.tratamiento.replace('(Continuación)', '').trim();
            const servicioObj = serviciosActivos ? serviciosActivos.find(s => s.nombre === baseTrat) : null;
            
            if (servicioObj && servicioObj.duracion && servicioObj.duracion > 1) {
                const prevOccurrences = data.filter(prev => 
                    prev.paciente_id === c.paciente_id && 
                    prev.tratamiento && 
                    prev.tratamiento.includes(baseTrat) && 
                    prev.estado !== 'Cancelada' && prev.estado !== 'Cancelado' &&
                    (prev.fecha < c.fecha || (prev.fecha === c.fecha && (prev.hora || '') <= (c.hora || '')))
                );
                const totalOccurrences = data.filter(tot => 
                    tot.paciente_id === c.paciente_id && 
                    tot.tratamiento && 
                    tot.tratamiento.includes(baseTrat) && 
                    tot.estado !== 'Cancelada' && tot.estado !== 'Cancelado'
                ).length;

                if (c.tratamiento.includes('(Continuación)') || totalOccurrences > 1 || prevOccurrences.length > 0) {
                    const occurrenceNumber = prevOccurrences.length || 1;
                    const currentSessionNum = ((occurrenceNumber - 1) % servicioObj.duracion) + 1;
                    sessionStr = `Sesión ${currentSessionNum} de ${servicioObj.duracion}`;
                }
            }
        }
        
        let eventObj = {
            id: c.id,
            title: c.consultorio ? `${c.pacientes?.nombre || 'Desconocido'} - ${c.consultorio}` : (c.pacientes?.nombre || 'Desconocido'),
            start: `${c.fecha}T${c.hora}`,
            backgroundColor: color,
            borderColor: color,
            classNames: classNames,
            extendedProps: {
                estado: c.estado,
                tratamiento: c.tratamiento,
                sessionStr: sessionStr
            }
        };
        
        if (c.hora_fin) {
            eventObj.end = `${c.fecha}T${c.hora_fin}`;
        }
        
        return eventObj;
    }

    static generateGoogleCalendarUrl(appointment) {
        let titleSuffix = '';
        if (appointment.notes) {
            if (appointment.notes.includes('[Azul]')) titleSuffix = ' (No paga)';
            else if (appointment.notes.includes('[Amarillo]')) titleSuffix = ' (Si paga)';
            else if (appointment.notes.includes('[Rojo]')) titleSuffix = ' (Evaluación)';
            else if (appointment.notes.includes('[Verde]')) titleSuffix = ' (1ra vez Descarga)';
        }
        const title = encodeURIComponent(`Cita Centro Eslava - ${appointment.name}${titleSuffix}`);
        const details = encodeURIComponent(`Cita médica programada en Centro Eslava.\nPaciente: ${appointment.name}\nTratante: ${appointment.doctor}\nNotas: ${appointment.notes || 'Ninguna'}`);
        const location = encodeURIComponent("Centro Eslava, Lima, Perú");
        
        let time24 = appointment.time;
        if (appointment.time.includes('AM') || appointment.time.includes('PM')) {
            const [timeStr, modifier] = appointment.time.split(' ');
            let [hours, minutes] = timeStr.split(':');
            if (hours === '12') hours = '00';
            if (modifier === 'PM') hours = parseInt(hours, 10) + 12;
            time24 = `${hours.toString().padStart(2, '0')}:${minutes}`;
        }
        
        const dateStr = appointment.date.replace(/-/g, '');
        const timeStr = time24.replace(/:/g, '') + '00';
        const startDateTime = `${dateStr}T${timeStr}`;
        
        const endHours = (parseInt(time24.split(':')[0], 10) + 1).toString().padStart(2, '0');
        const endMinutes = time24.split(':')[1];
        const endDateTime = `${dateStr}T${endHours}${endMinutes}00`;
        
        let url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDateTime}/${endDateTime}&details=${details}&location=${location}`;
        if (appointment.email) {
            url += `&add=${encodeURIComponent(appointment.email)}`;
        }
        return url;
    }
}

window.CalendarioService = CalendarioService;
