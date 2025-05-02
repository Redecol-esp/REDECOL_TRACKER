
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

      // 🔥 Guardar trayectoria en Firebase
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

function mostrarTrayectoria(nombre) {
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
  alert("En esta versión sólo se puede mostrar una trayectoria a la vez.");
}

function cambiarEstado(estado) {
  alert(`Estado del reciclador cambiado a: ${estado}`);
}
