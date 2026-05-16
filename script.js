// ═══════════════════════════════════════════
//  MYLIFE JOURNAL — script.js
//  Backend: https://myjournal-backend.onrender.com
// ═══════════════════════════════════════════

// ── BACKEND URL (hardcoded to your Render deployment) ──
const BACKEND_URL = 'https://myjournal-backend.onrender.com';

// ── STATE ──
let entries          = [];
let selectedMood     = '';
let currentEntryId   = null;
let currentUser      = null;
let currentTags      = [];
let activeTagFilter  = null;
let filteredEntries  = null;

// Calendar
let calYear  = new Date().getFullYear();
let calMonth = new Date().getMonth();
let calMarks = {};
let calNotes = {};
let selectedMarkColor = 'important';
let selectedCalDate   = null;

// Gratitude
let gratitudeHistory    = [];
let extraGratitudeCount = 0;

// Capsule
let capsules = [];

// Theme
const THEMES = ['light', 'sepia', 'dark'];
let themeIndex = 0;

// Ambient
let ambientPlaying = false;

// Writing speed
let wordCountHistory = [];
let lastWordCount    = 0;
let writingSpeedTimer= null;
let autoSaveTimer    = null;

// Current prompt text
let currentPromptText = '';

// ── QUOTES & PROMPTS ──────────────────────────────────────────────
const DAILY_QUOTES = [
  "Fill your paper with the breathings of your heart.",
  "In the journal I do not just express myself — I create myself.",
  "Write hard and clear about what hurts.",
  "Begin anywhere.",
  "Your life is your story. Write well. Edit often.",
  "Almost everything will work again if you unplug it.",
  "Let the soft animal of your body love what it loves.",
  "The secret of getting ahead is getting started.",
  "One day or day one — you decide.",
  "Not all those who wander are lost.",
  "The unexamined life is not worth living.",
  "Wherever you are, be all there.",
  "You only live once, but if you do it right, once is enough.",
];

const GRATITUDE_QUOTES = [
  '"Gratitude turns what we have into enough."',
  '"Joy is the simplest form of gratitude."',
  '"Enough is a feast." — Buddhist proverb',
  '"Count your joys instead of your woes."',
  '"When you are grateful, fear disappears and abundance appears."',
];

const FALLBACK_PROMPTS = [
  "What is one small thing that brought you unexpected joy today?",
  "Describe a person who has quietly shaped who you are.",
  "If today were a chapter title in your autobiography, what would it be?",
  "What would you tell your ten-year-old self right now?",
  "Write about a place that makes you feel completely yourself.",
  "What fear have you been carrying that you're ready to set down?",
  "Describe the last time you felt genuinely proud of yourself.",
  "What does your ideal ordinary Tuesday look like?",
  "Write about something you've changed your mind about recently.",
  "If your current mood were a weather pattern, what would it be?",
  "What are three things your future self will thank you for doing now?",
  "Describe a moment recently when time felt like it slowed down.",
  "What habit are you building, and why does it matter to you?",
  "Write a letter to the version of yourself from five years ago.",
  "What would you do if you knew you could not fail?",
  "Describe the last time you laughed until your stomach hurt.",
  "What is one thing you're carrying that isn't yours to carry?",
  "What does home mean to you right now?",
  "Write about a book, song, or film that has lived inside you.",
  "What small act of kindness have you witnessed or done recently?",
];

// ── ACHIEVEMENTS ─────────────────────────────────────────────────
const ACHIEVEMENTS_DEF = [
  { id:'first_entry',  icon:'🖊️', name:'First Words',     desc:'Write your first entry',       check:(e,g,s)=> e.length>=1 },
  { id:'streak_3',     icon:'🔥', name:'On a Roll',        desc:'3-day writing streak',          check:(e,g,s)=> s>=3 },
  { id:'streak_7',     icon:'🌟', name:'Week Warrior',     desc:'7-day writing streak',          check:(e,g,s)=> s>=7 },
  { id:'streak_30',    icon:'🏆', name:'Monthly Master',   desc:'30-day writing streak',         check:(e,g,s)=> s>=30 },
  { id:'words_1000',   icon:'📚', name:'Word Weaver',      desc:'Write 1,000 total words',       check:(e,g,s)=> totalWords(e)>=1000 },
  { id:'words_10000',  icon:'✍️', name:'Ink & Soul',       desc:'Write 10,000 total words',      check:(e,g,s)=> totalWords(e)>=10000 },
  { id:'entries_10',   icon:'📖', name:'Diligent Diarist', desc:'10 journal entries',            check:(e,g,s)=> e.length>=10 },
  { id:'entries_50',   icon:'🗂️', name:'Archive Keeper',   desc:'50 journal entries',            check:(e,g,s)=> e.length>=50 },
  { id:'grateful_7',   icon:'🌿', name:'Thankful Heart',   desc:'7 gratitude entries',           check:(e,g,s)=> g.length>=7 },
  { id:'capsule_1',    icon:'💌', name:'Time Traveller',   desc:'Seal your first time capsule',  check:(e,g,s)=> capsules.length>=1 },
  { id:'night_owl',    icon:'🦉', name:'Night Owl',        desc:'Write after 11 PM',             check:(e,g,s)=> e.some(x=> new Date(x.date).getHours()>=23) },
  { id:'early_bird',   icon:'🐦', name:'Early Bird',       desc:'Write before 7 AM',             check:(e,g,s)=> e.some(x=> new Date(x.date).getHours()<7) },
  { id:'all_moods',    icon:'🎭', name:'Full Spectrum',    desc:'Use all 8 moods',               check:(e,g,s)=> new Set(e.filter(x=>x.mood).map(x=>x.mood)).size>=8 },
  { id:'long_entry',   icon:'📜', name:'Deep Diver',       desc:'Write an entry over 500 words', check:(e,g,s)=> e.some(x=> wordCount(x.text)>=500) },
];

