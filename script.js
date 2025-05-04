// CONFIGURACIÓN DE FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyD3b9oEisECPPV3z9LsnxE4AYHelgGjWYs",
  authDomain: "redecol-app.firebaseapp.com",
  projectId: "redecol-app",
  storageBucket: "redecol-app.appspot.com",
  messagingSenderId: "347952248667",
  appId: "1:347952248667:web:661b27d8404b70d0f215be"
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

    ruta = []; // Reiniciar ruta
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
function mostrarTrayectoria() {
  const nombre = document.getElementById("nombreReciclador").value.trim();
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
  db.collection("rutas").get().then(snapshot => {
    snapshot.forEach(doc => {
      const datos = doc.data().trayectoria;
      const polyline = new google.maps.Polyline({
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

function cambiarEstado(estado) {
  alert(`Estado del reciclador cambiado a: ${estado}`);
}

// Descargar ruta en formato CSV
function descargarRuta() {
  const nombre = document.getElementById("nombreReciclador").value.trim();
  if (!nombre) return alert("Ingrese el nombre del reciclador.");

  db.collection("rutas").doc(nombre).get().then(doc => {
    if (!doc.exists) {
      alert("No se encontró trayectoria para ese reciclador.");
      return;
    }

    const datos = doc.data().trayectoria;
    let csvContent = "data:text/csv;charset=utf-8,Latitud,Longitud\n";
    datos.forEach(p => {
      csvContent += `${p.lat},${p.lng}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${nombre}_ruta.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });
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

    // Guardar en Firebase
    db.collection("usuarios").add({ nombre, nit, direccion, sector, telefono, correo });

    registroForm.reset();
    alert("Usuario registrado correctamente.");
  });
});
