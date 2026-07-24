// ==========================================
// Premium Weather Dashboard JavaScript Core
// ==========================================

// 1. API Configuration
const apiKey = "3ab3f0bc0835380f4d39c799a5c770cd"; 
const apiBaseUrl = "https://api.openweathermap.org/data/2.5/weather?units=metric";

// 2. Select HTML Elements
const cityInput = document.getElementById("city-input");
const searchBtn = document.getElementById("search-btn");
const locationBtn = document.getElementById("location-btn");
const unitToggle = document.getElementById("unit-toggle");

const cityName = document.getElementById("city-name");
const currentDate = document.getElementById("current-date");
const weatherDescription = document.getElementById("weather-description");
const temperature = document.getElementById("temperature");
const weatherIconContainer = document.getElementById("weather-icon-container");

const feelsLike = document.getElementById("feels-like");
const tempMinMax = document.getElementById("temp-minmax");
const humidity = document.getElementById("humidity");
const windSpeed = document.getElementById("wind-speed");
const pressure = document.getElementById("pressure");
const visibility = document.getElementById("visibility");

const suggestionsDropdown = document.getElementById("suggestions-dropdown");
const historyTags = document.getElementById("history-tags");
const clearHistoryBtn = document.getElementById("clear-history-btn");

const errorMessageCard = document.getElementById("error-message");
const closeErrorBtn = document.getElementById("close-error-btn");

// Weather overlay container
const weatherOverlay = document.getElementById("weather-overlay");

// Modal Overlay & Card selectors
const detailsModal = document.getElementById("details-modal");
const modalCloseBtn = document.getElementById("modal-close-btn");
const modalBody = document.getElementById("modal-body");

const humidityCard = document.getElementById("humidity-card");
const windCard = document.getElementById("wind-card");
const pressureCard = document.getElementById("pressure-card");
const aqiCard = document.getElementById("aqi-card");

// 3. Application State
let currentWeatherData = null;
let currentAqiData = null;
let currentForecastData = null;
let currentUnit = localStorage.getItem("weatherUnit") || "C";
let searchHistory = JSON.parse(localStorage.getItem("searchHistory")) || ["Navi Mumbai"];

// Pre-configured popular global cities for autocomplete
const popularCities = [
  "New York", "London", "Tokyo", "Paris", "Sydney", 
  "Mumbai", "Delhi", "Navi Mumbai", "Dubai", "Singapore", 
  "Berlin", "Toronto", "Chicago", "Los Angeles", "Rome"
];

// Highlighted index for suggestion key navigation
let activeSuggestionIndex = -1;

// 4. Initialize Application
window.addEventListener("DOMContentLoaded", () => {
  // Sync toggle checkbox state
  unitToggle.checked = (currentUnit === "F");
  
  // Render search history tags
  renderHistoryTags();
  
  // Close buttons setup
  closeErrorBtn.addEventListener("click", hideError);
  document.getElementById("close-alert-btn").addEventListener("click", () => {
    document.getElementById("alert-banner").classList.add("hidden");
  });
  
  // Modal Close Listeners
  modalCloseBtn.addEventListener("click", closeModal);
  detailsModal.addEventListener("click", (e) => {
    if (e.target === detailsModal) {
      closeModal();
    }
  });

  // Modal Open Listeners
  humidityCard.addEventListener("click", () => openDetailModal("humidity"));
  windCard.addEventListener("click", () => openDetailModal("wind"));
  pressureCard.addEventListener("click", () => openDetailModal("pressure"));
  aqiCard.addEventListener("click", () => openDetailModal("aqi"));
  
  // Fetch initial weather
  const initialCity = searchHistory.length > 0 ? searchHistory[0] : "Navi Mumbai";
  checkWeather(initialCity);
  
  // Initialize Lucide Icons
  if (typeof lucide !== "undefined") {
    lucide.createIcons();
  }
});

// 5. Autocomplete / Suggestions System

// Render suggestions list in UI
function showSuggestions(query) {
  const cleanQuery = query.toLowerCase().trim();
  suggestionsDropdown.innerHTML = "";
  activeSuggestionIndex = -1;

  if (cleanQuery === "") {
    if (searchHistory.length === 0) {
      suggestionsDropdown.classList.add("hidden");
      return;
    }
    
    searchHistory.forEach(city => {
      const div = createSuggestionItem(city, "history");
      suggestionsDropdown.appendChild(div);
    });
  } else {
    const allMatches = new Set();
    
    // Check history matches first
    searchHistory.forEach(city => {
      if (city.toLowerCase().includes(cleanQuery)) {
        allMatches.add(city);
      }
    });
    
    // Check popular cities matches
    popularCities.forEach(city => {
      if (city.toLowerCase().includes(cleanQuery)) {
        allMatches.add(city);
      }
    });

    if (allMatches.size === 0) {
      suggestionsDropdown.classList.add("hidden");
      return;
    }

    allMatches.forEach(city => {
      const type = searchHistory.includes(city) ? "history" : "map-pin";
      const div = createSuggestionItem(city, type);
      suggestionsDropdown.appendChild(div);
    });
  }

  suggestionsDropdown.classList.remove("hidden");
  if (typeof lucide !== "undefined") {
    lucide.createIcons();
  }
}

