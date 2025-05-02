let map;
let marcadorReciclador;
let rutaReciclador = [];
let trayectoriaPolyline;
let seguimientoActivo = false;
let watchID;

function initMap() {
  const ubicacionInicial = { lat: 4.570868, lng: -74.297333 }; // Centro Colombia
  map = new google.maps.Map(document.getElementById("map"), {
    center: ubicacionInicial,
    zoom: 13,
  });

  marcadorReciclador = new google.maps.Marker({
    position: ubicacionInicial,
    map,
    title: "Reciclador",
    icon: "https://maps.google.com/mapfiles/ms/icons/green-dot.png"
  });

  trayectoriaPolyline = new google.maps.Polyline({
    path: [],
    geodesic: true,
    strokeColor: "#2196f3",
    strokeOpacity: 1.0,
    strokeWeight: 4,
    map: map,
  });
}

function activarUbicacion() {
  if (!navigator.geolocation) {
    alert("Tu navegador no soporta geolocalización.");
    return;
  }

  seguimientoActivo = true;

  watchID = navigator.geolocation.watchPosition(
    (pos) => {
      const nuevaUbicacion = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      };

      rutaReciclador.push(nuevaUbicacion);
      marcadorReciclador.setPosition(nuevaUbicacion);
      map.setCenter(nuevaUbicacion);

      trayectoriaPolyline.setPath(rutaReciclador);
    },
    (err) => {
      console.error("Error al obtener la ubicación:", err);
      alert("No se pudo obtener la ubicación.");
    },
    { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
  );
}

function detenerUbicacion() {
  if (watchID) {
    navigator.geolocation.clearWatch(watchID);
    seguimientoActivo = false;
    alert("Seguimiento detenido.");
  }
}

function cargarRuta() {
  if (!rutaReciclador.length) {
    alert("No hay ruta registrada aún.");
    return;
  }

  map.fitBounds(new google.maps.LatLngBounds(...rutaReciclador.map(p => new google.maps.LatLng(p.lat, p.lng))));
}

function mostrarTrayectoria(nombre) {
  if (!rutaReciclador.length) {
    alert("No hay trayectoria registrada para este reciclador.");
    return;
  }

  const polilínea = new google.maps.Polyline({
    path: rutaReciclador,
    geodesic: true,
    strokeColor: "#f44336",
    strokeOpacity: 1.0,
    strokeWeight: 3,
    map: map,
  });

  map.fitBounds(new google.maps.LatLngBounds(...rutaReciclador.map(p => new google.maps.LatLng(p.lat, p.lng))));
}

function mostrarTodasTrayectorias() {
  mostrarTrayectoria("todos"); // En esta versión solo hay una trayectoria por dispositivo
}

function cambiarEstado(estado) {
  alert(`Estado del reciclador cambiado a: ${estado}`);
}
