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
    icon: "https://maps.google.com/mapfiles/ms/icons/green-dot.png"
  });
}

// --- SEGUIMIENTO GPS ---
function activarUbicacion() {
  const nombre = document.getElementById("nombreReciclador").value.trim();
  if (!nombre) return alert("Debes ingresar el nombre o ID del reciclador.");

  // Reiniciar
  ruta = [];

  db.collection("rutas").get().then(snap => {
    if (snap.size >= 4) return alert("Máximo 26 recicladores activos.");

    watchID = navigator.geolocation.watchPosition(pos => {
      const punto = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      ruta.push(punto);
      marker.setPosition(punto);
      map.setCenter(punto);
      db.collection("rutas").doc(nombre).set({ trayectoria: ruta });
    }, err => {
      console.error("GPS Error:", err);
      alert("Error obteniendo ubicación: " + err.message);
    }, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 10000
    });
  });
}

function detenerUbicacion() {
  if (watchID != null) {
    navigator.geolocation.clearWatch(watchID);
    alert("Seguimiento detenido.");
  }
}

// --- MOSTRAR RUTAS ---
function mostrarTrayectoria() {
  const nombre = document.getElementById("nombreReciclador").value.trim();
  if (!nombre) return alert("Ingrese el nombre del reciclador.");

  db.collection("rutas").doc(nombre).get().then(doc => {
    if (!doc.exists) return alert("No existe trayectoria para " + nombre);
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
      const datos = doc.data().trayectoria;
      new google.maps.Polyline({
        path: datos,
        geodesic: true,
        strokeColor: "#FF0000",
        strokeOpacity: 0.5,
        strokeWeight: 2,
        map
      });
    });
  });
}

// --- CAMBIO DE ESTADO ---
function cambiarEstado(estado) {
  alert(`Estado cambiado a: ${estado}`);
}

// --- DESCARGAR RUTA (CSV) ---
function descargarRuta() {
  const nombre = document.getElementById("nombreReciclador").value.trim();
  if (!nombre) return alert("Ingrese el nombre del reciclador.");
  db.collection("rutas").doc(nombre).get().then(doc => {
    if (!doc.exists) return alert("No existe trayectoria para " + nombre);
    const datos = doc.data().trayectoria;
    let csv = "data:text/csv;charset=utf-8,latitud,longitud\n"
      + datos.map(p => `${p.lat},${p.lng}`).join("\n");
    const uri = encodeURI(csv);
    const link = document.createElement("a");
    link.href = uri;
    link.download = `${nombre}_ruta.csv`;
    link.click();
  });
}

// --- REGISTRO DE USUARIOS ---
document.getElementById("registroForm").addEventListener("submit", e => {
  e.preventDefault();
  const u = {
    nombre: document.getElementById("nombre").value,
    nit:    document.getElementById("nit").value,
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
