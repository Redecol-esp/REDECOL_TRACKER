// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBEO4kGVuRJbZ9pf4Ruf-V21ZuPLBKl6z0",
  authDomain: "tuprojecto.firebaseapp.com",
  projectId: "tuprojecto",
  storageBucket: "tuprojecto.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdefghij"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let map;
let marker;

function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 7.0652, lng: -73.8511 }, // Barrancabermeja
    zoom: 14,
  });

  marker = new google.maps.Marker({
    map,
    draggable: false,
  });

  if (navigator.geolocation) {
    navigator.geolocation.watchPosition(
      position => {
        const pos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        map.setCenter(pos);
        marker.setPosition(pos);
        obtenerDireccion(pos);
      },
      () => alert("No se pudo obtener la ubicación.")
    );
  } else {
    alert("Tu navegador no soporta geolocalización.");
  }
}

function obtenerDireccion(pos) {
  const geocoderURL = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${pos.lat},${pos.lng}&key=AIzaSyBEO4kGVuRJbZ9pf4Ruf-V21ZuPLBKl6z0`;
  fetch(geocoderURL)
    .then(res => res.json())
    .then(data => {
      const direccion = data.results[0]?.formatted_address || "Dirección no encontrada";
      document.getElementById("direccion").value = direccion;
    })
    .catch(err => console.error("Error al obtener la dirección:", err));
}

document.getElementById("registroForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const reciclador = {
    nombre: document.getElementById("nombre").value,
    nit: document.getElementById("nit").value,
    direccion: document.getElementById("direccion").value,
    sector: document.getElementById("sector").value,
    telefono: document.getElementById("telefono").value,
    correo: document.getElementById("correo").value,
    latitud: marker.getPosition().lat(),
    longitud: marker.getPosition().lng(),
    fecha: new Date()
  };

  db.collection("recicladores").add(reciclador)
    .then(() => {
      alert("Reciclador registrado con éxito.");
      document.getElementById("registroForm").reset();
    })
    .catch(error => {
      console.error("Error al guardar:", error);
      alert("Error al registrar.");
    });
});