// Create a single autocomplete item node
function createSuggestionItem(city, iconType) {
  const div = document.createElement("div");
  div.className = "suggestion-item";
  div.innerHTML = `
    <i data-lucide="${iconType}" class="suggestion-icon"></i>
    <span>${city}</span>
  `;
  
  // Use mousedown instead of click to prevent input blur from firing first
  div.addEventListener("mousedown", (e) => {
    e.preventDefault(); 
    cityInput.value = city;
    suggestionsDropdown.classList.add("hidden");
    checkWeather(city);
  });

  return div;
}

// Keyboard Navigation for Suggestions List
cityInput.addEventListener("keydown", (e) => {
  const items = suggestionsDropdown.querySelectorAll(".suggestion-item");
  if (suggestionsDropdown.classList.contains("hidden") || items.length === 0) {
    return;
  }

  if (e.key === "ArrowDown") {
    e.preventDefault();
    activeSuggestionIndex = (activeSuggestionIndex + 1) % items.length;
    updateActiveSuggestion(items);
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    activeSuggestionIndex = (activeSuggestionIndex - 1 + items.length) % items.length;
    updateActiveSuggestion(items);
  } else if (e.key === "Enter") {
    if (activeSuggestionIndex >= 0 && activeSuggestionIndex < items.length) {
      e.preventDefault();
      const selectedCity = items[activeSuggestionIndex].querySelector("span").textContent;
      cityInput.value = selectedCity;
      suggestionsDropdown.classList.add("hidden");
      checkWeather(selectedCity);
    }
  } else if (e.key === "Escape") {
    suggestionsDropdown.classList.add("hidden");
  }
});

// Update visual active styling for arrow keys navigation
function updateActiveSuggestion(items) {
  items.forEach((item, index) => {
    if (index === activeSuggestionIndex) {
      item.classList.add("active");
      item.scrollIntoView({ block: "nearest" });
    } else {
      item.classList.remove("active");
    }
  });
}

// Suggestion event listeners
cityInput.addEventListener("input", (e) => showSuggestions(e.target.value));
cityInput.addEventListener("focus", (e) => showSuggestions(e.target.value));
cityInput.addEventListener("blur", () => {
  setTimeout(() => {
    suggestionsDropdown.classList.add("hidden");
  }, 180);
});

// 6. Search History (LocalStorage) Management

function saveSearch(city) {
  if (!city) return;
  const formattedCity = city.trim();
  
  // Remove duplicates case-insensitively
  searchHistory = searchHistory.filter(item => item.toLowerCase() !== formattedCity.toLowerCase());
  
  // Add to front of history list
  searchHistory.unshift(formattedCity);
  
  if (searchHistory.length > 8) {
    searchHistory.pop();
  }
  
  localStorage.setItem("searchHistory", JSON.stringify(searchHistory));
  renderHistoryTags();
}

function renderHistoryTags() {
  historyTags.innerHTML = "";
  
  if (searchHistory.length === 0) {
    clearHistoryBtn.classList.add("hidden");
    return;
  }
  
  clearHistoryBtn.classList.remove("hidden");
  
  searchHistory.forEach(city => {
    const tag = document.createElement("span");
    tag.className = "history-tag";
    tag.innerHTML = `${city}`;
    
    tag.addEventListener("click", () => {
      cityInput.value = city;
      checkWeather(city);
    });
    
    historyTags.appendChild(tag);
  });
}

clearHistoryBtn.addEventListener("click", () => {
  searchHistory = [];
  localStorage.removeItem("searchHistory");
  renderHistoryTags();
});

// 7. Weather Fetching Service with Subqueries

async function checkWeather(city) {
  hideError();
  const url = `${apiBaseUrl}&q=${encodeURIComponent(city)}&appid=${apiKey}`;
  await fetchWeatherData(url);
}

async function checkWeatherByCoords(lat, lon) {
  hideError();
  const url = `${apiBaseUrl}&lat=${lat}&lon=${lon}&appid=${apiKey}`;
  await fetchWeatherData(url);
}

async function fetchWeatherData(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      showError();
      return;
    }
    
    const data = await response.json();
    currentWeatherData = data;
    
    // Save to local storage history tags
    saveSearch(data.name);
    
    // Fetch parallel subqueries for AQI and Forecast using resolved coords
    const lat = data.coord.lat;
    const lon = data.coord.lon;
    
    await Promise.all([
      fetchAqiData(lat, lon),
      fetchForecastData(lat, lon)
    ]).catch(err => {
      console.error("Subquery parallel fetch failed:", err);
    });

    // Render final states
    renderWeather();
    
    // If details modal is open, refresh its content in case unit changed
    if (!detailsModal.classList.contains("hidden")) {
      refreshModalContent();
    }
  } catch (error) {
    console.error("Error fetching data:", error);
    showError("Network connection error. Please try again later.");
  }
}

// Fetch Air Quality Index Data
async function fetchAqiData(lat, lon) {
  try {
    const url = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`;
    const response = await fetch(url);
    if (response.ok) {
      currentAqiData = await response.json();
    } else {
      currentAqiData = null;
    }
  } catch (error) {
    console.error("AQI fetch failed:", error);
    currentAqiData = null;
  }
}

// Fetch Forecast Data
async function fetchForecastData(lat, lon) {
  try {
    const url = `https://api.openweathermap.org/data/2.5/forecast?units=metric&lat=${lat}&lon=${lon}&appid=${apiKey}`;
    const response = await fetch(url);
    if (response.ok) {
      currentForecastData = await response.json();
    } else {
      currentForecastData = null;
    }
  } catch (error) {
    console.error("Forecast fetch failed:", error);
    currentForecastData = null;
  }
}

