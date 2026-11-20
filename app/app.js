/* Lumi Edits — app.js (vanilla JS SPA)
   Sections:
     1. Constants, defaults, state
     2. Init & bindings
     3. API + upload helpers (preserved request helper)
     4. Utilities (escaping, URLs, time, editor bridge)
     5. Appearance / menu / overlay sheet helpers
     6. Navigation & state loading (/api/state with fallbacks)
     7. Reels tab (feed, filters, review, download, notes)
     8. Styles tab (catalog, draft selection)
     9. New reel stepper (clips -> title -> brief -> create)
    10. Editor / export sheet + versions
    11. Cover editor
    12. Post kit
    13. Chat
    14. Pay
    15. Boot
*/

const API = '/api';
const TOKEN_KEY = 'lumi_token';
const THEME_KEY = 'lumi_theme';           // look theme (legacy key, preserved)
const APPEARANCE_KEY = 'lumi_appearance'; // light | dark | auto
const DRAFT_KEY = 'lumi_draft';
const COVER_KEY = 'lumi_covers';
const EDIT_KEY = 'lumi_edits_v1';

/* ---------- Default catalog (used when API catalog is missing) ---------- */
const LOOKS = [
  { id: 'classic', name: 'Classic', desc: 'Clean paper, bold ink.', p1: '#f3efe4', p2: '#d8d0bd' },
  { id: 'glass', name: 'Glass', desc: 'Frosted panels, soft blur.', p1: '#dbe4ff', p2: '#a5b4fc' },
  { id: 'dojo', name: 'Dojo', desc: 'Dark training-mat aesthetic.', p1: '#312e81', p2: '#0f0e2e' },
  { id: 'clay', name: 'Clay', desc: 'Soft clay, deep shadows.', p1: '#f6e2cc', p2: '#c98f62' },
  { id: 'cleangirl', name: 'Clean Girl', desc: 'Minimal neutral, glazed.', p1: '#fff1f4', p2: '#f2c9d6' },
  { id: 'strawberry', name: 'Strawberry', desc: 'Berry pink, glossy.', p1: '#ffd6e7', p2: '#f472b6' },
  { id: 'matcha', name: 'Matcha', desc: 'Earthy, calm green.', p1: '#e4f0d8', p2: '#8ab17d' },
  { id: 'golden', name: 'Golden', desc: 'Warm gold on cream.', p1: '#fff1bd', p2: '#d4af37' },
  { id: 'silentpower', name: 'Silent Power', desc: 'High-contrast minimal.', p1: '#3f3f46', p2: '#09090b' },
  { id: 'everybody', name: 'Everybody', desc: 'Bold, playful color pop.', p1: '#fde68a', p2: '#fb7185' },
];

const DEFAULT_CATALOG = {
  styles: LOOKS,
  templates: LOOKS.map((l) => ({ id: l.id, name: l.name, desc: l.desc, p1: l.p1, p2: l.p2 })),
  captions: [
    { id: 'bold', name: 'Bold', desc: 'Big, high-contrast words.' },
    { id: 'highlight', name: 'Highlight', desc: 'Keyword pops.' },
    { id: 'two-tone', name: 'Two-tone', desc: 'Dual-color captions.' },
    { id: 'minimal', name: 'Minimal', desc: 'Quiet, small text.' },
    { id: 'karaoke', name: 'Karaoke', desc: 'Word-by-word fill.' },
  ],
  motion: [
    { id: 'none', name: 'None', desc: 'No motion graphics.' },
    { id: 'zoom', name: 'Zoom punch', desc: 'Beat-synced punch-ins.' },
    { id: 'kinetic', name: 'Kinetic type', desc: 'Moving typography.' },
    { id: 'arrows', name: 'Arrows & callouts', desc: 'Point to details.' },
    { id: 'transitions', name: 'Transitions', desc: 'Whips and matches.' },
  ],
  vfx: [
    { id: 'none', name: 'None', desc: 'No visual effects.' },
    { id: 'glow', name: 'Glow', desc: 'Soft light bloom.' },
    { id: 'grain', name: 'Film grain', desc: 'Analog texture.' },
    { id: 'glitch', name: 'Glitch', desc: 'Digital distortion.' },
    { id: 'speed', name: 'Speed ramps', desc: 'Fast / slow pushes.' },
  ],
  grades: [
    { id: 'none', name: 'Original', desc: 'No grade.' },
    { id: 'warm', name: 'Warm', desc: 'Golden highlights.' },
    { id: 'cool', name: 'Cool', desc: 'Clean blue tones.' },
    { id: 'film', name: 'Film', desc: 'Faded print look.' },
    { id: 'mono', name: 'Mono', desc: 'Black and white.' },
  ],
  hooks: [
    { id: 'control', name: 'Control', desc: 'Take charge from frame one.' },
    { id: 'wait-for', name: 'Wait-for', desc: 'Build the reveal.' },
    { id: 'flash-forward', name: 'Flash-forward', desc: 'Show the payoff first.' },
    { id: 'cold-open', name: 'Cold open', desc: 'Start mid-moment.' },
    { id: 'series-pitch', name: 'Series pitch', desc: 'Set up a recurring format.' },
  ],
  backgrounds: [
    { id: 'original', name: 'Original', desc: 'Keep your footage.' },
    { id: 'checker', name: 'Checker', desc: 'Studio checkered.' },
    { id: 'blur', name: 'Blur', desc: 'Soft blurred frame.' },
    { id: 'gradient', name: 'Gradient', desc: 'Color backdrop.' },
  ],
  music: [
    { id: 'name', name: 'A song I name', desc: 'I will send the track.' },
    { id: 'trending', name: 'Trending music', desc: 'Pick something current.' },
    { id: 'decide', name: 'You decide', desc: 'Lumi picks the bed.' },
    { id: 'none', name: 'No music', desc: 'Keep it dry.' },
  ],
  voices: [
    { id: 'none', name: 'No', desc: 'No voiceover.' },
    { id: 'ai', name: 'AI voiceover (preference only)', desc: 'Saved to your brief; no voice is generated locally.' },
    { id: 'upload', name: 'Yes, upload', desc: 'I will send audio.' },
    { id: 'record', name: 'Yes, record', desc: 'Record in Lumi.' },
  ],
  formats: [
    { id: 'vertical', name: 'Vertical 9:16', desc: 'Reels / TikTok / Shorts.' },
    { id: 'horizontal', name: 'Horizontal', desc: 'Keep the wide frame.' },
  ],
  intensities: [
    { id: 'Clean', name: 'Clean', desc: 'Minimal cuts.' },
    { id: 'Polished', name: 'Polished', desc: 'Balanced edit.' },
    { id: 'Punchy', name: 'Punchy', desc: 'Fast and bold.' },
    { id: 'Full Sauce', name: 'Full Sauce', desc: 'Everything on.' },
  ],
};

const BRIEF_FIELDS = [
  { key: 'videoType', label: 'Video type', catalog: null, options: ['Short-form reel', 'Long-form edit', 'Ad / promo', 'Tutorial', 'Story / vlog'] },
  { key: 'look', label: 'Look / template', catalog: 'templates' },
  { key: 'captionStyle', label: 'Caption style', catalog: 'captions' },
  { key: 'motion', label: 'Motion graphics', catalog: 'motion' },
  { key: 'vfx', label: 'Visual effects', catalog: 'vfx' },
  { key: 'intensity', label: 'Editing intensity', options: ['Clean', 'Polished', 'Punchy', 'Full Sauce'] },
  { key: 'hookStyle', label: 'Hook style', options: ['Control', 'Wait-for', 'Flash-forward', 'Cold open', 'Series pitch'] },
  { key: 'background', label: 'Background', catalog: 'backgrounds' },
  { key: 'music', label: 'Music', options: ['A song I name', 'Trending music', 'You decide', 'No music'] },
  { key: 'voiceover', label: 'Voiceover', options: ['No', 'AI voiceover (preference only)', 'Yes upload', 'Yes record'] },
  { key: 'length', label: 'Length', options: ['15–30 seconds', '30–45 seconds', '45–60 seconds', '60+ seconds'] },
  { key: 'grade', label: 'Color / grade', catalog: 'grades' },
];

const SUPPORTED_LINK_HINT = 'YouTube · Instagram · TikTok · Vimeo · Google Drive · Dropbox';

const NOTE_KINDS = [
  { id: 'general', label: 'General' },
  { id: 'storyboard', label: 'Storyboard' },
  { id: 'caption', label: 'Caption' },
  { id: 'broll', label: 'B-roll' },
  { id: 'motion', label: 'Motion' },
  { id: 'sfx', label: 'SFX' },
];

const STAGE_LABELS = {
  intake: 'Intake',
  assets: 'Assets',
  storyboard: 'Storyboard',
  approved: 'Approved',
  editing: 'Editing',
  review: 'Review',
  done: 'Done',
  waiting: 'Waiting',
  local_only: 'Local only',
  unknown: 'Unknown',
};