function totalWords(ents) { return ents.reduce((s,e)=> s+wordCount(e.text),0); }
function wordCount(text)  { return text ? text.trim().split(/\s+/).filter(w=>w.length>0).length : 0; }

// ═══════════════════════════════════════════
//  STARTUP
// ═══════════════════════════════════════════
document.addEventListener('DOMContentLoaded', ()=> {
  checkIfLoggedIn();
  loadWeather();
  setupMoodButtons();
  setupWordCount();
  loadCalData();
  loadCapsules();
  setDailyQuote();
  setTodayLabel();
  loadTheme();
  loadDraft();
  setGratefulDate();
  rotateGratitudeQuote();

  // Set capsule min date to tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate()+1);
  const capDate = document.getElementById('capsule-date');
  if (capDate) capDate.min = tomorrow.toISOString().split('T')[0];
});

function setDailyQuote() {
  const idx = new Date().getDate() % DAILY_QUOTES.length;
  const el  = document.getElementById('daily-quote');
  if (el) el.textContent = '"' + DAILY_QUOTES[idx] + '"';
}

function setTodayLabel() {
  const el = document.getElementById('today-label');
  if (el) el.textContent = new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'});
}

function setGratefulDate() {
  const el = document.getElementById('grateful-date');
  if (el) el.textContent = new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'});
}

function rotateGratitudeQuote() {
  const el = document.getElementById('grateful-rotating-quote');
  if (!el) return;
  el.textContent = GRATITUDE_QUOTES[Math.floor(Math.random()*GRATITUDE_QUOTES.length)];
}

// ═══════════════════════════════════════════
//  AUTHENTICATION
// ═══════════════════════════════════════════
function checkIfLoggedIn() {
  // Handle Google OAuth token in URL
  const urlParams = new URLSearchParams(window.location.search);
  const tokenFromGoogle = urlParams.get('token');
  if (tokenFromGoogle) {
    try {
      const payload = JSON.parse(atob(tokenFromGoogle.split('.')[1]));
      const user = { id: payload.id, username: payload.username };
      localStorage.setItem('jrnl_token', tokenFromGoogle);
      localStorage.setItem('jrnl_user', JSON.stringify(user));
      window.history.replaceState({}, '', window.location.pathname);
      currentUser = user;
      loadUserSession();
      return;
    } catch(e) { console.error('Google token parse failed:', e); }
  }

  // Check saved session
  const token = localStorage.getItem('jrnl_token');
  const user  = JSON.parse(localStorage.getItem('jrnl_user') || 'null');
  if (token && user) {
    currentUser = user;
    loadUserSession();
  }
}