// 8. Render Dynamic Weather Dashboard

function renderWeather() {
  if (!currentWeatherData) return;
  const data = currentWeatherData;
  
  // Render Text Stats
  cityName.textContent = `${data.name}, ${data.sys.country}`;
  currentDate.textContent = formatDate();
  weatherDescription.textContent = data.weather[0].description;
  
  // Temperature Unit Values Calculations
  const isCelsius = (currentUnit === "C");
  const tempCelsius = data.main.temp;
  const feelsLikeCelsius = data.main.feels_like;
  const minCelsius = data.main.temp_min;
  const maxCelsius = data.main.temp_max;
  
  // Apply Unit Conversions
  const dispTemp = isCelsius ? Math.round(tempCelsius) : Math.round(tempCelsius * 9/5 + 32);
  const dispFeels = isCelsius ? Math.round(feelsLikeCelsius) : Math.round(feelsLikeCelsius * 9/5 + 32);
  const dispMin = isCelsius ? Math.round(minCelsius) : Math.round(minCelsius * 9/5 + 32);
  const dispMax = isCelsius ? Math.round(maxCelsius) : Math.round(maxCelsius * 9/5 + 32);
  
  temperature.textContent = dispTemp;
  feelsLike.textContent = `${dispFeels}°`;
  tempMinMax.textContent = `${dispMin}° / ${dispMax}°`;
  
  // Standard non-temperature metrics
  humidity.textContent = `${data.main.humidity}%`;
  pressure.textContent = `${data.main.pressure} hPa`;
  
  // Wind Speed formatting (m/s to km/h or mph)
  if (isCelsius) {
    const speedKmh = Math.round(data.wind.speed * 3.6);
    windSpeed.textContent = `${speedKmh} km/h`;
  } else {
    const speedMph = Math.round(data.wind.speed * 2.237);
    windSpeed.textContent = `${speedMph} mph`;
  }
  
  // Visibility formatting (meters to km or miles)
  const visibilityVal = data.visibility || 10000;
  if (isCelsius) {
    const visibilityKm = (visibilityVal / 1000).toFixed(1);
    visibility.textContent = `${visibilityKm} km`;
  } else {
    const visibilityMi = (visibilityVal / 1609.34).toFixed(1);
    visibility.textContent = `${visibilityMi} mi`;
  }
  
  // Update Dynamic Icons based on weather conditions code and day/night status
  const iconCode = data.weather[0].icon;
  const weatherId = data.weather[0].id;
  const iconName = getWeatherIconName(weatherId, iconCode);
  
  weatherIconContainer.innerHTML = `<i data-lucide="${iconName}" class="main-weather-icon animate-float"></i>`;
  
  // Update Background gradient theme on body
  updateTheme(weatherId, iconCode);

  // Set up live overlay particle animations
  setWeatherOverlay(weatherId, iconCode);

  // Check and display Severe Weather Alerts
  renderSevereAlerts();

  // Render Air Quality Index
  renderAqi();

  // Render Hourly SVG Forecast Chart
  renderForecastChart();

  // Render Sunrise Sunset Progress Arc
  renderSunriseSunset();
  
  // Re-run Lucide parser to draw inline SVGs
  if (typeof lucide !== "undefined") {
    lucide.createIcons();
  }
}

// Helper: Get Lucide Icon Key from OpenWeather ID
function getWeatherIconName(id, iconCode) {
  const isNight = iconCode.endsWith("n");
  
  if (id >= 200 && id < 300) return "cloud-lightning";
  if (id >= 300 && id < 400) return "cloud-drizzle";
  if (id >= 500 && id < 600) return "cloud-rain";
  if (id >= 600 && id < 700) return "snowflake";
  if (id >= 700 && id < 800) return "cloud-fog";
  if (id === 800) return isNight ? "moon" : "sun";
  if (id === 801 || id === 802) return isNight ? "cloud-moon" : "cloud-sun";
  return "cloud";
}

// Helper: Apply Body Background Theme Classes
function updateTheme(id, iconCode) {
  const isNight = iconCode.endsWith("n");
  let themeClass = "theme-clear-day";
  
  if (id >= 200 && id < 300) {
    themeClass = "theme-thunderstorm";
  } else if (id >= 300 && id < 600) {
    themeClass = "theme-rain";
  } else if (id >= 600 && id < 700) {
    themeClass = "theme-snow";
  } else if (id >= 700 && id < 800) {
    themeClass = "theme-mist";
  } else if (id === 800) {
    themeClass = isNight ? "theme-clear-night" : "theme-clear-day";
  } else if (id > 800) {
    themeClass = "theme-clouds";
  }
  
  document.body.className = "";
  document.body.classList.add(themeClass);
}

// 9. Live Weather Overlay particle generators
function setWeatherOverlay(id, iconCode) {
  weatherOverlay.innerHTML = "";
  const isNight = iconCode.endsWith("n");
  
  if (id >= 200 && id < 300) {
    generateLightningEffect();
    generateRaindrops(35);
  } else if (id >= 300 && id < 600) {
    generateRaindrops(45);
  } else if (id >= 600 && id < 700) {
    generateSnowflakes(35);
  } else if (id >= 700 && id < 800) {
    generateCloudDrifts(4);
  } else if (id === 800) {
    if (!isNight) {
      generateSunFlare();
    }
  } else if (id > 800) {
    generateCloudDrifts(6);
  }
}

