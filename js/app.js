const search = document.querySelector(".input-container span");
const loader = document.querySelector("#loader");

const form = document.querySelector("form");
const locationContainer = document.querySelector(".location-container");
const inputField = document.querySelector(".input-container input"); // Dodano za pristup inputu

const ipP = document.getElementById("ipP");
const ispP = document.getElementById("ispP");
const countryP = document.getElementById("countryP");
const localP = document.getElementById("localP");

// Postavite minimalni i maksimalni nivo zumiranja
const minZoomLevel = 2;
const maxZoomLevel = 18;

// Postavite granice za mapu
const bounds = L.latLngBounds(
  L.latLng(-90, -180),  // Donji levi ugao
  L.latLng(90, 180)     // Gornji desni ugao
);

const map = L.map("map", {
  minZoom: minZoomLevel,
  maxZoom: maxZoomLevel,
  maxBounds: bounds,       // Postavite granice za mapu
  maxBoundsViscosity: 1.0  // Omogućava automatsko vraćanje mape u granice
}).setView([0, 0], minZoomLevel);
let marker;

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

// Prilagodite ponašanje mape kada se pokušava pomeriti van granica
map.on('drag', function() {
  map.setView(map.getCenter());  // Održava mapu u centru kad se pokuša prevazići granice
});

async function trackIp() {
  const apiKey = "at_XUqYZhpTeJ3vZhs72WSjsHci36Rwr";
  let query = inputField.value.trim(); // Uklonite razmake sa početka i kraja

  if (query === "") {
    throw new Error("Error: IP Adresa nije upisana.");
  }

  // Uklonite "http://" ili "https://" iz unosa i ekstraktujte samo domenu
  try {
    const url = new URL(query);
    query = url.hostname;
  } catch (error) {
    if (query.startsWith("http://")) {
      query = query.slice(7).split('/')[0];
    } else if (query.startsWith("https://")) {
      query = query.slice(8).split('/')[0];
    } else {
      query = query.split('/')[0];
    }
  }

  const apiUrl = `https://geo.ipify.org/api/v1/?apiKey=${apiKey}&domain=${query}`;

  try {
    const result = await fetch(apiUrl);
    const json = await result.json();

    if (json.code === 422) {
      throw new Error("Error: IP Adresa / domena nije točna.");
    }

    // Provjeri da li json.location postoji i ima potrebne podatke
    if (!json.location || !json.location.lat || !json.location.lng) {
      throw new Error("Error: Nema podataka za ovu IP adresu / domenu.");
    }

    return json;
  } catch (error) {
    throw new Error(`Greška prilikom pristupa API-ju: ${error.message}`);
  }
}

// Implementacija ograničenja broja zahtjeva
let requestQueue = [];

function isRateLimited() {
  const now = Date.now();
  const windowTime = 60000; // 1 minuta
  const maxRequests = 10;

  // Ukloni stare zahtjeve koji su izvan prozora
  requestQueue = requestQueue.filter(timestamp => now - timestamp < windowTime);

  if (requestQueue.length >= maxRequests) {
    const oldestRequest = requestQueue[0];
    const timeUntilReset = windowTime - (now - oldestRequest);
    return timeUntilReset;
  } else {
    requestQueue.push(now);
    return false;
  }
}

async function handler(e) {
  e.preventDefault();

  const rateLimit = isRateLimited();
  if (rateLimit !== false) {
    const secondsLeft = Math.ceil(rateLimit / 1000);
    alert(`Previše zahtjeva! Molimo pričekajte ${secondsLeft} sekundi prije nego što ponovno pokušate.`);
    return;
  }

  loader.classList.add("active");

  try {
    const json = await trackIp();

    if (json.location) {
      ipP.innerText = json.ip;
      ispP.innerText = json.isp;
      countryP.innerText = `${json.location.country}`;
      localP.innerText = `${json.location.city}, ${json.location.region}`;

      locationContainer.classList.add("active");

      const geoLocation = [json.location.lat, json.location.lng];
      map.setView(geoLocation, Math.min(maxZoomLevel, 13)); // Postavite nivo zumiranja na maksimalni nivo

      // Ukloni prethodni marker ako postoji
      if (marker) map.removeLayer(marker);
      
      // Dodaj novi marker
      marker = L.marker(geoLocation).addTo(map);
    } else {
      throw new Error("Error: Ne mogu prikazati podatke o lokaciji.");
    }
  } catch (error) {
    alert(error.message);

    // Ukloni marker ako postoji
    if (marker) {
      map.removeLayer(marker);
      marker = null;
    }

    // Postavi mapu na početni položaj
    map.setView([0, 0], minZoomLevel);

    // Ukloni locationContainer
    locationContainer.classList.remove("active");
    
    // Očisti input polje
    inputField.value = '';
  } finally {
    loader.classList.remove("active");
  }
}

search.addEventListener("click", handler);
form.addEventListener("submit", handler);