async function handleLogin(event) {
  if (event) event.preventDefault();
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  if (!username || !password) { showToast('Enter username and password'); return; }

  try {
    const res  = await fetch(BACKEND_URL + '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();

    if (!res.ok) {
      showToast(data.error || 'Login failed. Check your credentials.');
      return;
    }

    localStorage.setItem('jrnl_token', data.token);
    localStorage.setItem('jrnl_user', JSON.stringify(data.user));
    currentUser = data.user;
    showToast('Welcome back, ' + data.user.username + '! 🎉');
    loadUserSession();

  } catch(err) {
    console.error('Login error:', err);
    showToast('Cannot reach server. Check your connection.');
  }
}

async function handleSignup(event) {
  if (event) event.preventDefault();
  const username        = document.getElementById('signup-username').value.trim();
  const password        = document.getElementById('signup-password').value;
  const confirmPassword = document.getElementById('signup-confirm-password').value;

  if (!username || !password) { showToast('Enter username and password'); return; }
  if (password.length < 6)    { showToast('Password must be at least 6 characters'); return; }
  if (password !== confirmPassword) { showToast('Passwords do not match'); return; }

  try {
    const res  = await fetch(BACKEND_URL + '/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();

    if (!res.ok) {
      showToast(data.error || 'Signup failed');
      return;
    }

    showToast('Account created! Please login. 🎉');
    showPage('login');

  } catch(err) {
    console.error('Signup error:', err);
    showToast('Cannot reach server. Check your connection.');
  }
}

function loginWithGoogle() {
  window.location.href = BACKEND_URL + '/auth/google';
}

function handleLogout() {
  if (!confirm('Are you sure you want to logout?')) return;
  localStorage.removeItem('jrnl_token');
  localStorage.removeItem('jrnl_user');
  localStorage.removeItem('journal_draft');
  currentUser = null;
  entries     = [];
  document.getElementById('main-nav').style.display = 'none';
  document.getElementById('top-bar').classList.remove('visible');
  showPage('login');
  showToast('Logged out. See you soon!');
}

function loadUserSession() {
  const usernameEl = document.getElementById('user-username');
  const logoutBtn  = document.getElementById('logout-btn');
  const topBar     = document.getElementById('top-bar');
  const mainNav    = document.getElementById('main-nav');

  if (usernameEl) usernameEl.textContent = currentUser.username;
  if (logoutBtn)  logoutBtn.style.display = 'block';
  if (topBar)     topBar.classList.add('visible');
  if (mainNav)    mainNav.style.display = 'block';

  loadEntries();
  loadGratitudeHistory();
  updateStreakBadge();
  updateNotificationButton();
  checkBackendAvailability();
  switchTab('write');
 // loadPrompt();
}

// ═══════════════════════════════════════════
//  PAGE NAVIGATION
// ═══════════════════════════════════════════
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const page = document.getElementById('page-' + name);
  if (page) page.classList.add('active');

  if (name === 'entries')  renderEntries();
  if (name === 'calendar') renderCalendar();
  if (name === 'grateful') { renderGratitudeHistory(); rotateGratitudeQuote(); }
  if (name === 'insights') renderInsights();
  if (name === 'capsule')  renderCapsules();
}

function switchTab(name) {
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  const tab = document.querySelector(`.nav-tab[data-page="${name}"]`);
  if (tab) tab.classList.add('active');
  showPage(name);
}

// ═══════════════════════════════════════════
//  THEME
// ═══════════════════════════════════════════
function loadTheme() {
  const saved = localStorage.getItem('jrnl_theme') || 'light';
  themeIndex  = THEMES.indexOf(saved);
  if (themeIndex < 0) themeIndex = 0;
  applyTheme(false);
}

function cycleTheme() {
  themeIndex = (themeIndex + 1) % THEMES.length;
  applyTheme(true);
  localStorage.setItem('jrnl_theme', THEMES[themeIndex]);
}

function applyTheme(showMsg) {
  const theme = THEMES[themeIndex];
  document.documentElement.setAttribute('data-theme', theme);
  const btn = document.getElementById('theme-btn');
  if (btn) btn.textContent = theme === 'dark' ? '☀️' : theme === 'sepia' ? '🌙' : '📜';
  if (showMsg) showToast(theme.charAt(0).toUpperCase() + theme.slice(1) + ' theme');
}

// ═══════════════════════════════════════════
//  AMBIENT SOUNDS
// ═══════════════════════════════════════════
function toggleAmbient() {
  const btn   = document.getElementById('ambient-btn');
  const audio = document.getElementById('ambient-audio');
  if (!audio) return;

  if (ambientPlaying) {
    audio.pause();
    ambientPlaying = false;
    if (btn) btn.textContent = '🔇';
    showToast('Ambient sound off');
  } else {
    const tracks = [
      { name:'🌧 Rain',      url:'https://cdn.pixabay.com/audio/2022/05/13/audio_257112be2f.mp3' },
      { name:'☕ Café',      url:'https://cdn.pixabay.com/audio/2021/08/04/audio_bb630cc098.mp3' },
      { name:'🔥 Fireplace', url:'https://cdn.pixabay.com/audio/2022/03/10/audio_943f122e5c.mp3' },
    ];
    const t = tracks[Math.floor(Date.now()/1000) % tracks.length];
    audio.src    = t.url;
    audio.volume = 0.3;
    audio.play()
      .then(()=> { ambientPlaying = true; if (btn) btn.textContent = '🔊'; showToast(t.name + ' playing'); })
      .catch(()=> showToast('Browser blocked audio. Click the page first.'));
  }
}

// ═══════════════════════════════════════════
//  MOOD BUTTONS
// ═══════════════════════════════════════════
function setupMoodButtons() {
  document.querySelectorAll('.mood').forEach(btn => {
    btn.addEventListener('click', ()=> {
      document.querySelectorAll('.mood').forEach(b => b.classList.remove('selected'));
      if (selectedMood === btn.dataset.mood) {
        selectedMood = '';
      } else {
        btn.classList.add('selected');
        selectedMood = btn.dataset.mood;
      }
    });
  });
}

// ═══════════════════════════════════════════
//  TAGS
// ═══════════════════════════════════════════
function handleTagInput(e) {
  if (e.key !== 'Enter') return;
  const input = document.getElementById('tag-input');
  const raw   = input.value.trim().replace(/^#/,'').toLowerCase().replace(/\s+/g,'');
  if (!raw || currentTags.includes(raw)) { input.value = ''; return; }
  currentTags.push(raw);
  input.value = '';
  renderTagsDisplay();
}

function renderTagsDisplay() {
  const container = document.getElementById('tags-display');
  if (!container) return;
  container.innerHTML = currentTags.map(t=>
    `<span class="tag-pill">#${t}<span class="tag-pill-x" onclick="removeTag('${t}')">✕</span></span>`
  ).join('');
}

function removeTag(tag) {
  currentTags = currentTags.filter(t => t !== tag);
  renderTagsDisplay();
}

// ═══════════════════════════════════════════
//  WORD COUNT + AUTO SAVE
// ═══════════════════════════════════════════
function setupWordCount() {
  const ta = document.getElementById('entry-text');
  const wc = document.getElementById('word-count');
  const rt = document.getElementById('read-time');
  if (!ta) return;

  ta.addEventListener('input', ()=> {
    const words = ta.value.trim() ? ta.value.trim().split(/\s+/).filter(w=>w.length>0) : [];
    if (wc) wc.textContent = words.length;
    if (rt) rt.textContent = '~' + Math.max(1, Math.ceil(words.length/200)) + ' min read';
    trackWritingSpeed(words.length);
    triggerAutoSave();
  });
}

function trackWritingSpeed(currentCount) {
  clearTimeout(writingSpeedTimer);
  lastWordCount = currentCount;
  const el = document.getElementById('writing-speed');
  if (!el) return;
  wordCountHistory.push({ t: Date.now(), c: currentCount });
  if (wordCountHistory.length > 10) wordCountHistory.shift();
  if (wordCountHistory.length >= 2) {
    const first = wordCountHistory[0];
    const last  = wordCountHistory[wordCountHistory.length-1];
    const mins  = (last.t - first.t) / 60000;
    const wpm   = mins > 0 ? Math.round((last.c - first.c) / mins) : 0;
    if (wpm > 0 && wpm < 300) el.textContent = wpm + ' wpm';
  }
  writingSpeedTimer = setTimeout(()=>{ if(el) el.textContent=''; }, 3000);
}

function triggerAutoSave() {
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(()=> {
    const text = document.getElementById('entry-text')?.value || '';
    if (text.trim()) {
      localStorage.setItem('journal_draft', JSON.stringify({ text, mood: selectedMood, tags: currentTags }));
      const dot = document.getElementById('autosave-indicator');
      if (dot) { dot.classList.remove('hidden'); setTimeout(()=> dot.classList.add('hidden'), 2000); }
    }
  }, 1500);
}

function loadDraft() {
  try {
    const raw = localStorage.getItem('journal_draft');
    if (!raw) return;
    const draft = JSON.parse(raw);
    if (draft.text) {
      const ta = document.getElementById('entry-text');
      if (ta) { ta.value = draft.text; ta.dispatchEvent(new Event('input')); }
    }
    if (draft.mood) {
      selectedMood = draft.mood;
      document.querySelectorAll('.mood').forEach(b=> {
        if (b.dataset.mood === draft.mood) b.classList.add('selected');
      });
    }
    if (Array.isArray(draft.tags)) {
      currentTags = draft.tags;
      renderTagsDisplay();
    }
  } catch(_) {}
}

function clearDraft() {
  const ta = document.getElementById('entry-text');
  if (ta) ta.value = '';
  const wc = document.getElementById('word-count');
  if (wc) wc.textContent = '0';
  const rt = document.getElementById('read-time');
  if (rt) rt.textContent = '~0 min read';
  const sp = document.getElementById('writing-speed');
  if (sp) sp.textContent = '';
  document.querySelectorAll('.mood').forEach(b=> b.classList.remove('selected'));
  selectedMood = '';
  currentTags  = [];
  renderTagsDisplay();
  localStorage.removeItem('journal_draft');
  lastWordCount    = 0;
  wordCountHistory = [];
}

// ═══════════════════════════════════════════
//  AI WRITING PROMPTS
// ═══════════════════════════════════════════
async function loadPrompt() {
  const el = document.getElementById('prompt-text');
  if (!el) return;
  el.textContent = 'Thinking…';

  try {
    const moodHint = selectedMood ? ` The user is feeling ${selectedMood}.` : '';
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 100,
        messages: [{ role:'user', content:`Generate ONE short thoughtful journal writing prompt (1-2 sentences max).${moodHint} Make it personal and introspective. Return ONLY the prompt, no quotes, no preamble.` }]
      })
    });
    if (response.ok) {
      const data = await response.json();
      const text = data.content?.[0]?.text?.trim();
      if (text) { currentPromptText = text; el.textContent = text; return; }
    }
  } catch(_) {}

  // Fallback to local prompts
  const idx = Math.floor(Math.random() * FALLBACK_PROMPTS.length);
  currentPromptText = FALLBACK_PROMPTS[idx];
  el.textContent    = currentPromptText;
}