// Generating falling animated raindrops
function generateRaindrops(count) {
  for (let i = 0; i < count; i++) {
    const drop = document.createElement("div");
    drop.className = "raindrop";
    drop.style.left = Math.random() * 100 + "vw";
    drop.style.animationDuration = (Math.random() * 0.5 + 0.7) + "s";
    drop.style.animationDelay = Math.random() * 2 + "s";
    drop.style.opacity = Math.random() * 0.4 + 0.2;
    weatherOverlay.appendChild(drop);
  }
}

// Generating falling snowflake nodes
function generateSnowflakes(count) {
  for (let i = 0; i < count; i++) {
    const flake = document.createElement("div");
    flake.className = "snowflake-element";
    const size = Math.random() * 4 + 2; 
    flake.style.width = size + "px";
    flake.style.height = size + "px";
    flake.style.left = Math.random() * 100 + "vw";
    flake.style.animationDuration = (Math.random() * 3 + 4) + "s";
    flake.style.animationDelay = Math.random() * 5 + "s";
    flake.style.opacity = Math.random() * 0.5 + 0.4;
    weatherOverlay.appendChild(flake);
  }
}

// Generating cloud shapes
function generateCloudDrifts(count) {
  for (let i = 0; i < count; i++) {
    const cloud = document.createElement("div");
    cloud.className = "cloud-drift";
    const width = Math.random() * 180 + 100;
    const height = width * 0.6;
    cloud.style.width = width + "px";
    cloud.style.height = height + "px";
    cloud.style.top = Math.random() * 35 + "%"; 
    cloud.style.animationDuration = (Math.random() * 40 + 45) + "s";
    cloud.style.animationDelay = -(Math.random() * 40) + "s";
    cloud.style.opacity = Math.random() * 0.05 + 0.03;
    weatherOverlay.appendChild(cloud);
  }
}

// Generating lightning flash
function generateLightningEffect() {
  const flash = document.createElement("div");
  flash.className = "storm-lightning";
  weatherOverlay.appendChild(flash);
}

// Generating sun radial glow
function generateSunFlare() {
  const sunGlow = document.createElement("div");
  sunGlow.className = "sun-ray-glow";
  weatherOverlay.appendChild(sunGlow);
}

// 10. Advanced Widget Renderers

// A. Air Quality Index (AQI) Rendering
function renderAqi() {
  const aqiBadge = document.getElementById("aqi-badge");
  const aqiIndicatorDot = document.getElementById("aqi-indicator-dot");
  const aqiRecommendation = document.getElementById("aqi-recommendation");
  
  if (!currentAqiData || !currentAqiData.list || currentAqiData.list.length === 0) {
    return;
  }
  
  const aqiVal = currentAqiData.list[0].main.aqi; // 1 to 5
  
  aqiBadge.className = "aqi-badge";
  aqiBadge.classList.add(`level-${aqiVal}`);
  
  let label = "Good";
  let desc = "Excellent air quality. Great day for outdoor activities.";
  let pct = 10;
  
  switch(aqiVal) {
    case 1:
      label = "Good";
      desc = "Excellent air quality. Great day for outdoor activities.";
      pct = 10;
      break;
    case 2:
      label = "Fair";
      desc = "Very good air quality. Minor sensitivities for some individuals.";
      pct = 32.5;
      break;
    case 3:
      label = "Moderate";
      desc = "Acceptable air quality. Consider reducing heavy outdoor exertion if sensitive.";
      pct = 55;
      break;
    case 4:
      label = "Poor";
      desc = "Poor air quality. Sensitive groups should limit prolonged outdoor exposure.";
      pct = 77.5;
      break;
    case 5:
      label = "Very Poor";
      desc = "Hazardous air quality. Everyone should avoid outdoor activities and close windows.";
      pct = 90;
      break;
  }
  
  aqiBadge.textContent = label;
  aqiRecommendation.textContent = desc;
  aqiIndicatorDot.style.left = `${pct}%`;
}

