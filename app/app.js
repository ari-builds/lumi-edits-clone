// Lumi Edits Clone — app.js (vanilla JS SPA)
// Calls /api/... endpoints — works locally with Vercel dev and on Vercel.

const API = '/api';
const TOKEN_KEY = 'lumi_token';
const THEME_KEY = 'lumi_theme';

const app = {
  state: {
    user: null,
    token: null,
    theme: 'paper', // paper | dark | one of look themes
    activeTab: 'reels',
    reels: [],
    styles: [],
    conversations: [],
    activeConversation: null,
    messages: [],
    isAuthShown: true,
    likePending: new Set(),
    commentsPending: new Map(), // reelId -> true
    uploadPending: false,
  },

  // ---------- Init ----------
  init() {
    this.bindNav();
    this.bindTheme();
    this.bindAuth();
    this.bindReels();
    this.bindNewReel();
    this.bindChat();
    this.bindPay();

    // Restore session
    const token = localStorage.getItem(TOKEN_KEY);
    const theme = localStorage.getItem(THEME_KEY) || 'paper';
    this.setTheme(theme);
    if (token) {
      this.state.token = token;
      this.fetchMe();
    } else {
      this.showAuth();
    }
  },

  // ---------- API helpers ----------
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
    try { data = text ? JSON.parse(text) : {}; } catch { data = {}; }

    if (!res.ok) {
      throw new Error(data.error || `Request failed (${res.status})`);
    }
    return data;
  },

  // ---------- Auth ----------
  bindAuth() {
    const form = document.getElementById('auth-form');
    const toggle = document.getElementById('auth-toggle');
    const modeInput = document.getElementById('auth-mode');
    const tabs = document.querySelectorAll('#auth-overlay .tab');
    const btn = document.getElementById('auth-btn');

    tabs.forEach((t) => {
      t.addEventListener('click', () => {
        const mode = t.dataset.tab;
        modeInput.value = mode;
        tabs.forEach((x) => x.classList.toggle('active', x === t));
        const isLogin = mode === 'login';
        document.getElementById('auth-toggle').querySelector('span').textContent = isLogin ? 'Create one' : 'Log in';
        document.getElementById('auth-toggle').innerHTML = isLogin
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
  },

  rebindToggle() {
    const t = document.getElementById('auth-toggle');
    t.onclick = (e) => {
      const span = e.target.closest('span');
      if (!span) return;
      const mode = span.textContent === 'Create one' ? 'register' : 'login';
      document.querySelector(`#auth-overlay .tab[data-tab="${mode}"]`).click();
    };
  },

  // ---------- Session / UI ----------
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

  loadData() {
    this.loadStyles();
    this.loadReels();
    this.loadConversations();
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

  setTheme(name) {
    this.state.theme = name;
    localStorage.setItem(THEME_KEY, name);
    document.documentElement.dataset.theme = name === 'paper' ? '' : name;
    if (name === 'dark') document.documentElement.dataset.theme = 'dark';
  },

  bindTheme() {
    window.setTheme = (name) => this.setTheme(name);
  },

  toast(msg, ms = 3000) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => el.classList.remove('show'), ms);
  },

  // ---------- Navigation ----------
  bindNav() {
    document.querySelectorAll('.tab-nav .tab').forEach((tab) => {
      tab.addEventListener('click', (e) => {
        e.preventDefault();
        this.openTab(tab.dataset.tab);
      });
    });
  },

  openTab(tab) {
    this.state.activeTab = tab;
    document.querySelectorAll('.tab-nav .tab').forEach((t) => {
      t.classList.toggle('active', t.dataset.tab === tab);
      t.setAttribute('aria-current', t.dataset.tab === tab ? 'page' : null);
    });
    document.querySelectorAll('.view').forEach((v) => {
      v.classList.toggle('hidden', v.dataset.tab !== tab);
    });
    if (tab === 'styles') this.loadStyles();
    if (tab === 'chat') this.loadConversations();
    if (tab === 'reels') this.loadReels();
  },

  // ---------- Data loading ----------
  async loadStyles() {
    if (this.state.styles.length) return;
    try {
      const data = await this.request('/styles');
      this.state.styles = data.styles || [];
      this.renderStyles();
    } catch (err) {
      this.toast('Failed to load styles');
    }
  },

  async loadReels() {
    try {
      const data = await this.request('/reels');
      this.state.reels = data.reels || [];
      this.renderReels();
    } catch (err) {
      this.toast('Failed to load reels');
    }
  },

  async loadConversations() {
    try {
      const data = await this.request('/chat/conversations');
      this.state.conversations = data.conversations || [];
      this.renderConversations();
    } catch (err) {
      this.toast('Failed to load conversations');
    }
  },

  // ---------- Render: Styles ----------
  renderStyles() {
    const grid = document.getElementById('styles-grid');
    const empty = document.getElementById('styles-empty');
    if (!this.state.styles.length) {
      grid.innerHTML = '';
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');
    grid.innerHTML = this.state.styles.map((s) => `
      <div class="style-tile" data-id="${s.id}" data-preview="${s.id}"
           onclick="app.selectStyle('${s.id}')">
        <img class="thumb" src="/app/placeholder.svg" alt="${s.name}" />
        <span class="label">${s.name}</span>
      </div>
    `).join('');
  },

  selectStyle(id) {
    document.querySelectorAll('.style-tile').forEach((t) => {
      t.classList.toggle('selected', t.dataset.id === id);
    });
    this.state.selectedStyle = id;
    this.toast('Style selected: ' + id);
  },

  // ---------- Render: Reels ----------
  renderReels() {
    const feed = document.getElementById('reels-feed');
    const empty = document.getElementById('reels-empty');
    if (!this.state.reels.length) {
      feed.innerHTML = '';
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');
    feed.innerHTML = this.state.reels.map((r) => `
      <div class="reel-card" id="reel-${r.id}">
        <video src="${r.videoUrl}" muted playsinline preload="auto" poster="/app/placeholder.svg"></video>
        <div class="reel-actions">
          <button class="icon-btn" onclick="app.toggleLike('${r.id}')" aria-label="Like">
            ❤️ <span class="like-count" id="like-count-${r.id}">${r.likes}</span>
          </button>
          <button class="icon-btn" onclick="app.openComments('${r.id}')" aria-label="Comments">💬</button>
          <button class="icon-btn" aria-label="Share">↗️</button>
        </div>
        <div class="reel-caption">
          <div class="user">${r.user}</div>
          <div class="text">${this.escapeHtml(r.caption || '')}</div>
          <div class="meta">Style: ${r.style} · ${r.likes} likes</div>
        </div>
      </div>
    `).join('');
    // autoplay visible videos
    feed.querySelectorAll('video').forEach((v) => v.play().catch(() => {}));
  },

  escapeHtml(text) {
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
  },

  async toggleLike(reelId) {
    if (this.state.likePending.has(reelId)) return;
    this.state.likePending.add(reelId);
    try {
      const data = await this.request(`/reels/${reelId}/like`, { method: 'POST' });
      const reel = this.state.reels.find((r) => r.id === reelId);
      if (reel) reel.likes = data.likes;
      const el = document.getElementById(`like-count-${reelId}`);
      if (el) el.textContent = data.likes;
      this.renderReels();
    } catch (err) {
      this.toast('Could not like reel');
    } finally {
      this.state.likePending.delete(reelId);
    }
  },

  async openComments(reelId) {
    const reel = this.state.reels.find((r) => r.id === reelId);
    if (!reel) return;
    try {
      const data = await this.request(`/reels/${reelId}/comments`);
      this.renderCommentsModal(reel, data.comments || []);
    } catch (err) {
      this.toast('Could not load comments');
    }
  },

  renderCommentsModal(reel, comments) {
    // Simple modal overlay
    const existing = document.getElementById('comments-modal');
    if (existing) existing.remove();
    const el = document.createElement('div');
    el.id = 'comments-modal';
    el.className = 'overlay';
    el.innerHTML = `
      <div class="card" style="max-width:420px; width:92%; max-height:80vh; display:flex; flex-direction:column;">
        <div style="display:flex; align-items:center; justify-content:space-between; padding:12px 16px; border-bottom:1px solid var(--border);">
          <div style="font-weight:700;">Comments</div>
          <button class="icon-btn" onclick="this.closest('.overlay').remove()">✕</button>
        </div>
        <div style="flex:1; overflow:auto; padding:12px 16px; display:flex; flex-direction:column; gap:10px;">
          <div style="font-size:12px; color:var(--muted); margin-bottom:6px;">${this.escapeHtml(reel.caption)}</div>
          ${comments.map((c) => `
            <div class="chat-msg them">
              <div style="font-weight:600; font-size:12px; color:var(--ink-soft);">${this.escapeHtml(c.user)}</div>
              <div>${this.escapeHtml(c.text)}</div>
              <span class="chat-msg-time">${new Date(c.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
            </div>
          `).join('')}
        </div>
        <form id="comments-form" style="padding:10px 16px; border-top:1px solid var(--border); display:flex; gap:8px; align-items:center;">
          <input type="text" name="text" placeholder="Add a comment…" style="flex:1; padding:8px 10px; border:1px solid var(--border); border-radius:8px; background:var(--surface); color:var(--ink); font-size:14px;" />
          <button type="submit" class="btn btn-primary" style="padding:8px 14px; font-size:14px;">Send</button>
        </form>
      </div>
    `;
    document.body.appendChild(el);
    el.querySelector('#comments-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const text = fd.get('text');
      if (!text) return;
      try {
        await this.request(`/reels/${reelId}/comment`, { method: 'POST', body: { userId: this.state.user?.id || 'u1', user: this.state.user?.username || 'you', text } });
        e.target.reset();
        const data = await this.request(`/reels/${reelId}/comments`);
        const container = el.querySelector('.chat-msg').parentElement;
        container.innerHTML = (data.comments || []).map((c) => `
          <div class="chat-msg them">
            <div style="font-weight:600; font-size:12px; color:var(--ink-soft);">${this.escapeHtml(c.user)}</div>
            <div>${this.escapeHtml(c.text)}</div>
            <span class="chat-msg-time">${new Date(c.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
          </div>
        `).join('');
      } catch (err) {
        this.toast('Could not post comment');
      }
    });
  },

  // ---------- New Reel ----------
  bindNewReel() {
    const form = document.getElementById('newreel-form');
    const videoInput = document.getElementById('newreel-video');
    const videoEl = document.getElementById('trim-video');
    const slider = document.getElementById('trim-slider');
    const cur = document.getElementById('trim-current');
    const dur = document.getElementById('trim-duration');

    videoInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      videoEl.src = url;
      videoEl.onloadedmetadata = () => {
        slider.max = Math.floor(videoEl.duration || 0);
        dur.textContent = `/ ${this.fmtTime(videoEl.duration || 0)}`;
        cur.textContent = this.fmtTime(0);
      };
    });

    slider.addEventListener('input', () => {
      const t = parseInt(slider.value, 10);
      videoEl.currentTime = t;
      cur.textContent = this.fmtTime(t);
    });

    videoEl.addEventListener('timeupdate', () => {
      if (!slider.matches(':focus')) {
        slider.value = Math.floor(videoEl.currentTime || 0);
        cur.textContent = this.fmtTime(videoEl.currentTime || 0);
      }
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const submit = document.getElementById('newreel-submit');
      const file = fd.get('video');
      try {
        submit.disabled = true;
        submit.textContent = 'Uploading…';

        let videoUrl = '';
        if (file && file.size > 0) {
          // 1. Ask the API for a presigned PUT URL
          const signed = await this.request('/upload', {
            method: 'POST',
            body: { fileName: file.name || 'reel.mp4', fileType: file.type || 'video/mp4' },
          });
          // 2. Upload the actual file bytes directly to permanent storage
          submit.textContent = 'Uploading video…';
          const put = await fetch(signed.uploadUrl, {
            method: 'PUT',
            headers: { 'Content-Type': file.type || 'video/mp4' },
            body: file,
          });
          if (!put.ok) throw new Error('Video upload failed (' + put.status + ')');
          videoUrl = signed.publicUrl;
        }

        submit.textContent = 'Publishing…';
        const payload = {
          userId: this.state.user?.id || 'u1',
          user: this.state.user?.username || 'you',
          videoUrl,
          caption: fd.get('caption') || '',
          style: fd.get('style') || 'classic',
        };
        const data = await this.request('/reels', { method: 'POST', body: payload });
        this.state.reels.unshift(data.reel);
        this.renderReels();
        document.getElementById('newreel-form').classList.add('hidden');
        document.getElementById('newreel-success').classList.remove('hidden');
        this.toast('Reel published!');
      } catch (err) {
        this.toast(err.message || 'Publish failed');
      } finally {
        submit.disabled = false;
        submit.textContent = 'Publish Reel';
      }
    });
  },

  fmtTime(s) {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  },

  // ---------- Chat ----------
  bindChat() {
    const back = document.getElementById('chat-back');
    const input = document.getElementById('chat-input');
    const send = document.getElementById('chat-send');
    const videoBtn = document.getElementById('chat-video-btn');
    const form = document.getElementById('chat-composer');

    back.addEventListener('click', () => {
      document.getElementById('chat-thread-header').classList.add('hidden');
      document.getElementById('chat-messages').innerHTML = '<div class="empty">Select a conversation to start messaging.</div>';
      document.getElementById('chat-thread').classList.remove('active');
      this.state.activeConversation = null;
      input.disabled = true;
      send.disabled = true;
      videoBtn.disabled = true;
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!this.state.activeConversation) return;
      const text = input.value.trim();
      if (!text) return;
      try {
        send.disabled = true;
        await this.request(`/chat/conversations/${this.state.activeConversation}/messages`, {
          method: 'POST', body: { text },
        });
        input.value = '';
        this.loadMessages(this.state.activeConversation);
      } catch (err) {
        this.toast('Could not send message');
      } finally {
        send.disabled = false;
      }
    });

    document.getElementById('chat-video-btn').addEventListener('click', async () => {
      if (!this.state.activeConversation) return;
      const file = prompt('Paste a video URL (or leave blank)');
      if (!file) return;
      try {
        await this.request(`/chat/conversations/${this.state.activeConversation}/messages`, {
          method: 'POST', body: { videoUrl: file, text: '' },
        });
        this.loadMessages(this.state.activeConversation);
      } catch (err) {
        this.toast('Could not send video');
      }
    });
  },

  renderConversations() {
    const list = document.getElementById('chat-list-items');
    const empty = document.getElementById('chat-list-empty');
    if (!this.state.conversations.length) {
      list.innerHTML = '';
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');
    list.innerHTML = this.state.conversations.map((c) => {
      const other = c.other || { username: 'user' };
      const active = this.state.activeConversation === c.id ? 'active' : '';
      return `
        <div class="chat-list-item ${active}" onclick="app.openConversation('${c.id}')">
          <div class="chat-item-avatar">👤</div>
          <div class="chat-item-info">
            <div class="chat-item-name">${this.escapeHtml(other.username)}</div>
            <div class="chat-item-preview">${this.escapeHtml(c.lastMessage || '')}</div>
          </div>
          <div class="chat-item-time">${c.lastMessageAt ? new Date(c.lastMessageAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : ''}</div>
        </div>
      `;
    }).join('');
  },

  async openConversation(id) {
    this.state.activeConversation = id;
    this.renderConversations();
    document.getElementById('chat-thread-header').classList.remove('hidden');
    document.getElementById('chat-thread').classList.add('active');
    const conv = this.state.conversations.find((c) => c.id === id);
    document.getElementById('chat-thread-name').textContent = conv ? conv.other.username : 'Conversation';
    document.getElementById('chat-input').disabled = false;
    document.getElementById('chat-send').disabled = false;
    document.getElementById('chat-video-btn').disabled = false;
    await this.loadMessages(id);
  },

  async loadMessages(id) {
    try {
      const data = await this.request(`/chat/conversations/${id}`);
      this.state.messages = data.messages || [];
      this.renderMessages(id, data.conversation);
    } catch (err) {
      this.toast('Could not load messages');
    }
  },

  renderMessages(id, conv) {
    const container = document.getElementById('chat-messages');
    const myId = this.state.user?.id || 'u1';
    if (!this.state.messages.length) {
      container.innerHTML = '<div class="empty">No messages yet. Start the conversation!</div>';
      return;
    }
    container.innerHTML = this.state.messages.map((m) => {
      const me = m.senderId === myId;
      const hasVideo = m.videoUrl;
      return `
        <div class="chat-msg ${me ? 'me' : 'them'} ${hasVideo ? 'video' : ''}">
          ${hasVideo ? `<video src="${m.videoUrl}" muted playsinline controls style="width:100%; border-radius:10px;"></video>` : `<div>${this.escapeHtml(m.text)}</div>`}
          <span class="chat-msg-time">${new Date(m.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
        </div>
      `;
    }).join('');
    container.scrollTop = container.scrollHeight;
  },

  // ---------- Pay ----------
  bindPay() {
    const form = document.getElementById('pay-form');
    const submit = document.getElementById('pay-submit');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      try {
        submit.disabled = true;
        submit.textContent = 'Processing…';
        const intent = await this.request('/pay/create-intent', { method: 'POST', body: { amount: 499, currency: 'usd', method: 'card' } });
        const confirmed = await this.request('/pay/confirm', { method: 'POST', body: { client_secret: intent.client_secret, amount: 499, currency: 'usd' } });
        document.getElementById('pay-form').classList.add('hidden');
        document.getElementById('pay-success').classList.remove('hidden');
        this.toast('Payment successful!');
      } catch (err) {
        this.toast(err.message || 'Payment failed');
      } finally {
        submit.disabled = false;
        submit.textContent = 'Pay $4.99';
      }
    });
  }

};

app.init();