function usePrompt() {
  if (!currentPromptText) return;
  const ta = document.getElementById('entry-text');
  if (!ta) return;
  ta.value = ta.value ? ta.value.trimEnd() + '\n\n' + currentPromptText + '\n\n' : currentPromptText + '\n\n';
  ta.dispatchEvent(new Event('input'));
  ta.focus();
  ta.setSelectionRange(ta.value.length, ta.value.length);
  showToast('Prompt added ✨');
}

// ═══════════════════════════════════════════
//  SAVE ENTRY
// ═══════════════════════════════════════════
async function saveEntry() {
  const text = document.getElementById('entry-text')?.value.trim();
  if (!text) { showToast('Write something first!'); return; }

  const token = localStorage.getItem('jrnl_token');
  if (!token) { showToast('Please login first'); showPage('login'); return; }

  const entry = {
    date: new Date().toISOString(),
    mood: selectedMood,
    text: text,
    tags: [...currentTags],
  };

  try {
    const res = await fetch(BACKEND_URL + '/entries', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify(entry)
    });

    if (res.status === 401 || res.status === 403) {
      showToast('Session expired. Please login again.');
      handleLogout();
      return;
    }

    if (!res.ok) {
      const err = await res.json();
      showToast(err.error || 'Failed to save entry');
      return;
    }

    const saved = await res.json();
    // Use the _id returned by MongoDB
    entry._id = saved._id || saved.id || Date.now();
    entries.unshift(entry);
    afterSave();

  } catch(err) {
    console.error('Save error:', err);
    showToast('Connection error. Check your internet.');
  }
}

function afterSave() {
  renderEntries();
  clearDraft();
  showToast('Entry saved ✨');
  updateStreakBadge();
  renderTagFilterChips();
  //loadPrompt();
}

// ═══════════════════════════════════════════
//  LOAD ENTRIES FROM BACKEND
// ═══════════════════════════════════════════
async function loadEntries() {
  const token = localStorage.getItem('jrnl_token');
  if (!token) return;

  try {
    const res = await fetch(BACKEND_URL + '/entries', {
      headers: { 'Authorization': 'Bearer ' + token }
    });

    if (res.status === 401 || res.status === 403) {
      showToast('Session expired. Please login again.');
      handleLogout();
      return;
    }

    if (!res.ok) throw new Error('Server error');

    const data = await res.json();
    entries = Array.isArray(data) ? data : [];
    renderEntries();
    renderCalendar();
    updateStreakBadge();

  } catch(err) {
    console.error('Load entries error:', err);
    showToast('Could not load entries. Check connection.');
  }
}

// ═══════════════════════════════════════════
//  RENDER ENTRIES LIST
// ═══════════════════════════════════════════
function renderEntries() {
  const list    = document.getElementById('entries-list');
  const empty   = document.getElementById('empty-state');
  const counter = document.getElementById('entry-count');
  const source  = filteredEntries !== null ? filteredEntries : entries;

  if (counter) counter.textContent = source.length + (source.length===1?' entry':' entries');
  if (!list) return;

  if (source.length === 0) {
    list.style.display  = 'none';
    if (empty) empty.style.display = 'block';
    return;
  }

  list.style.display  = '';
  if (empty) empty.style.display = 'none';

  list.innerHTML = source.map(entry => {
    const id       = entry._id || entry.id;
    const tagsHTML = (entry.tags||[]).length > 0
      ? `<div class="entry-tags-preview">${entry.tags.map(t=>`<span class="entry-tag">#${t}</span>`).join('')}</div>`
      : '';
    return `<div class="entry-item" onclick="showDetail('${id}')">
      <div class="entry-mood-icon">${entry.mood||'📝'}</div>
      <div class="entry-info">
        <div class="entry-date-str">${formatDate(entry.date)}</div>
        <div class="entry-preview-text">${escapeHtml((entry.text||'').substring(0,100))}</div>
        ${tagsHTML}
      </div>
      <div class="entry-arrow">›</div>
    </div>`;
  }).join('');

  renderTagFilterChips();
}

