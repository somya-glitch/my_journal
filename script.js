// ===========================
//  JOURNAL APP — script.js
// ===========================

// --- STATE ---
let entries = [];          // All journal entries (array of objects)
let selectedMood = '';     // Currently selected mood emoji
let currentEntryId = null; // ID of the entry being viewed in detail

// Backend URL
const BACKEND_URL = window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://your-railway-url.up.railway.app';


// ===========================
//  STARTUP
// ===========================
document.addEventListener('DOMContentLoaded', function () {
  loadEntries();
  setTodayLabel();
  setupMoodButtons();
  setupWordCount();
  checkBackendAvailability();
  loadWeather();
});


// ===========================
//  PAGE NAVIGATION
// ===========================
function showPage(name) {
  // Hide all pages
  document.querySelectorAll('.page').forEach(function (p) {
    p.classList.remove('active');
  });

  // Show the requested page
  document.getElementById('page-' + name).classList.add('active');

  // If showing entries, refresh the list
  if (name === 'entries') {
    renderEntries();
  }
}


// ===========================
//  TODAY'S DATE LABEL
// ===========================
function setTodayLabel() {
  var label = document.getElementById('today-label');
  var options = { weekday: 'long', day: 'numeric', month: 'long' };
  label.textContent = new Date().toLocaleDateString('en-GB', options);
  label.style.fontSize = '13px';
  label.style.color = '#a09f9b';
}


// ===========================
//  MOOD BUTTONS
// ===========================
function setupMoodButtons() {
  var buttons = document.querySelectorAll('.mood');

  buttons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      // Deselect all
      buttons.forEach(function (b) {
        b.classList.remove('selected');
      });

      // Select this one (or deselect if already chosen)
      if (selectedMood === btn.dataset.mood) {
        selectedMood = '';
      } else {
        btn.classList.add('selected');
        selectedMood = btn.dataset.mood;
      }
    });
  });
}


// ===========================
//  WORD COUNT
// ===========================
function setupWordCount() {
  var ta = document.getElementById('entry-text');
  var counter = document.getElementById('word-count');

  ta.addEventListener('input', function () {
    var words = ta.value.trim().split(/\s+/).filter(function (w) {
      return w.length > 0;
    });
    counter.textContent = ta.value.trim() === '' ? 0 : words.length;
  });
}


// ===========================
//  SAVE AN ENTRY
// ===========================
function saveEntry() {
  var text = document.getElementById('entry-text').value.trim();

  if (text === '') {
    showToast('Write something first!');
    return;
  }

  // Build entry object
  var entry = {
    id:   Date.now(),           // Unique ID (timestamp)
    date: new Date().toISOString(), // Full date + time
    mood: selectedMood,
    text: text
  };

  // Add to the front of the list (newest first)
  entries.unshift(entry);

  // Save to browser storage
  saveEntries();

  // Reset the form
  document.getElementById('entry-text').value = '';
  document.getElementById('word-count').textContent = '0';
  document.querySelectorAll('.mood').forEach(function (b) {
    b.classList.remove('selected');
  });
  selectedMood = '';

  showToast('Entry saved!');
}


// ===========================
//  RENDER ENTRIES LIST
// ===========================
function renderEntries() {
  var list    = document.getElementById('entries-list');
  var empty   = document.getElementById('empty-state');
  var counter = document.getElementById('entry-count');

  counter.textContent = entries.length + (entries.length === 1 ? ' entry' : ' entries');

  if (entries.length === 0) {
    list.style.display  = 'none';
    empty.style.display = 'block';
    return;
  }

  list.style.display  = '';
  empty.style.display = 'none';

  list.innerHTML = entries.map(function (entry) {
    return (
      '<div class="entry-item" onclick="showDetail(' + entry.id + ')">' +
        '<div class="entry-mood-icon">' + (entry.mood || '📝') + '</div>' +
        '<div class="entry-info">' +
          '<div class="entry-date-str">' + formatDate(entry.date) + '</div>' +
          '<div class="entry-preview-text">' + escapeHtml(entry.text.substring(0, 80)) + '</div>' +
        '</div>' +
        '<div class="entry-arrow">›</div>' +
      '</div>'
    );
  }).join('');
}


