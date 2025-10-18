// La variable 'db' (Firestore) se inicializa en los archivos HTML y está disponible globalmente.

// --- Funciones de Gestión de Datos (Usando Firebase Firestore) ---

/**
 * Agrega una nueva reserva a la colección 'reservas' en Firestore.
 * @param {object} nuevaReserva - Los datos de la reserva.
 */
function agregarReserva(nuevaReserva) {
    // db.collection("reservas").add() guarda el documento
    return db.collection("reservas").add(nuevaReserva);
}

/**
 * Obtiene todas las reservas de la base de datos.
 * @returns {Promise<Array<object>>} Una promesa que resuelve con un array de reservas.
 */
function obtenerReservas() {
    return db.collection("reservas").get().then((querySnapshot) => {
        const reservas = [];
        querySnapshot.forEach((doc) => {
            // Incluye el ID de Firebase para poder actualizar o eliminar la reserva
            reservas.push({ id: doc.id, ...doc.data() }); 
        });
        return reservas;
    });
}

/**
 * Actualiza el estado (y opcionalmente fecha/hora) de una reserva específica por su ID de Firebase.
 * @param {string} id - El ID del documento de Firebase.
 * @param {string} estado - El nuevo estado ('Confirmado' o 'Pendiente').
 * @param {string} [fecha] - Nueva fecha opcional.
 * @param {string} [hora] - Nueva hora opcional.
 */
function actualizarEstadoReserva(id, estado, fecha, hora) {
    const data = { estado: estado };
    if (fecha) data.fecha = fecha;
    if (hora) data.hora = hora;
    
    // db.collection("reservas").doc(id).update() modifica solo los campos especificados
    return db.collection("reservas").doc(id).update(data);
}


// --- Funciones de Renderizado para el Usuario (index.html) ---

function mostrarDisponibilidad() {
    const tabla = document.getElementById('calendario-disponibilidad');
    if (!tabla) return; 

    // Obtiene las reservas de la NUBE
    obtenerReservas().then(reservas => {
        const confirmadas = reservas.filter(res => res.estado === 'Confirmado');
        
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

        if (confirmadas.length === 0) {
            tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;">🎉 ¡Todo el calendario está libre!</td></tr>`;
            return;
        }

        confirmadas.forEach(res => {
            const fila = tbody.insertRow();
            fila.insertCell().textContent = res.fecha;
            fila.insertCell().textContent = res.hora;
            fila.insertCell().innerHTML = `<span class="estado-ocupado">OCUPADO</span>`;
        });
    });
}


// --- Funciones de Renderizado para el Dueño (admin.html) ---