function filterEntries() {
  const q    = (document.getElementById('search-input')?.value||'').trim().toLowerCase();
  const tagQ = activeTagFilter;
  filteredEntries = entries.filter(e => {
    const matchText = !q || (e.text||'').toLowerCase().includes(q) || formatDate(e.date).toLowerCase().includes(q) || (e.mood||'').includes(q);
    const matchTag  = !tagQ || (e.tags||[]).includes(tagQ);
    return matchText && matchTag;
  });
  renderEntries();
}

function renderTagFilterChips() {
  const container = document.getElementById('tag-filter-chips');
  if (!container) return;
  const allTags = [...new Set(entries.flatMap(e=>e.tags||[]))];
  if (allTags.length === 0) { container.innerHTML = ''; return; }
  container.innerHTML = allTags.map(t=>
    `<button class="tag-filter-chip ${activeTagFilter===t?'active':''}" onclick="toggleTagFilter('${t}')">#${t}</button>`
  ).join('');
}

function toggleTagFilter(tag) {
  activeTagFilter = activeTagFilter===tag ? null : tag;
  filterEntries();
}

// ═══════════════════════════════════════════
//  DETAIL VIEW
// ═══════════════════════════════════════════
function showDetail(id) {
  const entry = entries.find(e => String(e._id||e.id) === String(id));
  if (!entry) return;
  currentEntryId = id;

  const metaEl = document.getElementById('detail-meta');
  if (metaEl) metaEl.innerHTML =
    (entry.mood ? `<span style="font-size:22px">${entry.mood}</span>` : '') +
    `<span>${formatDate(entry.date)}</span>`;

  const bodyEl = document.getElementById('detail-body');
  if (bodyEl) bodyEl.textContent = entry.text;

  const tagsEl = document.getElementById('detail-tags-row');
  if (tagsEl) tagsEl.innerHTML = (entry.tags||[]).map(t=>`<span class="tag-pill">#${t}</span>`).join('');

  showPage('detail');
}

async function deleteCurrentEntry() {
  if (!currentEntryId) return;
  if (!confirm('Delete this entry? This cannot be undone.')) return;

  const token = localStorage.getItem('jrnl_token');
  if (!token) return;

  try {
    const res = await fetch(BACKEND_URL + '/entries/' + currentEntryId, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + token }
    });

    if (!res.ok) throw new Error('Delete failed');

    entries        = entries.filter(e => String(e._id||e.id) !== String(currentEntryId));
    currentEntryId = null;
    showToast('Entry deleted');
    switchTab('entries');

  } catch(err) {
    console.error('Delete error:', err);
    showToast('Could not delete. Check connection.');
  }
}

// ═══════════════════════════════════════════
//  STREAK
// ═══════════════════════════════════════════
function calcStreak() {
  if (entries.length === 0) return 0;
  const days = [...new Set(entries.map(e => dateKey(new Date(e.date))))].sort().reverse();
  const today     = dateKey(new Date());
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate()-1);
  if (days[0] !== today && days[0] !== dateKey(yesterday)) return 0;
  let streak = 1;
  for (let i = 1; i < days.length; i++) {
    const prev = new Date(days[i-1]);
    prev.setDate(prev.getDate()-1);
    if (dateKey(prev) === days[i]) streak++;
    else break;
  }
  return streak;
}

function updateStreakBadge() {
  const el = document.getElementById('streak-count');
  if (el) el.textContent = calcStreak();
}

// ═══════════════════════════════════════════
//  CALENDAR
// ═══════════════════════════════════════════
function loadCalData() {
  calMarks = JSON.parse(localStorage.getItem('cal_marks')||'{}');
  calNotes = JSON.parse(localStorage.getItem('cal_notes')||'{}');
}

function saveCalData() {
  localStorage.setItem('cal_marks', JSON.stringify(calMarks));
  localStorage.setItem('cal_notes', JSON.stringify(calNotes));
}

function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function entryDatesThisMonth() {
  const keys = new Set();
  entries.forEach(e => {
    const d = new Date(e.date);
    if (d.getFullYear()===calYear && d.getMonth()===calMonth) keys.add(dateKey(d));
  });
  return keys;
}

function renderCalendar() {
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const el = document.getElementById('cal-month-year');
  if (el) el.textContent = `${months[calMonth]} ${calYear}`;
  const grid = document.getElementById('cal-grid');
  if (!grid) return;

  const firstDay    = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth+1, 0).getDate();
  const daysInPrev  = new Date(calYear, calMonth, 0).getDate();
  const today       = dateKey(new Date());
  const entryDays   = entryDatesThisMonth();
  let html = '';

  for (let i=firstDay-1; i>=0; i--) {
    const d  = daysInPrev - i;
    const pm = calMonth===0?11:calMonth-1;
    const py = calMonth===0?calYear-1:calYear;
    html += dayHTML(d, `${py}-${String(pm+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`, true, today, entryDays);
  }
  for (let d=1; d<=daysInMonth; d++) {
    html += dayHTML(d, `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`, false, today, entryDays);
  }
  const rem = (firstDay+daysInMonth)%7===0 ? 0 : 7-((firstDay+daysInMonth)%7);
  for (let d=1; d<=rem; d++) {
    const nm = calMonth===11?0:calMonth+1;
    const ny = calMonth===11?calYear+1:calYear;
    html += dayHTML(d, `${ny}-${String(nm+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`, true, today, entryDays);
  }
  grid.innerHTML = html;
}

