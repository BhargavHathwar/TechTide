/**
 * TechTide - Core Application & Monochromatic Cyber Animation Engine
 * Styled around the TechTide Triple-Wave Monogram
 * Supports Seamless Light & Dark Mode
 */

// Global State
const state = {
  user: null,
  category: '',
  saved: false,
  q: '',
  loadedAt: Date.now(),
  oldest: null,
  authMode: 'login' // 'login' | 'register'
};

// Utilities
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

const esc = (str = '') => {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
};

const timeAgo = (timestamp) => {
  const mins = Math.max(1, Math.round((Date.now() - timestamp) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
};

// API Fetch Client
async function api(path, opts = {}) {
  const response = await fetch('/api' + path, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw Object.assign(new Error(data.error || 'Something went wrong.'), { status: response.status });
  }
  return data;
}

// Toast System
function showToast(message, duration = 3000) {
  let container = $('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <img src="/logo-transparent.png" alt="" style="width: 18px; height: 18px; object-fit: contain;">
    <span>${esc(message)}</span>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/* ===================================================================
   THEME MANAGER (DARK / LIGHT MODE)
   =================================================================== */

function initTheme() {
  const savedTheme = localStorage.getItem('techtide-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const currentTheme = savedTheme || (prefersDark ? 'dark' : 'dark'); // Default to dark
  setTheme(currentTheme, false);

  const toggleButtons = [$('#landingThemeToggle'), $('#appThemeToggle')];
  toggleButtons.forEach(btn => {
    if (btn) {
      btn.onclick = () => {
        const activeTheme = document.documentElement.getAttribute('data-theme') || 'dark';
        const nextTheme = activeTheme === 'dark' ? 'light' : 'dark';
        setTheme(nextTheme, true);
      };
    }
  });

  // Listen for system theme change if no manual override
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem('techtide-theme')) {
      setTheme(e.matches ? 'dark' : 'light', false);
    }
  });
}

function setTheme(theme, announce = false) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('techtide-theme', theme);
  
  // Update browser bar theme-color
  const metaTheme = $('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute('content', theme === 'light' ? '#f8fafc' : '#030508');
  }

  if (announce) {
    showToast(theme === 'light' ? 'Light mode enabled' : 'Dark mode enabled');
  }
}

/* ===================================================================
   INTERACTIVE TECH NEWS TIDAL WAVE ANIMATION (CANVAS)
   Echoes the TechTide Triple-Wave Monogram
   Dynamically adapts to Dark and Light Mode
   =================================================================== */

class TechTideAnimation {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.nodes = [];
    this.dataPackets = [];
    this.waveOffset = 0;
    this.mouse = { x: -1000, y: -1000, radius: 150, isHovered: false };
    this.animationFrame = null;
    this.techTags = [
      'LLM Reasoning', 'RISC-V Silicon', 'Quantum Crypto', 'Zero-Day Patch', 
      'Rust 2026', 'Neural Core', 'Autonomous Agents', 'Wasm Cloud',
      'Solid-State Battery', 'Photonics', 'Edge TPU', 'Cyber Mesh'
    ];
    this.init();
  }

  init() {
    this.resize();
    window.addEventListener('resize', () => this.resize());
    
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - rect.left;
      this.mouse.y = e.clientY - rect.top;
      this.mouse.isHovered = true;
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.mouse.isHovered = false;
      this.mouse.x = -1000;
      this.mouse.y = -1000;
    });

    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      const isLight = document.documentElement.getAttribute('data-theme') === 'light';
      const burstColor = isLight ? '#090d16' : '#ffffff';

      // Burst 10 data packets
      for (let i = 0; i < 10; i++) {
        const angle = (Math.PI * 2 * i) / 10;
        this.dataPackets.push({
          x: clickX,
          y: clickY,
          vx: Math.cos(angle) * 3.5,
          vy: Math.sin(angle) * 3.5,
          life: 1,
          color: burstColor
        });
      }
    });

    this.createNodes();
    this.animate();
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * this.dpr;
    this.canvas.height = rect.height * this.dpr;
    this.ctx.scale(this.dpr, this.dpr);
    this.width = rect.width;
    this.height = rect.height;
  }

  createNodes() {
    this.nodes = [];
    const count = Math.min(16, Math.max(10, Math.floor(this.width / 45)));
    for (let i = 0; i < count; i++) {
      this.nodes.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        radius: Math.random() * 2.2 + 2,
        label: this.techTags[i % this.techTags.length],
        pulse: Math.random() * Math.PI * 2
      });
    }
  }

  animate() {
    this.ctx.clearRect(0, 0, this.width, this.height);
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    
    this.drawTripleTideWaves(isLight);
    this.updateAndDrawNodes(isLight);
    this.updateAndDrawPackets(isLight);
    this.drawConcentricRadarRings(isLight);
    this.waveOffset += 0.018;
    this.animationFrame = requestAnimationFrame(() => this.animate());
  }

  // Triple Concentric Tidal Wave Ribbons (matching the logo's triple contour)
  drawTripleTideWaves(isLight) {
    const ctx = this.ctx;
    const ribbonCount = 3;
    
    for (let r = 0; r < ribbonCount; r++) {
      ctx.beginPath();
      const alpha = isLight ? (0.07 + (2 - r) * 0.05) : (0.12 + (2 - r) * 0.08);
      ctx.strokeStyle = isLight 
        ? `rgba(9, 13, 22, ${alpha})` 
        : `rgba(255, 255, 255, ${alpha})`;
      ctx.lineWidth = 1.8 - r * 0.3;

      const baseHeight = this.height * 0.58 + r * 22;
      for (let x = 0; x <= this.width; x += 5) {
        const freq = 0.007 + r * 0.0015;
        const speed = this.waveOffset * (1 + r * 0.25);
        
        let mouseDeform = 0;
        if (this.mouse.isHovered) {
          const distToMouse = Math.abs(x - this.mouse.x);
          if (distToMouse < 180) {
            mouseDeform = Math.cos((distToMouse / 180) * (Math.PI / 2)) * 35;
          }
        }

        const y = baseHeight + 
          Math.sin(x * freq + speed) * (26 + r * 6) + 
          Math.cos(x * 0.003 - speed * 0.7) * 14 - mouseDeform;
          
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  updateAndDrawNodes(isLight) {
    const ctx = this.ctx;
    
    for (let i = 0; i < this.nodes.length; i++) {
      const a = this.nodes[i];
      for (let j = i + 1; j < this.nodes.length; j++) {
        const b = this.nodes[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 135) {
          const alpha = (1 - dist / 135) * (isLight ? 0.2 : 0.25);
          ctx.beginPath();
          ctx.strokeStyle = isLight ? `rgba(9, 13, 22, ${alpha})` : `rgba(255, 255, 255, ${alpha})`;
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 5]);
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
          ctx.setLineDash([]);

          if (Math.random() < 0.004) {
            this.dataPackets.push({
              x: a.x,
              y: a.y,
              targetX: b.x,
              targetY: b.y,
              progress: 0,
              speed: 0.02 + Math.random() * 0.02,
              color: isLight ? '#090d16' : '#ffffff'
            });
          }
        }
      }

      if (this.mouse.isHovered) {
        const mdx = this.mouse.x - a.x;
        const mdy = this.mouse.y - a.y;
        const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
        if (mdist < this.mouse.radius) {
          const mAlpha = (1 - mdist / this.mouse.radius) * 0.55;
          ctx.beginPath();
          ctx.strokeStyle = isLight ? `rgba(9, 13, 22, ${mAlpha})` : `rgba(255, 255, 255, ${mAlpha})`;
          ctx.lineWidth = 1.2;
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(this.mouse.x, this.mouse.y);
          ctx.stroke();

          a.vx += (mdx / mdist) * 0.07;
          a.vy += (mdy / mdist) * 0.07;
        }
      }

      a.x += a.vx;
      a.y += a.vy;

      if (a.x < 12 || a.x > this.width - 12) a.vx *= -1;
      if (a.y < 12 || a.y > this.height - 12) a.vy *= -1;

      a.vx *= 0.99;
      a.vy *= 0.99;

      a.pulse += 0.04;
      const pulseSize = a.radius + Math.sin(a.pulse) * 1.5;

      ctx.beginPath();
      ctx.arc(a.x, a.y, pulseSize + 3, 0, Math.PI * 2);
      ctx.fillStyle = isLight ? 'rgba(9, 13, 22, 0.08)' : 'rgba(255, 255, 255, 0.15)';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(a.x, a.y, a.radius, 0, Math.PI * 2);
      ctx.fillStyle = isLight ? '#090d16' : '#ffffff';
      ctx.fill();

      if (i % 2 === 0) {
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillStyle = isLight ? 'rgba(9, 13, 22, 0.55)' : 'rgba(255, 255, 255, 0.5)';
        ctx.fillText(a.label, a.x + 8, a.y + 3);
      }
    }
  }

  updateAndDrawPackets(isLight) {
    const ctx = this.ctx;
    for (let i = this.dataPackets.length - 1; i >= 0; i--) {
      const p = this.dataPackets[i];
      if (p.life !== undefined) {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.03;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = isLight ? `rgba(9, 13, 22, ${p.life})` : `rgba(255, 255, 255, ${p.life})`;
        ctx.fill();
        if (p.life <= 0) this.dataPackets.splice(i, 1);
      } else {
        p.progress += p.speed;
        const currX = p.x + (p.targetX - p.x) * p.progress;
        const currY = p.y + (p.targetY - p.y) * p.progress;

        ctx.beginPath();
        ctx.arc(currX, currY, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = isLight ? '#090d16' : '#ffffff';
        ctx.shadowColor = isLight ? '#090d16' : '#ffffff';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;

        if (p.progress >= 1) {
          this.dataPackets.splice(i, 1);
        }
      }
    }
  }

  drawConcentricRadarRings(isLight) {
    const ctx = this.ctx;
    const cx = this.width * 0.5;
    const cy = this.height * 0.5;
    const maxRadius = Math.min(this.width, this.height) * 0.42;

    ctx.strokeStyle = isLight ? 'rgba(9, 13, 22, 0.04)' : 'rgba(255, 255, 255, 0.035)';
    ctx.lineWidth = 1;
    for (let r = 1; r <= 3; r++) {
      ctx.beginPath();
      ctx.arc(cx, cy, (maxRadius / 3) * r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

/* ===================================================================
   LANDING PAGE CONTROLLER
   =================================================================== */

async function initLandingPage() {
  const canvas = $('#techRadarCanvas');
  if (canvas) {
    new TechTideAnimation(canvas);
  }

  loadPublicPreview();

  $$('.preview-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.preview-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const cat = btn.dataset.cat || '';
      loadPublicPreview(cat);
    });
  });

  $$('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId.startsWith('#') && targetId.length > 1) {
        const targetEl = $(targetId);
        if (targetEl) {
          e.preventDefault();
          targetEl.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });
  });
}

