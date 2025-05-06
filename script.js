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
window.livePolyline = null;       // Para la polilínea del seguimiento en vivo

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
            },
            handleError,
            { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 } // Timeout más largo para el intento único
        );
    }, 500); // Pequeño retraso antes de intentar getCurrentPosition

    watchID = navigator.geolocation.watchPosition(handlePosition, handleError, { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 });

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
    }
}
function detenerUbicacion() {
    if (watchID != null) {
        navigator.geolocation.clearWatch(watchID);
        alert("Seguimiento detenido.");
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
        let csv = "data:text/csv;charset=utf-8,latitud,longitud\n"
            + datos.map(p => `${p.lat},${p.lng}`).join("\n");
        const uri = encodeURI(csv);
        const link = document.createElement("a");
        link.href = uri;
        link.download = `${nombre}_ruta.csv`;
        document.body.appendChild(link); // Necesario para Firefox
        link.click();
        document.body.removeChild(link); // Limpiar
    });
}

// --- REGISTRO DE USUARIOS ---
document.getElementById("registroForm").addEventListener("submit", e => {
    e.preventDefault();
    const u = {
        nombre: document.getElementById("nombre").value,
        nit:     document.getElementById("nit").value,
        direccion: document.getElementById("direccion").value,
        sector: document.getElementById("sector").value,
        telefono: document.getElementById("telefono").value,
        correo: document.getElementById("correo").value
    };
    db.collection("usuarios").add(u).then(() => {
        alert("Usuario registrado.");
        const tr = document.createElement("tr");
        tr.innerHTML = `<td>${u.nombre}</td><td>${u.nit}</td>
            <td>${u.direccion}</td><td>${u.sector}</td>
            <td>${u.telefono}</td><td>${u.correo}</td>`;
        document.querySelector("#tablaUsuarios tbody").append(tr);
        e.target.reset();
    });
});

// --- CARGAR USUARIOS REGISTRADOS AL INICIO ---
function cargarUsuariosRegistrados() {
    db.collection("usuarios").get().then(snapshot => {
        const tbody = document.querySelector("#tablaUsuarios tbody");
        snapshot.forEach(doc => {
            const usuario = doc.data();
            const tr = document.createElement("tr");
            tr.innerHTML = `<td>${usuario.nombre}</td><td>${usuario.nit}</td>
                <td>${usuario.direccion}</td><td>${usuario.sector}</td>
                <td>${usuario.telefono}</td><td>${usuario.correo}</td>`;
            tbody.append(tr);
        });
    });
}

window.onload = cargarUsuariosRegistrados;