function dayHTML(d, key, other, today, entryDays) {
  const mark    = calMarks[key]||'';
  const hasNote = !!(calNotes[key]&&calNotes[key].trim());
  const classes = ['cal-day', other?'other-month':'', key===today?'today':'', mark?`mark-${mark}`:'', entryDays.has(key)?'has-entry':''].filter(Boolean).join(' ');
  return `<button class="${classes}" onclick="calDayClick('${key}')">
    <span class="cal-day-label">${d}</span>
    ${hasNote?'<span class="cal-note-dot"></span>':''}
  </button>`;
}

function calDayClick(key) {
  if (selectedMarkColor==='erase') { delete calMarks[key]; saveCalData(); renderCalendar(); openDateNote(key); return; }
  if (selectedMarkColor) { calMarks[key]=selectedMarkColor; saveCalData(); renderCalendar(); }
  openDateNote(key);
}

function openDateNote(key) {
  selectedCalDate = key;
  const section = document.getElementById('cal-note-section');
  if (section) section.style.display = 'block';
  const parts = key.split('-');
  const d = new Date(+parts[0], +parts[1]-1, +parts[2]);
  const lbl = document.getElementById('cal-note-date-label');
  if (lbl) lbl.textContent = d.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  const noteEl = document.getElementById('cal-note-text');
  if (noteEl) noteEl.value = calNotes[key]||'';
  const dayEntries = entries.filter(e => dateKey(new Date(e.date))===key);
  const entriesEl  = document.getElementById('cal-note-entries');
  if (entriesEl) {
    entriesEl.innerHTML = dayEntries.length>0
      ? `<div style="margin-top:8px;font-size:11px;color:var(--ink-f);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;">${dayEntries.length} entr${dayEntries.length>1?'ies':'y'} this day</div>` +
        dayEntries.map(e =>
          `<div style="font-family:var(--font-serif);font-size:13px;color:var(--ink-l);border-left:2px solid var(--border);padding-left:10px;margin-bottom:6px;cursor:pointer" onclick="showDetail('${e._id||e.id}')">
            ${e.mood?e.mood+' ':''}${escapeHtml((e.text||'').substring(0,80))}…
          </div>`
        ).join('')
      : '';
  }
}

function closeDateNote() {
  const s = document.getElementById('cal-note-section');
  if (s) s.style.display = 'none';
  selectedCalDate = null;
}

function saveCalNote() {
  if (!selectedCalDate) return;
  calNotes[selectedCalDate] = document.getElementById('cal-note-text')?.value||'';
  saveCalData();
  renderCalendar();
}

function prevMonth() { if(calMonth===0){calMonth=11;calYear--;}else calMonth--; renderCalendar(); closeDateNote(); }
function nextMonth() { if(calMonth===11){calMonth=0;calYear++;}else calMonth++; renderCalendar(); closeDateNote(); }

function setMarkColor(color) {
  selectedMarkColor = color;
  document.querySelectorAll('.legend-chip').forEach(c=>c.classList.remove('active'));
  const chip = document.querySelector(`.legend-chip[data-color="${color}"]`);
  if (chip) chip.classList.add('active');
}

// ═══════════════════════════════════════════
//  GRATITUDE
// ═══════════════════════════════════════════
function loadGratitudeHistory() {
  gratitudeHistory = JSON.parse(localStorage.getItem('gratitude_history')||'[]');
  const todayKey = dateKey(new Date());
  const todays   = gratitudeHistory.find(g=>g.date===todayKey);
  if (todays) {
    ['grateful-1','grateful-2','grateful-3'].forEach((id,i)=>{
      const el = document.getElementById(id);
      if (el && todays.items[i]) el.value = todays.items[i];
    });
  }
}

function addExtraGratitude() {
  extraGratitudeCount++;
  const wrap = document.getElementById('grateful-extra-wrap');
  if (!wrap) return;
  const div = document.createElement('div');
  div.className = 'grateful-card';
  div.innerHTML = `
    <div class="grateful-number">${3+extraGratitudeCount}</div>
    <div class="grateful-item-wrap">
      <p class="grateful-prompt">One more thing…</p>
      <input type="text" class="grateful-input extra-grateful" placeholder="something else you're grateful for…"/>
    </div>`;
  wrap.appendChild(div);
  div.querySelector('input').focus();
}

function saveGratitude() {
  const items = [
    document.getElementById('grateful-1')?.value.trim(),
    document.getElementById('grateful-2')?.value.trim(),
    document.getElementById('grateful-3')?.value.trim(),
    ...[...document.querySelectorAll('.extra-grateful')].map(el=>el.value.trim()),
  ].filter(Boolean);

  if (items.length===0) { showToast('Add at least one thing!'); return; }

  const todayKey = dateKey(new Date());
  const idx      = gratitudeHistory.findIndex(g=>g.date===todayKey);
  const record   = { date:todayKey, items };
  if (idx>=0) gratitudeHistory[idx]=record; else gratitudeHistory.unshift(record);
  localStorage.setItem('gratitude_history', JSON.stringify(gratitudeHistory));
  showToast('Gratitude saved 🌿');
  renderGratitudeHistory();
}

function renderGratitudeHistory() {
  const container = document.getElementById('grateful-history');
  if (!container) return;
  const past = gratitudeHistory.filter(g=>g.date!==dateKey(new Date()));
  if (past.length===0) { container.innerHTML=''; return; }
  container.innerHTML = `<div class="grateful-history-title">Past entries</div>` +
    past.slice(0,10).map(g=>{
      const parts = g.date.split('-');
      const d = new Date(+parts[0],+parts[1]-1,+parts[2]);
      return `<div class="grateful-history-item">
        <div class="grateful-history-date">${d.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</div>
        <ul class="grateful-history-things">${g.items.map(i=>`<li>${escapeHtml(i)}</li>`).join('')}</ul>
      </div>`;
    }).join('');
}