// B. Hourly Forecast SVG Line Graph Drawing
function renderForecastChart() {
  const forecastAreaPath = document.getElementById("forecast-area-path");
  const forecastLinePath = document.getElementById("forecast-line-path");
  const forecastPointsGroup = document.getElementById("forecast-points-group");
  
  if (!currentForecastData || !currentForecastData.list || currentForecastData.list.length === 0) {
    return;
  }
  
  const isCelsius = (currentUnit === "C");
  const points = currentForecastData.list.slice(0, 8); 
  
  const temps = points.map(item => {
    const c = item.main.temp;
    return isCelsius ? c : (c * 9/5 + 32);
  });
  
  const minTemp = Math.min(...temps);
  const maxTemp = Math.max(...temps);
  const tempRange = maxTemp === minTemp ? 2 : maxTemp - minTemp;
  
  const width = 440;
  const height = 100;
  const paddingLeft = 30;
  const paddingTop = 30;
  
  const coords = points.map((item, index) => {
    const x = paddingLeft + (index * (width / 7));
    const t = temps[index];
    const y = paddingTop + (height - ((t - minTemp) / tempRange) * height);
    const offset = currentWeatherData.timezone;
    const timeStr = formatForecastTime(item.dt, offset);
    
    return { x, y, temp: Math.round(t), timeStr };
  });
  
  let dLine = `M ${coords[0].x} ${coords[0].y}`;
  for (let i = 1; i < coords.length; i++) {
    dLine += ` L ${coords[i].x} ${coords[i].y}`;
  }
  
  let dArea = `M ${coords[0].x} ${coords[0].y}`;
  for (let i = 1; i < coords.length; i++) {
    dArea += ` L ${coords[i].x} ${coords[i].y}`;
  }
  dArea += ` L ${coords[coords.length - 1].x} 130 L ${coords[0].x} 130 Z`;
  
  forecastLinePath.setAttribute("d", dLine);
  forecastAreaPath.setAttribute("d", dArea);
  
  let html = "";
  coords.forEach((pt) => {
    html += `<circle cx="${pt.x}" cy="${pt.y}" r="4" fill="var(--text-primary)" stroke="var(--accent-color)" stroke-width="2" />`;
    html += `<text x="${pt.x}" y="${pt.y - 10}" text-anchor="middle" fill="var(--text-primary)" font-size="11" font-weight="700">${pt.temp}°</text>`;
    html += `<text x="${pt.x}" y="150" text-anchor="middle" fill="var(--text-secondary)" font-size="10" font-weight="500">${pt.timeStr}</text>`;
  });
  
  forecastPointsGroup.innerHTML = html;
}

// C. Sunrise Sunset progress arc plotter
function renderSunriseSunset() {
  const sunElapsedPath = document.getElementById("sun-elapsed-path");
  const sunNode = document.getElementById("sun-node");
  const sunNodeGroup = document.getElementById("sun-node-group");
  const sunriseTimeLabel = document.getElementById("sunrise-time");
  const sunsetTimeLabel = document.getElementById("sunset-time");
  const sunStatusLabel = document.getElementById("sun-status-label");
  
  if (!currentWeatherData) return;
  const data = currentWeatherData;
  
  const sunrise = data.sys.sunrise;
  const sunset = data.sys.sunset;
  const offset = data.timezone;
  
  sunriseTimeLabel.textContent = formatLocalTime(sunrise, offset);
  sunsetTimeLabel.textContent = formatLocalTime(sunset, offset);
  
  const current = Math.floor(Date.now() / 1000);
  
  const X_c = 120;
  const Y_c = 110;
  const R = 100;
  
  let pct = 0;
  let isDay = false;
  
  if (current >= sunrise && current <= sunset) {
    isDay = true;
    pct = (current - sunrise) / (sunset - sunrise);
  } else if (current > sunset) {
    isDay = false;
    pct = 1.0; 
  } else {
    isDay = false;
    pct = 0.0; 
  }
  
  const theta = Math.PI - (pct * Math.PI);
  const X_s = X_c + R * Math.cos(theta);
  const Y_s = Y_c - R * Math.sin(theta);
  
  sunNode.setAttribute("cx", X_s);
  sunNode.setAttribute("cy", Y_s);
  
  const glowRing = sunNodeGroup.querySelector('.animate-ping-sun');
  if (glowRing) {
    glowRing.setAttribute("cx", X_s);
    glowRing.setAttribute("cy", Y_s);
  }
  
  if (pct === 0) {
    sunElapsedPath.setAttribute("d", "");
  } else {
    sunElapsedPath.setAttribute("d", `M 20,110 A 100,100 0 0,1 ${X_s},${Y_s}`);
  }
  
  if (isDay) {
    const secondsLeft = sunset - current;
    const hrs = Math.floor(secondsLeft / 3600);
    const mins = Math.floor((secondsLeft % 3600) / 60);
    sunStatusLabel.textContent = `Sunset in ${hrs}h ${mins}m`;
  } else {
    const nextSunrise = (current > sunset) ? (sunrise + 86400) : sunrise;
    const secondsToSunrise = nextSunrise - current;
    const hrs = Math.floor(secondsToSunrise / 3600);
    const mins = Math.floor((secondsToSunrise % 3600) / 60);
    sunStatusLabel.textContent = `Sunrise in ${hrs}h ${mins}m`;
  }
}

// D. Severe weather alerts checker
function renderSevereAlerts() {
  const data = currentWeatherData;
  const alertBanner = document.getElementById("alert-banner");
  const alertText = document.getElementById("alert-text");
  
  if (!data) return;
  
  let alerts = [];
  
  const windKmh = data.wind.speed * 3.6;
  if (windKmh > 50) {
    alerts.push(`Extreme Wind Alert: Gusts reaching ${Math.round(windKmh)} km/h.`);
  }
  
  const tempC = data.main.temp;
  if (tempC > 40) {
    alerts.push(`Extreme Heat Warning: Temperatures hitting ${Math.round(tempC)}°C.`);
  } else if (tempC < -5) {
    alerts.push(`Extreme Cold Warning: Temperatures drop to ${Math.round(tempC)}°C.`);
  }
  
  const id = data.weather[0].id;
  if (id >= 200 && id < 300) {
    alerts.push(`Severe Storm Advisory: Heavy lighting flashes & high precipitation.`);
  } else if (id === 781) {
    alerts.push(`Tornado Warning: Critical hazard. Seek shelter immediately.`);
  }
  
  if (alerts.length > 0) {
    alertText.textContent = alerts.join(" | ");
    alertBanner.classList.remove("hidden");
  } else {
    alertBanner.classList.add("hidden");
  }
}

