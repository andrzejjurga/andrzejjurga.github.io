(() => {
  const BUFS = ['about', 'projects', 'experience', 'contact'];
  const buffer = document.getElementById('buffer');
  const slFile = document.getElementById('sl-file');

  // "~" lines after the end of each buffer, like vim
  document.querySelectorAll('.buf').forEach(b => {
    const eob = document.createElement('div');
    eob.className = 'eob';
    eob.setAttribute('aria-hidden', 'true');
    eob.textContent = '~\n~\n~';
    b.appendChild(eob);
  });

  function open(id) {
    if (!BUFS.includes(id)) id = 'about';
    document.querySelectorAll('.buf').forEach(b => b.classList.toggle('active', b.id === id));
    document.querySelectorAll('.tab').forEach(t => {
      if (t.dataset.buf === id) t.setAttribute('aria-current', 'page');
      else t.removeAttribute('aria-current');
    });
    const sec = document.getElementById(id);
    slFile.textContent = sec.dataset.file;
    document.title = id === 'about' ? 'Andrzej Jurga' : `${sec.dataset.file} · Andrzej Jurga`;
    buffer.scrollTop = 0;
  }

  document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', e => {
    e.preventDefault();
    if (location.hash !== '#' + t.dataset.buf) history.pushState(null, '', '#' + t.dataset.buf);
    open(t.dataset.buf);
  }));
  window.addEventListener('popstate', () => open(location.hash.slice(1)));

  // click-to-play video previews
  document.querySelectorAll('.fold-toggle').forEach(btn => btn.addEventListener('click', () => {
    const fold = document.getElementById(btn.getAttribute('aria-controls'));
    const opening = fold.hidden;
    fold.hidden = !opening;
    btn.setAttribute('aria-expanded', String(opening));
    btn.textContent = opening ? '▾ preview' : '▸ preview';
    const v = fold.querySelector('video');
    if (opening) {
      if (!v.src) v.src = v.dataset.src;
      v.play().catch(() => {});
    } else v.pause();
  }));

  open(location.hash.slice(1));
})();