async function loadPublicPreview(category = '') {
  const container = $('#previewGrid');
  if (!container) return;
  
  try {
    const url = `/public-preview${category ? '?category=' + encodeURIComponent(category) : ''}`;
    const articles = await api(url);
    
    if (!articles || articles.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-sub);">
          <p>No preview articles available in this topic yet. Check back in a few minutes as auto-fetch runs!</p>
        </div>
      `;
      return;
    }

    container.innerHTML = articles.map(a => {
      const catClass = `badge-${(a.category || 'default').toLowerCase()}`;
      return `
        <article class="preview-card">
          <div class="meta-row">
            <span class="badge ${catClass}">${esc(a.category)}</span>
            <span style="font-size: 0.8rem; color: var(--text-muted); font-family: var(--font-mono);">${timeAgo(a.published_at)}</span>
          </div>
          <h3><a href="${esc(a.url)}" target="_blank" rel="noopener noreferrer">${esc(a.title)}</a></h3>
          <p>${esc(a.summary || 'Click to read full coverage and analysis from source.')}</p>
          <div class="card-bottom">
            <span>Source: <strong>${esc(a.source)}</strong></span>
            <a href="${esc(a.url)}" target="_blank" rel="noopener noreferrer" style="color: var(--text-main); font-weight: 600;">
              Read Source ↗
            </a>
          </div>
        </article>
      `;
    }).join('');
  } catch (err) {
    console.warn('Failed to load public preview:', err);
  }
}

/* ===================================================================
   GLASS AUTH MODAL CONTROLLER
   =================================================================== */

function openAuthModal(mode = 'login') {
  setAuthMode(mode);
  $('#authModal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  setTimeout(() => {
    if (mode === 'login') $('#authEmail').focus();
    else $('#authName').focus();
  }, 100);
}

function closeAuthModal() {
  $('#authModal').classList.add('hidden');
  document.body.style.overflow = '';
  $('#authError').textContent = '';
}

function setAuthMode(mode) {
  state.authMode = mode;
  const isLogin = mode === 'login';
  
  $('#tabLogin').classList.toggle('active', isLogin);
  $('#tabRegister').classList.toggle('active', !isLogin);
  $('#nameGroup').classList.toggle('hidden', isLogin);
  
  $('#authSubmitBtn').innerHTML = isLogin 
    ? '<span>Sign In to TechTide</span>' 
    : '<span>Create Free Account</span>';
  
  $('#authModalTitle').textContent = isLogin ? 'Welcome Back' : 'Join TechTide';
  $('#authModalSub').textContent = isLogin 
    ? 'Access your unified real-time news radar.' 
    : 'Track top technology stories in sub-seconds.';
    
  $('#authError').textContent = '';
  $('#strengthBar').classList.toggle('hidden', isLogin);
}

function checkPasswordStrength(password) {
  const fill = $('#strengthFill');
  if (!fill) return;
  
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const widths = ['0%', '25%', '50%', '75%', '100%'];
  const colors = ['#f43f5e', '#f43f5e', '#fbbf24', '#94a3b8', 'var(--text-main)'];

  fill.style.width = widths[score];
  fill.style.backgroundColor = colors[score];
}

async function handleAuthSubmit() {
  const email = $('#authEmail').value.trim();
  const password = $('#authPassword').value;
  const name = $('#authName') ? $('#authName').value.trim() : '';
  const errorEl = $('#authError');
  const btn = $('#authSubmitBtn');

  errorEl.textContent = '';

  if (state.authMode === 'register' && name.length < 2) {
    errorEl.textContent = 'Please enter your name (at least 2 letters).';
    return;
  }
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    errorEl.textContent = 'Please enter a valid email address.';
    return;
  }
  if (password.length < 8) {
    errorEl.textContent = 'Password must be at least 8 characters.';
    return;
  }

  try {
    btn.disabled = true;
    btn.style.opacity = '0.7';
    btn.innerHTML = `<span class="live-pulse"></span> Processing...`;

    const endpoint = state.authMode === 'login' ? '/login' : '/register';
    const body = state.authMode === 'login' ? { email, password } : { name, email, password };
    
    const user = await api(endpoint, { method: 'POST', body });
    state.user = user;
    
    closeAuthModal();
    showToast(`Welcome ${user.name || 'to TechTide'}!`);
    switchToAppView(user);
  } catch (err) {
    errorEl.textContent = err.message || 'Authentication failed. Please check details.';
  } finally {
    btn.disabled = false;
    btn.style.opacity = '1';
    btn.innerHTML = state.authMode === 'login' 
      ? '<span>Sign In to TechTide</span>' 
      : '<span>Create Free Account</span>';
  }
}

function fillDemoAccount() {
  $('#authEmail').value = 'demo@techtide.io';
  $('#authPassword').value = 'TechTide2026!';
  if (state.authMode === 'register') {
    $('#authName').value = 'Tech Pioneer';
  }
  checkPasswordStrength('TechTide2026!');
  showToast('Demo credentials inserted. Click Submit!');
}

/* ===================================================================
   AUTHENTICATED FEED CONTROLLER
   =================================================================== */

function switchToAppView(user) {
  $('#landing').classList.add('hidden');
  $('#app').classList.remove('hidden');
  
  if ($('#userNameBadge')) {
    $('#userNameBadge').textContent = user.name || user.email;
  }
  if ($('#userInitials')) {
    const initials = (user.name || user.email || 'TT').slice(0, 2).toUpperCase();
    $('#userInitials').textContent = initials;
  }

  loadAppTopics();
  loadAppFeed();
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function switchToLandingView() {
  state.user = null;
  $('#app').classList.add('hidden');
  $('#landing').classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function loadAppTopics() {
  try {
    const cats = await api('/categories');
    const container = $('#appTopics');
    if (!container) return;

    const renderItem = (label, val, count, isSaved = false) => {
      const active = isSaved ? state.saved : (!state.saved && state.category === val);
      return `
        <button class="topic-btn ${active ? 'active' : ''}" 
                data-cat="${esc(val)}" 
                data-saved="${isSaved ? 1 : 0}">
          <span>${esc(label)}</span>
          ${count !== null ? `<span class="count-badge">${count}</span>` : ''}
        </button>
      `;
    };

    container.innerHTML = 
      renderItem('⚡ All Stories', '', null, false) +
      cats.map(c => renderItem(c.category, c.category, c.n, false)).join('') +
      renderItem('★ Bookmarks', '', null, true);
  } catch (err) {
    console.error('Failed to load topics:', err);
  }
}

function buildStoryHTML(a) {
  const catBadgeClass = `badge-${(a.category || 'default').toLowerCase()}`;
  return `
    <article class="story-card" data-id="${a.id}">
      <div class="story-card-body">
        <div>
          <div class="meta-top">
            <span class="source-tag">${esc(a.source)}</span>
            <span class="badge ${catBadgeClass}">${esc(a.category)}</span>
            <span class="time-ago" style="font-family: var(--font-mono);">${timeAgo(a.published_at)}</span>
          </div>
          <h3>
            <a href="${esc(a.url)}" target="_blank" rel="noopener noreferrer">${esc(a.title)}</a>
          </h3>
          <p>${esc(a.summary || '')}</p>
        </div>
        <div class="story-card-actions">
          <button class="action-btn save-btn ${a.saved ? 'active-save' : ''}" data-id="${a.id}">
            <svg viewBox="0 0 24 24" fill="${a.saved ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
            <span>${a.saved ? 'Saved' : 'Save'}</span>
          </button>
          <button class="action-btn share-btn" data-url="${esc(a.url)}" title="Copy Link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="18" cy="5" r="3"></circle>
              <circle cx="6" cy="12" r="3"></circle>
              <circle cx="18" cy="19" r="3"></circle>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
            </svg>
            <span>Share</span>
          </button>
          <a href="${esc(a.url)}" target="_blank" rel="noopener noreferrer" class="action-btn" style="margin-left:auto;">
            <span>Read ↗</span>
          </a>
        </div>
      </div>
      ${a.image ? `
        <div class="story-card-img-wrap">
          <img src="${esc(a.image)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentElement.remove()">
        </div>
      ` : ''}
    </article>
  `;
}

async function loadAppFeed(append = false) {
  const container = $('#appFeed');
  const loadMoreBtn = $('#loadMoreStories');
  const banner = $('#appBanner');

  const params = new URLSearchParams();
  if (state.category) params.set('category', state.category);
  if (state.q) params.set('q', state.q);
  if (state.saved) params.set('saved', '1');
  if (append && state.oldest) params.set('before', state.oldest);

  try {
    const stories = await api('/news?' + params.toString());
    
    if (!append) {
      state.loadedAt = Date.now();
      banner.classList.add('hidden');
    }

    if (stories.length > 0) {
      state.oldest = stories[stories.length - 1].published_at;
    }

    const html = stories.map(buildStoryHTML).join('');

    if (append) {
      container.insertAdjacentHTML('beforeend', html);
    } else {
      if (stories.length === 0) {
        container.innerHTML = `
          <div class="feed-empty">
            <div class="feed-empty-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="8" y1="12" x2="16" y2="12"></line>
              </svg>
            </div>
            <h3>${state.saved ? 'No saved stories yet' : 'No matching stories found'}</h3>
            <p>${state.saved 
              ? 'Click the “Save” button on any article to build your offline tech reading list.' 
              : 'Try searching for different keywords or clear category filters.'}</p>
            ${state.saved ? `<button class="btn btn-primary btn-sm" id="emptyBrowseAll">Browse All Stories</button>` : ''}
          </div>
        `;
        const emptyBrowseBtn = $('#emptyBrowseAll');
        if (emptyBrowseBtn) {
          emptyBrowseBtn.onclick = () => {
            state.saved = false;
            state.category = '';
            loadAppTopics();
            loadAppFeed();
          };
        }
      } else {
        container.innerHTML = html;
      }
    }

    loadMoreBtn.classList.toggle('hidden', stories.length < 30);
  } catch (err) {
    console.error('Failed to load news:', err);
  }
}

// Live Stories Polling
function startLivePolling() {
  setInterval(async () => {
    if (document.hidden || $('#app').classList.contains('hidden')) return;
    try {
      const { n } = await api('/news/new-count?since=' + state.loadedAt);
      if (n > 0) {
        const banner = $('#appBanner');
        banner.innerHTML = `
          <span class="live-pulse"></span>
          <span>${n} fresh tech ${n === 1 ? 'story' : 'stories'} just arrived • Click to refresh</span>
        `;
        banner.classList.remove('hidden');
      }
    } catch {}
  }, 45000);
}

/* ===================================================================
   EVENT BINDINGS & APP INITIALIZATION
   =================================================================== */

function setupEventHandlers() {
  // Landing Page Buttons
  $$('.auth-trigger-login').forEach(btn => btn.onclick = () => openAuthModal('login'));
  $$('.auth-trigger-register').forEach(btn => btn.onclick = () => openAuthModal('register'));

  // Auth Modal Buttons
  $('#authCloseBtn').onclick = closeAuthModal;
  $('#authModal').onclick = (e) => {
    if (e.target === $('#authModal')) closeAuthModal();
  };
  $('#tabLogin').onclick = () => setAuthMode('login');
  $('#tabRegister').onclick = () => setAuthMode('register');
  $('#authSubmitBtn').onclick = handleAuthSubmit;
  $('#demoFillBtn').onclick = fillDemoAccount;

  // Password visibility toggle
  $('#passwordToggleBtn').onclick = () => {
    const pwd = $('#authPassword');
    const isText = pwd.type === 'text';
    pwd.type = isText ? 'password' : 'text';
    $('#passwordEyeIcon').innerHTML = isText 
      ? '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>'
      : '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>';
  };

  // Password typing strength listener
  $('#authPassword').oninput = (e) => {
    if (state.authMode === 'register') {
      checkPasswordStrength(e.target.value);
    }
  };

  // Enter key in auth form
  $('#authPassword').onkeydown = (e) => {
    if (e.key === 'Enter') handleAuthSubmit();
  };

  // App Top Bar Actions
  $('#appLogoutBtn').onclick = async () => {
    try {
      await api('/logout', { method: 'POST' });
      showToast('Logged out successfully');
      switchToLandingView();
    } catch {
      location.reload();
    }
  };

  // Search input with debounce
  let searchTimer;
  $('#appSearchInput').oninput = (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.q = e.target.value.trim();
      state.oldest = null;
      loadAppFeed();
    }, 300);
  };

  // Shortcut key "/" or "Ctrl+K" / "Cmd+K" to focus search
  window.addEventListener('keydown', (e) => {
    if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
      e.preventDefault();
      const searchInput = $('#appSearchInput');
      if (searchInput && !$('#app').classList.contains('hidden')) {
        searchInput.focus();
      }
    }
    if (e.key === 'Escape' && !$('#authModal').classList.contains('hidden')) {
      closeAuthModal();
    }
  });

  // Category selection in app
  $('#appTopics').onclick = (e) => {
    const btn = e.target.closest('.topic-btn');
    if (!btn) return;
    state.saved = btn.dataset.saved === '1';
    state.category = btn.dataset.cat || '';
    state.oldest = null;
    loadAppTopics();
    loadAppFeed();
  };

  // Article Actions (Save / Bookmark / Share)
  $('#appFeed').onclick = async (e) => {
    const saveBtn = e.target.closest('.save-btn');
    if (saveBtn) {
      const articleId = saveBtn.dataset.id;
      const { saved } = await api('/bookmarks/' + articleId, { method: 'POST' });
      saveBtn.classList.toggle('active-save', saved);
      saveBtn.querySelector('span').textContent = saved ? 'Saved' : 'Save';
      const poly = saveBtn.querySelector('polygon');
      if (poly) poly.setAttribute('fill', saved ? 'currentColor' : 'none');
      showToast(saved ? 'Saved to bookmarks' : 'Removed from bookmarks');
      return;
    }

    const shareBtn = e.target.closest('.share-btn');
    if (shareBtn) {
      const url = shareBtn.dataset.url;
      navigator.clipboard.writeText(url).then(() => {
        showToast('Article URL copied to clipboard!');
      }).catch(() => {
        showToast('URL: ' + url);
      });
      return;
    }
  };

  $('#loadMoreStories').onclick = () => loadAppFeed(true);

  $('#appBanner').onclick = () => {
    loadAppTopics();
    loadAppFeed();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
}

// Bootstrap Application
async function initApp() {
  initTheme();
  setupEventHandlers();
  initLandingPage();
  startLivePolling();

  try {
    const user = await api('/me');
    state.user = user;
    switchToAppView(user);
  } catch {
    switchToLandingView();
  }
}

document.addEventListener('DOMContentLoaded', initApp);