// ===========================
//  SHOW ENTRY DETAIL
// ===========================
function showDetail(id) {
  var entry = entries.find(function (e) { return e.id === id; });
  if (!entry) return;

  currentEntryId = id;

  document.getElementById('detail-meta').innerHTML =
    (entry.mood ? '<span style="font-size:20px">' + entry.mood + '</span>' : '') +
    '<span>' + formatDate(entry.date) + '</span>';

  document.getElementById('detail-body').textContent = entry.text;

  showPage('detail');
}


// ===========================
//  DELETE ENTRY
// ===========================
function deleteCurrentEntry() {
  if (!currentEntryId) return;

  var confirmed = window.confirm('Delete this entry? This cannot be undone.');
  if (!confirmed) return;

  entries = entries.filter(function (e) { return e.id !== currentEntryId; });
  saveEntries();
  currentEntryId = null;

  showToast('Entry deleted');
  showPage('entries');
}


// ===========================
//  LOCAL STORAGE
// ===========================
function saveEntries() {
  localStorage.setItem('journal_entries', JSON.stringify(entries));
}

function loadEntries() {
  var stored = localStorage.getItem('journal_entries');
  if (stored) {
    try {
      entries = JSON.parse(stored);
    } catch (e) {
      entries = [];
    }
  }
}


// ===========================
//  TOAST NOTIFICATION
// ===========================
function showToast(message) {
  var toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');

  setTimeout(function () {
    toast.classList.remove('show');
  }, 2200);
}


// ===========================
//  HELPERS
// ===========================
function formatDate(isoString) {
  var d = new Date(isoString);
  return d.toLocaleDateString('en-GB', {
    weekday: 'short',
    day:     'numeric',
    month:   'long',
    year:    'numeric'
  });
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Check if backend server is available
async function checkBackendAvailability() {
  try {
    const res = await fetch(BACKEND_URL + '/', {
      method: 'GET',
      mode: 'cors'
    });
    if (res.ok) {
      // Backend is available, show the banner
      document.querySelector('.reminder-banner').style.display = 'flex';
    } else {
      document.querySelector('.reminder-banner').style.display = 'none';
    }
  } catch (err) {
    // Backend not available, hide the banner
    document.querySelector('.reminder-banner').style.display = 'none';
  }
}

async function subscribeEmail() {
  const email = document.getElementById('reminder-email').value.trim();
  if (!email) { showToast('Enter your email first!'); return; }

  try {
    const res = await fetch(BACKEND_URL + '/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    showToast(data.message);
    document.getElementById('reminder-email').value = '';
  } catch (err) {
    showToast('Something went wrong. Try again!');
  }
}
// Weather Feature
async function loadWeather() {
  if (!navigator.geolocation) {
    document.getElementById('weather-text').textContent = 'Weather not supported';
    return;
  }
  navigator.geolocation.getCurrentPosition(async (pos) => {
    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (!data.current_weather) {
        throw new Error('No weather data');
      }
      const temp = data.current_weather.temperature;
      const code = data.current_weather.weathercode;
      const icon = getWeatherIcon(code);
      document.getElementById('weather-icon').textContent = icon;
      document.getElementById('weather-text').textContent = `${temp}°C — ${getWeatherDesc(code)}`;
    } catch (err) {
      document.getElementById('weather-icon').textContent = '⚠️';
      document.getElementById('weather-text').textContent = 'Unable to fetch weather';
      console.error('Weather error:', err);
    }
  }, () => {
    document.getElementById('weather-text').textContent = 'Location access denied';
  });
}

function getWeatherIcon(code) {
  if (code === 0) return '☀️';
  if (code <= 2) return '⛅';
  if (code <= 3) return '☁️';
  if (code <= 67) return '🌧️';
  if (code <= 77) return '❄️';
  if (code <= 99) return '⛈️';
  return '🌤️';
}

function getWeatherDesc(code) {
  if (code === 0) return 'Clear sky';
  if (code <= 2) return 'Partly cloudy';
  if (code <= 3) return 'Overcast';
  if (code <= 51) return 'Drizzle';
  if (code <= 67) return 'Rainy';
  if (code <= 77) return 'Snowy';
  if (code <= 99) return 'Thunderstorm';
  return 'Cloudy';
}
