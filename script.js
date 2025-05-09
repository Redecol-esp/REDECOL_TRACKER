// --- CONFIGURACIÓN DE FIREBASE ---
const firebaseConfig = {
    apiKey: "AIzaSyBd25hLnwk72yO9E7ovKkB6Ba5RA0F_3aI",
    authDomain: "redecol-74a1b.firebaseapp.com",
    projectId: "redecol-74a1b",
    storageBucket: "redecol-74a1b.firebasestorage.app",
    messagingSenderId: "286437914537",
    appId: "1:286437914537:web:151e8791eed2189fef6b8",
    measurementId: "G-M9MJ2LJ010"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// --- VARIABLES GLOBALES ---
let map, marker, watchID, ruta = [];
window.liveTrackingListener = null; // Para controlar el listener en vivo
window.livePolyline = null;        // Para la polilínea del seguimiento en vivo

// --- INICIALIZAR MAPA ---
function initMap() {
    const centro = { lat: 4.570868, lng: -74.297333 };
    map = new google.maps.Map(document.getElementById("map"), {
        center: centro,
        zoom: 13
    });
    marker = new google.maps.Marker({
        position: centro,
        map,
        icon: "https://maps.google.com/mapfiles/ms/icons/green-dot.png" // Marcador genérico
    });
}

// --- SEGUIMIENTO GPS ---
function activarUbicacion() {
    const nombre = document.getElementById("nombreReciclador").value.trim();
    if (!nombre) return alert("Debes ingresar el nombre o ID del reciclador.");

    ruta = [];
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

    watchID = navigator.geolocation.watchPosition(handlePosition, handleError, { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 });
    // Mostrar indicador de grabación también al iniciar watchPosition
    document.getElementById("grabacionActiva").style.display = "inline";

    function handlePosition(pos) {
        console.log("Posición:", pos);
        if (pos && pos.coords) {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            const punto = { lat: lat, lng: lng };
            ruta.push(punto);
            marker.setPosition(punto);
            map.setCenter(punto);
            console.log("Guardando ubicación:", nombre, punto);
            db.collection("rutas").doc(nombre).set({ trayectoria: ruta })
                .then(() => console.log("Ubicación guardada en Firestore:", nombre, punto))
                .catch(error => console.error("Error al guardar en Firestore:", error));
        } else {
            console.warn("Objeto Position o coords inválido.");
        }
    }

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
function detenerUbicacion() {
    if (watchID != null) {
        navigator.geolocation.clearWatch(watchID);
        alert("Seguimiento detenido.");
        // Ocultar indicador de grabación
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
function mostrarTrayectoria() {
    const nombre = document.getElementById("nombreReciclador").value.trim();
    if (!nombre) return alert("Ingrese el nombre del reciclador.");

    db.collection("rutas").doc(nombre).get().then(doc => {
        if (!doc.exists || !doc.data().trayectoria) return alert("No existe trayectoria para " + nombre);
        const datos = doc.data().trayectoria;
        const poly = new google.maps.Polyline({
            path: datos,
            geodesic: true,
            strokeColor: "#2196f3",
            strokeWeight: 4,
            map
        });
        const bounds = new google.maps.LatLngBounds();
        datos.forEach(p => bounds.extend(p));
        map.fitBounds(bounds);
    });
}

function mostrarTodasTrayectorias() {
    db.collection("rutas").get().then(snap => {
        snap.forEach(doc => {
            if (doc.data().trayectoria) {
                const datos = doc.data().trayectoria;
                new google.maps.Polyline({
                    path: datos,
                    geodesic: true,
                    strokeColor: "#FF0000",
                    strokeOpacity: 0.5,
                    strokeWeight: 2,
                    map
                });
            }
        });
    });
}

// --- CAMBIO DE ESTADO ---
function cambiarEstado(estado) {
    alert(`Estado cambiado a: ${estado}`);
    const nombre = document.getElementById("nombreReciclador").value.trim();
    if (nombre) {
        db.collection("rutas").doc(nombre).update({ estado: estado })
        .then(() => console.log(`Estado de ${nombre} actualizado a ${estado}`))
        .catch(error => console.error("Error al actualizar el estado:", error));
    } else {
        alert("Por favor, ingrese el nombre del reciclador para cambiar su estado.");
    }
}

// --- DESCARGAR RUTA (CSV) ---
function descargarRuta() {
    const nombre = document.getElementById("nombreReciclador").value.trim();
    if (!nombre) return alert("Ingrese el nombre del reciclador.");
    db.collection("rutas").doc(nombre).get().then(doc => {
        if (!doc.exists || !doc.data().trayectoria) return alert("No existe trayectoria para " + nombre);
        const datos = doc.data().trayectoria;
        let csv = "data:text/csv;charset=utf-8,latitud,longitud,direccion\n";

        const geocodePromises = datos.map(async p => {
            try {
                const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=<span class="math-inline">\{p\.lat\},</span>{p.lng}&key=YOUR_API_KEY`);
                const data = await response.json();
                let direccion = "";
                if (data.results && data.results.length > 0) {
                    direccion = data.results[0].formatted_address;
                }
                return `<span class="math-inline">\{p\.lat\},</span>{p.lng},"${direccion}"`;
            } catch (error) {
                console.error("Error al geocodificar:", error);
                return `<span class="math-inline">\{p\.lat\},</span>{p.lng},"Error al obtener dirección"`;
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
                        fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=<span class="math-inline">\{p\.lat\},</span>{p.lng}&key=YOUR_API_KEY`) // Asegúrate de tener tu API KEY aquí
                            .then(response => response.json())
                            .then(data => {
                                let direccion = "";
                                if (data.results && data.results.length > 0) {
                                    direccion = data.results[0].formatted_address;
                                }
                                allRoutesData.push(`<span class="math-inline">\{nombre\},</span>{p.lat},<span class="math-inline">\{p\.lng\},"</span>{direccion}"`);
                            })
                            .catch(error => {
                                console.error(`Error al geocodificar para <span class="math-inline">\{nombre\} \(</span>{p.lat}, ${p.lng}):`, error);
                                allRoutesData.push(`<span class="math-inline">\{nombre\},</span>{p.lat},${p.lng},"Error al obtener dirección"`);
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
document.getElementById("registroForm").addEventListener("submit", e => {
    e.preventDefault();
    const u = {
        nombre
