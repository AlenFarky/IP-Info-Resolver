const search = document.querySelector(".input-container span");
const loader = document.querySelector("#loader");

const form = document.querySelector("form");
const locationContainer = document.querySelector(".location-container");
const inputField = document.querySelector(".input-container input");

const ipP = document.getElementById("ipP");
const ispP = document.getElementById("ispP");
const countryP = document.getElementById("countryP");
const localP = document.getElementById("localP");

// Set map limits
const minZoomLevel = 2;
const maxZoomLevel = 18;
const bounds = L.latLngBounds(
  L.latLng(-90, -180),
  L.latLng(90, 180)
);

const map = L.map("map", {
  minZoom: minZoomLevel,
  maxZoom: maxZoomLevel,
  maxBounds: bounds,
  maxBoundsViscosity: 1.0
}).setView([0, 0], minZoomLevel);
let marker;

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

map.on('drag', function() {
  map.setView(map.getCenter());
});

// Function to show alert messages
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
  return countryNames[countryCode] || countryCode;
}

// Function to generate country flag HTML
function displayCountryFlag(countryCode, countryName) {
  if (!countryCode) return countryName; // Fallback to only name if no code
  let flagClass = `flag-icon flag-icon-${countryCode.toLowerCase()}`;
  return `<span class="${flagClass}"></span> ${countryName}`;
}

// Get the submit button
const submitButton = form.querySelector("button[type='submit']");

// Disable button initially
submitButton.classList.add("disabled");
submitButton.setAttribute("disabled", true);

// Enable button when CAPTCHA is solved
window.turnstileCallback = function () {
  console.log("CAPTCHA Verified!");

  // Remove disabled state
  submitButton.classList.remove("disabled");
  submitButton.removeAttribute("disabled");
};

// Function to handle form submission
async function handler(e) {
  e.preventDefault();

  // Disable button to prevent multiple submissions
  submitButton.classList.add("disabled");
  submitButton.setAttribute("disabled", true);

  loader.classList.add("active");

  const formData = new FormData(form);
  const captchaToken = formData.get("cf-turnstile-response");

  if (!captchaToken) {
    showAlert('Oops!', 'Please wait few moments for CAPTCHA to validate you.', 'error');
    loader.classList.remove("active");
    submitButton.classList.remove("disabled");
    submitButton.removeAttribute("disabled");
    return;
  }

  const query = inputField.value.trim();
  if (query === "") {
    showAlert('Oops!', 'The IP address/domain is not entered.', 'error');
    loader.classList.remove("active");
    submitButton.classList.remove("disabled");
    submitButton.removeAttribute("disabled");
    return;
  }

  console.log('Sending data to server...');
  console.log('CAPTCHA Token:', captchaToken);
  console.log('Query:', query);

  try {
    const response = await fetch("https://captcha.farky.xyz/verify-ip", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        query: query,
        "cf-turnstile-response": captchaToken
      })
    });

    const result = await response.json();
    console.log("Server Response:", result);

    if (result.alert) {
      showAlert(result.alert.title, result.alert.text, result.alert.icon);
    }

    if (result.data) {
      ipP.innerText = result.data.ip?.trim() !== "" ? result.data.ip : "N/A";
      ispP.innerText = result.data.isp?.trim() !== "" ? result.data.isp : "N/A";

      if (result.data?.country && result.data.country.trim() !== "") {
        const countryCode = result.data.country;
        const fullCountryName = getCountryName(countryCode);
        countryP.innerHTML = displayCountryFlag(countryCode, fullCountryName);
      } else {
        countryP.innerText = "N/A";
      }

      if (
        result.data?.city && result.data.city.trim() !== "" &&
        result.data?.region && result.data.region.trim() !== ""
      ) {
        localP.innerText = `${result.data.city}, ${result.data.region}`;
      } else {
        localP.innerText = "N/A";
      }

      locationContainer.classList.add("active");

      if (result.data?.lat && result.data?.lng) {
        const geoLocation = [result.data.lat, result.data.lng];
        map.setView(geoLocation, Math.min(maxZoomLevel, 13));

        if (marker) map.removeLayer(marker);
        marker = L.marker(geoLocation).addTo(map);
      }
    } else {
      console.warn("Result data is missing or undefined.");
      showAlert('Oops!', 'Invalid response from server. Please try again.', 'error');
    }

  } catch (error) {
    console.error("Error submitting form:", error);
    showAlert('Oops!', 'Error processing your request. Please try again later.', 'error');
  } finally {
    // Reset CAPTCHA & disable button
    if (typeof turnstile !== 'undefined') {
      turnstile.reset();
    }
    loader.classList.remove("active");
    submitButton.classList.add("disabled");
    submitButton.setAttribute("disabled", true);
  }
}

// Attach event listeners
search.addEventListener("click", handler);
form.addEventListener("submit", handler);
