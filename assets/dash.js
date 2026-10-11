// Runtime mínimo que reproduz a API `dash` usada pelo painel, para rodar como site estático.
(function () {
  const FILES = {
    materias: 'data/materias.json',
    materia_exame: 'data/materia_exame.json',
    topicos: 'data/topicos.json',
    repetecos: 'data/repetecos.json',
    questoes: 'data/questoes.json',
    normas: 'data/normas.json',
    provas: 'data/provas.json',
  };
  const DEFAULTS = { materia: null, topico: null };
  const PALETTE = {
    light: ['#b4532a', '#2f6aa3', '#6f7f3e', '#8a4fa0', '#c08a1e', '#2e8a7a', '#a33b5c', '#5b6472'],
    dark: ['#e07a4f', '#6ea6dc', '#a3b56a', '#b886cc', '#e0b04a', '#5cc2ae', '#d9708f', '#9aa3b0'],
  };
  const dark = window.matchMedia('(prefers-color-scheme: dark)');
  const store = {}, status = {}, calcs = {}, subs = [];
  let params = { ...DEFAULTS };
  let scheduled = false;

  function notify() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      subs.forEach((fn) => { try { fn(); } catch (e) { console.error(e); } });
    });
  }

  function data(id) {
    if (calcs[id]) {
      const c = calcs[id];
      const ins = c.inputs.map((i) => data(i));
      if (ins.some((d) => d.status === 'error')) return { status: 'error', data: [], message: 'Falha numa fonte', refreshing: false, meta: [] };
      if (ins.some((d) => d.status !== 'ok')) return { status: 'loading', data: [], refreshing: false, meta: [] };
      if (!c.cache) c.cache = c.fn(...ins.map((d) => d.data));
      return { status: 'ok', data: c.cache, refreshing: false, meta: [] };
    }
    const st = status[id] || 'loading';
    return { status: st, data: st === 'ok' ? store[id] : [], refreshing: false, meta: [], columns: st === 'ok' && store[id][0] ? Object.keys(store[id][0]) : [] };
  }

  Object.entries(FILES).forEach(([id, url]) => {
    status[id] = 'loading';
    fetch(url)
      .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then((rows) => { store[id] = rows; status[id] = 'ok'; notify(); })
      .catch(() => { status[id] = 'error'; notify(); });
  });

  let lastW = 0;
  new ResizeObserver((es) => {
    const w = Math.round(es[0].contentRect.width);
    if (w !== lastW) { lastW = w; notify(); }
  }).observe(document.getElementById('dash-root'));
  dark.addEventListener('change', notify);

  window.dash = {
    data,
    onData(fn) { subs.push(fn); try { fn(); } catch (e) { console.error(e); } },
    calc(id, def) { calcs[id] = { inputs: def.inputs, fn: def.fn }; },
    loader() {},
    params: () => ({ ...params }),
    setParams(o) { params = { ...params, ...o }; notify(); },
    resetParams() { params = { ...DEFAULTS }; notify(); },
    refresh() {},
    setLink(id) { if (id) history.replaceState(null, '', '#' + id); },
    get colors() { return dark.matches ? PALETTE.dark : PALETTE.light; },
  };
})();
