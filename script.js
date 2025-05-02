
// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSy8d25hLnwk72yO9E7ovkKbB6Ba5RA0F_3aI",
  authDomain: "redecol-74a1b.firebaseapp.com",
  projectId: "redecol-74a1b",
  storageBucket: "redecol-74a1b.appspot.com",
  messagingSenderId: "286437914537",
  appId: "1:286437914537:web:151e8791eed2189fef6b8",
  measurementId: "G-M9MJ2LJ010"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let map;
let marker;
let watchID;
let ruta = [];

// Inicializar mapa
function initMap() {
  const centro = { lat: 4.570868, lng: -74.297333 };
  map = new google.maps.Map(document.getElementById("map"), {
    center: centro,
    zoom: 13,
  });

  marker = new google.maps.Marker({
    position: centro,
    map,
    title: "Reciclador",
    icon: "https://maps.google.com/mapfiles/ms/icons/green-dot.png"
  });
}

// Iniciar seguimiento y guardar en Firebase
function activarUbicacion() {
  const nombre = document.getElementById("nombreReciclador").value.trim();
  if (!nombre) {
    alert("Debes ingresar el nombre o ID del reciclador.");
    return;
  }

  db.collection("rutas").get().then(snapshot => {
    if (snapshot.size >= 4) {
      alert("Límite de 4 recicladores activos.");
      return;
    }

    watchID = navigator.geolocation.watchPosition((position) => {
      const punto = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };

      ruta.push(punto);
      marker.setPosition(punto);
      map.setCenter(punto);

      db.collection("rutas").doc(nombre).set({ trayectoria: ruta });
    }, (error) => {
      console.error("Error GPS:", error);
      alert("Error obteniendo ubicación.");
    }, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 10000
    });
  });
}

function detenerUbicacion() {
  if (watchID) {
    navigator.geolocation.clearWatch(watchID);
    alert("Seguimiento detenido.");
  }
}

// Mostrar trayectoria individual desde Firebase
function mostrarTrayectoria(nombre) {
  if (!nombre) {
    nombre = document.getElementById("nombreReciclador").value.trim();
  }
  if (!nombre) return alert("Ingrese el nombre del reciclador.");

  db.collection("rutas").doc(nombre).get().then(doc => {
    if (!doc.exists) {
      alert("No se encontró trayectoria para ese reciclador.");
      return;
    }

    const datos = doc.data().trayectoria;
    const polyline = new google.maps.Polyline({
      path: datos,
      geodesic: true,
      strokeColor: "#2196f3",
      strokeOpacity: 1.0,
      strokeWeight: 4,
      map
    });

    const bounds = new google.maps.LatLngBounds();
    datos.forEach(p => bounds.extend(new google.maps.LatLng(p.lat, p.lng)));
    map.fitBounds(bounds);
  });
}

function mostrarTodasTrayectorias() {
  alert("Solo se muestra una trayectoria a la vez en esta versión.");
}

function cambiarEstado(estado) {
  alert(`Estado del reciclador cambiado a: ${estado}`);
}

// Registro de usuarios
document.addEventListener("DOMContentLoaded", () => {
  const registroForm = document.getElementById("registroForm");
  const tabla = document.querySelector("#tablaUsuarios tbody");

  registroForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const nombre = document.getElementById("nombre").value;
    const nit = document.getElementById("nit").value;
    const direccion = document.getElementById("direccion").value;
    const sector = document.getElementById("sector").value;
    const telefono = document.getElementById("telefono").value;
    const correo = document.getElementById("correo").value;

    const fila = document.createElement("tr");
    fila.innerHTML = `
      <td>${nombre}</td>
      <td>${nit}</td>
      <td>${direccion}</td>
      <td>${sector}</td>
      <td>${telefono}</td>
      <td>${correo}</td>
    `;
    tabla.appendChild(fila);

    // También podrías guardar esto en Firebase si deseas:
    // db.collection("usuarios").add({ nombre, nit, direccion, sector, telefono, correo });

    registroForm.reset();
    alert("Usuario registrado correctamente.");
  });
});
