(() => {
  const BUFS = ['about', 'projects', 'experience', 'contact'];
  const ALL = [...BUFS, 'help'];
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  const buffer = $('#buffer');
  const form = $('#cmd-form');
  const input = $('#cmd-input');
  const msg = $('#cmd-msg');
  const sl = { mode: $('#sl-mode'), file: $('#sl-file'), ft: $('#sl-ft'), pct: $('#sl-pct'), pos: $('#sl-pos') };
  const defaultMsg = msg.innerHTML;

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
  };

  let current = null;
  let rnu = store.get('rnu') === '1';
  const cursor = {}; // per-buffer cursor index

  // end-of-buffer tildes
  $$('.buf').forEach(b => {
    const eob = document.createElement('div');
    eob.className = 'eob';
    eob.setAttribute('aria-hidden', 'true');
    eob.textContent = '~\n~\n~';
    eob.style.whiteSpace = 'pre';
    b.appendChild(eob);
  });

  const lines = () => current ? $$('.l', current).filter(l => l.offsetParent !== null) : [];

  function render() {
    const ls = lines();
    if (!ls.length) return;
    const c = Math.min(cursor[current.id] || 0, ls.length - 1);
    cursor[current.id] = c;
    ls.forEach((l, i) => {
      l.classList.toggle('cur', i === c);
      l.dataset.ln = rnu && i !== c ? Math.abs(i - c) : i + 1;
    });
    const pct = ls.length <= 1 ? 'All' : c === 0 ? 'Top' : c === ls.length - 1 ? 'Bot' : Math.round((c / (ls.length - 1)) * 100) + '%';
    sl.pct.textContent = pct;
    sl.pos.textContent = `${c + 1}:1`;
  }

  function moveTo(i, scroll = true) {
    const ls = lines();
    if (!ls.length) return;
    cursor[current.id] = Math.max(0, Math.min(i, ls.length - 1));
    render();
    if (scroll) ls[cursor[current.id]].scrollIntoView({ block: 'nearest' });
  }

  function open(id, { push = true } = {}) {
    if (!ALL.includes(id)) id = 'about';
    const sec = document.getElementById(id);
    if (current) current.classList.remove('active');
    current = sec;
    sec.classList.add('active');
    $$('[data-buf]').forEach(a => {
      if (a.dataset.buf === id) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    sl.file.textContent = sec.dataset.file;
    sl.ft.textContent = sec.dataset.ft;
    document.title = id === 'about' ? 'Andrzej Jurga' : `${sec.dataset.file} · Andrzej Jurga`;
    if (push && location.hash !== '#' + id) history.pushState(null, '', '#' + id);
    buffer.scrollTop = 0;
    render();
    const ls = lines();
    if (ls[cursor[id] || 0]) ls[cursor[id] || 0].scrollIntoView({ block: 'nearest' });
  }

  function cycle(d) {
    const i = BUFS.indexOf(current.id);
    open(BUFS[((i < 0 ? 0 : i) + d + BUFS.length) % BUFS.length]);
  }

  function say(text, cls = '') {
    msg.textContent = text;
    msg.className = 'cmd-msg' + (cls ? ' ' + cls : '');
  }

  function setTheme(t) {
    if (t === 'latte') document.documentElement.dataset.theme = 'latte';
    else delete document.documentElement.dataset.theme;
    $('meta[name="theme-color"]').content = t === 'latte' ? '#eff1f5' : '#1e1e2e';
    store.set('theme', t);
  }

  function toggleFold(btn) {
    const fold = document.getElementById(btn.getAttribute('aria-controls'));
    const opening = fold.hidden;
    fold.hidden = !opening;
    btn.setAttribute('aria-expanded', String(opening));
    btn.textContent = opening ? '▾ preview' : '▸ preview';
    const v = $('video', fold);
    if (v) {
      if (opening) {
        if (!v.src) v.src = v.dataset.src;
        v.play().catch(() => {});
      } else v.pause();
    }
    render();
  }

  // ---------- command line ----------
  function openCmd(prefill = '') {
    form.hidden = false;
    input.value = prefill;
    sl.mode.textContent = 'COMMAND';
    sl.mode.classList.add('cmd');
    input.focus();
  }
  function closeCmd() {
    form.hidden = true;
    sl.mode.textContent = 'NORMAL';
    sl.mode.classList.remove('cmd');
    buffer.focus({ preventScroll: true });
  }

  const alias = { a: 'about', p: 'projects', e: 'experience', exp: 'experience', c: 'contact', h: 'help' };
  function resolveBuf(name) {
    name = (name || '').toLowerCase().replace(/\.(md|txt)$/, '').replace(/^.*\//, '');
    if (alias[name]) return alias[name];
    return ALL.find(b => b.startsWith(name)) || null;
  }

  function run(raw) {
    const cmd = raw.trim().replace(/^:/, '');
    if (!cmd) return say('');
    const [head, ...rest] = cmd.split(/\s+/);
    const arg = rest.join(' ');

    if (/^\d+$/.test(cmd)) { moveTo(parseInt(cmd, 10) - 1); return say(''); }
    switch (head) {
      case 'e': case 'edit': case 'b': case 'buffer': {
        if (/^\d+$/.test(arg) && BUFS[arg - 1]) { open(BUFS[arg - 1]); return say(''); }
        const id = resolveBuf(arg);
        if (!id) return say(`E94: No matching buffer for ${arg || '""'}`, 'err');
        open(id); return say(`"${document.getElementById(id).dataset.file}" ${lines().length}L`);
      }
      case 'bn': case 'bnext': cycle(1); return say('');
      case 'bp': case 'bprev': case 'bprevious': cycle(-1); return say('');
      case 'h': case 'help': open('help'); return say('"help.txt" [readonly]');
      case 'colo': case 'colorscheme': {
        const t = /latte/i.test(arg) ? 'latte' : /mocha/i.test(arg) ? 'mocha' : null;
        if (!arg) return say(document.documentElement.dataset.theme === 'latte' ? 'catppuccin-latte' : 'catppuccin-mocha');
        if (!t) return say(`E185: Cannot find color scheme '${arg}'`, 'err');
        setTheme(t); return say(`catppuccin-${t}`, 'ok');
      }
      case 'set': case 'se': {
        if (/^(rnu|relativenumber)$/.test(arg)) rnu = true;
        else if (/^(nornu|norelativenumber)$/.test(arg)) rnu = false;
        else if (/^(rnu|relativenumber)!$/.test(arg)) rnu = !rnu;
        else return say(`E518: Unknown option: ${arg}`, 'err');
        store.set('rnu', rnu ? '1' : '0'); render(); return say('');
      }
      case 'q': case 'q!': case 'qa': case 'qa!': case 'wq': case 'x': case 'quit':
        return say('E37: No write since last change. Stick around a little longer :)', 'err');
      case 'w': case 'write':
        return say(`"${current.dataset.file}" [readonly] — nothing to save here`, 'err');
      case 'cv': case 'resume':
        open('experience'); return say('"experience.md" — the full CV is available on request');
      case 'contact': case 'mail':
        open('contact'); return say('');
      default:
        return say(`E492: Not an editor command: ${cmd}`, 'err');
    }
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    const v = input.value;
    closeCmd();
    run(v);
  });
  input.addEventListener('keydown', e => {
    if (e.key === 'Escape' || (e.key === 'Backspace' && !input.value)) { e.preventDefault(); closeCmd(); say(''); }
  });
  input.addEventListener('blur', () => { if (!form.hidden) setTimeout(() => { if (document.activeElement !== input) { closeCmd(); } }, 100); });
  msg.addEventListener('click', () => openCmd());

  // ---------- normal mode keys ----------
  let pending = '';
  document.addEventListener('keydown', e => {
    if (e.target === input) return;
    if (e.metaKey || e.altKey) return;
    const k = e.key;
    const ls = lines();
    const c = cursor[current.id] || 0;
    const half = Math.max(1, Math.floor(buffer.clientHeight / 2 / 23));

    if (e.ctrlKey) {
      if (k === 'd') { e.preventDefault(); moveTo(c + half); }
      else if (k === 'u') { e.preventDefault(); moveTo(c - half); }
      return;
    }
    if (k === 'g') {
      if (pending === 'g') { moveTo(0); pending = ''; } else { pending = 'g'; setTimeout(() => { pending = ''; }, 600); }
      return;
    }
    pending = '';
    switch (k) {
      case 'j': case 'ArrowDown': e.preventDefault(); moveTo(c + 1); break;
      case 'k': case 'ArrowUp': e.preventDefault(); moveTo(c - 1); break;
      case 'G': case 'End': e.preventDefault(); moveTo(ls.length - 1); break;
      case 'Home': e.preventDefault(); moveTo(0); break;
      case 'H': cycle(-1); break;
      case 'L': cycle(1); break;
      case ':': e.preventDefault(); openCmd(); break;
      case '?': open('help'); break;
      case 'Escape': say(''); msg.innerHTML = defaultMsg; break;
      case 'Enter': {
        const line = ls[c];
        if (!line) break;
        if (document.activeElement && document.activeElement.closest && document.activeElement.closest('a, button') && document.activeElement !== buffer) break;
        const t = line.querySelector('.fold-toggle') || line.querySelector('a');
        if (t) { e.preventDefault(); t.click(); }
        break;
      }
      default:
        if (/^[1-4]$/.test(k)) open(BUFS[k - 1]);
    }
  });

  // click a line to move the cursor there
  buffer.addEventListener('click', e => {
    const l = e.target.closest('.l');
    if (!l) return;
    const i = lines().indexOf(l);
    if (i >= 0) moveTo(i, false);
  });

  $$('.fold-toggle').forEach(b => b.addEventListener('click', () => toggleFold(b)));

  $$('[data-buf]').forEach(a => a.addEventListener('click', e => {
    e.preventDefault();
    open(a.dataset.buf);
  }));

  window.addEventListener('popstate', () => open(location.hash.slice(1), { push: false }));

  open(location.hash.slice(1) || 'about', { push: false });
})();