const app = {
  state: {
    user: null,
    token: null,
    theme: 'classic',           // look theme
    appearance: 'auto',         // light | dark | auto
    activeTab: 'reels',
    reels: [],
    styles: [],
    catalog: {},
    draft: {},
    account: {},
    price: { reel: 20, monthly: 60, monthlyReels: 10 },
    notices: [],
    conversations: [],
    activeConversation: null,
    messages: [],
    isAuthShown: true,
    reelFilter: 'mine',
    stylesSegment: 'templates',
    likePending: new Set(),
    covers: {},
    edits: {},                  // reelId -> local edit model (timeline, motion, captions)
    localSources: {},           // reelId -> object URL (for local preview/export)
    editorCtrl: null,           // camera controller
    editPreview: null,          // canvas preview controller
    newReel: null,
  },

  /* =====================================================================
     1. INIT & BINDINGS
     ===================================================================== */
  init() {
    this.state.catalog = this.defaultCatalog();
    this.state.newReel = this.freshNewReel();

    this.bindNav();
    this.bindTheme();
    this.bindAuth();
    this.bindHeader();
    this.bindChat();
    this.bindGlobalDelegation();

    const token = localStorage.getItem(TOKEN_KEY);
    const appearance = localStorage.getItem(APPEARANCE_KEY) || 'auto';
    const look = localStorage.getItem(THEME_KEY) || 'classic';
    this.state.appearance = appearance;
    this.setLook(look, false);
    this.applyAppearance();

    try {
      const raw = localStorage.getItem(COVER_KEY);
      if (raw) this.state.covers = JSON.parse(raw) || {};
    } catch (e) { this.state.covers = {}; }

    try {
      const raw = localStorage.getItem(EDIT_KEY);
      if (raw) this.state.edits = JSON.parse(raw) || {};
    } catch (e) { this.state.edits = {}; }

    if (token) {
      this.state.token = token;
      this.fetchMe();
    } else {
      this.showAuth();
    }
  },

  bindNav() {
    document.querySelectorAll('.tab-nav .tab').forEach((tab) => {
      tab.addEventListener('click', (e) => {
        e.preventDefault();
        this.openTab(tab.dataset.tab);
      });
    });
  },

  bindHeader() {
    const headerNew = document.getElementById('header-newreel');
    if (headerNew) headerNew.addEventListener('click', () => { this.resetNewReel(); this.openTab('newreel'); });
    const menu = document.getElementById('menu-btn');
    if (menu) menu.addEventListener('click', () => this.openAppearanceSheet());
    const inbox = document.getElementById('inbox-btn');
    if (inbox) inbox.addEventListener('click', () => this.openInbox());
  },

  // Global delegated actions (works for dynamically rendered HTML too)
  bindGlobalDelegation() {
    document.addEventListener('click', (e) => {
      const el = e.target.closest('[data-close-sheet]');
      if (el) { e.preventDefault(); this.closeSheet(); return; }
      const act = e.target.closest('[data-action]');
      if (!act) return;
      const name = act.dataset.action;
      const id = act.dataset.id || '';
      if (name === 'review') this.openReview(id);
      else if (name === 'cover') this.openCover(id);
      else if (name === 'postkit') this.openPostKit(id);
      else if (name === 'edit') this.openEditor(id);
      else if (name === 'download') this.downloadReel(id);
      else if (name === 'raw') this.openRawClips(id);
      else if (name === 'resolve-note') this.resolveNote(id, act.dataset.note || '');
      else if (name === 'approve-storyboard') this.approveStoryboard(id);
      else if (name === 'copypost') this.copyText(id);
    });
  },

  /* =====================================================================
     2. API + UPLOAD HELPERS  (original request helper preserved)
     ===================================================================== */
  async request(path, { method = 'GET', body, auth = true } = {}) {
    const headers = {};
    if (body && !(body instanceof FormData)) headers['Content-Type'] = 'application/json';
    if (auth && this.state.token) headers['Authorization'] = `Bearer ${this.state.token}`;

    let res;
    try {
      res = await fetch(`${API}${path}`, {
        method,
        headers,
        body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
      });
    } catch (err) {
      throw new Error('Network error. Is the API running?');
    }

    if (res.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      this.state.token = null;
      this.state.user = null;
      this.showAuth();
      throw new Error('Session expired. Please log in again.');
    }

    const text = await res.text();
    let data;
    try { data = text ? JSON.parse(text) : {}; } catch (e) { data = {}; }

    if (!res.ok) {
      throw new Error(data.error || `Request failed (${res.status})`);
    }
    return data;
  },

  idem() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  },

  // Presigned PUT upload; returns permanent public URL.
  // meta maps to the existing upload bookkeeping fields (kind/batch/ofIndex/reelId).
  async uploadBlob(blob, fileName, meta = {}) {
    const fileType = blob.type || 'application/octet-stream';
    const signed = await this.request('/upload', {
      method: 'POST',
      body: {
        fileName: fileName || 'upload.mp4',
        fileType,
        kind: meta.kind || 'raw',
        batch: meta.batch || '',
        ofIndex: meta.ofIndex || 0,
        reelId: meta.reelId || '',
      },
    });
    if (!signed || !signed.uploadUrl || !signed.publicUrl) {
      throw new Error('Upload service unavailable');
    }
    const put = await fetch(signed.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': fileType },
      body: blob,
    });
    if (!put.ok) throw new Error(`Upload failed (${put.status})`);
    return signed.publicUrl;
  },

  async saveDraftImmediate() {
    const d = this.state.draft;
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); } catch (e) { /* storage disabled */ }
    try {
      await this.request('/drafts', { method: 'PUT', body: { draft: d } });
    } catch (e) {
      // Local fallback is enough for this deployment.
    }
  },

  saveDraft() {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(this.state.draft)); } catch (e) { /* noop */ }
    clearTimeout(this._draftTimer);
    this._draftTimer = setTimeout(() => {
      this.request('/drafts', { method: 'PUT', body: { draft: this.state.draft } }).catch(() => {});
    }, 450);
  },

  /* =====================================================================
     3. AUTH (behavior preserved)
     ===================================================================== */
  bindAuth() {
    const form = document.getElementById('auth-form');
    const modeInput = document.getElementById('auth-mode');
    const tabs = document.querySelectorAll('#auth-overlay .tab');
    const btn = document.getElementById('auth-btn');

    tabs.forEach((t) => {
      t.addEventListener('click', () => {
        const mode = t.dataset.tab;
        modeInput.value = mode;
        tabs.forEach((x) => x.classList.toggle('active', x === t));
        const isLogin = mode === 'login';
        const toggle = document.getElementById('auth-toggle');
        toggle.innerHTML = isLogin
          ? "Don't have an account? <span>Create one</span>"
          : "Already have an account? <span>Log in</span>";
        btn.textContent = isLogin ? 'Continue' : 'Create account';
        this.rebindToggle();
      });
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const payload = Object.fromEntries(fd);
      const mode = modeInput.value;
      try {
        btn.disabled = true;
        btn.textContent = mode === 'login' ? 'Signing in…' : 'Creating…';
        const data = mode === 'login'
          ? await this.request('/auth/login', { method: 'POST', body: payload })
          : await this.request('/auth/register', { method: 'POST', body: payload });
        this.state.token = data.token;
        this.state.user = data.user;
        localStorage.setItem(TOKEN_KEY, data.token);
        this.hideAuth();
        this.loadData();
        this.openTab('reels');
      } catch (err) {
        this.toast(err.message || 'Auth failed');
      } finally {
        btn.disabled = false;
        btn.textContent = mode === 'login' ? 'Continue' : 'Create account';
      }
    });
    this.rebindToggle();
  },

  rebindToggle() {
    const t = document.getElementById('auth-toggle');
    if (!t) return;
    t.onclick = (e) => {
      const span = e.target.closest('span');
      if (!span) return;
      const mode = span.textContent === 'Create one' ? 'register' : 'login';
      const target = document.querySelector(`#auth-overlay .tab[data-tab="${mode}"]`);
      if (target) target.click();
    };
  },

  async fetchMe() {
    try {
      const data = await this.request('/auth/me', { auth: true });
      this.state.user = data.user;
      this.hideAuth();
      this.loadData();
      this.openTab('reels');
    } catch (err) {
      this.showAuth();
    }
  },

  showAuth() {
    this.state.isAuthShown = true;
    document.getElementById('auth-overlay').classList.remove('hidden');
    document.getElementById('shell-header').classList.add('hidden');
    document.getElementById('tab-nav').classList.add('hidden');
    document.querySelectorAll('.view').forEach((v) => v.classList.add('hidden'));
  },

  hideAuth() {
    this.state.isAuthShown = false;
    document.getElementById('auth-overlay').classList.add('hidden');
    document.getElementById('shell-header').classList.remove('hidden');
    document.getElementById('tab-nav').classList.remove('hidden');
  },

  /* =====================================================================
     4. UTILITIES
     ===================================================================== */
  // Escape every user-controlled string before innerHTML (text + attributes).
  esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  },

  // Only allow http(s), blob, and media data URLs for src/href attributes.
  safeUrl(value) {
    if (!value) return '';
    const s = String(value).trim();
    if (/^(https?:\/\/|blob:|data:(image|video|audio)\/)/i.test(s)) return s;
    return '';
  },

  // Colors interpolated into inline CSS must not become url()/expression().
  safeColor(value, fallback) {
    const s = String(value == null ? '' : value).trim();
    return /^(#[0-9a-f]{3,8}|rgba?\([\d.,\s%]+\)|[a-z]+)$/i.test(s) ? s : fallback;
  },

  // Escape a value placed inside a JS string literal in an inline onclick.
  jsAttr(value) {
    return this.esc(String(value == null ? '' : value)
      .replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, ' '));
  },

  fmtTime(seconds) {
    const n = Number(seconds);
    if (!isFinite(n) || n < 0) return '0:00';
    const m = Math.floor(n / 60);
    const s = Math.floor(n % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  },

  fmtBytes(bytes) {
    const n = Number(bytes) || 0;
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
    return `${(n / 1024 / 1024).toFixed(1)} MB`;
  },

  /* Reels from db.reelShape() carry versions[] (not a top-level version). */
  latestVersion(reel) {
    const versions = Array.isArray(reel && reel.versions) ? reel.versions : [];
    return versions.length ? versions[versions.length - 1] : null;
  },

  reelVersion(reel) {
    const versions = Array.isArray(reel && reel.versions) ? reel.versions : [];
    return versions.length || 1;
  },

  reelVideoUrl(reel) {
    if (!reel) return '';
    const latest = this.latestVersion(reel);
    return this.safeUrl((latest && latest.videoUrl) || reel.videoUrl || this.state.localSources[reel.id]);
  },

  reelPosterUrl(reel) {
    if (!reel) return '';
    const latest = this.latestVersion(reel);
    return this.safeUrl((latest && latest.posterUrl) || reel.posterUrl || this.state.covers[reel.id]);
  },

  reelRevisions(reel) {
    if (reel && reel.revision != null) return Number(reel.revision) || 0;
    return Array.isArray(reel && reel.notes) ? reel.notes.length : 0;
  },

  reelRevisionLimit(reel) {
    if (reel && reel.revisionLimit != null) return Number(reel.revisionLimit) || 3;
    return 3;
  },

  defaultCatalog() {
    // Deep-ish copy so mutations do not touch defaults.
    const out = {};
    Object.keys(DEFAULT_CATALOG).forEach((k) => { out[k] = DEFAULT_CATALOG[k].slice(); });
    return out;
  },

  catalogList(key) {
    const raw = this.state.catalog && this.state.catalog[key];
    const list = Array.isArray(raw) && raw.length ? raw : (DEFAULT_CATALOG[key] || []);
    return list.map((x) => {
      if (typeof x === 'string') return { id: x, name: x, desc: '' };
      const o = x || {};
      return {
        id: o.id != null ? o.id : (o.name || ''),
        name: o.name || o.title || o.id || 'Option',
        desc: o.desc || o.description || '',
        p1: o.p1 || o.preview || '',
        p2: o.p2 || '',
      };
    });
  },

  optionName(key, id) {
    const items = this.catalogList(key);
    const hit = items.find((x) => String(x.id) === String(id));
    return hit ? hit.name : (id || '');
  },

  toast(msg, ms = 3200) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = String(msg);
    el.classList.remove('hidden');
    requestAnimationFrame(() => el.classList.add('show'));
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.classList.add('hidden'), 260);
    }, ms);
  },

  /* ---------- Editor bridge (graceful fallbacks) ---------- */
  editor() {
    return (typeof window !== 'undefined' && window.LumiEditor) ? window.LumiEditor : null;
  },

  editorCan(method) {
    const E = this.editor();
    if (!E || typeof E[method] !== 'function') return false;
    try {
      const p = typeof E.probes === 'function' ? E.probes() : E.probes;
      if (p && typeof p === 'object') {
        const needle = method.toLowerCase().replace('video', '');
        for (const k of Object.keys(p)) {
          if (p[k] === false) {
            const key = k.toLowerCase();
            if (key.includes(needle) || needle.includes(key)) return false;
          }
        }
      }
    } catch (e) { /* probes failed: assume method works */ }
    return true;
  },

  /* ---------- Local edit model (timeline, motion, audio, captions) ---------- */
  editModel() {
    return (typeof window !== 'undefined' && window.LumiEditModel) ? window.LumiEditModel : null;
  },

  getEdit(reel) {
    const M = this.editModel();
    const id = String(reel?.id || 'draft');
    const saved = this.state.edits[id];
    if (saved && Array.isArray(saved.clips) && saved.clips.length) return saved;
    const fresh = M ? M.defaultEdit(reel) : { clips: [], captions: [], look: reel?.look || 'classic', format: reel?.format || 'vertical' };
    this.saveEdit(id, fresh);
    return fresh;
  },

  saveEdit(id, edit) {
    const key = String(id || 'draft');
    edit.version = 1;
    edit.updated = new Date().toISOString();
    this.state.edits[key] = edit;
    try { localStorage.setItem(EDIT_KEY, JSON.stringify(this.state.edits)); } catch (e) { /* storage is best effort */ }
    return edit;
  },

  editExportClips(edit) {
    const M = this.editModel();
    const norm = M ? M.normalizeTimeline(edit.clips, {
      look: edit.look, format: edit.format, musicMode: edit.musicMode
    }) : { clips: edit.clips || [], total: 30 };
    return { clips: norm.clips, total: norm.total };
  },

  /* =====================================================================
     5. APPEARANCE / MENU / OVERLAY SHEETS
     ===================================================================== */
  bindTheme() {
    window.setTheme = (name) => this.setLook(name);
  },

  applyAppearance() {
    const root = document.documentElement;
    root.setAttribute('data-theme', this.state.appearance || 'auto');
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', this.state.appearance === 'dark' ? '#0f0f10' : '#f6f3ec');
  },

  setAppearance(mode) {
    this.state.appearance = mode;
    localStorage.setItem(APPEARANCE_KEY, mode);
    this.applyAppearance();
    this.closeSheet();
    this.toast('Appearance updated');
  },

  setLook(name, persist = true) {
    const id = String(name || 'classic');
    this.state.theme = id;
    if (persist) localStorage.setItem(THEME_KEY, id);
    document.documentElement.setAttribute('data-look', id === 'classic' || id === 'paper' ? '' : id);
    if (id === 'classic' || id === 'paper') document.documentElement.removeAttribute('data-look');
  },

  openAppearanceSheet() {
    const modeBtn = (m, label) => `<button class="btn ${this.state.appearance === m ? 'btn-primary' : 'btn-ghost'}" onclick="app.setAppearance('${m}')">${label}</button>`;
    const looks = LOOKS.map((l) => `
      <button class="option-chip ${this.state.theme === l.id ? 'active' : ''}" onclick="app.setLook('${l.id}');app.closeSheet();app.renderStyles();">
        ${this.esc(l.name)}
      </button>`).join('');
    this.showSheet('Appearance', `
      <div class="section-title">Mode</div>
      <div class="btn-row">${modeBtn('light', 'Light')}${modeBtn('dark', 'Dark')}${modeBtn('auto', 'Match phone')}</div>
      <div class="section-title">Look theme</div>
      <div class="option-chips">
        <button class="option-chip ${this.state.theme === 'classic' ? 'active' : ''}" onclick="app.setLook('classic');app.closeSheet();app.renderStyles();">Classic</button>
        ${looks}
      </div>
      <p class="hint">Your choice is saved on this device.</p>
    `);
  },

  // Global overlay helpers used by review, cover, post kit, sheets.
  showSheet(title, bodyHtml, footHtml = '', opts = {}) {
    const root = document.getElementById('overlay-root');
    if (!root) return null;
    root.innerHTML = `
      <div class="overlay ${opts.center ? 'center' : ''}" id="global-overlay">
        <div class="sheet" role="dialog" aria-modal="true" aria-label="${this.esc(title)}">
          <div class="sheet-grab"></div>
          <div class="sheet-head">
            <h3>${this.esc(title)}</h3>
            <button class="icon-btn" data-close-sheet aria-label="Close">✕</button>
          </div>
          <div class="sheet-body">${bodyHtml}</div>
          ${footHtml ? `<div class="sheet-foot">${footHtml}</div>` : ''}
        </div>
      </div>`;
    const overlay = root.querySelector('#global-overlay');
    overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) this.closeSheet(); });
    if (typeof opts.onMount === 'function') opts.onMount(overlay);
    return overlay;
  },

  closeSheet() {
    const root = document.getElementById('overlay-root');
    if (root) root.innerHTML = '';
    if (this.state.editPreview && typeof this.state.editPreview.destroy === 'function') {
      try { this.state.editPreview.destroy(); } catch (e) { /* noop */ }
      this.state.editPreview = null;
    }
    if (this.state.editorCtrl && typeof this.state.editorCtrl.close === 'function' && !this.state.keepCamera) {
      try { this.state.editorCtrl.close(); } catch (e) { /* noop */ }
      this.state.editorCtrl = null;
    }
  },

  /* =====================================================================
     6. NAVIGATION & STATE LOADING
     ===================================================================== */
  openTab(tab) {
    this.state.activeTab = tab;
    document.querySelectorAll('.tab-nav .tab').forEach((t) => {
      t.classList.toggle('active', t.dataset.tab === tab);
      t.setAttribute('aria-current', t.dataset.tab === tab ? 'page' : null);
    });
    document.querySelectorAll('.view').forEach((v) => {
      v.classList.toggle('hidden', v.dataset.tab !== tab);
    });
    this.closeSheet();
    if (tab === 'styles') this.renderStyles();
    if (tab === 'chat') { this.renderConversations(); this.renderNotices(); }
    if (tab === 'reels') this.renderReels();
    if (tab === 'newreel') this.renderNewReel();
    if (tab === 'pay') this.renderPay();
  },

  loadData() {
    this.loadDraftFromStorage();
    return this.loadState();
  },

  async loadState() {
    try {
      const data = await this.request('/state');
      this.hydrateState(data || {});
      return;
    } catch (e) {
      // Fall back to the older endpoints; never break auth.
      this.loadStyles();
      this.loadReels();
      this.loadConversations();
    }
  },

  hydrateState(data) {
    if (data.user) this.state.user = data.user;
    const mergeList = (key, value) => {
      if (Array.isArray(value)) this.state[key] = value;
    };
    mergeList('reels', data.reels);
    mergeList('conversations', data.conversations);
    mergeList('notices', data.notices);

    if (data.catalog && typeof data.catalog === 'object') {
      const cat = this.defaultCatalog();
      Object.keys(data.catalog).forEach((k) => {
        if (Array.isArray(data.catalog[k])) cat[k] = data.catalog[k];
      });
      this.state.catalog = cat;
    }
    if (Array.isArray(data.styles) && data.styles.length && !Array.isArray(data.catalog)) {
      this.state.catalog.styles = data.styles;
      this.state.styles = data.styles;
    }
    if (data.draft && typeof data.draft === 'object') {
      this.state.draft = Object.assign({}, this.loadDraftFromStorage(), data.draft);
    }
    if (data.account && typeof data.account === 'object') this.state.account = data.account;
    if (data.price && typeof data.price === 'object') this.state.price = Object.assign({ reel: 20, monthly: 60, monthlyReels: 10 }, data.price);

    this.renderCapabilityBanner();
    this.renderReels();
    this.renderStyles();
    this.renderConversations();
    this.renderNotices();
    this.renderPay();
    if (this.state.activeTab === 'newreel') this.renderNewReel();
  },

  loadDraftFromStorage() {
    let local = {};
    try { local = JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}') || {}; } catch (e) { local = {}; }
    if (!this.state.draft || !Object.keys(this.state.draft).length) this.state.draft = local;
    return local;
  },

  async loadStyles() {
    try {
      const data = await this.request('/styles');
      const list = data.styles || [];
      this.state.styles = list;
      // The upgraded /api/styles may carry the full catalog in one response.
      Object.keys(data).forEach((key) => {
        if (Array.isArray(data[key]) && data[key].length) this.state.catalog[key] = data[key];
      });
      if (list.length) this.state.catalog.styles = list;
      if (list.length && !(this.state.catalog.templates || []).length) this.state.catalog.templates = list;
    } catch (e) {
      this.state.styles = this.catalogList('styles');
    }
    this.renderStyles();
  },

  async loadReels() {
    try {
      const data = await this.request('/reels');
      this.state.reels = data.reels || [];
    } catch (e) {
      this.toast('Could not refresh reels');
    }
    this.renderReels();
  },

  async loadConversations() {
    try {
      const data = await this.request('/chat/conversations');
      this.state.conversations = data.conversations || [];
    } catch (e) { /* chat stays usable */ }
    this.renderConversations();
  },

  /* =====================================================================
     7. REELS TAB
     ===================================================================== */
  setReelFilter(filter) {
    this.state.reelFilter = filter;
    document.querySelectorAll('#reels-filters .chip').forEach((c) => {
      c.classList.toggle('active', c.dataset.filter === filter);
    });
    this.renderReels();
  },

  isMine(reel) {
    const uid = this.state.user && this.state.user.id;
    const uname = this.state.user && this.state.user.username;
    return !!(reel && (reel.isMine || reel.mine || (uid && reel.userId === uid) || (uname && reel.user === uname)));
  },

  visibleReels() {
    const all = this.state.reels || [];
    if (this.state.reelFilter === 'all') return all;
    if (this.state.reelFilter === 'review') {
      return all.filter((r) => ['review', 'approved', 'storyboard'].includes(this.normalStatus(r))
        || ['storyboard', 'approved'].includes(String(r && r.stage || '')));
    }
    const mine = all.filter((r) => this.isMine(r));
    return mine.length ? mine : all; // demo feed if you have none yet
  },

  normalStatus(reel) {
    return String((reel && (reel.status || reel.state)) || '').toLowerCase() || 'unknown';
  },

  renderCapabilityBanner() {
    const el = document.getElementById('capability-banner');
    if (!el) return;
    const canExport = this.editorCan('exportVideo');
    el.innerHTML = `
      <div class="cap-row">
        <span class="cap-dot ${canExport ? 'ready' : 'limited'}"></span>
        <div class="grow">
          <strong>${canExport ? 'On-device tools ready' : 'Local export unavailable in this browser'}</strong>
          <p>Planning, reference analysis, storyboards, and feedback run locally in this browser. ${canExport ? 'Exports are rendered locally with MediaRecorder.' : 'You can still create a plan and notes, but no video will be rendered here.'}</p>
          <p class="tiny">No hosted LLM, remote renderer, stock downloads, or AI voiceover. Link-only reels stay <em>waiting</em> because their media is never downloaded.</p>
        </div>
      </div>`;
  },

  renderReels() {
    this.renderCapabilityBanner();
    const feed = document.getElementById('reels-feed');
    const empty = document.getElementById('reels-empty');
    const title = document.querySelector('.reels-toolbar .view-title');
    if (title) title.textContent = this.state.reelFilter === 'mine' ? 'Your reels' : this.state.reelFilter === 'review' ? 'In review' : 'All reels';
    if (!feed) return;
    const reels = this.visibleReels();
    if (!reels.length) {
      feed.innerHTML = '';
      if (empty) empty.classList.remove('hidden');
      return;
    }
    if (empty) empty.classList.add('hidden');
    feed.innerHTML = reels.map((r) => this.reelCardHtml(r)).join('');
    // Autoplay is always muted. Sound is enabled only after a real tap.
    feed.querySelectorAll('video').forEach((v) => { v.play().catch(() => {}); });
  },

  reelCardHtml(r) {
    const id = this.esc(r.id);
    const status = this.normalStatus(r);
    const cover = this.reelPosterUrl(r);
    const src = this.reelVideoUrl(r);
    const reviewish = ['review', 'done', 'approved', 'editing', 'storyboard', 'local_only', 'unknown'].includes(status);
    const stage = String(r.stage || '');
    const stageLabel = STAGE_LABELS[stage] || STAGE_LABELS[status] || stage;
    const caption = String(r.caption || r.brief || r.title || '');
    const version = `v${this.reelVersion(r)}`;
    const revs = this.reelRevisions(r);
    const media = src
      ? `<video src="${this.esc(src)}" ${cover ? `poster="${this.esc(cover)}"` : ''} muted playsinline loop preload="metadata" onclick="app.toggleSound('${this.jsAttr(r.id)}')"></video>`
      : cover
        ? `<img class="reel-poster" src="${this.esc(cover)}" alt="${this.esc(r.title || 'Reel')}" />`
        : `<div class="reel-poster" style="width:100%;height:100%;display:grid;place-items:center;color:#fff;opacity:.6">No video yet</div>`;

    const buttons = [];
    if (reviewish) {
      buttons.push(`<button class="btn" data-action="review" data-id="${id}">Review</button>`);
      buttons.push(`<button class="btn" data-action="cover" data-id="${id}">Cover</button>`);
      buttons.push(`<button class="btn" data-action="postkit" data-id="${id}">Post kit</button>`);
      buttons.push(`<button class="btn" data-action="download" data-id="${id}">Download</button>`);
      if ((Array.isArray(r.rawUrls) && r.rawUrls.length) || (Array.isArray(r.rawClips) && r.rawClips.length)) {
        buttons.push(`<button class="btn" data-action="raw" data-id="${id}">Raw clips</button>`);
      }
    }
    if (this.isMine(r)) buttons.push(`<button class="btn" data-action="edit" data-id="${id}">Edit</button>`);

    return `
      <article class="reel-card ${buttons.length ? 'has-buttons' : ''}" id="reel-${id}">
        ${media}
        <div class="reel-shade"></div>
        <div class="reel-topline">
          <span class="badge ${this.esc(status)}">${this.esc(stageLabel || status)}</span>
          ${r.statusMessage ? `<span class="status-message-pill" title="${this.esc(r.statusMessage)}">i</span>` : ''}
          <span class="sound-pill" id="sound-${id}">♪ Sound off</span>
        </div>
        <div class="reel-actions">
          <button class="icon-btn ${r.liked ? 'active' : ''}" onclick="app.toggleLike('${this.jsAttr(r.id)}')" aria-label="Like">♥ <span class="like-count" id="like-count-${this.esc(id)}">${this.esc(r.likes || 0)}</span></button>
          <button class="icon-btn" onclick="app.openComments('${this.jsAttr(r.id)}')" aria-label="Comments">▤</button>
        </div>
        <div class="reel-caption">
          <div class="user">${this.esc(r.user || 'you')}</div>
          ${r.title ? `<div class="title">${this.esc(r.title)}</div>` : ''}
          <div class="text">${this.esc(caption)}</div>
          <div class="meta">Look: ${this.esc(r.look || r.style || 'classic')} · ${version} · ${this.esc(revs)} revisions${r.planVersion ? ` · plan v${this.esc(r.planVersion)}` : ''}</div>
          ${r.statusMessage ? `<div class="status-note">${this.esc(r.statusMessage)}</div>` : ''}
        </div>
        ${buttons.length ? `<div class="reel-buttons">${buttons.join('')}</div>` : ''}
      </article>`;
  },

  toggleSound(reelId) {
    const card = document.getElementById(`reel-${reelId}`);
    if (!card) return;
    const v = card.querySelector('video');
    const pill = document.getElementById(`sound-${reelId}`);
    if (!v) return;
    v.muted = !v.muted;
    if (!v.muted) v.play().catch(() => {});
    if (pill) pill.textContent = v.muted ? '♪ Sound off' : '♪ Sound on';
  },

  async toggleLike(reelId) {
    if (this.state.likePending.has(reelId)) return;
    this.state.likePending.add(reelId);
    try {
      const data = await this.request(`/reels/${reelId}/like`, { method: 'POST' });
      const reel = this.state.reels.find((r) => String(r.id) === String(reelId));
      if (reel) { reel.likes = data.likes; reel.liked = true; }
      const el = document.getElementById(`like-count-${reelId}`);
      if (el) el.textContent = data.likes;
    } catch (e) {
      this.toast('Could not like reel');
    } finally {
      this.state.likePending.delete(reelId);
    }
  },

  async openComments(reelId) {
    const reel = this.state.reels.find((r) => String(r.id) === String(reelId));
    if (!reel) return;
    let comments = [];
    try {
      const data = await this.request(`/reels/${reelId}/comments`);
      comments = data.comments || [];
    } catch (e) { comments = Array.isArray(reel.comments) ? reel.comments : []; }
    this.renderCommentsSheet(reelId, comments);
  },

  renderCommentsSheet(reelId, comments) {
    const body = `
      <div id="comments-list">
        ${comments.length ? comments.map((c) => `
          <div class="note-item">
            <span class="label">${this.esc(c.user || 'user')}</span>
            <div>${this.esc(c.text || '')}</div>
          </div>`).join('') : '<p class="muted">No comments yet.</p>'}
      </div>`;
    const foot = `
      <form id="comments-form" class="row" novalidate>
        <input class="input grow" type="text" name="text" placeholder="Add a comment…" required />
        <button class="btn btn-primary" type="submit">Send</button>
      </form>`;
    this.showSheet('Comments', body, foot, {
      onMount: (overlay) => {
        const form = overlay.querySelector('#comments-form');
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          const text = form.querySelector('[name=text]').value.trim();
          if (!text) return;
          try {
            await this.request(`/reels/${reelId}/comment`, {
              method: 'POST',
              body: { userId: this.state.user?.id || 'u1', user: this.state.user?.username || 'you', text },
            });
            const data = await this.request(`/reels/${reelId}/comments`);
            this.renderCommentsSheet(reelId, data.comments || []);
          } catch (err) {
            this.toast('Could not post comment');
          }
        });
      },
    });
  },

  downloadReel(reelId) {
    const reel = this.state.reels.find((r) => String(r.id) === String(reelId));
    const url = this.reelVideoUrl(reel);
    if (!url) {
      this.toast('No downloadable video yet — this reel is still being edited.');
      return;
    }
    const a = document.createElement('a');
    a.href = url;
    a.download = `${String(reel.title || 'lumi-reel').replace(/[^a-z0-9_-]+/gi, '-') || 'lumi-reel'}.mp4`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  },

  openRawClips(reelId) {
    const reel = this.state.reels.find((r) => String(r.id) === String(reelId));
    if (!reel) return;
    const assetUrls = (Array.isArray(reel.assets) ? reel.assets : [])
      .filter((a) => a && a.kind === 'raw' && a.url)
      .map((a) => a.url);
    const raw = [...assetUrls, ...(Array.isArray(reel.rawUrls) ? reel.rawUrls : []), ...(Array.isArray(reel.rawClips) ? reel.rawClips : [])]
      .map((u) => this.safeUrl(u)).filter(Boolean);
    if (!raw.length) { this.toast('No raw clips attached to this reel.'); return; }
    this.showSheet('Raw clips', raw.map((u, i) => `
      <div class="note-item">
        <div class="spread"><strong>Clip ${i + 1}</strong><a class="btn btn-sm btn-ghost" href="${this.esc(u)}" target="_blank" rel="noopener">Open</a></div>
        <video class="review-video" src="${this.esc(u)}" muted playsinline controls preload="metadata" style="margin-top:8px"></video>
      </div>`).join(''));
  },

  /* ---------- Review sheet ---------- */
  async openReview(reelId) {
    const reel = this.state.reels.find((r) => String(r.id) === String(reelId));
    if (!reel) return;
    let notes = Array.isArray(reel.notes) ? reel.notes.slice() : [];
    try {
      const data = await this.request(`/reels/${reelId}/notes`);
      if (Array.isArray(data.notes)) notes = data.notes;
    } catch (e) { /* use local notes */ }

    const cap = this.reelRevisionLimit(reel);
    const used = this.reelRevisions(reel);
    const src = this.reelVideoUrl(reel);
    const hasPlan = !!(reel.plan || (Array.isArray(reel.storyboard) && reel.storyboard.length));
    const needsApproval = hasPlan && reel.stage !== 'approved';

    const body = `
      ${hasPlan ? `<div class="plan-banner">
        <strong>On-device plan v${this.esc(reel.planVersion || 1)}</strong>
        <span>${this.esc(reel.stage || 'storyboard')}</span>
        <p>${needsApproval ? 'Export is locked until this storyboard is approved.' : 'Storyboard approved. Local export is unlocked.'}</p>
      </div>` : ''}
      <div class="revision-meter">Revisions: <strong>${this.esc(used)} of ${this.esc(cap)}</strong> used. Ask for changes before approving.</div>
      ${src ? `<video id="review-video" class="review-video" src="${this.esc(src)}" muted playsinline controls preload="metadata"></video>` : '<p class="muted">No video preview in this deployment yet.</p>'}
      <div class="spread" style="margin-top:10px">
        <span class="timecode" id="review-time">0:00</span>
        <button class="btn btn-sm btn-secondary" id="pause-note">Pause to note</button>
      </div>
      <div class="section-title">Add a note</div>
      <div class="field">
        <label>Note at current timecode</label>
        <input type="text" id="note-text" placeholder="e.g. tighten the hook, fix caption typo" />
      </div>
      <div class="field">
        <label>Feedback kind</label>
        <select id="note-kind">
          ${NOTE_KINDS.map((k) => `<option value="${k.id}">${k.label}</option>`).join('')}
        </select>
      </div>
      <div class="row">
        <button class="btn btn-primary grow" id="add-note">Add note</button>
        <button class="btn btn-secondary" id="mark-area">Mark area</button>
      </div>
      <p class="hint" id="range-hint">Mark area stores the current playhead position as a timestamp range.</p>
      <div class="field" style="margin-top:12px">
        <label>Overall notes</label>
        <textarea id="overall-notes" placeholder="Anything the editor should know overall…">${this.esc(reel.overallNotes || '')}</textarea>
      </div>
      <div class="section-title">Notes</div>
      <div id="notes-list">${this.notesHtml(reelId, notes)}</div>`;

    const foot = `
      ${hasPlan ? `<div class="btn-row">
        <button class="btn btn-secondary grow" id="apply-feedback">Apply feedback to plan</button>
        ${needsApproval ? '<button class="btn btn-primary grow" id="approve-storyboard">Approve storyboard</button>' : ''}
      </div>` : ''}
      <div class="btn-row">
        <button class="btn btn-danger" id="request-changes">Request changes</button>
        <button class="btn btn-primary" id="approve-reel">Approve</button>
      </div>`;

    this.showSheet(`Review · ${reel.title || 'Reel'}`, body, foot, {
      onMount: (overlay) => this.bindReview(overlay, reel, notes, cap),
    });
  },

  notesHtml(reelId, notes) {
    if (!notes.length) return '<p class="muted">No notes yet.</p>';
    return notes.map((n) => {
      const resolved = n.status === 'resolved';
      return `
        <div class="note-item ${resolved ? 'resolved' : ''}">
          <div class="spread">
            <div>
              ${n.t != null ? `<span class="note-time">${this.esc(this.fmtTime(n.t))}${n.tEnd != null ? `–${this.esc(this.fmtTime(n.tEnd))}` : ''}</span>` : ''}
              <span class="note-kind">${this.esc((NOTE_KINDS.find((k) => k.id === n.kind) || { label: n.kind || 'General' }).label)}</span>
              <span>${this.esc(n.text || '')}</span>
            </div>
            ${resolved ? '<span class="status-pill paid">Resolved</span>'
              : `<button class="btn btn-sm btn-ghost" data-action="resolve-note" data-id="${this.esc(reelId)}" data-note="${this.esc(n.id || n._key || '')}">Resolve</button>`}
          </div>
        </div>`;
    }).join('');
  },

  bindReview(overlay, reel, notes, cap) {
    const video = overlay.querySelector('#review-video');
    const timeEl = overlay.querySelector('#review-time');
    let current = Number(reel.trimStart || 0) || 0;
    let markStart = null;
    let markRange = null;

    const sync = () => {
      if (video && isFinite(video.currentTime)) current = video.currentTime;
      if (timeEl) timeEl.textContent = this.fmtTime(current);
    };
    if (video) video.addEventListener('timeupdate', sync);

    overlay.querySelector('#pause-note')?.addEventListener('click', () => {
      if (video) video.pause();
      sync();
      this.toast(`Paused at ${this.fmtTime(current)} — add your note.`);
    });

    overlay.querySelector('#mark-area')?.addEventListener('click', () => {
      sync();
      if (markStart == null) {
        markStart = current;
        this.toast(`Mark start ${this.fmtTime(current)} — tap again to set end.`);
      } else {
        const a = Math.min(markStart, current);
        const b = Math.max(markStart, current);
        markRange = { t: a, tEnd: b };
        const input = overlay.querySelector('#note-text');
        if (input) input.value = `Mark ${this.fmtTime(a)}–${this.fmtTime(b)}: `;
        markStart = null;
      }
    });

    overlay.querySelector('#add-note')?.addEventListener('click', async () => {
      const input = overlay.querySelector('#note-text');
      const text = (input?.value || '').trim();
      if (!text) { this.toast('Write a note first.'); return; }
      const payload = Object.assign(
        { text, kind: overlay.querySelector('#note-kind')?.value || 'general', t: markRange ? markRange.t : current,
          status: 'open', version: this.reelVersion(reel), idem: this.idem() },
        markRange ? { tEnd: markRange.tEnd } : {}
      );
      markRange = null;
      let saved;
      try {
        const data = await this.request(`/reels/${reel.id}/notes`, { method: 'POST', body: payload });
        saved = data.note || payload;
      } catch (e) {
        saved = Object.assign({ _key: this.idem() }, payload); // local fallback
        this.toast('Note saved locally (service unavailable).');
      }
      notes.push(saved);
      const list = overlay.querySelector('#notes-list');
      if (list) list.innerHTML = this.notesHtml(reel.id, notes);
      if (input) input.value = '';
    });

    const submitReview = async (action) => {
      const text = (overlay.querySelector('#overall-notes')?.value || '').trim();
      if (action === 'changes' && used >= cap) {
        this.toast(`Revision cap reached (${cap}). Approve or resolve notes first.`);
        return;
      }
      try {
        const data = await this.request(`/reels/${reel.id}/review`, {
          method: 'POST',
          body: { action, version: this.reelVersion(reel), text, idem: this.idem() },
        });
        if (data.reel) Object.assign(reel, data.reel);
        else reel.status = action === 'approve' ? 'done' : 'editing';
        reel.overallNotes = text;
        this.closeSheet();
        this.toast(action === 'approve' ? 'Approved.' : 'Changes requested.');
        this.loadReels();
      } catch (e) {
        this.toast(e.message || 'Could not submit review');
      }
    };

    overlay.querySelector('#approve-reel')?.addEventListener('click', () => submitReview('approve'));
    overlay.querySelector('#request-changes')?.addEventListener('click', () => submitReview('changes'));

    overlay.querySelector('#approve-storyboard')?.addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      btn.disabled = true;
      try {
        const data = await this.request(`/reels/${reel.id}/review`, {
          method: 'POST',
          body: { action: 'approve-storyboard', version: this.reelVersion(reel), text: 'Storyboard approved locally.', idem: this.idem() },
        });
        if (data.reel) Object.assign(reel, data.reel);
        this.toast('Storyboard approved. Local export is unlocked.');
        this.closeSheet();
        this.loadReels();
      } catch (err) {
        this.toast(err.message || 'Could not approve storyboard');
        btn.disabled = false;
      }
    });

    overlay.querySelector('#apply-feedback')?.addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      btn.disabled = true;
      btn.textContent = 'Applying…';
      try {
        const notePayload = notes.map((n) => ({
          t: Number(n.t || 0),
          kind: n.kind || 'general',
          text: String(n.text || ''),
        })).filter((n) => n.text);
        const overall = (overlay.querySelector('#overall-notes')?.value || '').trim();
        if (overall) notePayload.push({ t: 0, kind: 'general', text: overall });
        const data = await this.request(`/reels/${reel.id}/plan`, {
          method: 'PATCH',
          body: { notes: notePayload, overall: overlay.querySelector('#overall-notes')?.value || '', source: 'local' },
        });
        if (data.reel) Object.assign(reel, data.reel);
        this.toast(`Plan v${reel.planVersion || 2} saved locally. Re-approve before exporting.`);
        this.closeSheet();
        this.loadReels();
      } catch (err) {
        this.toast(err.message || 'Could not revise plan locally');
        btn.disabled = false;
        btn.textContent = 'Apply feedback to plan';
      }
    });
  },

  async approveStoryboard(reelId) {
    try {
      const data = await this.request(`/reels/${reelId}/review`, {
        method: 'POST',
        body: { action: 'approve-storyboard', version: 1, text: 'Approved from reel card.', idem: this.idem() },
      });
      const reel = this.state.reels.find((r) => String(r.id) === String(reelId));
      if (reel && data.reel) Object.assign(reel, data.reel);
      this.toast('Storyboard approved. Local export is unlocked.');
      this.loadReels();
    } catch (e) {
      this.toast(e.message || 'Could not approve storyboard');
    }
  },

  async resolveNote(reelId, noteId) {
    if (!noteId) { this.toast('This note cannot be resolved locally.'); return; }
    try {
      await this.request(`/reels/${reelId}/notes/${encodeURIComponent(noteId)}`, {
        method: 'PATCH', body: { status: 'resolved' },
      });
      this.toast('Note resolved.');
      this.openReview(reelId);
    } catch (e) {
      this.toast('Could not resolve note on the service.');
    }
  },

  /* =====================================================================
     8. STYLES TAB
     ===================================================================== */
  renderStyles() {
    const tabs = document.getElementById('styles-tabs');
    const grid = document.getElementById('styles-grid');
    const extra = document.getElementById('styles-extra');
    const empty = document.getElementById('styles-empty');
    if (!tabs || !grid) return;

    const segments = [
      ['templates', 'Templates'],
      ['captions', 'Captions'],
      ['motion', 'Motion graphics'],
      ['vfx', 'Visual effects'],
      ['color', 'Color'],
    ];
    tabs.innerHTML = segments.map(([k, label]) => `
      <button class="${this.state.stylesSegment === k ? 'active' : ''}" onclick="app.setStylesSegment('${k}')">${label}</button>`).join('');

    const key = this.state.stylesSegment === 'color' ? 'grades' : this.state.stylesSegment;
    const items = this.catalogList(key);
    const isColor = this.state.stylesSegment === 'color';
    if (!items.length) {
      grid.innerHTML = '';
      if (empty) empty.classList.remove('hidden');
    } else {
      if (empty) empty.classList.add('hidden');
      grid.innerHTML = items.map((it) => this.styleTileHtml(it, key, isColor)).join('');
    }

    // Secondary categories rendered as selectable chips.
    const groups = ['hooks', 'backgrounds', 'music', 'voices', 'formats', 'intensities'];
    if (extra) {
      extra.innerHTML = groups.map((g) => {
        const label = ({ hooks: 'Hooks', backgrounds: 'Background options', music: 'Music', voices: 'Voiceover', formats: 'Format', intensities: 'Editing intensity' })[g];
        const list = this.catalogList(g);
        const selected = this.state.draft[g];
        return `
          <div class="option-group">
            <h4>${this.esc(label)}</h4>
            <div class="option-chips">
              ${list.map((it) => `
                <button class="option-chip ${String(selected) === String(it.id) ? 'active' : ''}"
                        onclick="app.selectStyle('${this.jsAttr(g)}','${this.jsAttr(it.id)}')">${this.esc(it.name)}</button>`).join('')}
            </div>
          </div>`;
      }).join('');
    }
  },

  styleTileHtml(it, key, comingSoon) {
    const selected = String(this.state.draft[key] != null ? this.state.draft[key] : this.state.draft.look) === String(it.id);
    const p1 = this.safeColor(it.p1, '#e9e4d7');
    const p2 = this.safeColor(it.p2, '#c9c2b2');
    const glyph = String(it.name || '?').trim().charAt(0).toUpperCase();
    return `
      <div class="style-tile tpl-${this.esc(key)} ${selected ? 'selected' : ''} ${comingSoon && !this.catalogList('grades').length ? 'coming-soon' : ''}"
           style="--p1:${this.esc(p1)};--p2:${this.esc(p2)}"
           onclick="app.selectStyle('${this.jsAttr(key)}','${this.jsAttr(it.id)}')" role="button" tabindex="0">
        <div class="preview"></div>
        <div class="glyph">${this.esc(glyph)}</div>
        <div class="check">✓</div>
        <div class="label">${this.esc(it.name)}</div>
        ${it.desc ? `<div class="desc">${this.esc(it.desc)}</div>` : ''}
      </div>`;
  },

  setStylesSegment(seg) {
    this.state.stylesSegment = seg;
    this.renderStyles();
  },

  selectStyle(kind, id) {
    this.state.draft[kind] = id;
    if (kind === 'templates' || kind === 'styles' || kind === 'look') this.state.draft.look = id;
    this.state.selectedStyle = id;
    this.saveDraft();
    this.renderStyles();
    this.toast(`${this.optionName(kind, id) || id} saved to your draft`);
  },

  loadPersonalStyle() {
    const local = this.loadDraftFromStorage();
    if (!Object.keys(local).length) {
      this.toast('No personal style saved yet — pick a few tiles.');
      return;
    }
    this.state.draft = Object.assign({}, local);
    this.saveDraft();
    this.renderStyles();
    this.toast('Personal style loaded.');
  },

  sameAsLastTime() {
    const local = this.loadDraftFromStorage();
    if (local.look) this.setLook(local.look);
    this.state.draft = Object.assign({}, local, this.state.draft);
    this.saveDraft();
    this.renderStyles();
    this.toast('Same as last time loaded.');
  },

  /* =====================================================================
     9. NEW REEL STEPPER
     ===================================================================== */
  freshNewReel() {
    return {
      step: 1,
      sources: [],
      title: '',
      format: 'vertical',
      captionBurn: true,
      trim: { start: 0, end: 0 },
      link: { url: '', shorts: 3, mode: 'cut' },
      opts: {
        videoType: 'Short-form reel',
        look: 'classic',
        captionStyle: 'bold',
        motion: 'zoom',
        vfx: 'none',
        intensity: 'Polished',
        hookStyle: 'Cold open',
        background: 'original',
        music: 'You decide',
        voiceover: 'No',
        length: '30–45 seconds',
        grade: 'none',
        referenceUrl: '',
        referenceMatch: 'Just inspiration',
        mattersMost: '',
        cta: 'Follow for more',
      },
      brief: '',
      referenceAssets: [],
      storyboard: [],
      plan: null,
      storyboardApproved: false,
      exporting: false,
      progress: 0,
      done: false,
      created: null,
    };
  },

  resetNewReel() {
    this.state.newReel = this.freshNewReel();
  },

  renderNewReel() {
    const root = document.getElementById('newreel-root');
    if (!root) return;
    const n = this.state.newReel;
    if (n.done) { root.innerHTML = this.completionHtml(); return; }
    if (n.step === 4 && !n.plan) n.plan = this.buildLocalPlan();
    root.innerHTML = `
      <div class="stepper-wrap">
        <div class="stepper-head">
          <h2>New reel</h2>
          <span class="step-count">Step ${n.step} of 4</span>
        </div>
        <div class="stepper-progress"><i style="width:${(n.step / 4) * 100}%"></i></div>
        <div class="step-dots">
          <span class="${n.step >= 1 ? 'on' : ''}"></span>
          <span class="${n.step >= 2 ? 'on' : ''}"></span>
          <span class="${n.step >= 3 ? 'on' : ''}"></span>
          <span class="${n.step >= 4 ? 'on' : ''}"></span>
        </div>
        ${n.step === 1 ? this.stepClipsHtml()
          : n.step === 2 ? this.stepTitleHtml()
          : n.step === 3 ? this.stepBriefHtml()
          : this.stepStoryboardHtml()}
      </div>`;
    if (n.step === 1) this.bindStepClips();
    if (n.step === 2) this.bindStepTitle();
    if (n.step === 3) this.bindStepBrief();
    if (n.step === 4) this.bindStepStoryboard();
  },

  goStep(step) {
    this.state.newReel.step = step;
    this.renderNewReel();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  /* ---------- Step 1: Clips ---------- */
  stepClipsHtml() {
    const n = this.state.newReel;
    const hasVisual = n.sources.some((s) => s.kind === 'file' || s.kind === 'camera');
    const linkSources = n.sources.filter((s) => s.kind === 'link');
    return `
      <div class="section-title">Add your footage</div>
      <div class="source-grid">
        <button class="source-card" id="src-files">
          <span class="sc-icon">▣</span>
          <span class="grow"><strong>Choose your clips</strong><small>Pick one or more videos from this device</small></span>
          <span>›</span>
        </button>
        <button class="source-card" id="src-camera">
          <span class="sc-icon">◉</span>
          <span class="grow"><strong>Film with Lumi</strong><small>Record right here in the browser</small></span>
          <span>›</span>
        </button>
        <button class="source-card" id="src-link">
          <span class="sc-icon">↗</span>
          <span class="grow"><strong>Paste a link</strong><small>${SUPPORTED_LINK_HINT}</small></span>
          <span>›</span>
        </button>
      </div>
      <input type="file" id="clip-file-input" accept="video/*" multiple class="sr-only" />

      <div id="link-panel" class="card hidden" style="margin-top:12px">
        <div class="field">
          <label>Link to your video</label>
          <textarea id="link-url" placeholder="https://…">${this.esc(n.link.url)}</textarea>
          <div class="hint">Supported: ${SUPPORTED_LINK_HINT}.</div>
        </div>
        <div class="field">
          <label>Orientation</label>
          <select id="link-orient">
            <option value="vertical" ${n.link.orient === 'vertical' ? 'selected' : ''}>Vertical 9:16</option>
            <option value="horizontal" ${n.link.orient === 'horizontal' ? 'selected' : ''}>Keep horizontal</option>
          </select>
        </div>
        <div class="field">
          <label>Shorts count</label>
          <select id="link-shorts">
            ${[3, 5, 10].map((x) => `<option value="${x}" ${Number(n.link.shorts) === x ? 'selected' : ''}>${x} shorts</option>`).join('')}
          </select>
        </div>
        <div class="btn-row">
          <button class="btn btn-primary" id="link-cut">Cut this into shorts</button>
          <button class="btn btn-secondary" id="link-one">Make one reel</button>
        </div>
      </div>

      <div class="source-list" id="source-list">${this.sourceListHtml()}</div>
      ${hasVisual ? this.trimBlockHtml() : ''}
      ${linkSources.length ? `<p class="hint">${this.esc(linkSources.length)} link source(s) attached. Editing from links needs the Lumi service.</p>` : ''}
      <div class="btn-row" style="margin-top:16px">
        <button class="btn btn-secondary" id="add-more">Add more clips</button>
        <button class="btn btn-primary" id="clips-next" ${n.sources.length ? '' : 'disabled'}>Next: Title</button>
      </div>`;
  },

  sourceListHtml() {
    const n = this.state.newReel;
    if (!n.sources.length) return '<p class="muted tiny">No clips added yet.</p>';
    return n.sources.map((s, i) => {
      const isLink = s.kind === 'link';
      const thumb = isLink
        ? `<div class="si-thumb">↗</div>`
        : `<video src="${this.esc(this.safeUrl(s.url))}" muted preload="metadata"></video>`;
      const meta = isLink
        ? `Link · ${this.esc(s.shorts || 1)} ${s.shorts === 1 ? 'reel' : 'shorts'} · ${this.esc(s.mode === 'cut' ? 'Cut' : 'One reel')}`
        : `${this.esc(s.name || 'Clip')} · ${this.esc(this.fmtBytes(s.size))} · ${this.esc(this.fmtTime(s.duration))}`;
      return `
        <div class="source-item">
          ${thumb}
          <div class="grow">
            <div class="si-name">${this.esc(s.name || s.url || 'Clip')}</div>
            <div class="si-meta">${meta}</div>
          </div>
          <button class="icon-btn" onclick="app.removeSource(${i})" aria-label="Remove">✕</button>
        </div>`;
    }).join('');
  },

  trimBlockHtml() {
    const n = this.state.newReel;
    const lead = n.sources.find((s) => s.kind === 'file' || s.kind === 'camera');
    const dur = lead?.duration || 30;
    const src = this.safeUrl(lead?.url);
    return `
      <div class="section-title">Preview & trim</div>
      ${n.sources.filter((s) => s.kind !== 'link').length > 1
        ? `<p class="hint">Local export uses the selected lead clip; any extra clips are uploaded as raw footage.</p>` : ''}
      <div class="preview-box ${n.format === 'horizontal' ? 'horizontal' : ''}">
        ${src ? `<video id="trim-video" src="${this.esc(src)}" muted playsinline preload="metadata"></video>` : ''}
        <div class="preview-tools">
          <div class="preview-tools tcodes"><span>Start <b id="trim-start-label">${this.esc(this.fmtTime(n.trim.start))}</b></span><span>End <b id="trim-end-label">${this.esc(this.fmtTime(n.trim.end || dur))}</b></span></div>
          <div class="range-row">
            <div><label>Start</label><input type="range" id="trim-start" min="0" max="${this.esc(Math.floor(dur))}" value="${this.esc(n.trim.start)}" /></div>
            <div><label>End</label><input type="range" id="trim-end" min="0" max="${this.esc(Math.floor(dur))}" value="${this.esc(n.trim.end || Math.floor(dur))}" /></div>
          </div>
          <div class="toggle-row"><span>Vertical 9:16</span><label class="switch"><input type="checkbox" id="fmt-vertical" ${n.format === 'vertical' ? 'checked' : ''} /><i></i></label></div>
          <div class="toggle-row"><span>Burn in captions</span><label class="switch"><input type="checkbox" id="caption-burn" ${n.captionBurn ? 'checked' : ''} /><i></i></label></div>
        </div>
      </div>`;
  },

  bindStepClips() {
    const n = this.state.newReel;
    const fileInput = document.getElementById('clip-file-input');
    document.getElementById('src-files')?.addEventListener('click', () => fileInput?.click());
    fileInput?.addEventListener('change', async (e) => {
      const files = Array.from(e.target.files || []);
      for (const file of files) {
        const source = {
          kind: 'file', file, name: file.name, size: file.size,
          url: URL.createObjectURL(file), duration: 0, width: 0, height: 0, hasAudio: false,
        };
        n.sources.push(source);
        this.measureSource(source);
      }
      e.target.value = '';
      this.renderNewReel();
    });

    document.getElementById('src-camera')?.addEventListener('click', () => this.openCamera());
    document.getElementById('src-link')?.addEventListener('click', () => {
      const panel = document.getElementById('link-panel');
      if (panel) { panel.classList.remove('hidden'); panel.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    });
    document.getElementById('add-more')?.addEventListener('click', () => {
      document.getElementById('src-files')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    document.getElementById('clips-next')?.addEventListener('click', () => {
      if (!n.sources.length) { this.toast('Add at least one clip or link first.'); return; }
      this.goStep(2);
    });

    // Link panel state
    const urlEl = document.getElementById('link-url');
    const orientEl = document.getElementById('link-orient');
    const shortsEl = document.getElementById('link-shorts');
    const persistLink = () => {
      n.link.url = (urlEl?.value || '').trim();
      n.link.orient = orientEl?.value || 'vertical';
      n.link.shorts = Number(shortsEl?.value) || 3;
    };
    [urlEl, orientEl, shortsEl].forEach((el) => el?.addEventListener('change', persistLink));
    const addLink = (mode) => {
      persistLink();
      if (!/^https?:\/\//i.test(n.link.url)) { this.toast('Paste a valid http(s) link first.'); return; }
      n.sources.push({ kind: 'link', url: n.link.url, shorts: n.link.shorts, mode, format: n.link.orient });
      n.format = n.link.orient === 'horizontal' ? 'horizontal' : n.format;
      this.renderNewReel();
      this.toast(mode === 'cut' ? `Will cut into ${n.link.shorts} shorts.` : 'One reel from link saved.');
    };
    document.getElementById('link-cut')?.addEventListener('click', () => addLink('cut'));
    document.getElementById('link-one')?.addEventListener('click', () => addLink('one'));

    const start = document.getElementById('trim-start');
    const end = document.getElementById('trim-end');
    const lead = n.sources.find((s) => s.kind === 'file' || s.kind === 'camera');
    const video = document.getElementById('trim-video');
    const syncRange = () => {
      n.trim.start = Number(start?.value) || 0;
      n.trim.end = Number(end?.value) || Number(start?.max) || 0;
      if (n.trim.end <= n.trim.start) n.trim.end = n.trim.start + 1;
      const a = document.getElementById('trim-start-label');
      const b = document.getElementById('trim-end-label');
      if (a) a.textContent = this.fmtTime(n.trim.start);
      if (b) b.textContent = this.fmtTime(n.trim.end);
    };
    start?.addEventListener('input', syncRange);
    end?.addEventListener('input', syncRange);
    if (video && lead) {
      if (!n.trim.end) n.trim.end = Math.floor(lead.duration || video.duration || 30);
      video.addEventListener('loadedmetadata', () => {
        if (!lead.duration && isFinite(video.duration)) {
          lead.duration = video.duration;
          if (end) { end.max = Math.floor(video.duration); end.value = Math.floor(video.duration); }
          if (start) start.max = Math.floor(video.duration);
          n.trim.end = Math.floor(video.duration);
          syncRange();
        }
      });
      video.addEventListener('timeupdate', () => { /* preview only; sound stays off */ });
    }
    document.getElementById('fmt-vertical')?.addEventListener('change', (e) => {
      n.format = e.target.checked ? 'vertical' : 'horizontal';
      this.renderNewReel();
    });
    document.getElementById('caption-burn')?.addEventListener('change', (e) => { n.captionBurn = e.target.checked; });
  },

  async measureSource(source) {
    const E = this.editor();
    if (E && typeof E.measureFile === 'function') {
      try {
        const m = await E.measureFile(source.file || source.blob);
        if (m) {
          source.duration = Number(m.duration) || 0;
          source.width = Number(m.width) || 0;
          source.height = Number(m.height) || 0;
          source.hasAudio = !!m.hasAudio;
          return;
        }
      } catch (e) { /* fall through to metadata */ }
    }
    try {
      const v = document.createElement('video');
      v.preload = 'metadata';
      v.muted = true;
      v.src = source.url;
      await new Promise((resolve) => {
        const done = () => resolve();
        v.onloadedmetadata = done;
        v.onerror = done;
        setTimeout(done, 2500);
      });
      source.duration = isFinite(v.duration) ? v.duration : 0;
      source.width = v.videoWidth || 0;
      source.height = v.videoHeight || 0;
    } catch (e) { /* duration stays 0 */ }
  },

  removeSource(index) {
    const s = this.state.newReel.sources[index];
    if (s && s.url && s.url.startsWith('blob:')) URL.revokeObjectURL(s.url);
    this.state.newReel.sources.splice(index, 1);
    this.renderNewReel();
  },

  openCamera() {
    const E = this.editor();
    if (!E || typeof E.openCamera !== 'function') {
      this.toast('Camera is not available in this browser/deployment. Choose clips instead.');
      return;
    }
    const n = this.state.newReel;
    try {
      this.state.keepCamera = false;
      this.state.editorCtrl = E.openCamera({
        orient: n.format,
        onUse: (blob) => {
          if (!(blob instanceof Blob)) { this.toast('No video was recorded.'); return; }
          const source = {
            kind: 'camera', blob, name: `camera-${Date.now()}.webm`, size: blob.size,
            url: URL.createObjectURL(blob), duration: 0, width: 0, height: 0, hasAudio: true,
          };
          n.sources.push(source);
          this.measureSource(source);
          this.closeSheet();
          this.renderNewReel();
          this.toast('Clip added.');
        },
        onClose: () => { this.state.editorCtrl = null; },
      });
    } catch (e) {
      this.toast('Camera could not start on this device.');
    }
  },

  /* ---------- Step 2: Title ---------- */
  stepTitleHtml() {
    const n = this.state.newReel;
    return `
      <div class="card">
        <div class="card-title">Name your reel</div>
        <p class="hint">This becomes the title on your card and in the brief.</p>
        <div class="field" style="margin-top:12px">
          <label>Title</label>
          <input type="text" id="reel-title" maxlength="120" placeholder="e.g. My morning coffee ritual" value="${this.esc(n.title)}" />
          <div class="field-error" id="title-error"></div>
        </div>
      </div>
      <div class="btn-row" style="margin-top:16px">
        <button class="btn btn-secondary" onclick="app.goStep(1)">Back</button>
        <button class="btn btn-primary" id="title-next">Next: Brief</button>
      </div>`;
  },

  bindStepTitle() {
    const n = this.state.newReel;
    const input = document.getElementById('reel-title');
    const err = document.getElementById('title-error');
    const next = document.getElementById('title-next');
    const validate = () => {
      const ok = !!n.title.trim();
      if (next) next.disabled = !ok;
      if (err) err.textContent = ok ? '' : 'Required Please enter the title of your video';
      return ok;
    };
    input?.addEventListener('input', () => { n.title = input.value; validate(); });
    next?.addEventListener('click', () => {
      if (!validate()) { this.toast('Required Please enter the title of your video'); return; }
      this.goStep(3);
    });
    validate();
    setTimeout(() => input?.focus(), 120);
  },

  /* ---------- Step 3: Brief ---------- */
  stepBriefHtml() {
    const n = this.state.newReel;
    const o = n.opts;
    const fields = BRIEF_FIELDS.map((f) => {
      const list = f.catalog ? this.catalogList(f.catalog) : f.options.map((x) => ({ id: x, name: x }));
      let current = o[f.key] != null ? o[f.key] : (list[0] && list[0].id);
      // If a default id is not in this deployment's catalog, snap to its first
      // real option so the generated brief always has a readable label.
      if (!list.some((it) => String(it.id) === String(current))) {
        current = list[0] ? list[0].id : '';
        o[f.key] = current;
      }
      return `
        <div class="field">
          <label>${this.esc(f.label)}</label>
          <select data-brief-key="${this.esc(f.key)}">
            ${list.map((it) => `<option value="${this.esc(it.id)}" ${String(current) === String(it.id) ? 'selected' : ''}>${this.esc(it.name)}</option>`).join('')}
          </select>
        </div>`;
    }).join('');

    return `
      <div class="section-title">Choose a path</div>
      <div class="path-buttons">
        <button class="btn btn-ghost" id="path-built">Choose a fully built-out style</button>
        <button class="btn btn-ghost" id="path-lumi">Let Lumi choose</button>
        <button class="btn btn-ghost" id="path-custom">Customize your reel</button>
        <button class="btn btn-ghost" id="path-last">Same as last time</button>
        <button class="btn btn-ghost" id="path-words">Write it in my own words</button>
      </div>

      <div class="section-title">Build your brief</div>
      <div class="card">${fields}</div>

      <div class="card" style="margin-top:12px">
        <div class="field">
          <label>Reference link</label>
          <input type="url" data-brief-key="referenceUrl" placeholder="https://…" value="${this.esc(o.referenceUrl)}" />
        </div>
        <div class="field">
          <label>Reference match</label>
          <select data-brief-key="referenceMatch">
            ${['Copy exactly', 'Just inspiration'].map((x) => `<option ${o.referenceMatch === x ? 'selected' : ''}>${x}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label>Style reference files (images or short video clips)</label>
          <input type="file" id="reference-file-input" accept="image/*,video/*" multiple class="input" />
          <div class="hint">Analyzed locally in this browser with canvas pixel sampling. Files are never uploaded for analysis.</div>
        </div>
        <div id="reference-list" class="reference-list">${this.referenceAssetsHtml()}</div>
        <div class="field">
          <label>Hook / opening line</label>
          <input type="text" data-brief-key="cta" placeholder="Follow for more" value="${this.esc(o.cta || '')}" />
        </div>
        <div class="field">
          <label>What matters most</label>
          <textarea data-brief-key="mattersMost" placeholder="Tell your editor what matters…">${this.esc(o.mattersMost)}</textarea>
        </div>
      </div>

      <div class="section-title">Generated brief (editable)</div>
      <textarea id="brief-text" class="input" style="min-height:260px;font-size:12.5px;line-height:1.55">${this.esc(n.brief || this.buildBrief())}</textarea>
      <p class="hint">Edit freely — your text is what gets sent with the reel.</p>

      <div class="progress-wrap hidden" id="create-progress">
        <div class="progress-bar"><i id="create-progress-fill"></i></div>
        <div class="progress-label" id="create-progress-label">Preparing…</div>
      </div>

      <div class="btn-row" style="margin-top:16px">
        <button class="btn btn-secondary" onclick="app.goStep(2)">Back</button>
        <button class="btn btn-primary" id="brief-next">Next: Storyboard</button>
      </div>`;
  },

  bindStepBrief() {
    const n = this.state.newReel;
    document.querySelectorAll('[data-brief-key]').forEach((el) => {
      el.addEventListener('change', () => {
        n.opts[el.dataset.briefKey] = el.value;
        const ta = document.getElementById('brief-text');
        if (ta) ta.value = this.buildBrief();
      });
    });
    const brief = document.getElementById('brief-text');
    brief?.addEventListener('input', () => { n.brief = brief.value; });

    document.getElementById('path-built')?.addEventListener('click', () => this.applyPath('built'));
    document.getElementById('path-lumi')?.addEventListener('click', () => this.applyPath('lumi'));
    document.getElementById('path-custom')?.addEventListener('click', () => this.applyPath('custom'));
    document.getElementById('path-last')?.addEventListener('click', () => this.applyPath('last'));
    document.getElementById('path-words')?.addEventListener('click', () => this.applyPath('words'));

    document.getElementById('reference-file-input')?.addEventListener('change', async (e) => {
      const files = Array.from(e.target.files || []);
      for (const file of files) {
        const asset = {
          kind: /^video\//i.test(file.type) ? 'reference' : 'style',
          name: file.name,
          url: URL.createObjectURL(file),
          file,
          analysis: null,
          analyzing: true,
        };
        n.referenceAssets.push(asset);
        const list = document.getElementById('reference-list');
        if (list) list.innerHTML = this.referenceAssetsHtml();
        try {
          asset.analysis = await this.analyzeReferenceFile(file);
        } catch (err) {
          asset.analysis = {
            method: 'local canvas sampling failed',
            palette: [],
            brightness: null,
            note: 'This reference could not be sampled locally. It is still attached, but no style colors were inferred.',
          };
        } finally {
          asset.analyzing = false;
          const updated = document.getElementById('reference-list');
          if (updated) updated.innerHTML = this.referenceAssetsHtml();
        }
      }
      e.target.value = '';
    });

    document.getElementById('brief-next')?.addEventListener('click', () => {
      const ta = document.getElementById('brief-text');
      if (ta) n.brief = ta.value.trim();
      if (!n.brief) { this.toast('Add a brief before generating the storyboard.'); return; }
      n.plan = this.buildLocalPlan();
      this.goStep(4);
    });
  },

  referenceAssetsHtml() {
    const list = this.state.newReel.referenceAssets || [];
    if (!list.length) return '<p class="muted tiny">No style references attached. You can continue without one.</p>';
    return list.map((a, i) => {
      const colors = (a.analysis?.palette || []).map((c) => `<i style="background:${this.esc(this.safeColor(c, '#777'))}"></i>`).join('');
      return `
        <div class="reference-item">
          <div class="spread">
            <strong>${this.esc(a.name || `Reference ${i + 1}`)}</strong>
            ${a.analyzing ? '<span class="status-pill">Analyzing…</span>' : '<span class="status-pill paid">Analyzed locally</span>'}
          </div>
          ${a.analysis?.note ? `<p class="tiny">${this.esc(a.analysis.note)}</p>` : ''}
          ${colors ? `<div class="swatches">${colors}</div>` : ''}
        </div>`;
    }).join('');
  },

  analyzeReferenceFile(file) {
    const isVideo = /^video\//i.test(file && file.type || '');
    const url = URL.createObjectURL(file);
    const source = isVideo ? document.createElement('video') : new Image();
    if (isVideo) {
      source.muted = true;
      source.preload = 'auto';
      source.playsInline = true;
      source.src = url;
    } else {
      source.src = url;
    }
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => { URL.revokeObjectURL(url); reject(new Error('Reference analysis timed out')); }, 12000);
      const sample = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 32;
          canvas.height = 32;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) throw new Error('Canvas unavailable');
          ctx.drawImage(source, 0, 0, 32, 32);
          const data = ctx.getImageData(0, 0, 32, 32).data;
          const buckets = new Map();
          let brightness = 0;
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i], g = data[i + 1], b = data[i + 2];
            brightness += (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
            const key = `${Math.round(r / 48)}-${Math.round(g / 48)}-${Math.round(b / 48)}`;
            const hit = buckets.get(key) || { count: 0, r: 0, g: 0, b: 0 };
            hit.count++; hit.r += r; hit.g += g; hit.b += b;
            buckets.set(key, hit);
          }
          const palette = [...buckets.values()]
            .sort((a, b) => b.count - a.count)
            .slice(0, 4)
            .map((h) => {
              const hex = (v) => Math.round(v / h.count).toString(16).padStart(2, '0');
              return `#${hex(h.r)}${hex(h.g)}${hex(h.b)}`;
            });
          const avg = brightness / (data.length / 4);
          clearTimeout(timeout);
          URL.revokeObjectURL(url);
          resolve({
            method: 'local canvas pixel sampling',
            palette,
            brightness: Math.round(avg * 100) / 100,
            note: `${isVideo ? 'Frame sampled from a reference video' : 'Pixels sampled from a reference image'} locally; no upload, no remote inference.`,
          });
        } catch (err) {
          clearTimeout(timeout);
          URL.revokeObjectURL(url);
          reject(err);
        }
      };
      if (isVideo) {
        source.addEventListener('loadeddata', () => {
          source.currentTime = Math.min(0.2, Math.max(0, (source.duration || 0.4) / 2));
        }, { once: true });
        source.addEventListener('seeked', sample, { once: true });
        source.addEventListener('error', () => { clearTimeout(timeout); URL.revokeObjectURL(url); reject(new Error('Could not read reference video')); }, { once: true });
      } else {
        source.onload = sample;
        source.onerror = () => { clearTimeout(timeout); URL.revokeObjectURL(url); reject(new Error('Could not read reference image')); };
      }
    });
  },

  applyPath(path) {
    const n = this.state.newReel;
    const o = n.opts;
    if (path === 'built') {
      const look = this.state.draft.look || 'classic';
      Object.assign(o, {
        look, captionStyle: this.state.draft.captions || 'bold',
        motion: this.state.draft.motion || 'zoom', vfx: this.state.draft.vfx || 'none',
        intensity: this.state.draft.intensities || 'Polished', background: this.state.draft.backgrounds || 'original',
        music: this.state.draft.music || 'You decide', grade: this.state.draft.grades || 'none',
      });
      this.toast('Built-out style applied.');
    } else if (path === 'lumi') {
      const pick = (key, i) => { const list = this.catalogList(key); return list[i % list.length]?.id || ''; };
      Object.assign(o, {
        look: pick('templates', 3), captionStyle: pick('captions', 1), motion: pick('motion', 2),
        vfx: pick('vfx', 0), intensity: 'Punchy', hookStyle: 'Flash-forward',
        background: pick('backgrounds', 2), music: 'You decide', voiceover: 'No', grade: pick('grades', 1),
      });
      this.toast('Lumi picked a style for you.');
    } else if (path === 'last') {
      const d = this.loadDraftFromStorage();
      Object.assign(o, {
        look: d.look || o.look, captionStyle: d.captions || o.captionStyle,
        motion: d.motion || o.motion, vfx: d.vfx || o.vfx, intensity: d.intensities || o.intensity,
        background: d.backgrounds || o.background, music: d.music || o.music, grade: d.grades || o.grade,
      });
      this.toast('Same as last time applied.');
    } else if (path === 'custom') {
      this.toast('Customize the options below.');
      document.querySelector('[data-brief-key]')?.focus();
      return;
    } else if (path === 'words') {
      n.brief = `Title: ${n.title}\nVideo type: ${o.videoType}\n\nWrite your brief in your own words here.`;
      this.toast('Brief reset — write it your way.');
    }
    const ta = document.getElementById('brief-text');
    if (ta) ta.value = this.buildBrief();
    this.renderNewReel();
  },

  buildBrief() {
    const n = this.state.newReel;
    const o = n.opts;
    const val = (key) => {
      if (key === 'look') return this.optionName('templates', o.look);
      if (key === 'captionStyle') return this.optionName('captions', o.captionStyle);
      if (key === 'motion') return this.optionName('motion', o.motion);
      if (key === 'vfx') return this.optionName('vfx', o.vfx);
      if (key === 'background') return this.optionName('backgrounds', o.background);
      if (key === 'grade') return this.optionName('grades', o.grade);
      return o[key] || '';
    };
    const visual = n.sources.filter((s) => s.kind !== 'link');
    const links = n.sources.filter((s) => s.kind === 'link');
    const footage = visual.length
      ? `${visual.length} local clip${visual.length === 1 ? '' : 's'} (lead clip used for local export)`
      : links.length ? `${links.length} link source(s): ${links.map((s) => s.url).join(', ').slice(0, 240)}` : 'none yet';
    const script = o.voiceover === 'No' ? 'No voiceover. Captions carry the story.' : `${o.voiceover} requested.`;
    return [
      `Title: ${n.title}`,
      `Video: ${o.videoType} / ${o.length}`,
      `Script: ${script}`,
      `Video type: ${o.videoType}`,
      `Look: ${val('look')}`,
      `Caption style: ${val('captionStyle')}`,
      `Editing intensity: ${o.intensity}`,
      `Hook style: ${o.hookStyle}`,
      `Motion graphics add-on: ${val('motion')}`,
      `Captions: ${n.captionBurn ? val('captionStyle') : 'off'}`,
      `Music: ${o.music}`,
      `B-roll: ${val('vfx')}`,
      `Background: ${val('background')}`,
      `Reference video: ${o.referenceUrl || 'none'}`,
      `Reference match: ${o.referenceMatch}`,
      `Footage: ${footage}`,
      `What matters most: ${o.mattersMost || 'Make it clean and on-brand.'}`,
    ].join('\n');
  },

  buildLocalPlan() {
    const n = this.state.newReel;
    const o = n.opts;
    const brief = n.brief || this.buildBrief();
    const visual = n.sources.filter((s) => s.kind === 'file' || s.kind === 'camera');
    const lead = visual[0];
    const start = Math.max(0, Number(n.trim.start) || 0);
    const rawEnd = Number(n.trim.end) || Number(lead?.duration) || 30;
    const end = Math.max(start + 3, rawEnd);
    const span = end - start;
    const count = Math.max(3, Math.min(8, Math.round(span / 5)));
    const step = span / count;
    const timedCaptions = this.parseCaptions(brief);
    const words = String(n.title || '').trim().split(/\s+/).filter(Boolean);
    const styleNotes = (n.referenceAssets || []).map((a) => a.analysis?.note).filter(Boolean);
    const palette = [...new Set((n.referenceAssets || []).flatMap((a) => (a.analysis?.palette || [])))];
    if (palette.length) styleNotes.push(`Reference palette sampled locally: ${palette.join(', ')}.`);
    if (o.referenceUrl) styleNotes.push(`Reference link saved (not fetched): ${o.referenceUrl}`);
    if (n.link?.url) styleNotes.push(`Link source saved, no local media: ${n.link.url}`);
    const visualBase = `${this.optionName('templates', o.look)} look · ${o.hookStyle} hook · ${o.intensity} pacing`;
    const scenes = Array.from({ length: count }, (_, i) => {
      const t = start + i * step;
      const timed = timedCaptions.filter((c) => c.t >= t && c.t < t + step);
      const caption = timed.length
        ? timed.map((c) => c.text).join(' / ')
        : (words[i % Math.max(1, words.length)] || n.title || `Scene ${i + 1}`);
      return {
        index: i,
        start: Math.round(t * 100) / 100,
        duration: Math.round(step * 100) / 100,
        sourceIndex: visual.length ? i % visual.length : null,
        caption: String(caption).slice(0, 240),
        visual: `${visualBase}; scene ${i + 1} of ${count}`,
        motion: o.motion === 'none' ? null : `Apply ${this.optionName('motion', o.motion)} during this window`,
        sfx: /no music/i.test(o.music) ? null : 'Optional subtle transition tone from local Web Audio',
        broll: o.vfx === 'none' ? null : `${this.optionName('vfx', o.vfx)} treatment; no stock media is downloaded`,
      };
    });
    return {
      planner: 'on-device AI planner',
      method: 'deterministic local rules from brief, trim range, and locally sampled references',
      createdAt: new Date().toISOString(),
      title: n.title,
      brief: brief.slice(0, 2000),
      sceneCount: scenes.length,
      estimatedDuration: Math.round(span * 100) / 100,
      sourceSummary: visual.map((s, i) => `${i + 1}. ${s.name || 'clip'} (${this.fmtTime(s.duration || 0)})`),
      styleNotes,
      scenes,
    };
  },

  stepStoryboardHtml() {
    const n = this.state.newReel;
    const plan = n.plan || (n.plan = this.buildLocalPlan());
    const scenes = Array.isArray(plan.scenes) ? plan.scenes : [];
    return `
      <div class="storyboard-banner">
        <div class="spread"><strong>On-device AI planner</strong><span class="status-pill paid">${this.esc(plan.method || 'deterministic local rules')}</span></div>
        <p>${scenes.length} scenes · ${this.esc(this.fmtTime(plan.estimatedDuration || 0))} planned · captions, motion, B-roll timing, and SFX cues are instructions for the local renderer.</p>
        ${(plan.styleNotes || []).length ? `<p class="tiny">${this.esc(plan.styleNotes.join(' '))}</p>` : ''}
      </div>
      <div class="storyboard-grid">
        ${scenes.map((s, i) => `
          <article class="story-card">
            <div class="story-card-head"><span>Scene ${i + 1}</span><span>${this.esc(this.fmtTime(s.start))} · ${this.esc(this.fmtTime(s.duration))}</span></div>
            <p class="story-visual">${this.esc(s.visual || '')}</p>
            <div class="field">
              <label>Caption</label>
              <input type="text" data-scene-caption="${i}" value="${this.esc(s.caption || '')}" />
            </div>
            <p class="tiny"><strong>Motion:</strong> ${this.esc(s.motion || 'None')}</p>
            <p class="tiny"><strong>B-roll:</strong> ${this.esc(s.broll || 'None')}</p>
            <p class="tiny"><strong>SFX:</strong> ${this.esc(s.sfx || 'None')}</p>
          </article>`).join('')}
      </div>
      <div class="approval-box ${n.storyboardApproved ? 'approved' : ''}">
        <div class="spread"><strong>${n.storyboardApproved ? 'Storyboard approved' : 'Approve this storyboard'}</strong><span class="status-pill ${n.storyboardApproved ? 'paid' : ''}">${n.storyboardApproved ? 'Unlocked' : 'Export locked'}</span></div>
        <p class="tiny">Approval is recorded on the reel before any local export is accepted. No AI-generated imagery, voice, or stock footage is implied.</p>
        <div class="btn-row" style="margin-top:10px">
          <button class="btn btn-secondary" id="regen-plan">Regenerate locally</button>
          <button class="btn ${n.storyboardApproved ? 'btn-ghost' : 'btn-primary'}" id="approve-plan">${n.storyboardApproved ? 'Approved ✓' : 'Approve storyboard'}</button>
        </div>
      </div>
      <div class="btn-row" style="margin-top:16px">
        <button class="btn btn-secondary" onclick="app.goStep(3)">Back</button>
        <button class="btn btn-primary" id="create-reel" ${n.storyboardApproved ? '' : 'disabled'}>Create reel</button>
      </div>`;
  },

  bindStepStoryboard() {
    const n = this.state.newReel;
    document.querySelectorAll('[data-scene-caption]').forEach((el) => {
      el.addEventListener('input', () => {
        const i = Number(el.dataset.sceneCaption);
        if (n.plan?.scenes?.[i]) n.plan.scenes[i].caption = el.value;
      });
    });
    document.getElementById('regen-plan')?.addEventListener('click', () => {
      n.plan = this.buildLocalPlan();
      n.storyboardApproved = false;
      this.renderNewReel();
      this.toast('Storyboard regenerated locally. Approve it again.');
    });
    document.getElementById('approve-plan')?.addEventListener('click', () => {
      n.storyboardApproved = true;
      this.renderNewReel();
      this.toast('Storyboard approved locally. Creating the reel will record this approval.');
    });
    document.getElementById('create-reel')?.addEventListener('click', () => this.createReel());
  },

  editorCaptionText(reel, plan) {
    if (Array.isArray(reel.captions) && reel.captions.length) {
      return reel.captions.map((c) => `${this.fmtTime(c.t)} ${c.text || ''}`).join('\n');
    }
    const scenes = (plan && plan.scenes) || (Array.isArray(reel.storyboard) ? reel.storyboard : []);
    return scenes.filter((s) => s && s.caption)
      .map((s) => `${this.fmtTime(s.start)} ${s.caption}`).join('\n');
  },

  parseCaptions(brief) {
    const out = [];
    String(brief || '').split('\n').forEach((line) => {
      const m = line.match(/^\s*(\d{1,2}:\d{2}|\d+(?:\.\d+)?)\s+(.+)$/);
      if (!m) return;
      const t = m[1].includes(':')
        ? m[1].split(':').reduce((a, b) => a * 60 + Number(b), 0)
        : Number(m[1]);
      if (isFinite(t)) out.push({ t, text: m[2].trim() });
    });
    return out.slice(0, 80);
  },

  /* ---------- Create reel (ingest + approved plan only; export is a separate step) ---------- */
  async createReel() {
    const n = this.state.newReel;
    if (n.exporting) return;
    if (!n.sources.length) { this.toast('Add at least one clip or link.'); return; }
    if (!n.title.trim()) { this.toast('Required Please enter the title of your video'); return; }
    if (!n.storyboardApproved || !n.plan) { this.toast('Approve the storyboard before creating the reel.'); return; }
    const briefText = (document.getElementById('brief-text')?.value || n.brief || this.buildBrief()).trim();
    if (!briefText) { this.toast('Add a brief before creating the reel.'); return; }
    n.brief = briefText;

    const visual = n.sources.filter((s) => s.kind === 'file' || s.kind === 'camera');
    const links = n.sources.filter((s) => s.kind === 'link');
    const lead = visual[0] || null;
    const sourceKind = visual.length ? (lead.kind === 'camera' ? 'camera' : 'file') : 'link';
    const plan = n.plan || this.buildLocalPlan();
    const storyboard = plan.scenes.slice();

    const payload = {
      title: n.title,
      brief: briefText,
      look: n.opts.look || this.state.draft.look || 'classic',
      format: n.format,
      sourceKind,
      sourceUrl: lead ? (lead.url || '') : (links[0]?.url || ''),
      shorts: links[0]?.shorts || 0,
      noMusicUrl: '',
      userId: this.state.user?.id || 'u1',
      user: this.state.user?.username || 'you',
      caption: briefText.slice(0, 240),
      style: n.opts.look || 'classic',
      rawUrls: [],
      referenceUrls: [],
      assets: [],
      plan,
      storyboard,
      styleOptions: Object.assign({}, n.opts),
    };

    this.setCreateProgress(true, 2, 'Saving draft…');
    n.exporting = true;
    const btn = document.getElementById('create-reel');
    if (btn) { btn.disabled = true; btn.textContent = 'Creating…'; }

    try {
      this.state.draft = Object.assign({}, this.state.draft, {
        title: n.title, brief: briefText, look: payload.look, format: n.format,
      });
      await this.saveDraftImmediate();
      try {
        await this.request('/intent', {
          method: 'POST',
          body: { kind: 'brief', reel: '', text: briefText, payload: { title: n.title, format: n.format }, idem: this.idem() },
        });
      } catch (e) { /* intent logging is best-effort */ }

      // Style references: remote links are recorded honestly; local files keep
      // their locally sampled analysis. No reference media is sent for inference.
      if (n.opts.referenceUrl && /^https?:\/\//i.test(n.opts.referenceUrl)) {
        payload.referenceUrls.push(n.opts.referenceUrl);
        payload.assets.push({ kind: 'reference', name: 'Reference link', url: n.opts.referenceUrl, remote: true, analysis: null });
      }
      for (const a of n.referenceAssets || []) {
        payload.assets.push({
          kind: a.kind || 'reference',
          name: a.name || 'reference',
          url: '',
          remote: false,
          analysis: a.analysis || null,
        });
      }

      // Link-only: honest fallback, no pretend download or edit.
      if (!lead) {
        payload.status = 'waiting';
        payload.videoUrl = '';
        let created = null;
        try {
          const data = await this.request('/reels', { method: 'POST', body: payload });
          created = data.reel || null;
          this.toast('Link saved. Editing from links needs the Lumi service.');
        } catch (e) {
          this.toast('Link saved locally. Editing from links needs the Lumi service.');
        }
        this.finishCreate(created, payload, briefText);
        return;
      }

      // Upload raw footage with metadata. This is ingest, not an export.
      this.setCreateProgress(true, 20, 'Uploading raw footage…');
      let done = 0;
      for (let i = 0; i < visual.length; i++) {
        const s = visual[i];
        try {
          const file = s.file || s.blob;
          const url = await this.uploadBlob(file, s.name || 'clip.mp4', {
            kind: 'raw', batch: 'intake', ofIndex: i + 1,
          });
          payload.rawUrls.push(url);
          payload.assets.push({
            kind: 'raw', name: s.name || 'clip.mp4', url, remote: false,
            ofIndex: i + 1, analysis: null,
          });
        } catch (e) { /* one clip failing should not block the reel */ }
        done++;
        this.setCreateProgress(true, 20 + Math.round((done / visual.length) * 50), 'Uploading raw footage…');
      }

      // Reference files are uploaded as media assets, but their analysis was
      // computed locally before upload and is stored alongside the asset row.
      for (let i = 0; i < (n.referenceAssets || []).length; i++) {
        const a = n.referenceAssets[i];
        try {
          const url = await this.uploadBlob(a.file, a.name || 'reference', {
            kind: a.kind || 'reference', batch: 'references', ofIndex: i + 1,
          });
          const existing = payload.assets.find((x) => x.name === a.name && x.kind === a.kind && !x.url);
          const asset = existing || { kind: a.kind || 'reference', name: a.name || 'reference' };
          asset.url = url;
          asset.remote = false;
          asset.ofIndex = i + 1;
          asset.analysis = a.analysis || null;
          if (!existing) payload.assets.push(asset);
        } catch (e) { /* reference upload is best effort */ }
      }

      payload.videoUrl = payload.rawUrls[0] || '';
      this.setCreateProgress(true, 80, 'Saving approved storyboard…');

      let created = null;
      try {
        const data = await this.request('/reels', { method: 'POST', body: payload });
        created = data.reel || null;
        if (created) {
          const approval = await this.request(`/reels/${created.id}/review`, {
            method: 'POST',
            body: { action: 'approve-storyboard', version: 1, text: 'Approved in New Reel step 4.', idem: this.idem() },
          });
          if (approval.reel) created = approval.reel;
        }
      } catch (e) {
        this.toast('Reel saved locally; approval could not be recorded on the service.');
      }
      this.finishCreate(created, payload, briefText);
    } catch (e) {
      this.toast(e.message || 'Could not create reel');
      this.setCreateProgress(false, 0, '');
    } finally {
      n.exporting = false;
      if (btn) { btn.disabled = false; btn.textContent = 'Create reel'; }
    }
  },

  setCreateProgress(show, pct, label) {
    const wrap = document.getElementById('create-progress');
    const fill = document.getElementById('create-progress-fill');
    const text = document.getElementById('create-progress-label');
    if (!wrap) return;
    wrap.classList.toggle('hidden', !show);
    if (fill) fill.style.width = `${Math.max(0, Math.min(100, pct))}%`;
    if (text && label) text.textContent = label;
  },

  finishCreate(created, payload, briefText) {
    const n = this.state.newReel;
    this.setCreateProgress(false, 0, '');
    const reel = created || Object.assign({}, payload, {
      id: `local_${Date.now()}`,
      likes: 0,
      notes: [],
      versions: [],
      revision: 0,
      revisionLimit: 3,
      createdAt: new Date().toISOString(),
    });
    if (payload.videoUrl) this.state.localSources[reel.id] = payload.videoUrl;
    this.state.reels.unshift(reel);
    n.done = true;
    n.created = reel;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ look: payload.look, brief: briefText }));
    } catch (e) { /* noop */ }
    this.renderNewReel();
    this.renderReels();
    // Refresh shared state, but keep a locally created reel visible if the
    // backend state endpoint does not include it yet.
    this.loadState().then(() => {
      if (!this.state.reels.some((x) => String(x.id) === String(reel.id))) {
        this.state.reels.unshift(reel);
        this.renderReels();
      }
    }).catch(() => {});
  },

  completionHtml() {
    const n = this.state.newReel;
    const r = n.created || {};
    const id = this.esc(r.id || '');
    return `
      <div class="stepper-wrap">
        <div class="completion">
          <div class="big-check">✓</div>
          <h3>Reel created</h3>
          <p>${this.esc(r.status === 'waiting' ? 'Your link is saved. Editing from links needs the Lumi service.' : 'Your approved storyboard and footage are saved. Open Edit to render a real local export.')}</p>
          <div class="btn-row" style="margin-top:18px">
            <button class="btn btn-primary" onclick="app.openTab('reels')">View reel</button>
            <button class="btn btn-secondary" data-action="review" data-id="${id}">Review</button>
            <button class="btn btn-secondary" data-action="cover" data-id="${id}">Cover</button>
            <button class="btn btn-secondary" data-action="postkit" data-id="${id}">Post kit</button>
          </div>
          <button class="btn btn-ghost btn-block" style="margin-top:12px" onclick="app.resetNewReel();app.renderNewReel()">Make another</button>
        </div>
      </div>`;
  },

  /* =====================================================================
     10. EDITOR / EXPORT SHEET
     ===================================================================== */
  /* ---------- Edit studio render helpers ---------- */
  motionPresetName(motion, duration, M) {
    if (!M) return 'none';
    const keys = (motion && Array.isArray(motion.keys) ? motion.keys : []);
    if (!keys.length) return 'none';
    const sig = (list) => JSON.stringify(list.map((k) => [
      Number(k.t).toFixed(2), Number(k.x).toFixed(3), Number(k.y).toFixed(3),
      Number(k.zoom).toFixed(3), Number(k.rotate).toFixed(3),
    ]));
    const target = sig(keys);
    for (const name of Object.keys(M.MOTION_PRESETS || {})) {
      if (sig(M.normalizeMotion(name, Number(duration) || 5).keys) === target) return name;
    }
    return 'custom';
  },

  editClipBlockHtml(clip, i, active, total) {
    const M = this.editModel();
    const t = Math.max(0.05, Number(total) || 1);
    const start = Math.max(0, Number(clip?.timelineStart) || 0);
    const dur = Math.max(0.05, Number(clip?.duration) || 0);
    const left = Math.min(99, start / t * 100);
    const width = Math.max(1.2, Math.min(100 - left, dur / t * 100));
    const tr = clip?.transition || {};
    const hasTr = tr.type && tr.type !== 'none' && Number(tr.duration) > 0;
    return `<button type="button" class="edit-block ${active ? 'active' : ''}" data-clip-index="${i}" style="left:${left.toFixed(2)}%;width:${width.toFixed(2)}%" title="${this.esc(clip?.name || ('Clip ' + (i + 1)))}">
      <span class="eb-label">${this.esc(clip?.name || ('Clip ' + (i + 1)))}</span>
      <span class="eb-meta">${this.fmtTime(dur)}${hasTr ? ' · ' + this.esc(tr.type) : ''}</span>
    </button>`;
  },

  editPanelHtml(clip, i) {
    const M = this.editModel();
    const c = clip || {};
    const tr = c.transition || { type: 'none', duration: 0 };
    const a = c.audio || { volume: 1, fadeIn: 0, fadeOut: 0, muted: false };
    const dur = Number(c.duration) || 5;
    const presets = M ? Object.keys(M.MOTION_PRESETS || {}) : ['none'];
    const activePreset = this.motionPresetName(c.motion, dur, M);
    const presetOpts = presets.map((p) => `<option value="${this.esc(p)}" ${p === activePreset ? 'selected' : ''}>${this.esc(p === 'none' ? 'None' : p)}</option>`).join('')
      + (activePreset === 'custom' ? '<option value="custom" selected>custom keyframes</option>' : '');
    const transitions = (M ? M.TRANSITIONS : ['none', 'fade', 'wipe', 'slide', 'zoom'])
      .map((p) => `<option value="${this.esc(p)}" ${p === tr.type ? 'selected' : ''}>${this.esc(p)}</option>`).join('');
    const positions = (M ? M.CAP_POSITIONS : ['top', 'middle', 'bottom']);
    const sizes = (M ? M.CAP_SIZES : ['S', 'M', 'L']);
    const keys = (c.motion && Array.isArray(c.motion.keys) ? c.motion.keys : []);
    return `
      <div class="edit-panel-head">
        <div><strong>Clip ${i + 1}</strong><span class="tiny muted"> ${this.esc(c.name || '')}</span></div>
        <div class="edit-panel-actions">
          <button type="button" data-clip-action="left" title="Move earlier">←</button>
          <button type="button" data-clip-action="right" title="Move later">→</button>
          <button type="button" data-clip-action="duplicate">Duplicate</button>
          <button type="button" data-clip-action="remove">Remove</button>
        </div>
      </div>
      <div class="fields-row">
        <div class="field"><label>In point</label><input type="number" step="0.01" min="0" data-clip-field="inPoint" value="${this.esc(Number(c.inPoint).toFixed(2))}" /></div>
        <div class="field"><label>Duration</label><input type="number" step="0.01" min="0.05" data-clip-field="duration" value="${this.esc(dur.toFixed(2))}" /></div>
        <div class="field"><label>Starts at</label><input type="number" step="0.01" min="0" data-clip-field="timelineStart" value="${this.esc(Number(c.timelineStart).toFixed(2))}" /></div>
      </div>
      <div class="section-title small">Transition in</div>
      <div class="fields-row">
        <div class="field"><label>Type</label><select data-clip-field="transition.type">${transitions}</select></div>
        <div class="field"><label>Length (s)</label><input type="number" step="0.05" min="0" max="5" data-clip-field="transition.duration" value="${this.esc(Number(tr.duration || 0).toFixed(2))}" /></div>
      </div>
      <div class="section-title small">Motion keyframes</div>
      <div class="field"><label>Preset</label><select data-clip-motion="preset">${presetOpts}</select></div>
      <div class="keyframe-list">
        ${keys.length ? keys.map((k, ki) => `
          <div class="keyframe-row" data-key-index="${ki}">
            <input type="number" step="0.05" min="0" data-key-field="t" value="${this.esc(Number(k.t).toFixed(2))}" title="Time in clip" />
            <input type="number" step="0.05" min="-1" max="1" data-key-field="x" value="${this.esc(Number(k.x).toFixed(2))}" title="Pan X" />
            <input type="number" step="0.05" min="-1" max="1" data-key-field="y" value="${this.esc(Number(k.y).toFixed(2))}" title="Pan Y" />
            <input type="number" step="0.05" min="1" max="3" data-key-field="zoom" value="${this.esc(Number(k.zoom).toFixed(2))}" title="Zoom" />
            <input type="number" step="0.5" min="-45" max="45" data-key-field="rotate" value="${this.esc(Number(k.rotate).toFixed(1))}" title="Rotate" />
            <button type="button" data-clip-action="remove-key" title="Remove keyframe">✕</button>
          </div>`).join('') : '<p class="tiny muted">No keyframes. Choose a preset or add one at the playhead.</p>'}
      </div>
      <div class="btn-row compact">
        <button type="button" class="btn btn-ghost" data-clip-action="add-key">Add keyframe at playhead</button>
        <button type="button" class="btn btn-ghost" data-clip-action="clear-motion">Clear motion</button>
      </div>
      <div class="section-title small">Audio</div>
      <div class="fields-row">
        <div class="field"><label>Volume</label><input type="number" step="0.05" min="0" max="2" data-audio-field="volume" value="${this.esc(Number(a.volume).toFixed(2))}" /></div>
        <div class="field"><label>Fade in</label><input type="number" step="0.05" min="0" data-audio-field="fadeIn" value="${this.esc(Number(a.fadeIn || 0).toFixed(2))}" /></div>
        <div class="field"><label>Fade out</label><input type="number" step="0.05" min="0" data-audio-field="fadeOut" value="${this.esc(Number(a.fadeOut || 0).toFixed(2))}" /></div>
        <div class="field"><label>Mute</label><label class="switch"><input type="checkbox" data-audio-field="muted" ${a.muted ? 'checked' : ''} /><i></i></label></div>
      </div>
      <p class="tiny muted">Pan / zoom / rotation are applied by the local renderer. Audio gain and fades are audible in exported videos; the preview is muted.</p>`;
  },

  editCaptionRowHtml(cap, i) {
    const M = this.editModel();
    const c = cap || {};
    const positions = (M ? M.CAP_POSITIONS : ['top', 'middle', 'bottom']);
    const sizes = (M ? M.CAP_SIZES : ['S', 'M', 'L']);
    const opts = (list, cur) => list.map((v) => `<option value="${this.esc(v)}" ${String(cur) === String(v) ? 'selected' : ''}>${this.esc(v)}</option>`).join('');
    return `<div class="caption-row" data-cap-index="${i}">
      <div class="fields-row">
        <div class="field"><label>At (s)</label><input type="number" step="0.1" min="0" data-cap-field="t" value="${this.esc(Number(c.t).toFixed(2))}" /></div>
        <div class="field"><label>For (s)</label><input type="number" step="0.1" min="0.05" data-cap-field="duration" value="${this.esc(Number(c.duration || 3).toFixed(2))}" /></div>
        <div class="field"><label>Position</label><select data-cap-field="position">${opts(positions, c.position || 'bottom')}</select></div>
        <div class="field"><label>Size</label><select data-cap-field="size">${opts(sizes, c.size || 'M')}</select></div>
      </div>
      <div class="fields-row">
        <div class="field"><label>Color (blank = look default)</label><input type="text" data-cap-field="color" placeholder="#ffffff or blank" value="${this.esc(c.color || '')}" /></div>
        <div class="field"><label>Weight</label><select data-cap-field="weight">${opts([400, 500, 600, 700, 800, 900], c.weight || 800)}</select></div>
      </div>
      <div class="caption-text-row">
        <input type="text" data-cap-field="text" value="${this.esc(c.text || '')}" placeholder="Caption text" />
        <button type="button" data-cap-action="remove" title="Remove caption">✕</button>
      </div>
    </div>`;
  },

  openEditor(reelId) {
    const reel = this.state.reels.find((r) => String(r.id) === String(reelId));
    if (!reel) return;
    const M = this.editModel();
    const edit = this.getEdit(reel);
    edit.captions = Array.isArray(edit.captions) ? edit.captions : [];
    edit.hook = edit.hook || { text: '', t: 0, duration: 2.5 };
    edit.cta = edit.cta || { text: 'Follow for more', t: 0, duration: 2 };
    if (M) edit.clips = M.normalizeTimeline(edit.clips, {
      look: edit.look, format: edit.format, musicMode: edit.musicMode,
    }).clips;
    const src = this.reelVideoUrl(reel);
    const canExport = this.editorCan('exportVideo');
    const hasPlan = !!(reel.plan || (Array.isArray(reel.storyboard) && reel.storyboard.length));
    const approved = !hasPlan || reel.stage === 'approved' || reel.status === 'done';
    const plan = reel.plan || (Array.isArray(reel.storyboard) && reel.storyboard.length
      ? { scenes: reel.storyboard, planner: 'on-device AI planner', method: 'saved storyboard' }
      : null);
    const looks = this.catalogList('templates').map((l) => `<option value="${this.esc(l.id)}" ${String(edit.look || l.id) === String(l.id) ? 'selected' : ''}>${this.esc(l.name)}</option>`).join('');
    const total = M ? M.normalizeTimeline(edit.clips, { look: edit.look, format: edit.format }).total : 30;
    const captionText = M && typeof M.serializeCaptions === 'function'
      ? M.serializeCaptions(edit.captions) : this.editorCaptionText(reel, plan);

    const body = `
      ${hasPlan ? `<div class="plan-banner ${approved ? 'ok' : ''}">
        <div class="spread"><strong>On-device plan v${this.esc(reel.planVersion || 1)}</strong><span>${this.esc(reel.stage || 'storyboard')}</span></div>
        <p>${approved ? 'Approved — local export is unlocked.' : 'Export is locked. Approve the storyboard in Review before rendering.'}</p>
      </div>` : ''}
      <div class="edit-studio">
        <div class="edit-preview-wrap">
          <canvas id="edit-canvas" class="edit-canvas" aria-label="Edit preview"></canvas>
          <video id="edit-fallback-video" class="review-video hidden" src="${this.esc(src)}" muted playsinline controls preload="metadata"></video>
          <div class="edit-preview-bar">
            <button type="button" class="icon-btn" id="edit-play" aria-label="Play or pause preview">▶</button>
            <input type="range" id="edit-seek" min="0" max="${this.esc(String(Math.max(0.05, total).toFixed(2)))}" step="0.01" value="0" aria-label="Seek preview" />
            <span class="timecode" id="edit-time">0:00 / ${this.fmtTime(total)}</span>
          </div>
          <p class="hint" id="edit-preview-hint">Preview is muted and drawn by the same local renderer used for export.</p>
        </div>
        ${!canExport ? '<p class="hint">Local export is not supported by this browser engine. You can still save a version note.</p>' : ''}

        <div class="section-title">Timeline <span class="tiny muted" id="edit-total">${this.fmtTime(total)}</span></div>
        <div class="edit-timeline" id="edit-timeline">
          ${edit.clips.map((c, i) => this.editClipBlockHtml(c, i, i === 0, total)).join('') || '<p class="tiny muted">No clips yet. Add one from the source.</p>'}
        </div>
        <div class="btn-row compact" style="margin-top:8px">
          <button type="button" class="btn btn-ghost" id="edit-reflow">Reflow timeline</button>
          <button type="button" class="btn btn-ghost" id="edit-add-clip">Add clip from source</button>
          <button type="button" class="btn btn-ghost" id="edit-reset">Rebuild edit</button>
        </div>
        <div class="edit-panel" id="edit-clip-panel">${edit.clips.length ? this.editPanelHtml(edit.clips[0], 0) : '<p class="tiny muted">Select a clip to edit it.</p>'}</div>

        <div class="section-title">Captions <span class="tiny muted" id="edit-captions-count">${edit.captions.length} lines</span></div>
        <div class="edit-captions" id="edit-captions-list">
          ${edit.captions.map((c, i) => this.editCaptionRowHtml(c, i)).join('') || '<p class="tiny muted">No timed captions. Add one at the playhead.</p>'}
        </div>
        <div class="btn-row compact" style="margin-top:8px"><button type="button" class="btn btn-ghost" id="edit-add-cap">Add caption at playhead</button></div>
        <details class="edit-advanced">
          <summary>Advanced caption text</summary>
          <p class="tiny muted">One per line: <code>0:03|bottom|M|#ffffff|800|Your line</code>. Blank color uses the look default.</p>
          <textarea id="edit-cap-text" rows="5" placeholder="0:00|bottom|L||800|Hook line">${this.esc(captionText)}</textarea>
          <button type="button" class="btn btn-secondary" id="edit-cap-apply">Apply text</button>
        </details>

        <div class="section-title">Format & copy</div>
        <div class="fields-row">
          <div class="field"><label>Format</label><select id="edit-format"><option value="vertical" ${edit.format === 'vertical' ? 'selected' : ''}>Vertical 9:16</option><option value="horizontal" ${edit.format === 'horizontal' ? 'selected' : ''}>Horizontal</option></select></div>
          <div class="field"><label>Look</label><select id="edit-look">${looks}</select></div>
        </div>
        <div class="field"><label>Hook text</label><input id="edit-hook" type="text" value="${this.esc(edit.hook.text || reel.title || '')}" /></div>
        <div class="field"><label>CTA text</label><input id="edit-cta" type="text" value="${this.esc(edit.cta.text || 'Follow for more')}" /></div>
        <div class="field"><label>Audio</label><select id="edit-music"><option value="source" ${edit.musicMode !== 'none' ? 'selected' : ''}>Keep clip audio</option><option value="none" ${edit.musicMode === 'none' ? 'selected' : ''}>Silent export</option></select></div>
        <p class="tiny muted" id="edit-save-state">Edits are saved on this device only.</p>
        <div class="progress-wrap hidden" id="edit-progress"><div class="progress-bar"><i id="edit-progress-fill"></i></div><div class="progress-label" id="edit-progress-label">Exporting…</div></div>
      </div>`;

    const foot = `
      <div class="btn-row">
        <button class="btn btn-secondary" id="edit-save-note">Save version</button>
        <button class="btn btn-ghost hidden" id="edit-cancel">Cancel export</button>
        <button class="btn btn-primary" id="edit-export" ${src && canExport && approved ? '' : 'disabled'}>Export</button>
      </div>`;

    this.showSheet(`Edit · ${reel.title || 'Reel'}`, body, foot, {
      onMount: (overlay) => this.bindEditor(overlay, reel, edit, src, plan, approved),
    });
    this.saveEdit(reel.id, edit);
  },

  bindEditor(overlay, reel, edit, src, plan, approved) {
    const M = this.editModel();
    const E = this.editor();
    const $ = (sel) => overlay.querySelector(sel);
    let selected = 0;
    let exportController = null;
    let preview = null;
    let playing = false;

    const totalOf = () => {
      if (M) {
        return M.normalizeTimeline(edit.clips, {
          look: edit.look, format: edit.format, musicMode: edit.musicMode,
        }).total;
      }
      return edit.clips.reduce((sum, c) => Math.max(sum, (Number(c.timelineStart) || 0) + (Number(c.duration) || 0)), 0.05);
    };
    const playhead = () => (preview && typeof preview.currentTime === 'function'
      ? preview.currentTime() : (Number($('#edit-seek')?.value) || 0));
    const persist = () => {
      this.saveEdit(reel.id, edit);
      const s = $('#edit-save-state');
      if (s) s.textContent = 'Saved on this device · ' + new Date().toLocaleTimeString();
    };
    const setProgress = (show, pct, label) => {
      const w = $('#edit-progress');
      const f = $('#edit-progress-fill');
      const l = $('#edit-progress-label');
      if (w) w.classList.toggle('hidden', !show);
      if (f) f.style.width = `${Math.max(0, Math.min(100, pct))}%`;
      if (l && label) l.textContent = label;
    };
    const syncTime = (t) => {
      const time = Math.max(0, Number(t) || 0);
      const el = $('#edit-time');
      if (el) el.textContent = this.fmtTime(time) + ' / ' + this.fmtTime(totalOf());
      const seek = $('#edit-seek');
      if (seek && document.activeElement !== seek) seek.value = String(Math.min(time, Number(seek.max) || time));
    };

    const renderTimeline = () => {
      const el = $('#edit-timeline');
      if (!el) return;
      const total = totalOf();
      el.innerHTML = edit.clips.map((c, i) => this.editClipBlockHtml(c, i, selected === i, total)).join('')
        || '<p class="tiny muted">No clips yet. Add one from the source.</p>';
      const label = $('#edit-total');
      if (label) label.textContent = this.fmtTime(total);
    };
    const renderPanel = () => {
      const el = $('#edit-clip-panel');
      if (!el) return;
      el.innerHTML = edit.clips[selected] ? this.editPanelHtml(edit.clips[selected], selected)
        : '<p class="tiny muted">Select a clip to edit it.</p>';
    };
    const renderCaptions = () => {
      const el = $('#edit-captions-list');
      if (!el) return;
      el.innerHTML = edit.captions.map((c, i) => this.editCaptionRowHtml(c, i)).join('')
        || '<p class="tiny muted">No timed captions. Add one at the playhead.</p>';
      const count = $('#edit-captions-count');
      if (count) count.textContent = edit.captions.length + ' lines';
    };
    const refreshChrome = () => {
      const seek = $('#edit-seek');
      if (seek) seek.max = String(Math.max(0.05, totalOf()));
      renderTimeline();
      renderPanel();
      syncTime(playhead());
    };

    /* Muted, seek-safe preview. Export uses the same renderer with real audio. */
    const initPreview = () => {
      if (preview) {
        try { preview.destroy(); } catch (e) { /* noop */ }
        preview = null;
        this.state.editPreview = null;
      }
      playing = false;
      const play = $('#edit-play');
      if (play) play.textContent = '▶';
      const canvas = $('#edit-canvas');
      const hint = $('#edit-preview-hint');
      const fallback = $('#edit-fallback-video');
      if (!E || typeof E.createPreview !== 'function' || !canvas || !edit.clips.length) {
        if (canvas) canvas.classList.add('hidden');
        if (fallback) fallback.classList.remove('hidden');
        if (hint) hint.textContent = 'Preview is unavailable here; local export may still work.';
        return Promise.resolve();
      }
      return E.createPreview({
        canvas,
        edit,
        plan,
        onTime: (t) => {
          syncTime(t);
          if (playing && t >= totalOf() - 0.02) {
            playing = false;
            const b = $('#edit-play');
            if (b) b.textContent = '▶';
          }
        },
      }).then((p) => {
        preview = p;
        this.state.editPreview = p;
        const seek = $('#edit-seek');
        if (seek) seek.max = String(Math.max(0.05, p.duration()));
        canvas.classList.remove('hidden');
        if (fallback) fallback.classList.add('hidden');
        if (hint) hint.textContent = 'Preview is muted and drawn by the same local renderer used for export.';
      }).catch((err) => {
        canvas.classList.add('hidden');
        if (fallback) fallback.classList.remove('hidden');
        if (hint) hint.textContent = 'Preview unavailable: ' + ((err && err.message) || 'source cannot be drawn');
      });
    };

    $('#edit-play')?.addEventListener('click', () => {
      const btn = $('#edit-play');
      if (preview) {
        if (preview.currentTime() >= totalOf() - 0.02) preview.seek(0).catch(() => {});
        if (playing) { preview.pause(); playing = false; }
        else { preview.play(); playing = true; }
      } else {
        const fb = $('#edit-fallback-video');
        if (fb) {
          if (fb.paused) { const p = fb.play(); if (p && p.catch) p.catch(() => {}); playing = true; }
          else { fb.pause(); playing = false; }
        }
      }
      if (btn) btn.textContent = playing ? '❚❚' : '▶';
    });

    $('#edit-seek')?.addEventListener('input', (e) => {
      const v = Number(e.target.value) || 0;
      syncTime(v);
      if (playing) {
        playing = false;
        if (preview) preview.pause();
        const b = $('#edit-play');
        if (b) b.textContent = '▶';
      }
      if (preview) preview.seek(v).catch(() => {});
      else {
        const fb = $('#edit-fallback-video');
        if (fb && isFinite(fb.duration)) { try { fb.currentTime = v; } catch (err) { /* noop */ } }
      }
    });

    $('#edit-timeline')?.addEventListener('click', (e) => {
      const block = e.target.closest('[data-clip-index]');
      if (!block) return;
      selected = Number(block.dataset.clipIndex) || 0;
      renderTimeline();
      renderPanel();
      const c = edit.clips[selected];
      if (c && preview) preview.seek(Math.min((Number(c.timelineStart) || 0) + 0.01, totalOf())).catch(() => {});
    });

    $('#edit-reflow')?.addEventListener('click', () => {
      if (M) M.reflow(edit.clips);
      else {
        let cursor = 0;
        edit.clips.forEach((c) => { c.timelineStart = cursor; cursor += Math.max(0.05, Number(c.duration) || 0); });
      }
      refreshChrome();
      persist();
      initPreview();
      this.toast('Timeline reflowed to remove gaps.');
    });

    $('#edit-add-clip')?.addEventListener('click', () => {
      if (!src) { this.toast('No source clip is available.'); return; }
      const dur = edit.clips[selected] ? (Number(edit.clips[selected].duration) || 3) : 3;
      edit.clips.push({
        id: 'c_' + Date.now(),
        url: src,
        name: 'Clip ' + (edit.clips.length + 1),
        inPoint: 0,
        duration: dur,
        sourceDuration: 0,
        timelineStart: 0,
        transition: { type: 'fade', duration: 0.3 },
        motion: M ? M.normalizeMotion('none', dur) : { keys: [] },
        audio: { volume: 1, fadeIn: 0, fadeOut: 0, muted: false },
        look: edit.look || 'classic',
      });
      if (M) M.reflow(edit.clips);
      selected = edit.clips.length - 1;
      refreshChrome();
      persist();
      initPreview();
    });

    $('#edit-reset')?.addEventListener('click', () => {
      if (M) Object.assign(edit, M.defaultEdit(reel));
      else { edit.clips = []; edit.captions = []; }
      edit.captions = Array.isArray(edit.captions) ? edit.captions : [];
      selected = 0;
      const hook = $('#edit-hook');
      if (hook) hook.value = edit.hook?.text || '';
      const cta = $('#edit-cta');
      if (cta) cta.value = edit.cta?.text || '';
      const capText = $('#edit-cap-text');
      if (capText && M) capText.value = M.serializeCaptions(edit.captions);
      refreshChrome();
      renderCaptions();
      persist();
      initPreview();
      this.toast('Edit rebuilt from the source.');
    });

    $('#edit-clip-panel')?.addEventListener('change', (e) => {
      const el = e.target;
      const clip = edit.clips[selected];
      if (!clip) return;
      const field = el.dataset.clipField;
      if (field === 'transition.type') {
        clip.transition = clip.transition || {};
        clip.transition.type = el.value;
        refreshChrome(); persist(); return;
      }
      if (field === 'transition.duration') {
        clip.transition = clip.transition || {};
        clip.transition.duration = Math.max(0, Number(el.value) || 0);
        refreshChrome(); persist(); return;
      }
      if (el.dataset.clipMotion === 'preset') {
        if (el.value !== 'custom' && M) clip.motion = M.normalizeMotion(el.value, Number(clip.duration) || 5);
        renderPanel(); persist(); initPreview(); return;
      }
      const af = el.dataset.audioField;
      if (af) {
        clip.audio = clip.audio || {};
        clip.audio[af] = af === 'muted' ? !!el.checked : Number(el.value);
        persist(); return;
      }
      if (el.dataset.keyField != null) {
        const ki = Number(el.closest('[data-key-index]')?.dataset.keyIndex);
        const k = clip.motion && Array.isArray(clip.motion.keys) ? clip.motion.keys[ki] : null;
        if (k) {
          k[el.dataset.keyField] = Number(el.value);
          if (M) clip.motion = M.normalizeMotion(clip.motion, Number(clip.duration) || 5);
          renderPanel(); persist(); initPreview();
        }
        return;
      }
      if (field) {
        const value = Number(el.value);
        clip[field] = isFinite(value) ? value : 0;
        if (field === 'duration') {
          clip.duration = Math.max(0.05, clip.duration);
          if (M) clip.motion = M.normalizeMotion(clip.motion, clip.duration);
        }
        if (field === 'inPoint' || field === 'timelineStart') clip[field] = Math.max(0, clip[field]);
        refreshChrome(); persist(); initPreview();
      }
    });

    $('#edit-clip-panel')?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-clip-action]');
      if (!btn) return;
      const action = btn.dataset.clipAction;
      const clip = edit.clips[selected];
      if (!clip && ['duplicate', 'remove', 'add-key', 'remove-key', 'clear-motion'].includes(action)) return;
      if (action === 'left' && selected > 0) {
        [edit.clips[selected - 1], edit.clips[selected]] = [edit.clips[selected], edit.clips[selected - 1]];
        selected--;
      } else if (action === 'right' && selected < edit.clips.length - 1) {
        [edit.clips[selected + 1], edit.clips[selected]] = [edit.clips[selected], edit.clips[selected + 1]];
        selected++;
      } else if (action === 'duplicate') {
        const copy = JSON.parse(JSON.stringify(clip));
        copy.id = 'c_' + Date.now();
        copy.name = String(clip.name || 'Clip') + ' copy';
        edit.clips.splice(selected + 1, 0, copy);
        selected++;
      } else if (action === 'remove') {
        if (edit.clips.length <= 1) { this.toast('Keep at least one clip.'); return; }
        edit.clips.splice(selected, 1);
        selected = Math.max(0, selected - 1);
      } else if (action === 'add-key') {
        const local = Math.max(0, Math.min(Number(clip.duration) || 1,
          playhead() - (Number(clip.timelineStart) || 0)));
        clip.motion = clip.motion || { keys: [] };
        clip.motion.keys = Array.isArray(clip.motion.keys) ? clip.motion.keys : [];
        clip.motion.keys.push({ t: local, x: 0, y: 0, zoom: 1, rotate: 0 });
        if (M) clip.motion = M.normalizeMotion(clip.motion, Number(clip.duration) || 5);
      } else if (action === 'remove-key') {
        const ki = Number(btn.closest('[data-key-index]')?.dataset.keyIndex);
        if (clip.motion && Array.isArray(clip.motion.keys) && Number.isFinite(ki)) clip.motion.keys.splice(ki, 1);
        if (M) clip.motion = M.normalizeMotion(clip.motion || { keys: [] }, Number(clip.duration) || 5);
      } else if (action === 'clear-motion') {
        clip.motion = { keys: [] };
      } else return;
      if (M) M.reflow(edit.clips);
      refreshChrome();
      persist();
      initPreview();
    });

    $('#edit-captions-list')?.addEventListener('change', (e) => {
      const el = e.target;
      const row = el.closest('[data-cap-index]');
      if (!row) return;
      const cap = edit.captions[Number(row.dataset.capIndex)];
      const f = el.dataset.capField;
      if (!cap || !f) return;
      cap[f] = (f === 't' || f === 'duration' || f === 'weight') ? Number(el.value) : el.value;
      if (typeof cap[f] === 'number' && !isFinite(cap[f])) cap[f] = f === 'duration' ? 3 : 0;
      persist();
    });

    $('#edit-captions-list')?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-cap-action]');
      if (!btn || btn.dataset.capAction !== 'remove') return;
      const row = btn.closest('[data-cap-index]');
      if (!row) return;
      edit.captions.splice(Number(row.dataset.capIndex), 1);
      renderCaptions();
      persist();
    });

    $('#edit-add-cap')?.addEventListener('click', () => {
      const cap = M
        ? M.normalizeCaption({ t: playhead(), duration: 3, text: 'New caption', position: 'bottom', size: 'M', color: '', weight: 800 }, edit.captions.length)
        : { id: 'cap_' + Date.now(), t: playhead(), duration: 3, text: 'New caption', position: 'bottom', size: 'M', color: '', weight: 800 };
      edit.captions.push(cap);
      edit.captions.sort((a, b) => Number(a.t) - Number(b.t));
      renderCaptions();
      const capText = $('#edit-cap-text');
      if (capText && M) capText.value = M.serializeCaptions(edit.captions);
      persist();
    });

    $('#edit-cap-apply')?.addEventListener('click', () => {
      const ta = $('#edit-cap-text');
      if (!ta) return;
      const parsed = M ? M.parseCaptions(ta.value)
        : this.parseCaptions(ta.value).map((c, i) => ({
          id: 'cap_' + (i + 1), t: c.t, duration: 3, text: c.text,
          position: 'bottom', size: 'M', color: '', weight: 800,
        }));
      if (!parsed.length) { this.toast('No timed caption lines found.'); return; }
      edit.captions = parsed;
      renderCaptions();
      persist();
      this.toast('Caption lines applied.');
    });

    const bindField = (sel, key) => {
      $(sel)?.addEventListener('change', (e) => {
        if (key === 'hook.text' || key === 'cta.text') {
          const [parent, child] = key.split('.');
          edit[parent] = edit[parent] || {};
          edit[parent][child] = e.target.value;
        } else {
          edit[key] = e.target.value;
        }
        persist();
        if (key === 'format' || key === 'look') initPreview();
      });
    };
    bindField('#edit-format', 'format');
    bindField('#edit-look', 'look');
    bindField('#edit-hook', 'hook.text');
    bindField('#edit-cta', 'cta.text');
    bindField('#edit-music', 'musicMode');

    $('#edit-cancel')?.addEventListener('click', () => {
      if (exportController) exportController.abort();
    });

    $('#edit-export')?.addEventListener('click', async (e) => {
      if (!src || !this.editorCan('exportVideo')) { this.toast('Export is unavailable here.'); return; }
      if (!approved) { this.toast('Approve the storyboard in Review before exporting.'); return; }
      const btn = e.currentTarget;
      const cancel = $('#edit-cancel');
      btn.disabled = true;
      if (cancel) cancel.classList.remove('hidden');
      exportController = new AbortController();
      try {
        const editor = this.editor();
        setProgress(true, 5, 'Exporting locally…');
        const ex = this.editExportClips(edit);
        const captions = M ? edit.captions.map((c, i) => M.normalizeCaption(c, i)) : edit.captions;
        const blob = await editor.exportVideo({
          sourceUrl: src,
          clips: ex.clips,
          plan,
          start: 0,
          end: ex.total,
          format: edit.format || 'vertical',
          look: edit.look || 'classic',
          captions,
          hook: edit.hook || null,
          cta: edit.cta || null,
          musicMode: edit.musicMode || 'source',
          onProgress: (p) => setProgress(true, 5 + Math.min(90, (Number(p) || 0) * 0.9), 'Exporting locally…'),
          signal: exportController.signal,
        });
        if (!(blob instanceof Blob)) throw new Error('No export was produced');
        setProgress(true, 96, 'Uploading…');
        const ext = (typeof editor.extForBlob === 'function' && editor.extForBlob(blob)) || 'mp4';
        const videoUrl = await this.uploadBlob(blob, `${reel.title || 'reel'}.${String(ext).replace(/[^a-z0-9]/gi, '') || 'mp4'}`, {
          kind: 'export', batch: 'versions', ofIndex: this.reelVersion(reel) + 1, reelId: reel.id,
        });
        const data = await this.request(`/reels/${reel.id}/version`, {
          method: 'POST',
          body: {
            videoUrl, noMusicUrl: '', posterUrl: this.reelPosterUrl(reel) || '',
            note: `Local edit · ${edit.clips.length} clips · ${captions.length} captions`,
            idem: this.idem(),
          },
        });
        if (data.reel) Object.assign(reel, data.reel);
        this.closeSheet();
        this.toast('Local export saved as a new version.');
        this.loadReels();
      } catch (err) {
        setProgress(false, 0, '');
        this.toast(err.name === 'AbortError' ? 'Export cancelled.' : (err.message || 'Export failed'));
      } finally {
        exportController = null;
        btn.disabled = false;
        if (cancel) cancel.classList.add('hidden');
      }
    });

    $('#edit-save-note')?.addEventListener('click', async () => {
      try {
        await this.request(`/reels/${reel.id}/version`, {
          method: 'POST',
          body: {
            videoUrl: this.reelVideoUrl(reel) || reel.videoUrl || '',
            noMusicUrl: '',
            posterUrl: this.reelPosterUrl(reel) || '',
            note: `Edit note · ${edit.clips.length} clips · ${edit.captions.length} captions`,
            idem: this.idem(),
          },
        });
        this.toast('Version saved.');
        this.loadReels();
      } catch (err) {
        this.toast('Version note could not be saved on the service.');
      }
    });

    renderTimeline();
    renderPanel();
    renderCaptions();
    const seek = $('#edit-seek');
    if (seek) seek.max = String(Math.max(0.05, totalOf()));
    syncTime(0);
    initPreview();
  },

  /* =====================================================================
     11. COVER EDITOR
     ===================================================================== */
  openCover(reelId) {
    const reel = this.state.reels.find((r) => String(r.id) === String(reelId));
    if (!reel) return;
    const coverState = { style: 'bold', position: 'smart', size: 'M', background: 'original', title: reel.title || '' };
    const choices = (key, values) => values.map((v) => `
      <button class="${coverState[key] === v ? 'active' : ''}" data-cover-key="${key}" data-value="${v}">${v}</button>`).join('');

    const body = `
      <div class="cover-previews">
        <figure><canvas id="cover-916" width="360" height="640"></canvas><figcaption>9:16</figcaption></figure>
        <figure><canvas id="cover-34" width="480" height="640"></canvas><figcaption>3:4</figcaption></figure>
      </div>
      <div class="field" style="margin-top:14px"><label>Title</label><input id="cover-title" type="text" value="${this.esc(coverState.title)}" /></div>
      ${[['style', ['bold', 'highlight', 'two-tone', 'minimal']], ['position', ['smart', 'top', 'middle', 'lower']], ['size', ['S', 'M', 'L']], ['background', ['original', 'checker', 'blur', 'gradient']]].map(([k, vals]) => `
        <div class="section-title">${k}</div><div class="ctrl-grid">${choices(k, vals)}</div>`).join('')}
      <p class="hint">Covers are drawn locally with Lumi's cover engine when available.</p>`;

    const foot = `<button class="btn btn-primary btn-block" id="cover-save">Save cover</button>`;

    this.showSheet(`Cover · ${reel.title || 'Reel'}`, body, foot, {
      onMount: (overlay) => this.bindCover(overlay, reel, coverState),
    });
  },

  async bindCover(overlay, reel, state) {
    const src = this.reelVideoUrl(reel);

    // Prefer a locally generated poster frame — it is same-origin and avoids
    // tainted canvases when the reel video lives on another host.
    let posterImage = null;
    if (src && this.editorCan('makePoster')) {
      try {
        const posterBlob = await this.editor().makePoster({
          sourceUrl: src,
          t: Math.min(1, Number(reel.trimStart) || 1),
          format: 'vertical',
          look: reel.look || reel.style || 'classic',
        });
        if (posterBlob instanceof Blob) {
          posterImage = new Image();
          posterImage.src = URL.createObjectURL(posterBlob);
          await new Promise((resolve) => {
            posterImage.onload = resolve;
            posterImage.onerror = resolve;
            setTimeout(resolve, 1500);
          });
        }
      } catch (e) { posterImage = null; }
    }

    const sourceVideo = document.createElement('video');
    sourceVideo.muted = true;
    sourceVideo.playsInline = true;
    sourceVideo.preload = 'auto';
    sourceVideo.crossOrigin = 'anonymous';
    if (src) sourceVideo.src = src;

    const draw = () => {
      const E = this.editor();
      const options = {
        sourceImage: posterImage || (src ? sourceVideo : null),
        title: state.title,
        style: state.style,
        position: state.position,
        size: state.size,
        background: state.background,
      };
      ['cover-916', 'cover-34'].forEach((id) => {
        const canvas = overlay.querySelector(`#${id}`);
        if (!canvas) return;
        try {
          if (E && typeof E.drawCover === 'function') {
            const out = E.drawCover(canvas, options);
            if (out && typeof out.then === 'function') out.catch(() => this.fallbackCover(canvas, state));
          } else {
            this.fallbackCover(canvas, state);
          }
        } catch (e) {
          this.fallbackCover(canvas, state);
        }
      });
    };

    overlay.querySelectorAll('[data-cover-key]').forEach((b) => {
      b.addEventListener('click', () => {
        const key = b.dataset.coverKey;
        state[key] = b.dataset.value;
        overlay.querySelectorAll(`[data-cover-key="${key}"]`).forEach((x) => x.classList.toggle('active', x === b));
        draw();
      });
    });
    overlay.querySelector('#cover-title')?.addEventListener('input', (e) => { state.title = e.target.value; draw(); });

    if (src && !posterImage) {
      sourceVideo.addEventListener('loadeddata', () => {
        try { sourceVideo.currentTime = Math.min(1, (sourceVideo.duration || 2) - 0.1); } catch (e) { /* noop */ }
      });
      sourceVideo.addEventListener('seeked', draw);
      sourceVideo.load();
      setTimeout(draw, 500);
    } else {
      draw();
    }

    overlay.querySelector('#cover-save')?.addEventListener('click', async () => {
      const canvas = overlay.querySelector('#cover-916');
      if (!canvas) return;
      try {
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
        if (!blob) throw new Error('Could not render cover');
        const dataUrl = canvas.toDataURL('image/png');
        this.state.covers[reel.id] = dataUrl;
        try { localStorage.setItem(COVER_KEY, JSON.stringify(this.state.covers)); } catch (e) { /* noop */ }
        this.renderReels();
        try {
          const url = await this.uploadBlob(blob, `${reel.title || 'cover'}.png`);
          await this.request(`/covers/${reel.id}`, { method: 'PUT', body: { cover: url } });
          this.state.covers[reel.id] = url;
          try { localStorage.setItem(COVER_KEY, JSON.stringify(this.state.covers)); } catch (e) { /* noop */ }
          this.renderReels();
          this.toast('Cover saved.');
        } catch (e) {
          this.toast('Cover saved on this device (upload unavailable).');
        }
        this.closeSheet();
      } catch (e) {
        this.toast('Could not save cover.');
      }
    });
  },

  fallbackCover(canvas, state) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#2f6fd0');
    grad.addColorStop(1, '#8b5cf6');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    const size = state.size === 'L' ? Math.floor(w * 0.13) : state.size === 'S' ? Math.floor(w * 0.07) : Math.floor(w * 0.1);
    ctx.font = `800 ${size}px -apple-system, Segoe UI, sans-serif`;
    ctx.fillStyle = state.style === 'highlight' ? '#ffe066' : '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const words = String(state.title || 'Lumi').split(/\s+/);
    const lines = [];
    let line = '';
    words.forEach((word) => {
      if ((line + ' ' + word).trim().length > 16) { lines.push(line); line = word; }
      else line = (line + ' ' + word).trim();
    });
    lines.push(line);
    const yBase = state.position === 'top' ? h * 0.25 : state.position === 'lower' ? h * 0.7 : h * 0.5;
    lines.forEach((ln, i) => ctx.fillText(ln, w / 2, yBase + (i - (lines.length - 1) / 2) * size * 1.15, w * 0.9));
  },

  /* =====================================================================
     12. POST KIT
     ===================================================================== */
  postKitFor(reel) {
    const title = String(reel.title || reel.caption || 'My reel').trim();
    const look = String(reel.look || reel.style || 'classic');
    const brief = String(reel.brief || reel.caption || '');
    const words = title.replace(/[^a-zA-Z0-9\s]/g, '').split(/\s+/).filter(Boolean).slice(0, 4);
    const tag = words.join('').toLowerCase() || 'lumi';
    const caption = `${title}\n\nMade with Lumi — ${look} look.\n${brief ? brief.split('\n').slice(0, 2).join(' ') + '\n' : ''}Follow for more edits.`;
    const hashtags = `#${tag} #reels #shorts #videoediting #lumi #${look.replace(/[^a-z0-9]/gi, '') || 'edit'} #fyp #creator`;
    const hooks = [
      `POV: ${title}`,
      `Wait for the ending of "${title}"`,
      `3 things you missed in this ${look} edit`,
    ];
    const otherHooks = [
      `This is your sign to try the ${look} look`,
      `Here's how "${title}" came together`,
      `Would you watch this again?`,
    ];
    return { caption, hashtags, hooks, otherHooks };
  },

  openPostKit(reelId) {
    const reel = this.state.reels.find((r) => String(r.id) === String(reelId));
    if (!reel) return;
    const kit = this.postKitFor(reel);
    const field = (id, label, value, rows = 3) => `
      <div class="field">
        <div class="spread"><label>${label}</label><button class="btn btn-sm btn-ghost" data-action="copypost" data-id="${id}">Copy</button></div>
        <textarea id="${id}" rows="${rows}">${this.esc(value)}</textarea>
      </div>`;
    const body = `
      <p class="hint">Generated locally from your reel details — review before posting.</p>
      ${field('post-caption', 'Caption', kit.caption, 5)}
      ${field('post-tags', 'Hashtags', kit.hashtags, 2)}
      ${field('post-hooks', 'Hooks', kit.hooks.join('\n'), 4)}
      ${field('post-other', 'Other hooks', kit.otherHooks.join('\n'), 4)}`;
    const foot = `<button class="btn btn-primary btn-block" id="post-save">Save post kit</button>`;
    this.showSheet('Post kit', body, foot, {
      onMount: (overlay) => {
        overlay.querySelector('#post-save')?.addEventListener('click', async () => {
          const payload = {
            caption: overlay.querySelector('#post-caption')?.value || '',
            hashtags: overlay.querySelector('#post-tags')?.value || '',
            hooks: overlay.querySelector('#post-hooks')?.value || '',
            otherHooks: overlay.querySelector('#post-other')?.value || '',
          };
          try {
            await this.request('/intent', {
              method: 'POST',
              body: { kind: 'postkit', reel: reel.id, text: payload.caption, payload, idem: this.idem() },
            });
            this.toast('Post kit saved.');
          } catch (e) {
            this.toast('Post kit kept on this device (save unavailable).');
          }
          this.closeSheet();
        });
      },
    });
  },

  async copyText(id) {
    const el = document.getElementById(id);
    const text = el?.value || '';
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      this.toast('Copied.');
    } catch (e) {
      el.select();
      this.toast('Select and copy manually.');
    }
  },

  /* =====================================================================
     13. CHAT
     ===================================================================== */
  bindChat() {
    const back = document.getElementById('chat-back');
    const input = document.getElementById('chat-input');
    const send = document.getElementById('chat-send');
    const form = document.getElementById('chat-composer');
    const photoBtn = document.getElementById('chat-photo-btn');
    const clipBtn = document.getElementById('chat-clip-btn');
    const teamBtn = document.getElementById('chat-team-btn');

    back?.addEventListener('click', () => {
      document.getElementById('chat-thread-header').classList.add('hidden');
      document.getElementById('chat-messages').innerHTML = '<div class="empty">Select a conversation to start messaging.</div>';
      document.getElementById('chat-thread').classList.remove('active');
      this.state.activeConversation = null;
      [input, send, photoBtn, clipBtn].forEach((x) => { if (x) x.disabled = true; });
    });

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!this.state.activeConversation) return;
      const text = (input?.value || '').trim();
      if (!text) return;
      try {
        if (send) send.disabled = true;
        await this.request(`/chat/conversations/${this.state.activeConversation}/messages`, { method: 'POST', body: { text } });
        if (input) input.value = '';
        this.loadMessages(this.state.activeConversation);
      } catch (err) {
        this.toast('Could not send message');
      } finally {
        if (send) send.disabled = false;
      }
    });

    const attach = (inputEl) => async (e) => {
      const file = e.target.files?.[0];
      if (!file || !this.state.activeConversation) return;
      try {
        this.toast('Uploading attachment…');
        const url = await this.uploadBlob(file, file.name || 'attachment');
        const isImage = /^image\//.test(file.type) || /\.(png|jpe?g|gif|webp)$/i.test(file.name);
        await this.request(`/chat/conversations/${this.state.activeConversation}/messages`, {
          method: 'POST',
          body: { text: isImage ? '' : `Clip: ${file.name}`, videoUrl: url },
        });
        e.target.value = '';
        this.loadMessages(this.state.activeConversation);
      } catch (err) {
        this.toast('Could not attach file');
      }
    };
    document.getElementById('chat-photo-input')?.addEventListener('change', attach(document.getElementById('chat-photo-input')));
    document.getElementById('chat-clip-input')?.addEventListener('change', attach(document.getElementById('chat-clip-input')));
    photoBtn?.addEventListener('click', () => document.getElementById('chat-photo-input')?.click());
    clipBtn?.addEventListener('click', () => document.getElementById('chat-clip-input')?.click());
    teamBtn?.addEventListener('click', () => this.openInbox());

    const search = document.getElementById('chat-search');
    search?.addEventListener('input', () => this.renderConversations(search.value));
  },

  renderConversations(query = '') {
    const list = document.getElementById('chat-list-items');
    const empty = document.getElementById('chat-list-empty');
    if (!list) return;
    const q = String(query || '').toLowerCase();
    const convos = (this.state.conversations || []).filter((c) => {
      const name = String(c.other?.username || '');
      return !q || name.toLowerCase().includes(q) || String(c.lastMessage || '').toLowerCase().includes(q);
    });
    if (!convos.length) {
      list.innerHTML = '';
      if (empty) empty.classList.toggle('hidden', !!q);
      return;
    }
    if (empty) empty.classList.add('hidden');
    list.innerHTML = convos.map((c) => {
      const other = c.other || { username: 'user' };
      const active = this.state.activeConversation === c.id ? 'active' : '';
      return `
        <li class="chat-list-item ${active}" onclick="app.openConversation('${this.jsAttr(c.id)}')">
          <div class="chat-item-avatar">◉</div>
          <div class="chat-item-info">
            <div class="chat-item-name">${this.esc(other.username)}</div>
            <div class="chat-item-preview">${this.esc(c.lastMessage || '')}</div>
          </div>
          <div class="chat-item-time">${this.esc(c.lastMessageAt ? new Date(c.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '')}</div>
        </li>`;
    }).join('');
  },

  async openConversation(id) {
    this.state.activeConversation = id;
    this.renderConversations();
    document.getElementById('chat-thread-header').classList.remove('hidden');
    document.getElementById('chat-thread').classList.add('active');
    const conv = this.state.conversations.find((c) => c.id === id);
    const nameEl = document.getElementById('chat-thread-name');
    if (nameEl) nameEl.textContent = conv?.other?.username || 'Conversation';
    ['chat-input', 'chat-send', 'chat-photo-btn', 'chat-clip-btn'].forEach((x) => {
      const el = document.getElementById(x);
      if (el) el.disabled = false;
    });
    await this.loadMessages(id);
  },

  async loadMessages(id) {
    try {
      const data = await this.request(`/chat/conversations/${id}`);
      this.state.messages = data.messages || [];
      this.renderMessages();
    } catch (e) {
      this.toast('Could not load messages');
    }
  },

  renderMessages() {
    const container = document.getElementById('chat-messages');
    if (!container) return;
    const myId = this.state.user?.id || 'u1';
    if (!this.state.messages.length) {
      container.innerHTML = '<div class="empty">No messages yet. Start the conversation!</div>';
      return;
    }
    container.innerHTML = this.state.messages.map((m) => {
      const me = m.senderId === myId;
      const url = this.safeUrl(m.videoUrl);
      const isImage = /\.(png|jpe?g|gif|webp)(\?|$)/i.test(url) || /data:image\//i.test(url);
      const media = url
        ? (isImage ? `<img src="${this.esc(url)}" alt="attachment" />` : `<video src="${this.esc(url)}" muted playsinline controls></video>`)
        : '';
      return `
        <div class="chat-msg ${me ? 'me' : 'them'} ${url ? 'video' : ''}">
          ${media}
          ${m.text ? `<div>${this.esc(m.text)}</div>` : ''}
          <span class="chat-msg-time">${this.esc(new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))}</span>
        </div>`;
    }).join('');
    container.scrollTop = container.scrollHeight;
  },

  renderNotices() {
    const banner = document.getElementById('chat-notice');
    if (!banner) return;
    const notice = (this.state.notices || []).find((n) => /needs your answer|answer needed|team/i.test(`${n.kind || ''} ${n.text || n.message || ''}`));
    if (!notice) { banner.classList.add('hidden'); return; }
    banner.classList.remove('hidden');
    banner.innerHTML = `<span>Lumi needs your answer — ${this.esc(notice.text || notice.message || 'check your inbox')}</span>
      <button class="btn btn-sm btn-primary" onclick="app.openInbox()">Reply</button>`;
  },

  openInbox() {
    const notices = (this.state.notices || []).map((n) => `<div class="note-item">${this.esc(n.text || n.message || n.kind || 'Notice')}</div>`).join('') || '<p class="muted">No new notices.</p>';
    const convos = (this.state.conversations || []).map((c) => `
      <button class="option-chip" onclick="app.closeSheet();app.openConversation('${this.jsAttr(c.id)}')">${this.esc(c.other?.username || 'Conversation')}</button>`).join('') || '<p class="muted">No conversations yet.</p>';
    const body = `
      <div class="section-title">Notices</div>${notices}
      <div class="section-title">Conversations</div><div class="option-chips">${convos}</div>
      <div class="section-title">Ask the Lumi team</div>
      <div class="field"><textarea id="team-question" placeholder="What do you need help with?"></textarea></div>`;
    const foot = `<button class="btn btn-primary btn-block" id="team-send">Send to team</button>`;
    this.showSheet('Inbox', body, foot, {
      onMount: (overlay) => {
        overlay.querySelector('#team-send')?.addEventListener('click', async () => {
          const text = (overlay.querySelector('#team-question')?.value || '').trim();
          if (!text) { this.toast('Write a question first.'); return; }
          try {
            await this.request('/intent', {
              method: 'POST',
              body: { kind: 'team_reply', reel: '', text, payload: {}, idem: this.idem() },
            });
            this.toast('Your question was sent to the team inbox.');
          } catch (e) {
            this.toast('Team inbox is not connected in this deployment.');
          }
          this.closeSheet();
        });
      },
    });
  },

  /* =====================================================================
     14. PAY
     ===================================================================== */
  renderPay() {
    const root = document.getElementById('pay-root');
    if (!root) return;
    const price = this.state.price || {};
    const reelPrice = price.reel != null ? price.reel : 20;
    const monthly = price.monthly != null ? price.monthly : 60;
    const monthlyReels = price.monthly_reels != null ? price.monthly_reels : (price.monthlyReels != null ? price.monthlyReels : 10);
    const status = String(this.state.account?.status || 'Free');
    const statusClass = /paid/i.test(status) ? 'paid' : /needs|due/i.test(status) ? 'need' : '';

    const reels = (this.state.reels || []).filter((r) => this.isMine(r)).slice(0, 12);
    root.innerHTML = `
      <div class="pay-head">
        <h2>Pay</h2>
        <p class="muted">Simple pricing. No card details are collected here.</p>
        <span class="status-pill ${statusClass}">${this.esc(status)}</span>
      </div>
      <div class="price-grid">
        <div class="price-card featured">
          <div class="pname">Single reel</div>
          <div class="price"><span class="amount">$${this.esc(reelPrice)}</span> <span class="unit">/ reel</span></div>
        </div>
        <div class="price-card">
          <div class="pname">Monthly</div>
          <div class="price"><span class="amount">$${this.esc(monthly)}</span> <span class="unit">/ ${this.esc(monthlyReels)} reels</span></div>
        </div>
      </div>
      <div class="section-title" style="padding:0 16px">Your reels</div>
      <div class="pay-list">
        ${reels.length ? reels.map((r) => `
          <div class="pay-reel">
            <div class="pr-info">
              <div class="pr-title">${this.esc(r.title || r.caption || 'Reel')}</div>
              <div class="pr-meta">${this.esc(this.normalStatus(r))} · ${this.esc(r.look || r.style || 'classic')}</div>
            </div>
            <button class="btn btn-sm btn-secondary" onclick="app.payIntent('download','${this.jsAttr(r.id)}')">Pay to download</button>
            <button class="btn btn-sm btn-ghost" onclick="app.payIntent('start','${this.jsAttr(r.id)}')">Pay to start</button>
          </div>`).join('') : '<p class="muted">No reels to pay for yet.</p>'}
      </div>
      <div class="disclaimer">Checkout is not connected in this deployment; no real charge is made. Pressing a pay button records an intent only. Nothing is marked as paid.</div>
      <div class="section-title" style="padding:0 16px">History</div>
      <div class="pay-list" id="pay-history"><p class="muted">Loading history…</p></div>`;
    this.loadPayHistory();
  },

  async loadPayHistory() {
    const root = document.getElementById('pay-history');
    if (!root) return;
    try {
      const data = await this.request('/pay/history');
      const payments = data.payments || [];
      root.innerHTML = payments.length ? payments.slice(0, 10).map((p) => `
        <div class="pay-reel"><div class="pr-info"><div class="pr-title">$${this.esc(((Number(p.amount) || 0) / 100).toFixed(2))}</div>
        <div class="pr-meta">${this.esc(p.status || 'recorded')} · ${this.esc(p.created_at || p.createdAt || '')}</div></div></div>`).join('')
        : '<p class="muted">No payment records.</p>';
    } catch (e) {
      root.innerHTML = '<p class="muted">Payment history unavailable in this deployment.</p>';
    }
  },

  async payIntent(reason, reelId) {
    try {
      await this.request('/intent', {
        method: 'POST',
        body: {
          kind: 'pay',
          reel: reelId,
          text: `Pay intent: ${reason}`,
          payload: { reason, reelId },
          idem: this.idem(),
        },
      });
    } catch (e) { /* still show the honest message */ }
    this.toast('Checkout is not connected in this deployment; no real charge is made.');
  },

  /* =====================================================================
     15. BOOT
     ===================================================================== */
};

app.init();