// ═══════════════════════════════════════════
//  INSIGHTS
// ═══════════════════════════════════════════
function renderInsights() {
  const streak   = calcStreak();
  const total    = entries.length;
  const totWords = totalWords(entries);
  const avg      = total>0 ? Math.round(totWords/total) : 0;

  const set = (id,val)=>{ const el=document.getElementById(id); if(el) el.textContent=val; };
  set('stat-total-entries', total);
  set('stat-total-words',   totWords.toLocaleString());
  set('stat-streak',        streak);
  set('stat-avg-words',     avg);

  renderMoodBreakdown();
  renderHeatmap();
  renderAchievements();
  renderWordCloud();
}

function renderMoodBreakdown() {
  const container = document.getElementById('mood-breakdown');
  if (!container) return;
  const moodEntries = entries.filter(e=>e.mood);
  if (moodEntries.length===0) { container.innerHTML='<p style="color:var(--ink-f);font-size:14px">No mood data yet.</p>'; return; }
  const counts = {};
  moodEntries.forEach(e=>{ counts[e.mood]=(counts[e.mood]||0)+1; });
  const sorted = Object.entries(counts).sort((a,b)=>b[1]-a[1]);
  const max    = sorted[0][1];
  container.innerHTML = sorted.map(([emoji,count])=>
    `<div class="mood-bar-row">
      <span class="mood-bar-emoji">${emoji}</span>
      <div class="mood-bar-track"><div class="mood-bar-fill" style="width:${Math.round(count/max*100)}%"></div></div>
      <span class="mood-bar-count">${count}</span>
    </div>`
  ).join('');
}

function renderHeatmap() {
  const container = document.getElementById('heatmap');
  if (!container) return;
  const today    = new Date();
  const startDay = new Date(today);
  startDay.setDate(today.getDate() - (12*7-1));
  const dayCounts = {};
  entries.forEach(e=>{ const k=dateKey(new Date(e.date)); dayCounts[k]=(dayCounts[k]||0)+1; });
  const max = Math.max(1,...Object.values(dayCounts));
  let html  = '';
  const cur = new Date(startDay);
  while (cur<=today) {
    const k     = dateKey(cur);
    const count = dayCounts[k]||0;
    const level = count===0?0:count<max*0.33?1:count<max*0.66?2:3;
    html += `<div class="hm-cell" data-level="${level}" title="${cur.toLocaleDateString('en-GB',{day:'numeric',month:'short'})}: ${count} entr${count===1?'y':'ies'}"></div>`;
    cur.setDate(cur.getDate()+1);
  }
  container.innerHTML = html;
}

function renderAchievements() {
  const container = document.getElementById('achievements-grid');
  if (!container) return;
  const streak = calcStreak();
  container.innerHTML = ACHIEVEMENTS_DEF.map(ach=>{
    const earned = ach.check(entries, gratitudeHistory, streak);
    return `<div class="achievement ${earned?'unlocked':'locked'}">
      <div class="achievement-icon">${ach.icon}</div>
      <div class="achievement-name">${ach.name}</div>
      <div class="achievement-desc">${ach.desc}</div>
    </div>`;
  }).join('');
}

function renderWordCloud() {
  const container = document.getElementById('word-cloud');
  if (!container) return;
  const stopWords = new Set(['the','a','an','and','or','but','in','on','at','to','for','of','with','i','you','he','she','it','we','they','is','was','are','were','be','been','have','has','had','do','does','did','will','would','could','should','that','this','these','those','my','your','his','her','our','their','me','him','us','them','what','which','who','how','when','where','why','if','as','so','not','no','yes','just','very','really','more','much','some','any','all','many','most','about','after','before','now','then','here','there','today','time','day','feel','think','know','want','need','like','see']);
  const allText = entries.map(e=>e.text||'').join(' ');
  const words   = allText.toLowerCase().match(/\b[a-z]{4,}\b/g)||[];
  const freq    = {};
  words.forEach(w=>{ if(!stopWords.has(w)) freq[w]=(freq[w]||0)+1; });
  const sorted = Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,30);
  if (sorted.length===0) { container.innerHTML='<p style="color:var(--ink-f);font-size:14px">Write more to see your favourite words!</p>'; return; }
  const maxF = sorted[0][1];
  container.innerHTML = sorted.map(([word,count])=>{
    const size = 12 + Math.round((count/maxF)*18);
    return `<span class="wc-word" style="font-size:${size}px" title="${count} times">${word}</span>`;
  }).join('');
}

// ═══════════════════════════════════════════
//  TIME CAPSULE (local storage only)
// ═══════════════════════════════════════════
function loadCapsules() {
  capsules = JSON.parse(localStorage.getItem('time_capsules')||'[]');
}

function saveCapsules() {
  localStorage.setItem('time_capsules', JSON.stringify(capsules));
}

function sealCapsule() {
  const text    = document.getElementById('capsule-text')?.value.trim();
  const dateStr = document.getElementById('capsule-date')?.value;
  if (!text)    { showToast('Write your letter first!'); return; }
  if (!dateStr) { showToast('Choose a date to unlock it!'); return; }
  const unlockDate = new Date(dateStr);
  if (unlockDate <= new Date()) { showToast('Choose a future date!'); return; }
  capsules.unshift({ id:Date.now(), text, writtenAt:new Date().toISOString(), unlockDate:unlockDate.toISOString() });
  saveCapsules();
  const ta = document.getElementById('capsule-text');
  const di = document.getElementById('capsule-date');
  if (ta) ta.value = '';
  if (di) di.value = '';
  showToast('Capsule sealed! 🔒');
  renderCapsules();
}