// 11. Helper Time Formatters

function formatLocalTime(utcSeconds, timezoneOffset) {
  const date = new Date((utcSeconds + timezoneOffset) * 1000);
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const formattedHours = hours % 12 || 12;
  const formattedMinutes = minutes < 10 ? '0' + minutes : minutes;
  return `${formattedHours}:${formattedMinutes} ${ampm}`;
}

function formatForecastTime(dt, timezoneOffset) {
  const date = new Date((dt + timezoneOffset) * 1000);
  const hours = date.getUTCHours();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const formattedHours = hours % 12 || 12;
  return `${formattedHours} ${ampm}`;
}

function formatDate() {
  const options = { weekday: 'long', month: 'long', day: 'numeric' };
  const today = new Date();
  return today.toLocaleDateString('en-US', options);
}

// 12. Error Notifications Panel

function showError(customText) {
  errorMessageCard.classList.remove("hidden");
  if (customText) {
    errorMessageCard.querySelector("p").textContent = customText;
  } else {
    errorMessageCard.querySelector("p").textContent = "Please check the spelling and try again.";
  }
}

function hideError() {
  errorMessageCard.classList.add("hidden");
}

// 13. Interactive Detail Popups Modal System

let activeModalType = null;

function openDetailModal(type) {
  if (!currentWeatherData) return;
  activeModalType = type;
  refreshModalContent();
  detailsModal.classList.remove("hidden");
}

function closeModal() {
  detailsModal.classList.add("hidden");
  activeModalType = null;
}

// Redraws the modal inner HTML based on state variables (called on open or unit toggling)
function refreshModalContent() {
  if (!activeModalType || !currentWeatherData) return;
  
  let content = "";
  switch(activeModalType) {
    case "humidity":
      content = generateHumidityModalContent();
      break;
    case "wind":
      content = generateWindModalContent();
      break;
    case "pressure":
      content = generatePressureModalContent();
      break;
    case "aqi":
      content = generateAqiModalContent();
      break;
  }
  
  modalBody.innerHTML = content;
  
  if (typeof lucide !== "undefined") {
    lucide.createIcons();
  }
}

// A. Humidity popup deep-dive markup
function generateHumidityModalContent() {
  const tempC = currentWeatherData.main.temp;
  const hum = currentWeatherData.main.humidity;
  
  // Calculate Dew Point using Magnus-Tetens
  const a = 17.27;
  const b = 237.7;
  const alpha = ((a * tempC) / (b + tempC)) + Math.log(hum / 100);
  const dewPointC = (b * alpha) / (a - alpha);
  
  // Apply units conversion
  const isCelsius = (currentUnit === "C");
  const dispDewPoint = isCelsius ? Math.round(dewPointC) : Math.round(dewPointC * 9/5 + 32);
  const unitStr = isCelsius ? "°C" : "°F";
  
  // Comfort rating based on dew point comfort limits
  let comfortLabel = "Pleasant";
  let comfortClass = "";
  if (dewPointC < 10) {
    comfortLabel = "Dry & Fresh";
  } else if (dewPointC < 16) {
    comfortLabel = "Comfortable / Pleasant";
  } else if (dewPointC < 21) {
    comfortLabel = "Sticky / Humid";
    comfortClass = "comfort-sticky";
  } else {
    comfortLabel = "Oppressive / Uncomfortable";
    comfortClass = "comfort-oppressive";
  }
  
  // Absolute moisture approximation (grams of water vapor per m3 of air)
  const absoluteHum = (6.112 * Math.exp((17.67 * tempC) / (243.5 + tempC)) * hum * 2.1674) / (273.15 + tempC);
  
  return `
    <div class="modal-title">
      <i data-lucide="droplets" class="color-humidity"></i>
      <span>Humidity Deep-Dive</span>
    </div>
    <div class="humidity-details-wrapper">
      <div class="humidity-metrics-grid">
        <div class="humidity-subcard">
          <span class="humidity-subval">${hum}%</span>
          <span class="humidity-sublabel">Relative Humidity</span>
        </div>
        <div class="humidity-subcard">
          <span class="humidity-subval">${dispDewPoint}${unitStr}</span>
          <span class="humidity-sublabel">Dew Point</span>
        </div>
        <div class="humidity-subcard" style="grid-column: span 2;">
          <span class="humidity-subval">${absoluteHum.toFixed(2)} g/m³</span>
          <span class="humidity-sublabel">Absolute Moisture Level</span>
        </div>
      </div>
      <div class="humidity-comfort-banner ${comfortClass}">
        Comfort Level: ${comfortLabel}
      </div>
    </div>
  `;
}

