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

function showAlert(title, text, icon) {
  return Swal.fire({
      icon: icon,
      title: title,
      text: text,
      showConfirmButton: false,
      timer: 2400,
  });
}

// Function to get country name from ISO code
function getCountryName(countryCode) {
  return countryNames[countryCode] || countryCode; // Fallback to the code if not found
}

async function trackIp() {
  const apiKey = "at_Gg6ZYmeKv4zC87nPwanATi8uow1M9";
  let query = inputField.value.trim(); // Uklonite razmake sa početka i kraja

  if (query === "") {
    showAlert('Oops!', 'The IP address / domain is not entered.', 'error')
    return;
  }

  addRequestToQueue();

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
      showAlert('Oops!', 'The IP address/domain is incorrect.', 'error')
    }

    // Provjeri da li json.location postoji i ima potrebne podatke
    if (!json.location || !json.location.lat || !json.location.lng) {
      showAlert('Oops!', 'No data available for this IP address/domain.', 'error')
    }

    return json;
  } catch (error) {
    showAlert('Oops!', 'Error accessing the API.', 'error')
  }
}

let requestQueue = [];

function isRateLimited() {
  const now = Date.now();
  const windowTime = 60000; // 1 minute window
  const maxRequests = 10;

  // Remove timestamps that are older than the window
  requestQueue = requestQueue.filter(timestamp => now - timestamp < windowTime);

  // Check if the number of requests exceeds the limit
  if (requestQueue.length >= maxRequests) {
    const oldestRequest = requestQueue[0];
    const timeUntilReset = windowTime - (now - oldestRequest); // Time left for rate limit reset
    return timeUntilReset;
  }

  return false;
}

function addRequestToQueue() {
  requestQueue.push(Date.now());
}

async function handler(e) {
  e.preventDefault();

  const rateLimit = isRateLimited();
  if (rateLimit !== false) {
    const secondsLeft = Math.ceil(rateLimit / 1000);
    showAlert('Oops!', `Too many requests! Please wait ${secondsLeft} seconds before trying again.`, 'error')
    return;
  }

  loader.classList.add("active");

  try {
    const json = await trackIp();

    if (json.location) {
      ipP.innerText = json.ip;
      ispP.innerText = json.isp;

      const countryCode = json.location.country;
      const fullCountryName = getCountryName(countryCode);
      countryP.innerText = `${fullCountryName}`;
      //countryP.innerText = `${json.location.country}`;

      localP.innerText = `${json.location.city}, ${json.location.region}`;



      locationContainer.classList.add("active");

      const geoLocation = [json.location.lat, json.location.lng];
      map.setView(geoLocation, Math.min(maxZoomLevel, 13)); // Postavite nivo zumiranja na maksimalni nivo

      // Ukloni prethodni marker ako postoji
      if (marker) map.removeLayer(marker);
      
      // Dodaj novi marker
      marker = L.marker(geoLocation).addTo(map);
    } else {
      showAlert('Oops!', 'Unable to display location data.', 'error')
    }
  } catch (error) {
    // alert(error.message);

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