function cargarPanelAdmin() {
    // Obtiene las reservas de la NUBE
    obtenerReservas().then(reservas => {
        
        const pendientesDiv = document.getElementById('reservas-pendientes');
        const confirmadasTbody = document.getElementById('reservas-confirmadas').querySelector('tbody');
        
        if (!pendientesDiv || !confirmadasTbody) return; 

        pendientesDiv.innerHTML = '';
        confirmadasTbody.innerHTML = '';
        
        const pendientes = reservas.filter(res => res.estado === 'Pendiente');
        const confirmadas = reservas.filter(res => res.estado === 'Confirmado');

        // 1. Renderizar Pendientes
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
                            <label for="fecha-${reserva.id}">Fecha (Reasignar):</label>
                            <input type="date" id="fecha-${reserva.id}" value="${reserva.fecha}" required>
                        </div>
                        <div class="form-group">
                            <label for="hora-${reserva.id}">Hora (Reasignar):</label>
                            <input type="time" id="hora-${reserva.id}" value="${reserva.hora}" required>
                        </div>
                        <button type="submit">✅ Confirmar Turno</button>
                        <button type="button" class="btn-rechazar" data-id="${reserva.id}" 
                                 style="background-color: var(--color-marron);">❌ Rechazar/Eliminar</button>
                    </form>
                `;
                pendientesDiv.appendChild(card);
            });
            
            // 2. Agregar Event Listeners para Confirmar/Rechazar (Pendientes)
            document.querySelectorAll('.form-aprobacion').forEach(form => {
                form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    const id = form.getAttribute('data-id');
                    const nuevaFecha = form.querySelector(`input[type="date"]`).value;
                    const nuevaHora = form.querySelector(`input[type="time"]`).value;
                    
                    actualizarEstadoReserva(id, 'Confirmado', nuevaFecha, nuevaHora)
                        .then(() => cargarPanelAdmin()); 
                });
            });
            
            document.querySelectorAll('.btn-rechazar').forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = btn.getAttribute('data-id');
                    if(confirm('¿Seguro que quieres rechazar y ELIMINAR este turno?')) {
                        // Elimina el documento de Firebase
                        db.collection("reservas").doc(id).delete()
                            .then(() => cargarPanelAdmin());
                    }
                });
            });
        }

        // 3. Renderizar Confirmadas (CON BOTÓN DE CANCELAR/ELIMINAR)
        if (confirmadas.length === 0) {
            confirmadasTbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No hay turnos confirmados aún.</td></tr>`; 
        } else {
            confirmadas.forEach(reserva => {
                const fila = confirmadasTbody.insertRow();
                fila.insertCell().textContent = reserva.nombre;
                fila.insertCell().textContent = reserva.telefono;
                fila.insertCell().textContent = `${reserva.fecha} ${reserva.hora}`;
                fila.insertCell().innerHTML = `<span class="estado-ocupado">Confirmado</span>`;
                
                // Celda de Acciones con el botón "❌ Cancelar"
                const cellAcciones = fila.insertCell();
                cellAcciones.innerHTML = `<button class="btn-eliminar-confirmado" data-id="${reserva.id}" 
                                            style="padding: 5px 10px; background-color: var(--color-marron);">❌ Cancelar</button>`; 
            });
            
            // Agregar Event Listener para eliminar confirmados
            document.querySelectorAll('.btn-eliminar-confirmado').forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = btn.getAttribute('data-id');
                    if(confirm('⚠️ ¿Seguro que quieres CANCELAR y ELIMINAR este turno CONFIRMADO? Esta acción es permanente.')) {
                        // Llama al método de eliminación de Firebase
                        db.collection("reservas").doc(id).delete()
                            .then(() => cargarPanelAdmin()); // Recarga el panel
                    }
                });
            });
        }
    }); // Fin del obtenerReservas.then()
}


// --- Lógica de Inicialización para el Usuario (index.html) ---

// Mueve toda la lógica del formulario de index.html aquí.
document.addEventListener('DOMContentLoaded', () => {
    const formulario = document.getElementById('formulario-reserva');
    
    // Si encuentra el formulario, estamos en index.html y ejecutamos su lógica
    if (formulario) { 
        const fechaInput = document.getElementById('fecha');
        const mensajeReserva = document.getElementById('mensaje-reserva');
        
        // 1. Validar que no se pueda elegir una fecha pasada
        const hoy = new Date();
        const fechaMinima = hoy.toISOString().split('T')[0];
        fechaInput.setAttribute('min', fechaMinima);

        // 2. Manejar el envío del formulario
        formulario.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const horaSolicitada = document.getElementById('hora').value;
            const horaInicio = '09:00';
            const horaFin = '18:00';
            
            // VALIDACIÓN DE HORARIO (extra, aunque el input ya lo tiene)
            if (horaSolicitada < horaInicio || horaSolicitada > horaFin) {
                mensajeReserva.textContent = `❌ Lo sentimos, solo se puede reservar entre las ${horaInicio} y las ${horaFin}.`;
                mensajeReserva.style.color = 'var(--color-marron)';
                return; 
            }

            const nuevaReserva = {
                nombre: document.getElementById('nombre').value,
                telefono: document.getElementById('telefono').value,
                fecha: document.getElementById('fecha').value,
                hora: horaSolicitada,
                estado: 'Pendiente' // Estado inicial
            };

            // Añade la reserva a Firebase
            agregarReserva(nuevaReserva).then(() => {
                formulario.reset();
                mensajeReserva.textContent = "✅ Tu solicitud ha sido enviada. Espera la confirmación del dueño.";
                mensajeReserva.style.color = 'var(--color-rosa-fuerte)';
                mostrarDisponibilidad(); // Recarga la tabla de disponibilidad
            }).catch(() => {
                mensajeReserva.textContent = "🚨 Error al enviar la reserva. Intenta de nuevo más tarde.";
                mensajeReserva.style.color = 'red';
            });
        });

        // 3. Cargar disponibilidad al inicio
        mostrarDisponibilidad();
    }
    // NOTA: Si no encuentra el formulario (estamos en admin.html), la función cargarPanelAdmin() es llamada
    // por el script de autenticación en admin.html, no aquí.
});
