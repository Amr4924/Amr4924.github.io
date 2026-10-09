/* ============================================================
   لوحة التحكم — بتعدّل data.json وبتعمل commit للريبو عن طريق GitHub API.
   مفيش سيرفر: كل حاجة بتشتغل في المتصفح، والتوكن بيتخزن في المتصفح بس.
   ============================================================ */
(function () {
  'use strict';

  const CFG = Object.assign({ owner: '', repo: '', branch: '', dataPath: 'data.json', pollMs: 5000 }, window.ADMIN_CONFIG || {});
  const API = 'https://api.github.com';
  const TOKEN_KEY = 'adm_gh_token';
  const ICON_COLOR = '%23f3ece1';

  /* ---------------------------------------------------------- DOM helper */
  function h(tag, props, ...kids) {
    const el = document.createElement(tag);
    const p = props || {};
    Object.keys(p).forEach((k) => {
      const v = p[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'value' || k === 'checked') return; // applied after children
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k.length > 2 && k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
      else el.setAttribute(k, v === true ? '' : String(v));
    });
    appendKids(el, kids);
    if (p.value !== undefined && p.value !== null) el.value = p.value;
    if (p.checked) el.checked = true;
    return el;
  }
  function appendKids(el, kids) {
    kids.forEach((c) => {
      if (c === null || c === undefined || c === false) return;
      if (Array.isArray(c)) appendKids(el, c);
      else if (c.nodeType) el.appendChild(c);
      else el.appendChild(document.createTextNode(String(c)));
    });
  }
  const byId = (id) => document.getElementById(id);

  /* ------------------------------------------------------------ encoding */
  function bytesToB64(bytes) {
    let bin = '';
    const CH = 0x8000;
    for (let i = 0; i < bytes.length; i += CH) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
    return btoa(bin);
  }
  function b64ToBytes(b64) {
    const bin = atob(String(b64).replace(/\s+/g, ''));
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  const utf8ToB64 = (s) => bytesToB64(new TextEncoder().encode(s));
  const b64ToUtf8 = (b) => new TextDecoder('utf-8').decode(b64ToBytes(b));

  /* ------------------------------------------------------------- helpers */
  const slugify = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  const kb = (n) => (n < 1048576 ? Math.max(1, Math.round(n / 1024)) + 'KB' : (n / 1048576).toFixed(1) + 'MB');
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function iconUrl(v) {
    v = String(v || '').trim();
    if (!v) return '';
    if (/^(https?:)?\/\//i.test(v) || v.charAt(0) === '/') return v;
    let set = 'simple-icons';
    let name = v;
    const i = v.indexOf(':');
    if (i > 0) { set = v.slice(0, i); name = v.slice(i + 1); }
    return 'https://api.iconify.design/' + encodeURIComponent(set.toLowerCase()) + '/' + encodeURIComponent(name.toLowerCase()) + '.svg?color=' + ICON_COLOR;
  }
  function iconInputValue(url) {
    const m = /^https:\/\/api\.iconify\.design\/([a-z0-9-]+)\/([a-z0-9-]+)\.svg\?color=%23f3ece1$/i.exec(url || '');
    if (!m) return url || '';
    return m[1] === 'simple-icons' ? m[2] : m[1] + ':' + m[2];
  }

  /* ---------------------------------------------------------------- data */
  const DEFAULT_HERO = {
    eyebrow: 'Flutter Developer',
    titleBefore: 'أبني تطبيقات',
    titleAccent: 'Flutter',
    titleAfter: 'بحس تصميم واهتمام بالتفاصيل',
    chips: ['الفرقة الثالثة', '{projects} مشاريع', 'دفعة 2028'],
  };
  const DEFAULT_EDU = 'Computer Science & AI — South Valley National University (SVNU), خريج متوقع يونيو 2028';

  // Makes sure every container the UI edits exists, so the dashboard never crashes on a missing key.
  function normalize(d) {
    d.aboutMe = d.aboutMe || {};
    const a = d.aboutMe;
    a.timeline = Array.isArray(a.timeline) ? a.timeline : [];
    a.radar = a.radar || {};
    ['confident', 'learning', 'exploring'].forEach((k) => { a.radar[k] = Array.isArray(a.radar[k]) ? a.radar[k] : []; });
    d.skills = d.skills || {};
    d.skills.languages = Array.isArray(d.skills.languages) ? d.skills.languages : [];
    d.skills.tools = Array.isArray(d.skills.tools) ? d.skills.tools : [];
    d.socialLinks = d.socialLinks || {};
    d.socialLinks.primary = Array.isArray(d.socialLinks.primary) ? d.socialLinks.primary : [];
    d.socialLinks.more = Array.isArray(d.socialLinks.more) ? d.socialLinks.more : [];
    d.projects = Array.isArray(d.projects) ? d.projects : [];
    d.certificates = Array.isArray(d.certificates) ? d.certificates : [];
    d.hero = Object.assign({}, DEFAULT_HERO, d.hero || {});
    if (!Array.isArray(d.hero.chips)) d.hero.chips = DEFAULT_HERO.chips.slice();
    d.cv = d.cv || {};
    if (!d.cv.education) d.cv.education = DEFAULT_EDU;
    d.projects.forEach((p) => {
      p.tech = Array.isArray(p.tech) ? p.tech : [];
      p.links = p.links || {};
      p.caseStudy = p.caseStudy || {};
      p.caseStudy.features = Array.isArray(p.caseStudy.features) ? p.caseStudy.features : [];
    });
    // The site shows the first three projects when none is flagged; make that explicit in the UI.
    if (d.projects.length && !d.projects.some((p) => Object.prototype.hasOwnProperty.call(p, 'featured'))) {
      d.projects.slice(0, 3).forEach((p) => { p.featured = true; });
    }
    return d;
  }

  function collectRefs(d) {
    const s = new Set();
    const add = (v) => { if (v && typeof v === 'string' && v.charAt(0) === '/') s.add(v); };
    add(d.profilePicture);
    add(d.heroPicture);
    (d.projects || []).forEach((p) => add(p.image));
    (d.certificates || []).forEach((c) => add(c.imageUrl));
    return s;
  }

  function trimDeep(o) {
    const fix = (v) => (typeof v === 'string' ? v.trim() : v);
    if (Array.isArray(o)) {
      o.forEach((v, i) => { if (typeof v === 'string') o[i] = fix(v); else if (v && typeof v === 'object') trimDeep(v); });
    } else if (o && typeof o === 'object') {
      Object.keys(o).forEach((k) => { const v = o[k]; if (typeof v === 'string') o[k] = fix(v); else if (v && typeof v === 'object') trimDeep(v); });
    }
  }

  function validate(d) {
    const errs = [];
    const seen = new Set();
    if (!String(d.name || '').trim()) errs.push('الاسم الكامل فاضي (تبويب عام)');
    if (!String(d.handle || '').trim()) errs.push('الاسم المختصر (Handle) فاضي (تبويب عام)');
    d.projects.forEach((p, i) => {
      const n = 'مشروع ' + (i + 1) + (p.name ? ' (' + p.name + ')' : '');
      if (!String(p.name || '').trim()) errs.push(n + ': الاسم فاضي');
      if (!SLUG_RE.test(p.slug || '')) errs.push(n + ': الـ slug لازم يكون حروف إنجليزي صغيرة وأرقام وشرطة بس');
      else if (seen.has(p.slug)) errs.push(n + ': الـ slug متكرر مع مشروع تاني');
      seen.add(p.slug);
      if (p.category !== 'flutter' && p.category !== 'web') errs.push(n + ': النوع لازم يكون Flutter أو Web');
    });
    d.certificates.forEach((c, i) => {
      const n = 'شهادة ' + (i + 1) + (c.title ? ' (' + c.title + ')' : '');
      if (!String(c.title || '').trim()) errs.push(n + ': الاسم فاضي');
      if (!c.imageUrl) errs.push(n + ': لازم تحط صورة للشهادة');
    });
    [['languages', 'اللغات'], ['tools', 'الأدوات']].forEach(([k, label]) => d.skills[k].forEach((s, i) => {
      if (!String(s.name || '').trim()) errs.push(label + ' — عنصر ' + (i + 1) + ': الاسم فاضي');
      if (!s.icon) errs.push(label + ' — ' + (s.name || 'عنصر ' + (i + 1)) + ': الأيقونة فاضية');
    }));
    [['primary', 'روابط التواصل الأساسية'], ['more', 'روابط التواصل التانية']].forEach(([k, label]) => d.socialLinks[k].forEach((l, i) => {
      if (!String(l.name || '').trim() || !String(l.url || '').trim()) errs.push(label + ' — عنصر ' + (i + 1) + ': الاسم أو الرابط فاضي');
    }));
    d.aboutMe.timeline.forEach((t, i) => { if (!String(t.title || '').trim()) errs.push('مرحلة ' + (i + 1) + ' في رحلتي: العنوان فاضي'); });
    return errs;
  }

  /* --------------------------------------------------------------- state */
  const state = {
    token: '', gh: null, branch: '', headSha: '', blobSha: '',
    data: null, baseline: '',
    pending: new Map(),   // '/projects/x.webp' -> { b64, mime, ext, size }   (files waiting to be committed)
    previews: new Map(),  // same keys -> data URL, kept for the session so previews survive the commit
    tab: 'general',
    openSet: new WeakSet(),
    autoSlug: new WeakSet(),
    deploy: { s: 'idle', url: '' },
    busy: false,
    toastTimer: null,
    unloadBound: false,
  };

  const isDirty = () => !!state.data && (JSON.stringify(state.data) !== state.baseline || state.pending.size > 0);

  function cleanPending() {
    const refs = collectRefs(state.data);
    Array.from(state.pending.keys()).forEach((k) => { if (!refs.has(k)) state.pending.delete(k); });
  }
  function changed() { cleanPending(); updateBar(); }

  const SECTIONS = [
    ['عام', 'identity'], ['الرئيسية', 'hero'], ['المشاريع', 'projects'], ['المهارات', 'skills'],
    ['رحلتي', 'journey'], ['الشهادات', 'certificates'], ['التواصل', 'social'],
  ];
  function changedSections() {
    const base = JSON.parse(state.baseline);
    const cur = state.data;
    const diff = (a, b) => JSON.stringify(a) !== JSON.stringify(b);
    const out = {};
    if (['name', 'handle', 'role', 'profilePicture', 'heroPicture', 'cv'].some((k) => diff(base[k], cur[k])) || diff(base.aboutMe.lede, cur.aboutMe.lede)) out.identity = true;
    if (diff(base.hero, cur.hero)) out.hero = true;
    if (diff(base.projects, cur.projects)) out.projects = true;
    if (diff(base.skills, cur.skills)) out.skills = true;
    const a1 = Object.assign({}, base.aboutMe); const a2 = Object.assign({}, cur.aboutMe);
    delete a1.lede; delete a2.lede;
    if (diff(a1, a2)) out.journey = true;
    if (diff(base.certificates, cur.certificates)) out.certificates = true;
    if (diff(base.socialLinks, cur.socialLinks)) out.social = true;
    return SECTIONS.filter((s) => out[s[1]]);
  }

  /* ------------------------------------------------------ GitHub client */
  function makeGH(token) {
    async function req(method, path, body) {
      const url = /^https?:/.test(path) ? path : API + '/repos/' + CFG.owner + '/' + CFG.repo + path;
      let res;
      try {
        res = await fetch(url, {
          method,
          headers: Object.assign({ Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json' }, body ? { 'Content-Type': 'application/json' } : {}),
          body: body ? JSON.stringify(body) : undefined,
          cache: 'no-store',
        });
      } catch (e) {
        const err = new Error('مشكلة في الاتصال بالإنترنت أو بـ GitHub');
        err.status = 0;
        throw err;
      }
      let json = null;
      try { json = await res.json(); } catch (e) { /* empty body */ }
      if (!res.ok) {
        const err = new Error((json && json.message) || 'HTTP ' + res.status);
        err.status = res.status;
        err.body = json;
        throw err;
      }
      return json;
    }
    return { get: (p) => req('GET', p), post: (p, b) => req('POST', p, b), patch: (p, b) => req('PATCH', p, b) };
  }

  function explain(e) {
    const m = String((e && e.message) || '');
    if (e && e.code === 'conflict') return m;
    if (/fast.?forward/i.test(m)) return 'حصل push جديد على الريبو وانت بتحفظ — دوس "حفظ ونشر" تاني.';
    if (e.status === 401) return 'التوكن غلط أو منتهي. اعمل توكن جديد وسجّل دخول تاني.';
    if (e.status === 403) return /rate limit/i.test(m) ? 'وصلت للحد الأقصى من طلبات GitHub، جرّب بعد شوية.' : 'التوكن ملوش صلاحية كافية — لازم يكون Contents: Read and write على الريبو ده.';
    if (e.status === 404) return 'الريبو مش موجود، أو التوكن مش مضاف على الريبو ده (Repository access).';
    return m || 'حصل خطأ غير متوقع';
  }

  async function loadData(gh, branch) {
    const ref = await gh.get('/git/ref/heads/' + branch);
    const headSha = ref.object.sha;
    const file = await gh.get('/contents/' + CFG.dataPath + '?ref=' + headSha);
    if (!file || !file.content) throw new Error('مش قادر أقرأ ' + CFG.dataPath + ' من الريبو');
    let parsed;
    try { parsed = JSON.parse(b64ToUtf8(file.content)); } catch (e) { throw new Error(CFG.dataPath + ' مش JSON صحيح — صلّحه الأول من الكود'); }
    return { headSha, blobSha: file.sha, data: normalize(parsed) };
  }

  async function startSession(token, remember) {
    const gh = makeGH(token);
    const repo = await gh.get('');
    const branch = CFG.branch || repo.default_branch || 'main';
    const loaded = await loadData(gh, branch);
    state.token = token; state.gh = gh; state.branch = branch;
    state.headSha = loaded.headSha; state.blobSha = loaded.blobSha;
    state.data = loaded.data; state.baseline = JSON.stringify(loaded.data);
    state.pending.clear(); state.tab = 'general';
    try {
      (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, token);
      (remember ? sessionStorage : localStorage).removeItem(TOKEN_KEY);
    } catch (e) { /* storage blocked: session only */ }
    renderApp();
    refreshDeploy();
  }

  function logout() {
    try { localStorage.removeItem(TOKEN_KEY); sessionStorage.removeItem(TOKEN_KEY); } catch (e) { /* ignore */ }
    state.token = ''; state.gh = null; state.data = null; state.pending.clear();
    renderLogin();
  }

  /* -------------------------------------------------------- deploy state */
  function paintDeploy() {
    const el = byId('deployPill');
    if (!el) return;
    const map = {
      idle: ['النشر: —', ''],
      run: ['جاري النشر…', 'pill--run'],
      ok: ['الموقع محدّث', 'pill--ok'],
      bad: ['فشل النشر — افتح السجل', 'pill--bad'],
      unknown: ['حالة النشر غير متاحة', ''],
    };
    const m = map[state.deploy.s] || map.idle;
    el.className = 'pill ' + m[1];
    el.textContent = m[0];
    if (state.deploy.url) el.setAttribute('href', state.deploy.url); else el.removeAttribute('href');
  }
  function setDeploy(s, url) { state.deploy = { s, url: url || '' }; paintDeploy(); }
  function runState(run) {
    if (run.status !== 'completed') return 'run';
    return run.conclusion === 'success' ? 'ok' : 'bad';
  }
  async function refreshDeploy() {
    try {
      const r = await state.gh.get('/actions/runs?branch=' + state.branch + '&event=push&per_page=1');
      const run = (r.workflow_runs || [])[0];
      if (!run) return setDeploy('unknown');
      const s = runState(run);
      setDeploy(s, run.html_url);
      if (s === 'run') watchDeploy(run.head_sha);
    } catch (e) { setDeploy('unknown'); }
  }
  let watchToken = 0;
  async function watchDeploy(sha) {
    const my = ++watchToken;
    setDeploy('run');
    const t0 = Date.now();
    while (Date.now() - t0 < 8 * 60 * 1000 && my === watchToken) {
      await sleep(CFG.pollMs);
      if (my !== watchToken || !state.gh) return;
      try {
        const r = await state.gh.get('/actions/runs?head_sha=' + sha + '&event=push&per_page=5');
        const run = (r.workflow_runs || [])[0];
        if (!run) continue;
        const s = runState(run);
        setDeploy(s, run.html_url);
        if (s !== 'run') return;
      } catch (e) {
        if (e.status === 403 || e.status === 404) return setDeploy('unknown');
      }
    }
    if (my === watchToken) setDeploy('unknown');
  }

  /* --------------------------------------------------------- UI: basics */
  function toast(msg, isErr) {
    const el = byId('toast');
    if (!el) return;
    el.className = 'toast' + (isErr ? ' err' : '');
    el.innerHTML = '';
    el.appendChild(h('div', { text: msg }));
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => { el.innerHTML = ''; }, 3600);
  }

  function closeModal() { const m = byId('modal'); if (m) m.remove(); }
  function showModal(o) {
    closeModal();
    const bodyP = o.body ? h('p', { text: o.body }) : null;
    const acts = h('div', { class: 'modal__actions' });
    (o.actions || []).forEach((a) => acts.appendChild(h('button', { type: 'button', class: 'btn ' + (a[2] || 'btn-soft') + ' btn-sm', onClick: () => { closeModal(); if (a[1]) a[1](); } }, a[0])));
    const box = h('div', { class: 'modal__box' },
      h('h3', null, o.spin ? h('span', { class: 'spin' }) : null, o.title),
      bodyP,
      o.list ? h('ul', null, o.list.map((t) => h('li', { text: t }))) : null,
      acts);
    document.body.appendChild(h('div', { class: 'modal', id: 'modal' }, box));
    return { setBody(t) { if (bodyP) bodyP.textContent = t; } };
  }

  function scrollTop() { const s = document.scrollingElement; return s ? s.scrollTop : 0; }
  function setScroll(y) { const s = document.scrollingElement; if (s) s.scrollTop = y; }

  const card = (title, desc, ...kids) => h('section', { class: 'card' }, title ? h('h2', { text: title }) : null, desc ? h('p', { class: 'card__desc', text: desc }) : null, kids);
  const field = (label, control, hint) => h('label', { class: 'field' }, h('span', { class: 'field__label', text: label }), control, hint ? h('small', { class: 'field__hint', text: hint }) : null);
  const empty = (t) => h('div', { class: 'empty', text: t || 'فاضي' });
  const addButton = (label, fn) => h('button', { type: 'button', class: 'btn btn-soft add-btn', onClick: () => { fn(); changed(); rerender(); } }, label);

  function inp(obj, key, o) {
    o = o || {};
    const el = h(o.multiline ? 'textarea' : 'input', {
      type: o.multiline ? null : (o.type || 'text'),
      rows: o.multiline ? (o.rows || 4) : null,
      placeholder: o.placeholder || null,
      list: o.list || null,
      class: o.ltr ? 'ltr' : null,
      dir: o.ltr ? 'ltr' : null,
      spellcheck: o.ltr ? 'false' : null,
    });
    el.value = obj[key] == null ? '' : String(obj[key]);
    el.addEventListener('input', () => { obj[key] = el.value; if (o.after) o.after(el.value); changed(); });
    return el;
  }
  function lines(obj, key, o) {
    o = o || {};
    const el = h('textarea', { rows: o.rows || 4, placeholder: o.placeholder || null });
    el.value = (obj[key] || []).join('\n');
    el.addEventListener('input', () => { obj[key] = el.value.split('\n').map((s) => s.trim()).filter(Boolean); changed(); });
    return el;
  }
  function csv(obj, key) {
    const el = h('input', { type: 'text', class: 'ltr', dir: 'ltr', spellcheck: 'false' });
    el.value = (obj[key] || []).join(', ');
    el.addEventListener('input', () => { obj[key] = el.value.split(/[,،]/).map((s) => s.trim()).filter(Boolean); changed(); });
    return el;
  }
  function sel(obj, key, options, after) {
    const el = h('select', null, options.map((o) => h('option', { value: o[0] }, o[1])));
    el.value = obj[key] || options[0][0];
    el.addEventListener('change', () => { obj[key] = el.value; if (after) after(el.value); changed(); });
    return el;
  }
  function chk(label, obj, key, after) {
    const el = h('input', { type: 'checkbox' });
    el.checked = !!obj[key];
    el.addEventListener('change', () => { obj[key] = el.checked; if (after) after(); changed(); });
    return h('label', { class: 'check', style: 'margin-bottom:14px' }, el, label);
  }

  function move(arr, i, d) {
    const j = i + d;
    if (j < 0 || j >= arr.length) return;
    const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
  }
  function rowActions(arr, i, o) {
    o = o || {};
    const stop = (e) => { e.preventDefault(); e.stopPropagation(); };
    return h('div', { class: 'row-actions' },
      h('button', { type: 'button', class: 'icon-btn', title: 'لفوق', disabled: i === 0, onClick: (e) => { stop(e); move(arr, i, -1); changed(); rerender(); } }, '↑'),
      h('button', { type: 'button', class: 'icon-btn', title: 'لتحت', disabled: i === arr.length - 1, onClick: (e) => { stop(e); move(arr, i, 1); changed(); rerender(); } }, '↓'),
      h('button', { type: 'button', class: 'icon-btn danger', title: 'حذف', onClick: (e) => { stop(e); if (o.confirm && !window.confirm(o.confirm)) return; arr.splice(i, 1); changed(); rerender(); } }, 'حذف'));
  }

  /* ---------------------------------------------------- UI: image upload */
  const MIME_EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif', 'image/svg+xml': 'svg', 'image/avif': 'avif' };
  const KEEP_BELOW = 300 * 1024;
  const MAX_DIM = 1800;
  const MAX_BYTES = 15 * 1024 * 1024;

  function readBytes(blob) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(new Uint8Array(r.result));
      r.onerror = () => rej(new Error('مش قادر أقرأ الملف'));
      r.readAsArrayBuffer(blob);
    });
  }
  function decodeImage(file) {
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      const t = setTimeout(() => { URL.revokeObjectURL(url); rej(new Error('timeout')); }, 8000);
      img.onload = () => { clearTimeout(t); URL.revokeObjectURL(url); res(img); };
      img.onerror = () => { clearTimeout(t); URL.revokeObjectURL(url); rej(new Error('decode')); };
      img.src = url;
    });
  }
  // Big images get resized + converted to WebP; anything that fails just uploads as-is.
  async function shrink(file) {
    const img = await decodeImage(file);
    const scale = Math.min(1, MAX_DIM / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const hgt = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = hgt;
    canvas.getContext('2d').drawImage(img, 0, 0, w, hgt);
    const blob = await new Promise((r) => canvas.toBlob(r, 'image/webp', 0.86));
    if (!blob || blob.type !== 'image/webp' || blob.size >= file.size * 0.9) return null;
    return blob;
  }
  async function prepareImage(file) {
    if (!MIME_EXT[file.type]) throw new Error('نوع الملف مش مدعوم — استخدم PNG أو JPG أو WebP');
    if (file.size > MAX_BYTES) throw new Error('الصورة كبيرة أوي (أقصى حد 15MB)');
    let blob = file;
    let mime = file.type;
    if (file.type !== 'image/gif' && file.type !== 'image/svg+xml' && file.size > KEEP_BELOW) {
      try { const small = await shrink(file); if (small) { blob = small; mime = small.type; } } catch (e) { /* keep original */ }
    }
    const bytes = await readBytes(blob);
    return { b64: bytesToB64(bytes), mime, ext: MIME_EXT[mime] || 'png', size: bytes.length };
  }

  function imageField(o) {
    const obj = o.obj;
    const key = o.key;
    const prev = o.noPreview ? null : h('img', { class: 'img-prev', alt: '' });
    const status = h('small', { class: 'field__hint', text: o.hint || '' });
    const file = h('input', { type: 'file', accept: 'image/*', class: 'file-hidden' });
    const paint = () => {
      if (prev) {
        const v = obj[key];
        if (v) { prev.src = state.previews.get(v) || v; prev.style.display = ''; } else { prev.removeAttribute('src'); prev.style.display = 'none'; }
      }
      if (o.onSet) o.onSet();
    };
    file.addEventListener('change', async () => {
      const f = file.files && file.files[0];
      if (!f) return;
      status.textContent = 'بيتجهّز…';
      try {
        const img = await prepareImage(f);
        const path = o.dir + '/' + (slugify(o.base()) || 'image') + '-' + Date.now().toString(36) + '.' + img.ext;
        obj[key] = path;
        state.pending.set(path, img);
        state.previews.set(path, 'data:' + img.mime + ';base64,' + img.b64);
        changed();
        paint();
        status.textContent = 'جاهزة (' + kb(img.size) + ') — هتترفع لما تدوس "حفظ ونشر"';
      } catch (e) {
        status.textContent = e.message || 'الصورة دي مش مظبوطة';
      }
      try { file.value = ''; } catch (e) { /* ignore */ }
    });
    const rm = h('button', { type: 'button', class: 'btn btn-ghost btn-sm', onClick: () => { obj[key] = ''; changed(); paint(); status.textContent = o.hint || ''; } }, 'إزالة');
    paint();
    return h('div', { class: 'field' },
      h('span', { class: 'field__label', text: o.label }),
      h('div', { class: 'img-field' }, prev, h('div', { class: 'img-field__side' }, h('div', { class: 'img-field__btns' }, h('label', { class: 'btn btn-soft btn-sm' }, 'اختيار صورة', file), rm), status)));
  }

  function setIconImg(img, url) { if (url) img.setAttribute('src', url); else img.removeAttribute('src'); }
  function iconInput(obj, key, listId) {
    const prev = h('img', { class: 'icon-prev', alt: '' });
    setIconImg(prev, obj[key]);
    const el = h('input', { type: 'text', class: 'ltr', dir: 'ltr', spellcheck: 'false', list: listId || null, placeholder: 'flutter  أو  lucide:globe' });
    el.value = iconInputValue(obj[key]);
    el.addEventListener('input', () => { obj[key] = iconUrl(el.value); setIconImg(prev, obj[key]); changed(); });
    return h('div', { class: 'icon-wrap' }, el, prev);
  }

  /* ------------------------------------------------------------- UI: tabs */
  function viewGeneral() {
    const d = state.data;
    return h('div', null,
      card('الهوية', null,
        h('div', { class: 'grid2' },
          field('الاسم الكامل', inp(d, 'name'), 'بيظهر في الـ CV والفوتر'),
          field('الاسم المختصر (Handle)', inp(d, 'handle', { ltr: true }), 'بيظهر في الهيدر وعناوين الصفحات')),
        field('المسمى الوظيفي', inp(d, 'role'), 'بيظهر في الـ CV'),
        imageField({ label: 'الصورة الشخصية', obj: d, key: 'profilePicture', dir: '/profile', base: () => d.handle || 'photo', hint: 'بتظهر في الهيدر جوه دايرة صغيرة' })),
      card('نبذة قصيرة', 'بتظهر تحت العنوان في الصفحة الرئيسية وفي الـ CV.',
        field('النبذة', inp(d.aboutMe, 'lede', { multiline: true, rows: 4 }))),
      card('التعليم', 'السطر اللي بيظهر في قسم التعليم في الـ CV.',
        field('التعليم', inp(d.cv, 'education'))));
  }

  function viewHome() {
    const hero = state.data.hero;
    return h('div', null,
      card('عنوان الصفحة الرئيسية', 'العنوان الكبير فوق. الكلمة الملوّنة بتتكتب في خانة لوحدها.',
        field('الكلمة الصغيرة فوق العنوان', inp(hero, 'eyebrow', { ltr: true })),
        h('div', { class: 'grid2' },
          field('قبل الكلمة الملوّنة', inp(hero, 'titleBefore')),
          field('الكلمة الملوّنة', inp(hero, 'titleAccent'))),
        field('بعد الكلمة الملوّنة (السطر التاني)', inp(hero, 'titleAfter'))),
      card('الشارات الصغيرة', null,
        field('كل سطر شارة', lines(hero, 'chips', { rows: 4 }), 'اكتب {projects} وهيتحول لعدد المشاريع تلقائيًا. مثال: {projects} مشاريع'),
        h('p', { class: 'note', text: 'المشاريع اللي بتظهر في الرئيسية بتتحدد من تبويب المشاريع (خانة "اعرضه في الصفحة الرئيسية").' })));
  }

  const CAT = [['flutter', 'Flutter'], ['web', 'Web']];
  const TONES = [['rose', 'وردي'], ['gold', 'دهبي']];
  const STATUSES = ['قيد التطوير', 'قيد التطوير النشط', 'مكتمل', 'مشروع تدريبي مكتمل'];
  const ICON_SUGGEST = ['watch', 'gem', 'graduation-cap', 'shopping-bag', 'list-checks', 'mic', 'layout-template', 'smartphone', 'globe', 'dumbbell', 'utensils', 'book-open', 'music', 'camera', 'map-pin', 'message-circle', 'wallet', 'rocket'].map((n) => 'lucide:' + n);

  function projectItem(p, i, list) {
    const det = h('details', { class: 'item' });
    if (state.openSet.has(p)) det.open = true;
    det.addEventListener('toggle', () => { if (det.open) state.openSet.add(p); else state.openSet.delete(p); });
    const title = h('span', { class: 'title', text: p.name || '(بدون اسم)' });
    const slugInput = inp(p, 'slug', { ltr: true, after: () => state.autoSlug.delete(p) });
    const nameInput = inp(p, 'name', {
      after: (v) => {
        title.textContent = v || '(بدون اسم)';
        if (state.autoSlug.has(p)) { const s = slugify(v); if (s) { p.slug = s; slugInput.value = s; } }
      },
    });
    det.appendChild(h('summary', null,
      h('span', { class: 'badge badge--' + p.category, text: p.category === 'web' ? 'Web' : 'Flutter' }),
      title,
      p.featured ? h('span', { class: 'badge badge--star', text: 'في الرئيسية' }) : null,
      rowActions(list, i, { confirm: 'متأكد إنك عايز تمسح مشروع "' + (p.name || '') + '"؟' })));
    const cs = p.caseStudy;
    det.appendChild(h('div', { class: 'item__body' },
      h('div', { class: 'grid2' },
        field('اسم المشروع', nameInput),
        field('الـ Slug (جزء من رابط الصفحة)', slugInput, 'حروف إنجليزي صغيرة وأرقام وشرطة. تغييره بيغيّر رابط صفحة المشروع.')),
      h('div', { class: 'grid2' },
        field('النوع', sel(p, 'category', CAT, () => rerender())),
        field('حالة المشروع', inp(p, 'status', { list: 'statusList' }))),
      field('جملة قصيرة تحت الاسم', inp(p, 'tagline')),
      field('وصف مختصر (بيظهر على الكارت)', inp(p, 'description', { multiline: true, rows: 3 })),
      field('التقنيات المستخدمة', csv(p, 'tech'), 'افصل بينهم بفاصلة. مثال: Flutter, Dart, Provider'),
      h('div', { class: 'grid2' },
        field('لون الغلاف', sel(p, 'coverTone', TONES)),
        p.category === 'web' ? field('أيقونة الغلاف', iconInput(p, 'coverIcon', 'iconList'), 'مثال: lucide:globe أو simple-icons:astro') : null),
      imageField({
        label: 'صورة المشروع', obj: p, key: 'image', dir: '/projects', base: () => p.slug || 'project',
        hint: p.category === 'web' ? 'صورة عرضية (16:9). لو سبتها فاضية بيظهر الغلاف الافتراضي.' : 'سكرين شوت طولي من التطبيق. لو سبتها فاضية بيظهر الشكل الافتراضي.',
      }),
      field('رابط التجربة أو التحميل (اختياري)', inp(p.links, 'demo', { type: 'url', ltr: true, placeholder: 'https://…' }), 'لو فيه رابط بيظهر زرار Live Demo'),
      chk('اعرضه في الصفحة الرئيسية', p, 'featured', () => rerender()),
      h('p', { class: 'sub-title', text: 'صفحة تفاصيل المشروع' }),
      field('المشكلة', inp(cs, 'problem', { multiline: true })),
      field('الحل والتنفيذ', inp(cs, 'approach', { multiline: true })),
      field('أهم الميزات', lines(cs, 'features', { rows: 4 }), 'كل ميزة في سطر'),
      field('النتيجة والتعلم', inp(cs, 'result', { multiline: true }))));
    return det;
  }

  function addProject() {
    const list = state.data.projects;
    let n = list.length + 1;
    let slug = 'new-project-' + n;
    while (list.some((p) => p.slug === slug)) { n += 1; slug = 'new-project-' + n; }
    const p = {
      slug, name: 'مشروع جديد', category: 'flutter', tagline: '', description: '', status: 'قيد التطوير',
      coverIcon: iconUrl('lucide:smartphone'), coverTone: 'rose', image: '', tech: ['Flutter', 'Dart'], featured: false,
      links: { demo: '' }, caseStudy: { problem: '', approach: '', features: [], result: '' },
    };
    list.push(p);
    state.autoSlug.add(p);
    state.openSet.add(p);
    toast('اتضاف مشروع جديد — عدّل بياناته وبعدين احفظ');
  }

  function viewProjects() {
    const list = state.data.projects;
    return h('div', null,
      h('datalist', { id: 'statusList' }, STATUSES.map((v) => h('option', { value: v }))),
      h('datalist', { id: 'iconList' }, ICON_SUGGEST.map((v) => h('option', { value: v }))),
      h('div', { class: 'card__head' }, h('h2', { text: 'المشاريع (' + list.length + ')' })),
      list.length ? null : empty('مفيش مشاريع لسه'),
      list.map((p, i) => projectItem(p, i, list)),
      addButton('+ إضافة مشروع جديد', addProject));
  }

  function skillRow(arr, it, i) {
    const prev = h('img', { class: 'icon-prev', alt: '' });
    setIconImg(prev, it.icon);
    const iconEl = h('input', { type: 'text', class: 'ltr', dir: 'ltr', spellcheck: 'false', placeholder: 'flutter' });
    iconEl.value = iconInputValue(it.icon);
    iconEl.addEventListener('input', () => { it.icon = iconUrl(iconEl.value); setIconImg(prev, it.icon); changed(); });
    return h('div', { class: 'row' },
      field('الاسم', inp(it, 'name')),
      field('الأيقونة', h('div', { class: 'icon-wrap' }, iconEl, prev)),
      rowActions(arr, i));
  }
  function skillGroup(title, arr) {
    return card(title + ' (' + arr.length + ')',
      'الأيقونة بتتجاب من Iconify: اكتب اسمها من مجموعة simple-icons (زي flutter أو figma). ولو من مجموعة تانية اكتبها كده: lucide:mail',
      arr.length ? null : empty(),
      arr.map((it, i) => skillRow(arr, it, i)),
      addButton('+ إضافة', () => arr.push({ name: '', icon: '' })));
  }
  function viewSkills() {
    const s = state.data.skills;
    return h('div', null, skillGroup('اللغات والـ Frameworks', s.languages), skillGroup('الأدوات والمنصات', s.tools));
  }

  function timelineItem(arr, t, i) {
    const det = h('details', { class: 'item' });
    if (state.openSet.has(t)) det.open = true;
    det.addEventListener('toggle', () => { if (det.open) state.openSet.add(t); else state.openSet.delete(t); });
    const title = h('span', { class: 'title', text: t.title || '(بدون عنوان)' });
    det.appendChild(h('summary', null, h('span', { class: 'badge', text: t.stage || '—' }), title, rowActions(arr, i, { confirm: 'تمسح المرحلة دي؟' })));
    det.appendChild(h('div', { class: 'item__body' },
      h('div', { class: 'grid2' },
        field('الاسم الصغير (زي "الأساس")', inp(t, 'stage')),
        field('العنوان', inp(t, 'title', { after: (v) => { title.textContent = v || '(بدون عنوان)'; } }))),
      field('الوصف', inp(t, 'desc', { multiline: true, rows: 3 }))));
    return det;
  }
  function viewJourney() {
    const a = state.data.aboutMe;
    return h('div', null,
      card('القصة', 'الفقرة اللي فوق في صفحة رحلتي.', field('القصة', inp(a, 'story', { multiline: true, rows: 8 }))),
      card('المراحل (Timeline)', 'كل مرحلة ليها اسم صغير وعنوان ووصف. الترتيب هنا هو الترتيب في الصفحة.',
        a.timeline.length ? null : empty('مفيش مراحل'),
        a.timeline.map((t, i) => timelineItem(a.timeline, t, i)),
        addButton('+ إضافة مرحلة', () => { const t = { stage: '', title: 'مرحلة جديدة', desc: '' }; a.timeline.push(t); state.openSet.add(t); })),
      card('فين أنا دلوقتي', 'كل سطر مهارة أو موضوع.',
        field('واثق فيها', lines(a.radar, 'confident')),
        field('بتعلمها دلوقتي', lines(a.radar, 'learning')),
        field('بستكشفها', lines(a.radar, 'exploring'))));
  }

  function certRow(list, c, i) {
    const thumb = h('img', { class: 'thumb', alt: '' });
    const paintThumb = () => { if (c.imageUrl) thumb.setAttribute('src', state.previews.get(c.imageUrl) || c.imageUrl); else thumb.removeAttribute('src'); };
    paintThumb();
    return h('div', { class: 'cert-row' }, thumb,
      h('div', null,
        h('div', { class: 'grid2' }, field('اسم الشهادة', inp(c, 'title')), field('الجهة المانحة', inp(c, 'issuer'))),
        field('التصنيف', inp(c, 'category', { list: 'catList' }), 'الشهادات بتتجمّع في الصفحة حسب التصنيف'),
        imageField({ label: 'صورة الشهادة', obj: c, key: 'imageUrl', dir: '/certificates', base: () => c.title || 'certificate', hint: 'PNG أو JPG — بتتصغّر تلقائيًا لو كبيرة', noPreview: true, onSet: paintThumb }),
        rowActions(list, i, { confirm: 'متأكد إنك عايز تمسح شهادة "' + (c.title || '') + '"؟' })));
  }
  function viewCerts() {
    const list = state.data.certificates;
    const cats = Array.from(new Set(list.map((c) => c.category).filter(Boolean)));
    return h('div', null,
      h('datalist', { id: 'catList' }, cats.map((c) => h('option', { value: c }))),
      h('div', { class: 'card__head' }, h('h2', { text: 'الشهادات (' + list.length + ')' })),
      list.length ? null : empty('مفيش شهادات'),
      list.map((c, i) => certRow(list, c, i)),
      addButton('+ إضافة شهادة (بتتضاف فوق)', () => list.unshift({ title: '', issuer: '', category: cats[0] || 'تقني', imageUrl: '' })));
  }

  function socialRow(arr, l, i) {
    const prev = h('img', { class: 'icon-prev', alt: '' });
    setIconImg(prev, l.icon);
    const iconEl = h('input', { type: 'text', class: 'ltr', dir: 'ltr', spellcheck: 'false', placeholder: 'github' });
    iconEl.value = iconInputValue(l.icon);
    iconEl.addEventListener('input', () => { l.icon = iconUrl(iconEl.value); setIconImg(prev, l.icon); changed(); });
    return h('div', { class: 'row row--social' },
      field('الاسم', inp(l, 'name')),
      field('الرابط', inp(l, 'url', { ltr: true, placeholder: 'https://…' })),
      field('الأيقونة', h('div', { class: 'icon-wrap' }, iconEl, prev)),
      rowActions(arr, i));
  }
  function socialGroup(title, desc, arr) {
    return card(title + ' (' + arr.length + ')', desc,
      arr.length ? null : empty(),
      arr.map((l, i) => socialRow(arr, l, i)),
      addButton('+ إضافة رابط', () => arr.push({ name: '', url: '', icon: '' })));
  }
  function viewSocial() {
    const s = state.data.socialLinks;
    return h('div', null,
      socialGroup('الروابط الأساسية', 'بتظهر في الصفحة الرئيسية والفوتر والـ CV. الإيميل يتكتب كده: mailto:name@gmail.com — وسيب اسمه Email عشان الـ CV يلاقيه.', s.primary),
      socialGroup('روابط تانية', 'بتظهر كأيقونات صغيرة في صفحة التواصل.', s.more));
  }

  const TABS = [['general', 'عام'], ['home', 'الرئيسية'], ['projects', 'المشاريع'], ['skills', 'المهارات'], ['journey', 'رحلتي'], ['certs', 'الشهادات'], ['social', 'التواصل']];
  const VIEWS = { general: viewGeneral, home: viewHome, projects: viewProjects, skills: viewSkills, journey: viewJourney, certs: viewCerts, social: viewSocial };

  function renderTabs() {
    const nav = byId('tabs');
    if (!nav) return;
    nav.innerHTML = '';
    TABS.forEach((t) => {
      const count = t[0] === 'projects' ? state.data.projects.length : t[0] === 'certs' ? state.data.certificates.length : null;
      nav.appendChild(h('button', {
        type: 'button', class: 'tab' + (state.tab === t[0] ? ' is-active' : ''), 'data-tab': t[0],
        onClick: () => { state.tab = t[0]; renderPanel(); setScroll(0); },
      }, t[1], count === null ? null : h('small', { text: count })));
    });
  }
  function renderPanel() {
    const panel = byId('panel');
    if (!panel || !state.data) return;
    const y = scrollTop();
    panel.innerHTML = '';
    panel.appendChild(VIEWS[state.tab]());
    renderTabs();
    setScroll(y);
  }
  const rerender = renderPanel;

  /* ------------------------------------------------- UI: bar, backup, etc */
  function updateBar() {
    const bar = byId('savebar');
    if (!bar) return;
    const dirty = isDirty();
    bar.hidden = !dirty;
    if (!dirty) return;
    const small = byId('savebarSmall');
    const names = changedSections().map((s) => s[0]);
    if (small) small.textContent = (names.length ? names.join(' · ') : 'صور جديدة') + (state.pending.size ? ' — ' + state.pending.size + ' صورة جديدة' : '');
  }

  function discard() {
    if (!isDirty()) return;
    if (!window.confirm('تتراجع عن كل التعديلات اللي ما اتحفظتش؟')) return;
    state.data = JSON.parse(state.baseline);
    state.pending.clear();
    rerender();
    updateBar();
    toast('اتلغت التعديلات');
  }

  function backup() {
    try {
      const blob = new Blob([JSON.stringify(state.data, null, 2) + '\n'], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = h('a', { href: url, download: 'data-backup-' + new Date().toISOString().slice(0, 10) + '.json' });
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch (e) { toast('المتصفح مش بيدعم تحميل الملف ده', true); }
  }

  function renderApp() {
    const root = byId('app');
    root.innerHTML = '';
    root.appendChild(h('div', null,
      h('header', { class: 'topbar' }, h('div', { class: 'topbar__in' },
        h('h1', { text: 'لوحة التحكم' }),
        h('a', { id: 'deployPill', class: 'pill', target: '_blank', rel: 'noopener' }, 'النشر: —'),
        h('a', { class: 'view-site', href: '/', target: '_blank', rel: 'noopener' }, 'افتح الموقع'),
        h('button', { type: 'button', class: 'btn btn-ghost btn-sm', onClick: backup }, 'نسخة احتياطية'),
        h('button', { type: 'button', class: 'btn btn-ghost btn-sm', onClick: logout }, 'خروج'))),
      h('div', { class: 'adm-body' }, h('nav', { class: 'tabs', id: 'tabs' }), h('main', { id: 'panel' })),
      h('div', { id: 'savebar', class: 'savebar', hidden: true }, h('div', { class: 'savebar__in' },
        h('div', { class: 'savebar__msg' }, 'فيه تعديلات لسه ما اتحفظتش', h('small', { id: 'savebarSmall' })),
        h('button', { type: 'button', class: 'btn btn-ghost btn-sm', onClick: discard }, 'تراجع عن الكل'),
        h('button', { type: 'button', class: 'btn btn-primary btn-sm', id: 'saveBtn', onClick: save }, 'حفظ ونشر'))),
      h('div', { id: 'toast', class: 'toast' })));
    if (!state.unloadBound) {
      state.unloadBound = true;
      window.addEventListener('beforeunload', (e) => { if (isDirty()) { e.preventDefault(); e.returnValue = ''; } });
    }
    renderPanel();
    updateBar();
    paintDeploy();
  }

  /* ------------------------------------------------------------- login UI */
  function renderLogin(err) {
    const tokenInput = h('input', { type: 'password', id: 'tokenInput', class: 'ltr', dir: 'ltr', autocomplete: 'off', placeholder: 'github_pat_…', spellcheck: 'false' });
    const remember = h('input', { type: 'checkbox', id: 'rememberBox' });
    remember.checked = true;
    const errBox = h('div', { class: 'error-box', id: 'loginError', hidden: !err }, err || '');
    const btn = h('button', { type: 'button', id: 'loginBtn', class: 'btn btn-primary' }, 'دخول');
    const show = (m) => { errBox.textContent = m; errBox.hidden = false; };
    const go = async () => {
      const t = tokenInput.value.trim();
      if (!t) { show('اكتب التوكن الأول'); return; }
      btn.disabled = true; btn.textContent = 'بيتأكد…'; errBox.hidden = true;
      try { await startSession(t, remember.checked); } catch (e) { btn.disabled = false; btn.textContent = 'دخول'; show(explain(e)); }
    };
    btn.addEventListener('click', go);
    tokenInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
    const root = byId('app');
    root.innerHTML = '';
    root.appendChild(h('div', { class: 'login-wrap' }, h('div', { class: 'login-card' },
      h('h1', { text: 'لوحة التحكم' }),
      h('p', { text: 'من هنا بتعدّل محتوى الموقع من غير ما تفتح الكود. محتاج توكن من GitHub مرة واحدة بس:' }),
      h('ol', { class: 'steps' },
        h('li', null, 'افتح ', h('a', { href: 'https://github.com/settings/personal-access-tokens/new', target: '_blank', rel: 'noopener' }, 'صفحة إنشاء توكن (Fine-grained)'), '.'),
        h('li', null, 'الاسم أي حاجة (مثلًا ', h('code', { text: 'portfolio-admin' }), ') والمدة مثلًا 90 يوم.'),
        h('li', null, h('b', { text: 'Repository access' }), ' ← Only select repositories ← اختار ', h('code', { text: CFG.repo || 'your-repo' }), ' بس.'),
        h('li', null, h('b', { text: 'Permissions' }), ' ← Repository permissions ← ', h('b', { text: 'Contents: Read and write' }), ' (ومعاها Actions: Read-only لو عايز تشوف حالة النشر).'),
        h('li', null, 'دوس Generate token، انسخه، والصقه هنا:')),
      tokenInput,
      h('div', { class: 'login-actions' }, btn, h('label', { class: 'check' }, remember, 'افتكرني على الجهاز ده')),
      errBox,
      h('p', { class: 'note', text: 'التوكن بيتخزن في المتصفح ده بس وبيتبعت لـ GitHub بس — ما بيتحطش في الكود ولا في الموقع. لو فقدته أو شكّيت فيه، امسحه من إعدادات GitHub.' }))));
    tokenInput.focus();
  }
  function renderLoading() {
    const root = byId('app');
    root.innerHTML = '';
    root.appendChild(h('div', { class: 'login-wrap' }, h('p', null, h('span', { class: 'spin' }), 'بيتحمّل…')));
  }

  /* ----------------------------------------------------------- publishing */
  function commitMessage() {
    const keys = changedSections().map((s) => s[1]);
    const imgs = state.pending.size;
    return 'dashboard: update ' + (keys.length ? keys.join(', ') : 'images') + (imgs ? ' (+' + imgs + ' image' + (imgs > 1 ? 's' : '') + ')' : '');
  }

  async function publish(step) {
    const gh = state.gh;
    const branch = state.branch;
    const d = state.data;
    const text = JSON.stringify(d, null, 2) + '\n';
    const refs = collectRefs(d);
    const oldRefs = collectRefs(JSON.parse(state.baseline));
    const message = commitMessage();

    step('بيتأكد إن محدش غيّر الملفات من مكان تاني…');
    const ref = await gh.get('/git/ref/heads/' + branch);
    const head = ref.object.sha;
    if (head !== state.headSha) {
      const f = await gh.get('/contents/' + CFG.dataPath + '?ref=' + head);
      if (f.sha !== state.blobSha) {
        const err = new Error(CFG.dataPath + ' اتغيّر على GitHub من مكان تاني بعد ما فتحت اللوحة. نزّل نسخة احتياطية من تعديلاتك، وبعدين اعمل تسجيل خروج ودخول عشان تحمّل آخر نسخة.');
        err.code = 'conflict';
        throw err;
      }
    }
    const headCommit = await gh.get('/git/commits/' + head);
    const baseTree = headCommit.tree.sha;

    const uploads = Array.from(state.pending.entries()).filter((e) => refs.has(e[0]));
    // Images that were referenced before and aren't anymore (deleted certificate, replaced screenshot…).
    const dels = Array.from(oldRefs).filter((p) => !refs.has(p) && /^\/(projects|certificates)\//.test(p));
    let existing = null;
    if (dels.length) {
      const t = await gh.get('/git/trees/' + baseTree + '?recursive=1');
      existing = new Set((t.tree || []).filter((e) => e.type === 'blob').map((e) => e.path));
    }

    const entries = [];
    if (uploads.length) step('بيرفع الصور…');
    for (let i = 0; i < uploads.length; i++) {
      const blob = await gh.post('/git/blobs', { content: uploads[i][1].b64, encoding: 'base64' });
      entries.push({ path: 'public' + uploads[i][0], mode: '100644', type: 'blob', sha: blob.sha });
    }
    let deleted = 0;
    dels.forEach((p) => {
      if (existing && existing.has('public' + p)) { entries.push({ path: 'public' + p, mode: '100644', type: 'blob', sha: null }); deleted += 1; }
    });
    const dataBlob = await gh.post('/git/blobs', { content: utf8ToB64(text), encoding: 'base64' });
    entries.push({ path: CFG.dataPath, mode: '100644', type: 'blob', sha: dataBlob.sha });

    step('بيعمل commit…');
    const tree = await gh.post('/git/trees', { base_tree: baseTree, tree: entries });
    const commit = await gh.post('/git/commits', { message, tree: tree.sha, parents: [head] });
    await gh.patch('/git/refs/heads/' + branch, { sha: commit.sha, force: false });
    return { commitSha: commit.sha, blobSha: dataBlob.sha, uploaded: uploads.length, deleted };
  }

  async function save() {
    if (state.busy || !state.data) return;
    trimDeep(state.data);
    const errs = validate(state.data);
    if (errs.length) {
      showModal({ title: 'في حاجات محتاجة تتصلح قبل الحفظ', list: errs.slice(0, 12), actions: [['تمام']] });
      return;
    }
    state.busy = true;
    const btn = byId('saveBtn');
    if (btn) btn.disabled = true;
    const m = showModal({ title: 'بيتحفظ…', body: 'بيتم رفع التعديلات لـ GitHub', spin: true });
    try {
      const r = await publish((t) => m.setBody(t));
      state.headSha = r.commitSha;
      state.blobSha = r.blobSha;
      state.baseline = JSON.stringify(state.data);
      state.pending.clear();
      closeModal();
      renderPanel();
      updateBar();
      showModal({
        title: 'اتحفظ',
        body: 'الموقع هيتحدث خلال دقيقة أو اتنين (بعد ما GitHub يخلّص النشر). حالة النشر ظاهرة فوق.' + (r.uploaded ? ' اترفع ' + r.uploaded + ' صورة.' : '') + (r.deleted ? ' واتمسح ' + r.deleted + ' صورة مش مستخدمة.' : ''),
        actions: [['تمام', null, 'btn-primary']],
      });
      watchDeploy(r.commitSha);
    } catch (e) {
      closeModal();
      if (e.status === 401) {
        showModal({ title: 'التوكن مش شغال', body: explain(e), actions: [['تسجيل دخول تاني', logout, 'btn-primary']] });
      } else {
        showModal({ title: 'ما اتحفظش', body: explain(e) + ' (تعديلاتك لسه موجودة في الصفحة، ما اتمسحتش.)', actions: [['تمام']] });
      }
    } finally {
      state.busy = false;
      const b2 = byId('saveBtn');
      if (b2) b2.disabled = false;
    }
  }

  /* ----------------------------------------------------------------- boot */
  async function boot() {
    let saved = '';
    let remembered = false;
    try {
      saved = localStorage.getItem(TOKEN_KEY) || '';
      remembered = !!saved;
      if (!saved) saved = sessionStorage.getItem(TOKEN_KEY) || '';
    } catch (e) { /* storage blocked */ }
    if (!saved) return renderLogin();
    renderLoading();
    try {
      await startSession(saved, remembered);
    } catch (e) {
      if (e.status === 401) { try { localStorage.removeItem(TOKEN_KEY); sessionStorage.removeItem(TOKEN_KEY); } catch (x) { /* ignore */ } }
      renderLogin(explain(e));
    }
  }

  boot();
})();