// B. Wind Speed popup compass markup
function generateWindModalContent() {
  const speed = currentWeatherData.wind.speed; // m/s
  const deg = currentWeatherData.wind.deg || 0;
  const isCelsius = (currentUnit === "C");
  
  // Speed conversions
  const speedVal = isCelsius ? Math.round(speed * 3.6) : Math.round(speed * 2.237);
  const speedUnit = isCelsius ? "km/h" : "mph";
  
  // Wind Gusts
  let gustValStr = "N/A";
  if (currentWeatherData.wind.gust) {
    const gustSpeed = currentWeatherData.wind.gust;
    const gustVal = isCelsius ? Math.round(gustSpeed * 3.6) : Math.round(gustSpeed * 2.237);
    gustValStr = `${gustVal} ${speedUnit}`;
  } else {
    const estGust = isCelsius ? Math.round(speed * 3.6 * 1.35) : Math.round(speed * 2.237 * 1.35);
    gustValStr = `~${estGust} ${speedUnit} (Est)`;
  }
  
  // Wind Cardinal Directions
  const directions = ["North (N)", "North-East (NE)", "East (E)", "South-East (SE)", "South (S)", "South-West (SW)", "West (W)", "North-West (NW)"];
  const dirIndex = Math.round(deg / 45) % 8;
  const dirName = directions[dirIndex];
  
  // Beaufort Scale computation
  const speedKmh = speed * 3.6;
  let force = 0;
  let forceDesc = "Calm";
  if (speedKmh < 1) { force = 0; forceDesc = "Calm"; }
  else if (speedKmh < 6) { force = 1; forceDesc = "Light Air"; }
  else if (speedKmh < 12) { force = 2; forceDesc = "Light Breeze"; }
  else if (speedKmh < 20) { force = 3; forceDesc = "Gentle Breeze"; }
  else if (speedKmh < 29) { force = 4; forceDesc = "Moderate Breeze"; }
  else if (speedKmh < 39) { force = 5; forceDesc = "Fresh Breeze"; }
  else if (speedKmh < 50) { force = 6; forceDesc = "Strong Breeze"; }
  else if (speedKmh < 62) { force = 7; forceDesc = "Near Gale"; }
  else if (speedKmh < 75) { force = 8; forceDesc = "Gale"; }
  else if (speedKmh < 89) { force = 9; forceDesc = "Strong Gale"; }
  else { force = 10; forceDesc = "Storm Force"; }

  return `
    <div class="modal-title">
      <i data-lucide="wind" class="color-wind"></i>
      <span>Wind & Compass Analysis</span>
    </div>
    <div class="compass-wrapper">
      <!-- Compass Visual representation -->
      <svg width="110" height="110" viewBox="0 0 100 100" class="compass-svg">
        <circle cx="50" cy="50" r="44" fill="none" stroke="var(--card-border)" stroke-width="2.5"/>
        <text x="50" y="14" text-anchor="middle" font-size="10" font-weight="800" fill="var(--text-primary)">N</text>
        <text x="88" y="53" text-anchor="middle" font-size="10" font-weight="800" fill="var(--text-primary)">E</text>
        <text x="50" y="93" text-anchor="middle" font-size="10" font-weight="800" fill="var(--text-primary)">S</text>
        <text x="12" y="53" text-anchor="middle" font-size="10" font-weight="800" fill="var(--text-primary)">W</text>
        
        <!-- Needle pointing rotated by wind degree -->
        <polygon points="50,16 45,50 50,45 55,50" fill="#e74c3c" transform="rotate(${deg}, 50, 50)" />
        <polygon points="50,84 45,50 50,45 55,50" fill="var(--text-secondary)" transform="rotate(${deg}, 50, 50)" />
        <circle cx="50" cy="50" r="4" fill="var(--text-primary)" />
      </svg>
      
      <span class="compass-direction-text">${dirName} (${deg}°)</span>
      
      <div class="compass-details-row">
        <div class="compass-detail-item">
          <span class="compass-detail-val">${speedVal} ${speedUnit}</span>
          <span class="compass-detail-label">Speed</span>
        </div>
        <div class="compass-detail-item">
          <span class="compass-detail-val">${gustValStr}</span>
          <span class="compass-detail-label">Gusts</span>
        </div>
        <div class="compass-detail-item">
          <span class="compass-detail-val">Force ${force}</span>
          <span class="compass-detail-label">${forceDesc}</span>
        </div>
      </div>
    </div>
  `;
}

// C. Barometric Pressure speedometer gauge markup
function generatePressureModalContent() {
  const press = currentWeatherData.main.pressure;
  
  // Gauge tilt angle calculation (clamped between 950 and 1050 hPa)
  let angle = ((press - 950) / 100) * 180 - 90;
  angle = Math.max(-90, Math.min(90, angle));
  
  let desc = "Normal Atmospheric Pressure. Weather is likely stable and fair with moderate winds.";
  if (press < 1009) {
    desc = "Low Pressure System. Usually associated with rising warm air, cloud formation, precipitation, or stormy weather.";
  } else if (press > 1022) {
    desc = "High Pressure System. Clear skies, cool dry air, and calm weather conditions dominate this atmospheric state.";
  }
  
  return `
    <div class="modal-title">
      <i data-lucide="gauge" class="color-pressure"></i>
      <span>Barometer & Atmosphere</span>
    </div>
    <div class="barometer-wrapper">
      <!-- Speedometer dial representation -->
      <svg width="140" height="80" viewBox="0 0 140 80" class="barometer-svg">
        <path d="M 20,70 A 50,50 0 0,1 120,70" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="8" stroke-linecap="round"/>
        <!-- Colors segments: low blue, normal green, high orange -->
        <path d="M 20,70 A 50,50 0 0,1 55,23" fill="none" stroke="#2980b9" stroke-width="8"/>
        <path d="M 55,23 A 50,50 0 0,1 85,23" fill="none" stroke="#2ecc71" stroke-width="8"/>
        <path d="M 85,23 A 50,50 0 0,1 120,70" fill="none" stroke="#e67e22" stroke-width="8"/>
        
        <!-- Rotating needle indicator -->
        <path d="M 70,70 L 70,25" stroke="#e74c3c" stroke-width="3" stroke-linecap="round" transform="rotate(${angle}, 70, 70)" />
        <circle cx="70" cy="70" r="5" fill="var(--text-primary)" />
      </svg>
      
      <div class="barometer-trend-card">
        <span class="barometer-trend-val">${press} hPa</span>
        <p class="barometer-trend-desc">${desc}</p>
      </div>
    </div>
  `;
}

