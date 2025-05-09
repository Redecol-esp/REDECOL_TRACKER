// --- CONFIGURACIÓN DE FIREBASE ---
        // 13. Configuración de Firebase.  Asegúrate de reemplazar estos valores
        //     con los de tu propio proyecto de Firebase.
        const firebaseConfig = {
            apiKey: "AIzaSyBd25hLnwk72yO9E7ovKkB6Ba5RA0F_3aI",
            authDomain: "redecol-74a1b.firebaseapp.com",
            projectId: "redecol-74a1b",
            storageBucket: "redecol-74a1b.firebasestorage.app",
            messagingSenderId: "286437914537",
            appId: "1:286437914537:web:151e8791eed2189fef6b8",
            measurementId: "G-M9MJ2LJ010"
        };

        // 14. Inicialización de Firebase.
        firebase.initializeApp(firebaseConfig);
        const db = firebase.firestore();

        // --- VARIABLES GLOBALES ---
        // 15. Declaración de variables globales.  'map' ya está declarada arriba.
        let marker, watchID, ruta = [];
        window.liveTrackingListener = null; // Para controlar el listener en vivo
        window.livePolyline = null;       // Para la polilínea del seguimiento en vivo

        // --- SEGUIMIENTO GPS ---
        // 16. Función para activar el seguimiento de la ubicación del reciclador.
        function activarUbicacion() {
            const nombre = document.getElementById("nombreReciclador").value.trim();
            if (!nombre) return alert("Debes ingresar el nombre o ID del reciclador.");

            ruta = []; // Inicializa la ruta cada vez que se inicia el seguimiento
            let initialTimeout = setTimeout(() => {
                navigator.geolocation.getCurrentPosition(
                    pos => {
                        console.log("Ubicación inicial obtenida con getCurrentPosition:", pos);
                        handlePosition(pos);
                        // Iniciar watchPosition después de obtener la inicial
                        watchID = navigator.geolocation.watchPosition(handlePosition, handleError, { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 });
                        clearTimeout(initialTimeout);
                        // Mostrar indicador de grabación
                        document.getElementById("grabacionActiva").style.display = "inline";
                    },
                    handleError,
                    { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 } // Timeout más largo para el intento único
                );
            }, 500); // Pequeño retraso antes de intentar getCurrentPosition

            // 16.1 Obtenemos el nombre del reciclador desde el input correspondiente.

            // 16.2 Iniciamos el seguimiento de la ubicación usando la API de Geolocation del navegador.
            //       La función getCurrentPosition obtiene la primera ubicación y luego watchPosition
            //       sigue actualizando la ubicación a medida que el usuario se mueve.
            watchID = navigator.geolocation.watchPosition(handlePosition, handleError, {
                enableHighAccuracy: true,  // Intenta obtener la ubicación más precisa posible
                maximumAge: 0,            // No usar ubicaciones en caché
                timeout: 10000             // Tiempo máximo para obtener una ubicación (en milisegundos)
            });
            document.getElementById("grabacionActiva").style.display = "inline";


            // 17. Función que se llama cada vez que se obtiene una nueva ubicación.
            function handlePosition(pos) {
                console.log("Posición:", pos);
                // 17.1 Verificamos que la posición sea válida.
                if (pos && pos.coords) {
                    const lat = pos.coords.latitude;
                    const lng = pos.coords.longitude;
                    const punto = { lat: lat, lng: lng };
                    ruta.push(punto); // Añade el punto a la ruta
                    // 17.2 Creamos un objeto LatLng con las coordenadas.
                    const ubicacion = { lat: lat, lng: lng };

                    // 17.3 Movemos el marcador a la nueva ubicación.
                    marker.setPosition(ubicacion);
                    map.setCenter(ubicacion); // Centramos el mapa en la nueva ubicación

                    // 17.4 Guardamos la ubicación en la base de datos de Firebase.
                    console.log("Guardando ubicación:", nombre, ubicacion);
                    db.collection("rutas").doc(nombre).set({ trayectoria: ruta })
                        .then(() => console.log("Ubicación guardada en Firestore:", nombre, ubicacion))
                        .catch(error => console.error("Error al guardar en Firestore:", error));
                } else {
                  console.warn("Objeto Position o coords inválido.");
                }
            }

            // 18. Función para manejar errores de la API de Geolocation.
            function handleError(err) {
                console.error("GPS Error:", err);
                alert("Error obteniendo ubicación: " + err.message);
                if (initialTimeout) {
                    clearTimeout(initialTimeout);
                }
                // Ocultar indicador de grabación en caso de error
                document.getElementById("grabacionActiva").style.display = "none";
            }
        }

        // 19. Función para detener el seguimiento de la ubicación.
        function detenerUbicacion() {
            // 19.1 Verificamos que watchPosition esté activo.
            if (watchID != null) {
                navigator.geolocation.clearWatch(watchID);  // Detenemos el seguimiento.
                alert("Seguimiento detenido.");
                document.getElementById("grabacionActiva").style.display = "none";
            }
        }

        // --- SEGUIMIENTO EN VIVO ---
        function iniciarSeguimientoEnVivo() {
            const nombre = document.getElementById("nombreReciclador").value.trim();
            if (!nombre) return alert("Ingrese el nombre del reciclador a seguir en vivo.");

            // Detener cualquier listener previo
            if (window.liveTrackingListener) {
                window.liveTrackingListener();
                window.liveTrackingListener = null;
            }
            // Limpiar polilínea anterior
            if (window.livePolyline) {
                window.livePolyline.setMap(null);
                window.livePolyline = null;
            }

            const recicladorRef = db.collection("rutas").doc(nombre);

            window.liveTrackingListener = recicladorRef.onSnapshot((doc) => {
                if (doc.exists && doc.data().trayectoria && doc.data().trayectoria.length > 0) {
                    const ultimoPunto = doc.data().trayectoria[doc.data().trayectoria.length - 1];
                    const latLng = new google.maps.LatLng(ultimoPunto.lat, ultimoPunto.lng);
                    marker.setPosition(latLng);
                    map.setCenter(latLng); // Centrar el mapa en la última ubicación

                    // Dibujar la ruta en tiempo real
                    if (!window.livePolyline) {
                        window.livePolyline = new google.maps.Polyline({
                            path: [latLng],
                            geodesic: true,
                            strokeColor: '#00FF00',
                            strokeWeight: 4,
                            map: map
                        });
                    } else {
                        const currentPath = window.livePolyline.getPath();
                        currentPath.push(latLng);
                        window.livePolyline.setPath(currentPath);
                    }
                } else {
                    alert(`No se encontraron datos de trayectoria para ${nombre}.`);
                    if (window.livePolyline) {
                        window.livePolyline.setMap(null); // Limpiar la polilínea si existe
                        window.livePolyline = null;
                    }
                }
            }, (error) => {
                console.error("Error al escuchar la ubicación en tiempo real:", error);
                alert("Error al obtener la ubicación en tiempo real.");
            });
        }

        function detenerSeguimientoEnVivo() {
            if (window.liveTrackingListener) {
                window.liveTrackingListener();
                window.liveTrackingListener = null;
                if (window.livePolyline) {
                    window.livePolyline.setMap(null);
                    window.livePolyline = null;
                }
                alert("Seguimiento en vivo detenido.");
            } else {
                alert("No hay ningún seguimiento en vivo activo.");
            }
        }

        // --- MOSTRAR RUTAS ---
        // 20. Función para mostrar la trayectoria de un reciclador en el mapa.
        function mostrarTrayectoria() {
            const nombre = document.getElementById("nombreReciclador").value.trim();
            if (!nombre) return alert("Ingrese el nombre del reciclador.");

            // 20.1 Obtenemos el nombre del reciclador.

            // 20.2 Consultamos la base de datos de Firebase para obtener la trayectoria del reciclador.
            db.collection("rutas").doc(nombre).get().then(doc => {
                // 20.3 Verificamos si el documento existe y tiene datos de trayectoria.
                if (!doc.exists || !doc.data().trayectoria) return alert("No existe trayectoria para " + nombre);

                // 20.4 Obtenemos el array de puntos de la trayectoria.
                const datos = doc.data().trayectoria;

                // 20.5 Creamos una polilínea para mostrar la trayectoria en el mapa.
                const poly = new google.maps.Polyline({
                    path: datos,          // Pasamos el array de puntos
                    geodesic: true,       // Usar la proyección geodésica (para curvas en la Tierra)
                    strokeColor: "#2196f3", // Color de la línea (azul)
                    strokeWeight: 4,        // Grosor de la línea
                    map: map             // El mapa donde se dibujará la línea
                });

                // 20.6 Ajustamos la vista del mapa para que se muestre toda la trayectoria.
                const bounds = new google.maps.LatLngBounds(); // Objeto para calcular los límites
                datos.forEach(p => bounds.extend(p));       // Extendemos los límites con cada punto
                map.fitBounds(bounds);                    // Ajustamos la vista del mapa
            });
        }

        // 21. Función para mostrar todas las trayectorias de todos los recicladores.
        function mostrarTodasTrayectorias() {
            // 21.1 Consultamos la base de datos para obtener todas las rutas.
            db.collection("rutas").get().then(snap => {
                // 21.2 Iteramos sobre cada documento (ruta) obtenido.
                snap.forEach(doc => {
                    // 21.3 Verificamos si el documento tiene datos de trayectoria.
                    if (doc.data().trayectoria) {
                        const datos = doc.data().trayectoria;
                        // 21.4 Creamos una polilínea para cada trayectoria.
                        new google.maps.Polyline({
                            path: datos,
                            geodesic: true,
                            strokeColor: "#FF0000", // Color de línea (rojo)
                            strokeOpacity: 0.5,       // Opacidad de la línea
                            strokeWeight: 2,
                            map: map
                        });
                    }
                });
            });
        }

        // --- CAMBIO DE ESTADO ---
        // 22. Función para cambiar el estado de un reciclador.
        function cambiarEstado(estado) {
            // 22.1 Mostramos un mensaje con el nuevo estado.
            alert(`Estado cambiado a: ${estado}`);
            const nombre = document.getElementById("nombreReciclador").value.trim();
            if (nombre) {
                // 22.2 Actualizamos el estado en la base de datos.
                db.collection("rutas").doc(nombre).update({ estado: estado })
                    .then(() => console.log(`Estado de ${nombre} actualizado a ${estado}`))
                    .catch(error => console.error("Error al actualizar el estado:", error));
            } else {
                 alert("Por favor, ingrese el nombre del reciclador para cambiar su estado.");
            }
        }

        // --- DESCARGAR RUTA (CSV) ---
        // 23. Función para descargar la ruta de un reciclador en formato CSV.
        function descargarRuta() {
            const nombre = document.getElementById("nombreReciclador").value.trim();
            if (!nombre) return alert("Ingrese el nombre del reciclador.");

            db.collection("rutas").doc(nombre).get().then(doc => {
                if (!doc.exists || !doc.data().trayectoria) return alert("No existe trayectoria para " + nombre);
                const datos = doc.data().trayectoria;
                let csv = "data:text/csv;charset=utf-8,latitud,longitud,direccion\n";

                const geocodePromises = datos.map(async p => {
                    try {
                        const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${p.lat},${p.lng}&key=YOUR_API_KEY`);
                        const data = await response.json();
                        let direccion = "";
                        if (data.results && data.results.length > 0) {
                            direccion = data.results[0].formatted_address;
                        }
                        return `${p.lat},${p.lng},"${direccion}"`;
                    } catch (error) {
                        console.error("Error al geocodificar:", error);
                        return `${p.lat},${p.lng},"Error al obtener dirección"`;
                    }
                });

                Promise.all(geocodePromises).then(rows => {
                    csv += rows.join("\n");
                    const uri = encodeURI(csv);
                    const link = document.createElement("a");
                    link.href = uri;
                    link.download = `${nombre}_ruta.csv`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                });
            });
        }

        // --- DESCARGAR TODAS LAS RUTAS (CSV) ---
        function descargarTodasRutas() {
            db.collection("rutas").get().then(snapshot => {
                let csv = "data:text/csv;charset=utf-8,nombre_reciclador,latitud,longitud,direccion\n";
                const geocodePromises = [];
                const allRoutesData = [];

                snapshot.forEach(doc => {
                    const nombre = doc.id;
                    const trayectoria = doc.data().trayectoria;
                    if (trayectoria && trayectoria.length > 0) {
                        trayectoria.forEach(p => {
                            geocodePromises.push(
                                fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${p.lat},${p.lng}&key=YOUR_API_KEY`) // Asegúrate de tener tu API KEY aquí
                                    .then(response => response.json())
                                    .then(data => {
                                        let direccion = "";
                                        if (data.results && data.results.length > 0) {
                                            direccion = data.results[0].formatted_address;
                                        }
                                        allRoutesData.push(`${nombre},${p.lat},${p.lng},"${direccion}"`);
                                    })
                                    .catch(error => {
                                        console.error(`Error al geocodificar para ${nombre} (${p.lat}, ${p.lng}):`, error);
                                        allRoutesData.push(`${nombre},${p.lat},${p.lng},"Error al obtener dirección"`);
                                    })
                            );
                        });
                    }
                });

                Promise.all(geocodePromises).then(() => {
                    csv += allRoutesData.join("\n");
                    const uri = encodeURI(csv);
                    const link = document.createElement("a");
                    link.href = uri;
                    link.download = `todas_las_rutas.csv`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                });
            });
        }

        // --- REGISTRO DE USUARIOS ---
        // 24. Evento para el formulario de registro de usuarios.
        document.getElementById("registroForm").addEventListener("submit", e => {
            e.preventDefault(); // Evita que el formulario se envíe de la manera tradicional.

            // 24.1 Obtenemos los valores de los campos del formulario.
            const u = {
                nombre: document.getElementById("nombre").value,
                nit: document.getElementById("nit").value,
                direccion: document.getElementById("direccion").value,
                sector: document.getElementById("sector").value,
                telefono: document.getElementById("telefono").value,
                correo: document.getElementById("correo").value
            };

            // 24.2 Guardamos el usuario en la base de datos de Firebase.
            db.collection("usuarios").add(u)
                .then(ref => {
                    console.log("Usuario registrado con ID: ", ref.id);
                    cargarUsuariosRegistrados(); // Recargamos la tabla de usuarios.
                    document.getElementById("registroForm").reset(); // Limpiamos el formulario.
                    alert("Usuario registrado exitosamente.");
                })
                .catch(error => console.error("Error al registrar usuario: ", error));
        });

        // --- CARGAR USUARIOS REGISTRADOS AL INICIO ---
        // 25. Función para cargar y mostrar los usuarios registrados en la tabla.
        function cargarUsuariosRegistrados() {
            // 25.1 Consultamos la base de datos para obtener todos los usuarios.
            db.collection("usuarios").get().then(snapshot => {
                const tablaBody = document.querySelector("#tablaUsuarios tbody");
                tablaBody.innerHTML = ""; // Limpiamos el contenido de la tabla.
                // 25.2 Iteramos sobre cada documento (usuario) obtenido.
                snapshot.forEach(doc => {
                    const usuario = doc.data();
                    // 25.3 Insertamos una nueva fila en la tabla por cada usuario.
                    const row = tablaBody.insertRow();
                    row.insertCell().textContent = usuario.nombre;
                    row.insertCell().textContent = usuario.nit;
                    row.insertCell().textContent = usuario.direccion;
                    row.insertCell().textContent = usuario.sector;
                    row.insertCell().textContent = usuario.telefono;
                    row.insertCell().textContent = usuario.correo;
                });
            });
        }

        // 26. Función que se ejecuta cuando la página se carga completamente.
        window.onload = function() {
          initMap();             // Inicializamos el mapa de Google.
          cargarUsuariosRegistrados(); // Cargamos los usuarios registrados.
        };
        </script>
</body>
</html>