function renderCapsules() {
  const container = document.getElementById('capsule-list');
  if (!container) return;
  if (capsules.length===0) { container.innerHTML='<p style="color:var(--ink-f);font-family:var(--font-serif);font-style:italic;padding:20px 0">No capsules yet. Write a letter to your future self!</p>'; return; }
  const now = new Date();
  container.innerHTML = capsules.map(c=>{
    const unlock   = new Date(c.unlockDate);
    const locked   = unlock > now;
    const written  = new Date(c.writtenAt);
    const daysLeft = locked ? Math.ceil((unlock-now)/86400000) : 0;
    return `<div class="capsule-item ${locked?'locked':'unlocked'}">
      <div class="capsule-meta">Written ${written.toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})} · ${locked?'Unlocks':'Unlocked'} ${unlock.toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}</div>
      ${locked
        ? `<div class="capsule-preview blurred">This letter is sealed and waiting for you…</div>
           <div class="days-remaining">${daysLeft} day${daysLeft!==1?'s':''} to go ⏳</div>`
        : `<div class="capsule-preview">${escapeHtml(c.text)}</div>`
      }
      ${!locked?`<button class="btn-tiny capsule-unlock-btn" onclick="deleteCapsule(${c.id})">Archive 📦</button>`:''}
    </div>`;
  }).join('');
}

function deleteCapsule(id) {
  if (!confirm('Archive this capsule?')) return;
  capsules = capsules.filter(c=>c.id!==id);
  saveCapsules();
  renderCapsules();
}

// ═══════════════════════════════════════════
//  EXPORT
// ═══════════════════════════════════════════
function exportEntries() {
  if (entries.length===0) { showToast('No entries to export!'); return; }
  const lines = ['MY LIFE JOURNAL','═'.repeat(40),''];
  entries.forEach(e=>{
    lines.push(formatDate(e.date));
    if (e.mood) lines.push('Mood: '+e.mood);
    if ((e.tags||[]).length) lines.push('Tags: '+e.tags.map(t=>'#'+t).join(' '));
    lines.push('─'.repeat(30));
    lines.push(e.text);
    lines.push('','');
  });
  lines.push('─'.repeat(40));
  lines.push(`Exported ${new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}`);
  lines.push(`Total: ${entries.length} entries · ${totalWords(entries).toLocaleString()} words`);
  const blob = new Blob([lines.join('\n')],{type:'text/plain;charset=utf-8'});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `my-journal-${dateKey(new Date())}.txt`;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
  showToast('Journal exported ⬇️');
}

// ═══════════════════════════════════════════
//  NOTIFICATIONS + BACKEND PING
// ═══════════════════════════════════════════
async function checkBackendAvailability() {
  try { await fetch(BACKEND_URL+'/'); } catch(_) {}
  const banner = document.getElementById('reminder-banner');
  if (banner) banner.style.display = 'flex';
}

async function subscribeEmail() {
  const email = document.getElementById('reminder-email')?.value.trim();
  if (!email) { showToast('Enter your email first!'); return; }
  try {
    const res  = await fetch(BACKEND_URL+'/subscribe',{
      method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email})
    });
    const data = await res.json();
    showToast(res.ok ? (data.message||'Subscribed!') : (data.error||'Failed'));
    if (res.ok) { const inp=document.getElementById('reminder-email'); if(inp) inp.value=''; }
  } catch(_) { showToast('Could not connect to server.'); }
}

function updateNotificationButton() {
  const btn = document.getElementById('notification-button');
  if (!btn||!('Notification' in window)) { if(btn) btn.style.display='none'; return; }
  if (Notification.permission==='granted')  { btn.textContent='🔔 On';      btn.disabled=true; }
  else if (Notification.permission==='denied') { btn.textContent='🔕 Blocked'; btn.disabled=true; }
  else { btn.textContent='🔔 Enable'; btn.disabled=false; }
}

async function enableNotifications() {
  if (!('Notification' in window)) { showToast('Not supported here.'); return; }
  if (Notification.permission==='granted') { showToast('Already enabled!'); return; }
  const perm = await Notification.requestPermission();
  if (perm==='granted') {
    showToast("You'll get daily reminders!");
    new Notification('MyLife Journal',{body:'Notifications enabled 📓'});
  } else { showToast('Enable in browser settings.'); }
  updateNotificationButton();
}

// ═══════════════════════════════════════════
//  WEATHER
// ═══════════════════════════════════════════
async function loadWeather() {
  const iconEl = document.getElementById('weather-icon');
  const textEl = document.getElementById('weather-text');
  if (!navigator.geolocation) { if(textEl) textEl.textContent='Weather unavailable'; return; }
  navigator.geolocation.getCurrentPosition(async pos=>{
    const {latitude:lat,longitude:lon} = pos.coords;
    try {
      const res  = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
      const data = await res.json();
      const {temperature:temp,weathercode:code} = data.current_weather;
      if(iconEl) iconEl.textContent = getWeatherIcon(code);
      if(textEl) textEl.textContent = `${temp}°C — ${getWeatherDesc(code)}`;
    } catch(_) { if(textEl) textEl.textContent='Weather unavailable'; }
  }, ()=>{ if(textEl) textEl.textContent='Location denied'; }, {timeout:7000});
}

function getWeatherIcon(c) {
  if(c===0)return'☀️';if(c<=2)return'⛅';if(c<=3)return'☁️';
  if(c<=67)return'🌧️';if(c<=77)return'❄️';if(c<=99)return'⛈️';return'🌤️';
}
function getWeatherDesc(c) {
  if(c===0)return'Clear sky';if(c<=2)return'Partly cloudy';if(c<=3)return'Overcast';
  if(c<=51)return'Drizzle';if(c<=67)return'Rainy';if(c<=77)return'Snowy';
  if(c<=99)return'Thunderstorm';return'Cloudy';
}

// ═══════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════
function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'long',year:'numeric'});
}

function escapeHtml(str) {
  return String(str||'')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── TOAST ──
function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(()=> toast.classList.remove('show'), 2600);
}