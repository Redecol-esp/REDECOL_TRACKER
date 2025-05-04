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

// GUARDAR REGISTRO DE USUARIO
document.getElementById("registroForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const nombre = document.getElementById("nombre").value;
  const nit = document.getElementById("nit").value;
  const direccion = document.getElementById("direccion").value;
  const sector = document.getElementById("sector").value;
  const telefono = document.getElementById("telefono").value;
  const correo = document.getElementById("correo").value;

  db.collection("usuarios").add({
    nombre, nit, direccion, sector, telefono, correo,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  }).then(() => {
    alert("Usuario registrado correctamente.");
    mostrarUsuarios();
    document.getElementById("registroForm").reset();
  }).catch((error) => {
    console.error("Error al registrar: ", error);
  });
});

// MOSTRAR USUARIOS REGISTRADOS EN LA TABLA
function mostrarUsuarios() {
  const tbody = document.querySelector("#tablaUsuarios tbody");
  tbody.innerHTML = "";

  db.collection("usuarios").orderBy("timestamp", "desc").get().then((querySnapshot) => {
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const fila = document.createElement("tr");
      fila.innerHTML = `
        <td>${data.nombre}</td>
        <td>${data.nit}</td>
        <td>${data.direccion}</td>
        <td>${data.sector}</td>
        <td>${data.telefono}</td>
        <td>${data.correo}</td>
      `;
      tbody.appendChild(fila);
    });
  });
}
mostrarUsuarios();

// ===============================
// RASTREO DE UBICACIÓN EN TIEMPO REAL
let watchId = null;
let map;
let marker;
let rutaCoords = [];
let polyline;
let recicladorNombre = "";

function activarUbicacion() {
  recicladorNombre = document.getElementById("nombreReciclador").value.trim();
  if (!recicladorNombre) {
    alert("Ingresa el nombre o ID del reciclador.");
    return;
  }

  if (navigator.geolocation) {
    watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const coords = { lat: latitude, lng: longitude };
        rutaCoords.push(coords);

        // Mostrar en el mapa
        if (!map) {
          map = new google.maps.Map(document.getElementById("map"), {
            zoom: 15,
            center: coords,
          });
        }

        if (marker) marker.setMap(null);
        marker = new google.maps.Marker({ position: coords, map });

        if (polyline) polyline.setMap(null);
        polyline = new google.maps.Polyline({
          path: rutaCoords,
          geodesic: true,
          strokeColor: "#1E90FF",
          strokeOpacity: 1.0,
          strokeWeight: 4,
        });
        polyline.setMap(map);

        // Guardar ubicación en Firebase
        db.collection("trayectorias").add({
          nombre: recicladorNombre,
          latitud: latitude,
          longitud: longitude,
          timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
      },
      (error) => console.error("Error de geolocalización:", error),
      { enableHighAccuracy: true }
    );
  } else {
    alert("La geolocalización no está soportada por este navegador.");
  }
}

function detenerUbicacion() {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    alert("Seguimiento detenido.");
  }
}

// CAMBIO DE ESTADO DEL SERVICIO
function cambiarEstado(estado) {
  const reciclador = document.getElementById("nombreReciclador").value.trim();
  if (!reciclador) {
    alert("Escribe el nombre del reciclador.");
    return;
  }

  db.collection("estados").add({
    reciclador,
    estado,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  }).then(() => {
    alert(`Estado actualizado a: ${estado}`);
  });
}

// VISUALIZACIÓN DE RUTAS
function mostrarTrayectoria(nombreReciclador) {
  if (!nombreReciclador) {
    alert("Ingresa el nombre del reciclador.");
    return;
  }

  db.collection("trayectorias")
    .where("nombre", "==", nombreReciclador)
    .orderBy("timestamp")
    .get()
    .then((querySnapshot) => {
      const puntos = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        puntos.push({ lat: data.latitud, lng: data.longitud });
      });

      if (puntos.length > 0) {
        const map = new google.maps.Map(document.getElementById("map"), {
          zoom: 15,
          center: puntos[0],
        });

        new google.maps.Polyline({
          path: puntos,
          geodesic: true,
          strokeColor: "#32CD32",
          strokeOpacity: 1.0,
          strokeWeight: 4,
          map,
        });
      } else {
        alert("No hay datos para este reciclador.");
      }
    });
}

function mostrarTodasTrayectorias() {
  db.collection("trayectorias")
    .orderBy("timestamp")
    .get()
    .then((querySnapshot) => {
      const rutas = {};
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (!rutas[data.nombre]) rutas[data.nombre] = [];
        rutas[data.nombre].push({ lat: data.latitud, lng: data.longitud });
      });

      const map = new google.maps.Map(document.getElementById("map"), {
        zoom: 6,
        center: { lat: 4.570868, lng: -74.297333 },
      });

      Object.keys(rutas).forEach((nombre, i) => {
        new google.maps.Polyline({
          path: rutas[nombre],
          geodesic: true,
          strokeColor: getColor(i),
          strokeOpacity: 1.0,
          strokeWeight: 3,
          map,
        });
      });
    });
}

// Colores distintos por ruta
function getColor(i) {
  const colores = ["#FF0000", "#0000FF", "#008000", "#800080", "#FFA500", "#00CED1"];
  return colores[i % colores.length];
}