// D. AQI Pollutants breakdown list
function generateAqiModalContent() {
  if (!currentAqiData || !currentAqiData.list || currentAqiData.list.length === 0) {
    return "<p>No AQI breakdown details available.</p>";
  }
  
  const comp = currentAqiData.list[0].components;
  
  return `
    <div class="modal-title">
      <i data-lucide="activity" class="color-aqi"></i>
      <span>Air Pollutants Analysis</span>
    </div>
    <div class="pollutant-breakdown-wrapper">
      ${createPollutantRow("PM2.5", comp.pm2_5, "µg/m³")}
      ${createPollutantRow("PM10", comp.pm10, "µg/m³")}
      ${createPollutantRow("NO₂", comp.no2, "µg/m³")}
      ${createPollutantRow("O₃", comp.o3, "µg/m³")}
      ${createPollutantRow("CO", comp.co, "µg/m³")}
      ${createPollutantRow("SO₂", comp.so2, "µg/m³")}
    </div>
  `;
}

// Creates an individual chemical pollutant progress bar row
function createPollutantRow(label, val, unit) {
  let keyName = "pm2_5";
  if (label === "PM2.5") keyName = "pm2_5";
  else if (label === "PM10") keyName = "pm10";
  else if (label === "NO₂") keyName = "no2";
  else if (label === "O₃") keyName = "o3";
  else if (label === "CO") keyName = "co";
  else if (label === "SO₂") keyName = "so2";
  
  const style = getPollutantStyle(keyName, val);
  return `
    <div class="pollutant-row">
      <span class="pollutant-name">${label}</span>
      <div class="pollutant-bar-wrapper">
        <div class="pollutant-progress-track">
          <div class="pollutant-progress-fill ${style.color}" style="width: ${style.pct}%;"></div>
        </div>
      </div>
      <span class="pollutant-value">${val.toFixed(1)} ${unit}</span>
    </div>
  `;
}

// Compute progress percentage & colors for specific gases
function getPollutantStyle(name, val) {
  let max = 100;
  let color = "bar-good";
  if (name === "pm2_5") {
    max = 75;
    color = val < 10 ? "bar-good" : val < 25 ? "bar-moderate" : "bar-poor";
  } else if (name === "pm10") {
    max = 150;
    color = val < 20 ? "bar-good" : val < 50 ? "bar-moderate" : "bar-poor";
  } else if (name === "no2") {
    max = 150;
    color = val < 40 ? "bar-good" : val < 90 ? "bar-moderate" : "bar-poor";
  } else if (name === "o3") {
    max = 150;
    color = val < 50 ? "bar-good" : val < 100 ? "bar-moderate" : "bar-poor";
  } else if (name === "co") {
    max = 10000;
    color = val < 4000 ? "bar-good" : val < 9000 ? "bar-moderate" : "bar-poor";
  } else if (name === "so2") {
    max = 200;
    color = val < 20 ? "bar-good" : val < 80 ? "bar-moderate" : "bar-poor";
  }
  const pct = Math.min(100, Math.round((val / max) * 100));
  return { pct, color };
}

// 14. Search Trigger Listeners

searchBtn.addEventListener("click", () => {
  const city = cityInput.value.trim();
  if (city !== "") {
    checkWeather(city);
    suggestionsDropdown.classList.add("hidden");
  }
});

cityInput.addEventListener("keypress", (event) => {
  if (event.key === "Enter") {
    const city = cityInput.value.trim();
    if (city !== "") {
      checkWeather(city);
      suggestionsDropdown.classList.add("hidden");
    }
  }
});

// 15. Geolocation Integration

locationBtn.addEventListener("click", () => {
  if (!navigator.geolocation) {
    showError("Geolocation is not supported by your browser.");
    return;
  }
  
  locationBtn.classList.add("loading-geo");
  
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      checkWeatherByCoords(lat, lon).finally(() => {
        locationBtn.classList.remove("loading-geo");
      });
    },
    (error) => {
      locationBtn.classList.remove("loading-geo");
      let errorMsg = "Unable to retrieve your location.";
      if (error.code === error.PERMISSION_DENIED) {
        errorMsg = "Location access denied. Please search manually.";
      }
      showError(errorMsg);
    },
    { enableHighAccuracy: true, timeout: 6000 }
  );
});

// 16. Unit Toggle Switch Event Listener

unitToggle.addEventListener("change", (e) => {
  currentUnit = e.target.checked ? "F" : "C";
  localStorage.setItem("weatherUnit", currentUnit);
  renderWeather();
});