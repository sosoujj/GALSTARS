const STORAGE_KEY = 'reservasSistema';

// --- Funciones de Gestión de Datos (Simulación de BD) ---

function obtenerReservas() {
    const reservasJSON = localStorage.getItem(STORAGE_KEY);
    // Si no hay reservas, devuelve un array vacío
    return reservasJSON ? JSON.parse(reservasJSON) : [];
}

function guardarReservas(reservas) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reservas));
}

function agregarReserva(nuevaReserva) {
    const reservas = obtenerReservas();
    // Generar un ID simple
    nuevaReserva.id = Date.now(); 
    reservas.push(nuevaReserva);
    guardarReservas(reservas);
}

function actualizarEstadoReserva(id, estado, fecha, hora) {
    const reservas = obtenerReservas();
    const index = reservas.findIndex(res => res.id === id);
    if (index !== -1) {
        reservas[index].estado = estado;
        if (fecha && hora) {
            reservas[index].fecha = fecha; // Permite al dueño reasignar
            reservas[index].hora = hora;
        }
        guardarReservas(reservas);
    }
}


// --- Funciones de Renderizado para el Usuario (index.html) ---

function mostrarDisponibilidad() {
    const tabla = document.getElementById('calendario-disponibilidad');
    if (!tabla) return; // Si no estamos en index.html, salimos

    const reservas = obtenerReservas().filter(res => res.estado === 'Confirmado');
    tabla.innerHTML = `
        <thead>
            <tr>
                <th>Fecha</th>
                <th>Hora</th>
                <th>Estado</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;
    const tbody = tabla.querySelector('tbody');

    if (reservas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;">🎉 ¡Todo el calendario está libre!</td></tr>`;
        return;
    }

    // Mostrar solo las confirmadas como "Ocupado"
    reservas.forEach(res => {
        const fila = tbody.insertRow();
        fila.insertCell().textContent = res.fecha;
        fila.insertCell().textContent = res.hora;
        fila.insertCell().innerHTML = `<span class="estado-ocupado">OCUPADO</span>`;
    });
}


// --- Funciones de Renderizado para el Dueño (admin.html) ---

function cargarPanelAdmin() {
    const reservas = obtenerReservas();
    
    // Contenedores
    const pendientesDiv = document.getElementById('reservas-pendientes');
    const confirmadasTbody = document.getElementById('reservas-confirmadas').querySelector('tbody');
    
    if (!pendientesDiv || !confirmadasTbody) return; // Si no estamos en admin.html, salimos

    pendientesDiv.innerHTML = '';
    confirmadasTbody.innerHTML = '';
    
    const pendientes = reservas.filter(res => res.estado === 'Pendiente');
    const confirmadas = reservas.filter(res => res.estado === 'Confirmado');

    // 1. Renderizar Pendientes (Formulario de Aprobación Rápida)
    if (pendientes.length === 0) {
        pendientesDiv.innerHTML = "<p>🥳 No hay turnos pendientes por aprobar.</p>";
    } else {
        pendientes.forEach(reserva => {
            const card = document.createElement('div');
            card.className = 'reservas-list';
            card.innerHTML = `
                <p><strong>Cliente:</strong> ${reserva.nombre}</p>
                <p><strong>Teléfono:</strong> ${reserva.telefono}</p>
                <p><strong>Solicita:</strong> ${reserva.fecha} a las ${reserva.hora}</p>
                
                <form class="form-aprobacion" data-id="${reserva.id}">
                    <div class="form-group">
                        <label for="fecha-${reserva.id}">Fecha (Reasignar si es necesario):</label>
                        <input type="date" id="fecha-${reserva.id}" value="${reserva.fecha}" required>
                    </div>
                    <div class="form-group">
                        <label for="hora-${reserva.id}">Hora (Reasignar si es necesario):</label>
                        <input type="time" id="hora-${reserva.id}" value="${reserva.hora}" required>
                    </div>
                    <button type="submit">✅ Confirmar Turno</button>
                    <button type="button" class="btn-rechazar" data-id="${reserva.id}" 
                            style="background-color: var(--color-marron);">❌ Rechazar</button>
                </form>
            `;
            pendientesDiv.appendChild(card);
        });
        
        // Agregar Event Listeners para Confirmar/Rechazar
        document.querySelectorAll('.form-aprobacion').forEach(form => {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const id = parseInt(form.getAttribute('data-id'));
                const nuevaFecha = form.querySelector(`input[type="date"]`).value;
                const nuevaHora = form.querySelector(`input[type="time"]`).value;
                actualizarEstadoReserva(id, 'Confirmado', nuevaFecha, nuevaHora);
                cargarPanelAdmin(); // Recargar el panel
            });
        });
        
        document.querySelectorAll('.btn-rechazar').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.getAttribute('data-id'));
                if(confirm('¿Seguro que quieres rechazar este turno? (Se eliminará)')) {
                    // En este caso, al ser un ejemplo simple, lo eliminaremos para sacarlo de la vista Pendiente
                    const reservas = obtenerReservas().filter(res => res.id !== id);
                    guardarReservas(reservas);
                    cargarPanelAdmin();
                }
            });
        });
    }

    // 2. Renderizar Confirmadas
    if (confirmadas.length === 0) {
        confirmadasTbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">No hay turnos confirmados aún.</td></tr>`;
    } else {
        confirmadas.forEach(reserva => {
            const fila = confirmadasTbody.insertRow();
            fila.insertCell().textContent = reserva.nombre;
            fila.insertCell().textContent = reserva.telefono;
            fila.insertCell().textContent = `${reserva.fecha} ${reserva.hora}`;
            fila.insertCell().innerHTML = `<span class="estado-ocupado">Confirmado</span>`;
        });
    }
}

// Exportar funciones si se usa en un entorno de módulos. Aquí es simple, solo se declara.