// ===========================
//  JOURNAL APP — script.js
// ===========================

// --- STATE ---
let entries = [];          // All journal entries (array of objects)
let selectedMood = '';     // Currently selected mood emoji
let currentEntryId = null; // ID of the entry being viewed in detail
let currentUser = null;    // Current logged-in user {id, username}

// Backend URL
const BACKEND_URL = document.querySelector('meta[name="backend-url"]')?.content ||
  (window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://myjournal-backend.onrender.com');


// ===========================
//  STARTUP
// ===========================
document.addEventListener('DOMContentLoaded', function () {
  checkIfLoggedIn();
  loadWeather();
  setupMoodButtons();
  setupWordCount();
});


// ===========================
//  AUTHENTICATION
// ===========================
function checkIfLoggedIn() {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  if (token && user) {
    currentUser = user;
    loadUserSession();
  }
}

async function handleLogin(event) {
  event.preventDefault();
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  
  if (!username || !password) {
    showToast('Enter username and password');
    return;
  }

  try {
    const res = await fetch(BACKEND_URL + '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    
    if (!res.ok) {
      showToast(data.error || 'Login failed');
      return;
    }

    // Save token and user
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    currentUser = data.user;
    
    showToast('Welcome! 🎉');
    loadUserSession();
  } catch (err) {
    showToast('Connection error. Try again.');
    console.error(err);
  }
}

async function handleSignup(event) {
  event.preventDefault();
  const username = document.getElementById('signup-username').value.trim();
  const password = document.getElementById('signup-password').value;
  const confirmPassword = document.getElementById('signup-confirm-password').value;
  
  if (!username || !password) {
    showToast('Enter username and password');
    return;
  }

  if (password !== confirmPassword) {
    showToast('Passwords do not match');
    return;
  }

  try {
    const res = await fetch(BACKEND_URL + '/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    
    if (!res.ok) {
      showToast(data.error || 'Signup failed');
      return;
    }

    showToast('Account created! Please login.');
    showPage('login');
  } catch (err) {
    showToast('Connection error. Try again.');
    console.error(err);
  }
}

function loginWithGoogle() {
  window.location.href = BACKEND_URL + '/auth/google';
}

function handleLogout() {
  if (confirm('Are you sure you want to logout?')) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    currentUser = null;
    entries = [];
    showPage('login');
    showToast('Logged out');
  }
}

function loadUserSession() {
  document.getElementById('user-username').textContent = currentUser.username;
  document.getElementById('logout-btn').style.display = 'block';
  loadEntries();
  setTodayLabel();
  checkBackendAvailability();
  updateNotificationButton();
  showPage('write');
}

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
    date: new Date().toISOString(),
    mood: selectedMood,
    text: text
  };

  const token = localStorage.getItem('token');
  fetch(BACKEND_URL + '/entries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify(entry)
  })
  .then(res => res.json())
  .then(() => {
    // Add to local list
    entry._id = Date.now(); // temp id
    entries.unshift(entry);
    renderEntries();

    // Reset the form
    document.getElementById('entry-text').value = '';
    document.getElementById('word-count').textContent = '0';
    document.querySelectorAll('.mood').forEach(function (b) {
      b.classList.remove('selected');
    });
    selectedMood = '';

    showToast('Entry saved!');
  })
  .catch(err => {
    showToast('Error saving entry');
    console.error(err);
  });
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
      '<div class="entry-item" onclick="showDetail(\'' + (entry._id || entry.id) + '\')">' +
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
  var entry = entries.find(function (e) { return (e._id || e.id) === id; });
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

  const token = localStorage.getItem('token');
  fetch(BACKEND_URL + '/entries/' + currentEntryId, {
    method: 'DELETE',
    headers: { 'Authorization': 'Bearer ' + token }
  })
  .then(() => {
    entries = entries.filter(function (e) { return (e._id || e.id) !== currentEntryId; });
    currentEntryId = null;
    showToast('Entry deleted');
    showPage('entries');
  })
  .catch(err => {
    showToast('Error deleting entry');
    console.error(err);
  });
}


// ===========================
//  LOCAL STORAGE
// ===========================
function saveEntries() {
  localStorage.setItem('journal_entries', JSON.stringify(entries));
}

function loadEntries() {
  const token = localStorage.getItem('token');
  if (!token) return;
  fetch(BACKEND_URL + '/entries', {
    headers: { 'Authorization': 'Bearer ' + token }
  })
  .then(res => res.json())
  .then(data => {
    entries = data;
    renderEntries();
  })
  .catch(err => console.error('Error loading entries:', err));
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
      mode: 'cors',
      timeout: 5000
    });
    if (res.ok) {
      // Backend is available, show the banner
      document.querySelector('.reminder-banner').style.display = 'flex';
    } else {
      // Backend not available, but still show banner for notifications
      document.querySelector('.reminder-banner').style.display = 'flex';
    }
  } catch (err) {
    // Backend not available, but show banner anyway for notifications
    document.querySelector('.reminder-banner').style.display = 'flex';
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
    if (!res.ok) {
      showToast(data.error || 'Subscription failed');
      return;
    }
    showToast(data.message);
    document.getElementById('reminder-email').value = '';
    if (Notification.permission === 'granted') {
      showLocalNotification('Subscribed!', 'You will get daily email reminders at 4PM.');
    }
  } catch (err) {
    showToast('Something went wrong. Try again!');
  }
}

function updateNotificationButton() {
  const button = document.getElementById('notification-button');
  if (!button || !('Notification' in window)) {
    if (button) button.style.display = 'none';
    return;
  }
  if (Notification.permission === 'granted') {
    button.textContent = 'Notifications enabled';
    button.disabled = true;
  } else if (Notification.permission === 'denied') {
    button.textContent = 'Notifications blocked';
    button.disabled = true;
  } else {
    button.textContent = 'Enable notifications';
    button.disabled = false;
  }
}

async function enableNotifications() {
  if (!('Notification' in window)) {
    showToast('Browser notifications are not supported here.');
    return;
  }
  if (Notification.permission === 'granted') {
    showToast('Notifications already enabled.');
    return;
  }
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      showToast('Notifications enabled! You\'ll get reminders.');
      showLocalNotification('My Journal', 'Notifications are enabled.');
    } else {
      showToast('Notifications blocked. Enable in browser settings.');
    }
  } catch (err) {
    showToast('Unable to enable notifications.');
  }
  updateNotificationButton();
}

function showLocalNotification(title, body) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    new Notification(title, {
      body,
      icon: '/favicon.ico'
    });
  } catch (err) {
    console.error('Notification error:', err);
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
  }, {
    timeout: 7000,
    maximumAge: 0,
    enableHighAccuracy: false
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
