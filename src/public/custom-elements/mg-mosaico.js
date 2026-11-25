/* =====================================================================
   mg-mosaico.js — v1.3.0 — 25/11/2026
   v1.3.0: config.autoLoad = -1 → carga continua sin tope ni "Ver más";
           config.skip → botón flotante "Ir al final" (pausa la carga hasta volver al mosaico);
           bolitas del visor más grandes: gris oscuro y la activa en cian (colors.dot / colors.dotActive)
   v1.2.0: config.photos (una miniatura por foto), config.shuffle (orden aleatorio),
           config.autoLoad (cargas automáticas al bajar antes de "Ver más"),
           el visor se abre en la foto pulsada
   v1.1.0: "Ver más" añade config.more filas (escritorio 2, móvil 3)
   Mosaico de proyectos tipo Instagram — web pública Marisa Gutiérrez
   ---------------------------------------------------------------------
   Wix:     public/custom-elements/mg-mosaico.js
   Tag:     mg-mosaico   (Custom Element → Choose Source → Velo file)
   Datos:   page code → $w('#mosaico').setAttribute('items',  JSON.stringify([...]))
                        $w('#mosaico').setAttribute('config', JSON.stringify({...}))  (opcional)
   Eventos hacia page code — $w('#mosaico').on('<nombre>', e => e.detail):
            mgOpen  { id, index }   se abre un proyecto
            mgLink  { id, link }    clic en el CTA del visor (solo con config.linkMode = 'event')
   ---------------------------------------------------------------------
   Contrato de cada item (lo construye el page code a partir del CMS):
     id        string    obligatorio
     cover     string    obligatorio · wix:image://… o https://…
     images    string[]  opcional · galería del visor (la portada se antepone si no está)
     title     string
     subtitle  string    tipo de proyecto, ubicación, año…
     text      string    texto plano; línea en blanco = párrafo nuevo
     badge     string    rótulo fijo sobre la miniatura (solo con overlay = true)
     overlay   boolean   muestra badge + título fijos sobre la miniatura
     pinned    boolean   icono de destacado (el orden lo decide el page code)
     link      string    URL de la página del proyecto (CTA del visor)
     alt       string    texto alternativo (por defecto, title)
   ---------------------------------------------------------------------
   URLs de imagen Wix — formato de @wix/image-kit 1.131.0 (engines/transforms.js):
     https://static.wixstatic.com/media/{id}/v1/fill/w_{W},h_{H},al_c,q_{Q},enc_auto/{name}.{ext}
     https://static.wixstatic.com/media/{id}/v1/fit/w_{W},h_{H},q_{Q},enc_auto/{name}.{ext}
   Si una variante redimensionada falla, la imagen cae al original.
   ===================================================================== */
(() => {
  'use strict';

  const TAG = 'mg-mosaico';
  const VERSION = '1.3.0';
  if (typeof window === 'undefined' || !window.customElements || customElements.get(TAG)) return;

  /* ---------- Valores por defecto (todos sobrescribibles con el atributo config) ---------- */
  const DEFAULTS = {
    breakpoints: { wide: 1280, desktop: 900, tablet: 600 },   // ancho del propio elemento, en px
    cols: { wide: 6, desktop: 4, tablet: 3, mobile: 3 },
    rows: { wide: 2, desktop: 3, tablet: 4, mobile: 4 },      // filas visibles al cargar · 0 = todas
    more: { wide: 2, desktop: 2, tablet: 4, mobile: 3 },      // filas que añade cada "Ver más"
    photos: false,                                            // true = una miniatura por cada foto de todos los proyectos
    shuffle: false,                                           // true = orden aleatorio en cada carga
    autoLoad: 0,                                              // cargas automáticas al bajar antes de mostrar "Ver más" · -1 = sin límite
    skip: false,                                              // botón flotante "Ir al final" mientras se recorre el mosaico
    gap:  { wide: 4, desktop: 4, tablet: 3, mobile: 2 },      // px
    ratio: '3/4',                                             // proporción de la miniatura (ancho/alto)
    hover: true,                                              // velo con título al pasar el ratón
    viewer: true,                                             // false = solo emite mgOpen
    linkMode: 'href',                                         // 'href' | 'event'
    quality: 80,
    fontTitle: '',                                            // '' = tipografía heredada del sitio
    fontBody: '',
    colors: {
      placeholder: '#e9e5df',
      ink: '#1c2540',
      muted: '#6b6f7b',
      panel: '#ffffff',
      stage: '#efece8',
      backdrop: 'rgba(18,17,16,.88)',
      overlayInk: '#ffffff',
      border: '#1c2540',
      dot: '#6f6f6f',
      dotActive: '#00aeef'
    },
    labels: {
      more: 'Ver más proyectos',
      open: 'Explorar proyecto',
      close: 'Cerrar',
      prev: 'Imagen anterior',
      next: 'Imagen siguiente',
      prevItem: 'Proyecto anterior',
      nextItem: 'Proyecto siguiente',
      skip: 'Ir al final'
    }
  };

  const WIX_STATIC = 'https://static.wixstatic.com/media/';
  const RE_WIX_URI = /^wix:image:\/\/v1\/([^/#]+)(?:\/[^#]*)?(?:#(.*))?$/;
  const RE_WIX_STATIC = /^https:\/\/static\.wixstatic\.com\/media\/([^/?#]+)$/;
  const TILE_WIDTHS = [240, 360, 480, 640, 800, 1080];
  const VIEW_BOXES = [720, 1080, 1440, 1920];
  const VIEW_SIZES = '(min-width: 900px) min(calc(100vw - 540px), 860px), 100vw';

  const ICON = {
    pin: '<svg viewBox="0 0 24 24" fill="currentColor"><path transform="rotate(45 12 12)" d="M15.5 2.5a1 1 0 0 1 .7 1.7L15 5.4l1.6 5.3 1.7 1.7a1 1 0 0 1-.7 1.7H13v6.2l-1 1.7-1-1.7v-6.2H6.4a1 1 0 0 1-.7-1.7l1.7-1.7L9 5.4 7.8 4.2a1 1 0 0 1 .7-1.7z"/></svg>',
    gallery: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 2h10a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3V5a3 3 0 0 1 3-3zM3 7a1 1 0 0 1 1 1v10a2 2 0 0 0 2 2h10a1 1 0 1 1 0 2H6a4 4 0 0 1-4-4V8a1 1 0 0 1 1-1z"/></svg>',
    left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M15 4l-8 8 8 8"/></svg>',
    right: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4l8 8-8 8"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M5 5l14 14M19 5L5 19"/></svg>',
    down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v15M5 12l7 7 7-7"/></svg>'
  };

  /* ---------- Utilidades ---------- */
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ESC[c]);
  const str = v => (v == null ? '' : String(v)).trim();
  const int = (v, d) => { const n = parseInt(v, 10); return Number.isFinite(n) ? n : d; };
  const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
  const reduced = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  function merge(base, over) {
    const out = {};
    Object.keys(base).forEach(k => { out[k] = isObj(base[k]) ? merge(base[k], null) : base[k]; });
    if (!isObj(over)) return out;
    Object.keys(over).forEach(k => {
      const v = over[k];
      out[k] = isObj(v) && isObj(out[k]) ? merge(out[k], v) : v;
    });
    return out;
  }

  function parseJSON(v, fallback) {
    if (v == null || v === '') return fallback;
    try { return JSON.parse(v); } catch (e) { console.warn(`[${TAG}] JSON no válido`, e); return fallback; }
  }

  function ratioOf(r) {
    const m = String(r).match(/^\s*(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)\s*$/);
    if (m && +m[1] > 0 && +m[2] > 0) return { css: `${+m[1]} / ${+m[2]}`, k: +m[2] / +m[1] };
    return { css: '3 / 4', k: 4 / 3 };
  }

  function safeLink(v) {
    const s = str(v);
    return /^(https?:\/\/|\/)/i.test(s) ? s : '';
  }

  function paragraphs(text) {
    return str(text).split(/\n\s*\n/).map(p => p.trim()).filter(Boolean)
      .map(p => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
  }

  /* ---------- Imágenes ---------- */
  function media(src) {
    const s = str(src);
    if (!s) return null;
    let m = s.match(RE_WIX_URI);
    if (m) {
      const q = new URLSearchParams(m[2] || '');
      return { id: m[1], ow: int(q.get('originWidth'), 0), oh: int(q.get('originHeight'), 0), url: WIX_STATIC + m[1] };
    }
    m = s.match(RE_WIX_STATIC);
    if (m) return { id: m[1], ow: 0, oh: 0, url: s };
    if (/^(https?:\/\/|data:image\/|blob:|\/)/i.test(s)) return { id: '', ow: 0, oh: 0, url: s };
    return null;
  }

  function wixVariant(m, mode, w, h, q) {
    if (!m.id || /\.gif$/i.test(m.id)) return m.url;
    const dot = m.id.lastIndexOf('.');
    const name = dot > 0 ? m.id.slice(0, dot) : m.id;
    const ext = dot > 0 ? m.id.slice(dot + 1) : 'jpg';
    const op = mode === 'fit' ? `fit/w_${w},h_${h}` : `fill/w_${w},h_${h},al_c`;
    return `${m.url}/v1/${op},q_${q},enc_auto/${name}.${ext}`;
  }

  function tileSrc(m, k, q) {
    if (!m.id) return { src: m.url, srcset: '' };
    const maxW = m.ow && m.oh ? Math.max(1, Math.floor(Math.min(m.ow, m.oh / k))) : Infinity;
    const ws = [];
    for (const w of TILE_WIDTHS) {
      const c = Math.min(w, maxW);
      if (!ws.includes(c)) ws.push(c);
      if (c < w) break;
    }
    const set = ws.map(w => `${wixVariant(m, 'fill', w, Math.round(w * k), q)} ${w}w`);
    const d = ws[Math.min(2, ws.length - 1)];
    return { src: wixVariant(m, 'fill', d, Math.round(d * k), q), srcset: set.join(', ') };
  }

  function viewSrc(m, q) {
    if (!m.id) return { src: m.url, srcset: '' };
    const out = [];
    for (const box of VIEW_BOXES) {
      let rw = box, full = false;
      if (m.ow && m.oh) {
        const s = Math.min(box / m.ow, box / m.oh);
        full = s >= 1;
        rw = Math.round(m.ow * Math.min(1, s));
      }
      if (!out.some(x => x.rw === rw)) out.push({ box, rw });
      if (full) break;
    }
    const d = out[Math.min(1, out.length - 1)];
    return {
      src: wixVariant(m, 'fit', d.box, d.box, q),
      srcset: out.map(x => `${wixVariant(m, 'fit', x.box, x.box, q)} ${x.rw}w`).join(', ')
    };
  }

  function normItems(arr) {
    if (!Array.isArray(arr)) return [];
    return arr.map((it, i) => {
      if (!isObj(it)) return null;
      const list = Array.isArray(it.images) ? it.images : [];
      const cover = media(it.cover) || media(list[0]);
      if (!cover) return null;
      const gal = list.map(media).filter(Boolean);
      const key = x => x.id || x.url;
      const images = gal.some(x => key(x) === key(cover)) ? gal : [cover].concat(gal);
      const title = str(it.title);
      return {
        id: str(it.id) || String(i),
        title,
        subtitle: str(it.subtitle),
        text: str(it.text),
        badge: str(it.badge),
        overlay: it.overlay === true,
        pinned: it.pinned === true,
        link: safeLink(it.link),
        alt: str(it.alt) || title,
        cover,
        images
      };
    }).filter(Boolean);
  }

  function onImgLoad(e) {
    const t = e.target;
    if (t && t.tagName === 'IMG') t.classList.add('ok');
  }

  function onImgError(e) {
    const t = e.target;
    if (!t || t.tagName !== 'IMG') return;
    const fb = t.getAttribute('data-fb');
    if (fb && !t.hasAttribute('data-fb-done')) {
      t.setAttribute('data-fb-done', '');
      t.removeAttribute('srcset');
      t.src = fb;
    } else {
      t.classList.add('ok', 'err');
    }
  }

  /* ---------- CSS de la rejilla ---------- */
  const GRID_CSS = `
:host{display:block;width:100%}
:host([hidden]){display:none}
*{box-sizing:border-box}
.mg{--cols:3;--gap:2px;--ratio:3 / 4;font-family:var(--fb,inherit);color:var(--ink)}
.grid{display:grid;grid-template-columns:repeat(var(--cols),minmax(0,1fr));gap:var(--gap)}
.cell{min-width:0}
.tile{position:relative;display:block;width:100%;aspect-ratio:var(--ratio);margin:0;padding:0;border:0;border-radius:0;background:var(--ph);overflow:hidden;cursor:pointer;font:inherit;color:inherit;-webkit-tap-highlight-color:transparent;container-type:inline-size}
.tile img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;opacity:0;transition:opacity .5s ease,transform .7s cubic-bezier(.2,.6,.2,1);-webkit-user-drag:none;user-select:none}
.tile img.ok{opacity:1}
.tile img.err{opacity:0}
.tile:focus-visible{outline:2px solid var(--ink);outline-offset:2px;z-index:4}
.icons{position:absolute;top:8px;right:8px;display:inline-flex;gap:6px;z-index:2;pointer-events:none}
.ic{display:inline-flex;width:18px;height:18px;color:#fff;filter:drop-shadow(0 1px 2px rgba(0,0,0,.45))}
.ic svg{display:block;width:18px;height:18px}
.cap{position:absolute;left:0;right:0;bottom:0;z-index:1;display:flex;flex-direction:column;align-items:center;gap:3px;padding:36px 10px 12px;text-align:center;color:var(--ov);background:linear-gradient(to top,rgba(0,0,0,.5),rgba(0,0,0,0));pointer-events:none}
.cap-k{font-size:11px;font-size:clamp(9px,5.2cqi,12px);letter-spacing:.08em;text-transform:uppercase;line-height:1.2}
.cap-t{font-family:var(--ft,inherit);font-size:13px;font-size:clamp(11px,6.4cqi,16px);line-height:1.2;opacity:.92}
.hov{position:absolute;inset:0;z-index:3;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:14%;text-align:center;color:#fff;background:rgba(14,14,16,.42);opacity:0;transition:opacity .35s ease;pointer-events:none}
.hov-t{font-family:var(--ft,inherit);font-weight:400;font-size:18px;font-size:clamp(14px,9cqi,26px);line-height:1.12;text-wrap:balance}
.hov-s{font-size:11px;font-size:clamp(10px,5cqi,12px);letter-spacing:.08em;text-transform:uppercase;opacity:.88}
@media (hover:hover) and (pointer:fine){
  .tile:hover .hov,.tile:focus-visible .hov{opacity:1}
  .tile:hover img.ok{transform:scale(1.035)}
}
.mg[data-bp="mobile"] .icons{top:6px;right:6px;gap:4px}
.mg[data-bp="mobile"] .ic,.mg[data-bp="mobile"] .ic svg{width:15px;height:15px}
.more{display:flex;justify-content:center;padding-top:clamp(22px,3vw,40px)}
.more[hidden]{display:none}
.more-btn{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:13px 28px;font:inherit;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink);background:transparent;border:1px solid var(--bb);border-radius:4px;cursor:pointer;transition:background .25s ease,color .25s ease}
.more-btn:hover{background:var(--ink);color:var(--inv)}
.more-btn:focus-visible{outline:2px solid var(--ink);outline-offset:3px}
@media (prefers-reduced-motion:reduce){
  .tile img,.hov,.more-btn{transition:none}
  .tile:hover img.ok{transform:none}
}`;

  /* ---------- CSS del visor ---------- */
  const VIEWER_CSS = `
*{box-sizing:border-box;min-width:0}
[hidden]{display:none!important}
.vw{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .28s ease;font-family:var(--fb);color:var(--ink);-webkit-font-smoothing:antialiased}
.vw.on{opacity:1}
.bd{position:absolute;inset:0;background:var(--bdp)}
button{font:inherit;color:inherit;-webkit-tap-highlight-color:transparent}
.panel{position:relative;z-index:1;display:grid;grid-template-columns:minmax(0,1fr) 380px;grid-template-rows:minmax(0,1fr);width:min(1240px,calc(100vw - 160px));height:min(86vh,880px);background:var(--panel);overflow:hidden;transform:translateY(10px) scale(.99);transition:transform .32s cubic-bezier(.2,.7,.2,1)}
.vw.on .panel{transform:none}
.stage{position:relative;background:var(--stage);overflow:hidden}
.track{display:flex;height:100%;overflow-x:auto;overflow-y:hidden;scroll-snap-type:x mandatory;scrollbar-width:none;overscroll-behavior-x:contain}
.track::-webkit-scrollbar{display:none}
.sl{flex:0 0 100%;height:100%;margin:0;scroll-snap-align:center;scroll-snap-stop:always;display:flex;align-items:center;justify-content:center}
.sl img{display:block;width:100%;height:100%;object-fit:contain;opacity:0;transition:opacity .4s ease;-webkit-user-drag:none;user-select:none}
.sl img.ok{opacity:1}
.sl img.err{opacity:0}
.ar{position:absolute;top:50%;z-index:2;width:44px;height:44px;margin-top:-22px;padding:0;border:0;border-radius:50%;background:rgba(255,255,255,.9);color:#1a1a1a;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 2px 12px rgba(0,0,0,.14)}
.ar svg{display:block;width:18px;height:18px}
.al{left:14px}.ax{right:14px}
.dots{position:absolute;left:0;right:0;bottom:16px;z-index:2;display:flex;justify-content:center;gap:9px;pointer-events:none}
.dot{display:block;width:10px;height:10px;border-radius:50%;background:var(--dot);box-shadow:0 0 0 1.5px rgba(255,255,255,.75)}
.dot.on{background:var(--doton)}
.info{display:flex;flex-direction:column;padding:44px 38px 32px;overflow-y:auto}
.sub{margin:0 0 12px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--mut)}
.t{margin:0 0 20px;font-family:var(--ft);font-weight:400;font-size:36px;line-height:1.08;color:var(--ink);text-wrap:balance}
.tx{font-size:15px;line-height:1.7;color:var(--ink)}
.tx p{margin:0 0 .9em}
.foot{margin-top:auto;padding-top:28px;display:flex;flex-direction:column;align-items:flex-start;gap:18px}
.cta{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:13px 26px;border:1px solid var(--bb);border-radius:4px;color:var(--ink);background:transparent;font-size:13px;letter-spacing:.08em;text-transform:uppercase;text-decoration:none;cursor:pointer;transition:background .25s ease,color .25s ease}
.cta:hover{background:var(--ink);color:var(--panel)}
.cnt{margin:0;font-size:12px;letter-spacing:.06em;color:var(--mut);font-variant-numeric:tabular-nums}
.nav{display:none;width:100%;justify-content:space-between;gap:12px;padding-top:6px;border-top:1px solid rgba(0,0,0,.08)}
.nb{display:inline-flex;align-items:center;gap:6px;min-height:44px;padding:10px 0;border:0;background:transparent;color:var(--mut);font-size:12px;letter-spacing:.06em;text-transform:uppercase;cursor:pointer}
.nb svg{display:block;width:14px;height:14px}
.x{position:absolute;top:16px;right:16px;z-index:3;width:44px;height:44px;padding:0;border:0;border-radius:50%;background:transparent;color:#fff;display:inline-flex;align-items:center;justify-content:center;cursor:pointer}
.x svg{display:block;width:24px;height:24px}
.pn{position:absolute;top:50%;z-index:2;width:48px;height:48px;margin-top:-24px;padding:0;border:0;background:transparent;color:#fff;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;opacity:.75;transition:opacity .2s}
.pn:hover{opacity:1}
.pn svg{display:block;width:30px;height:30px}
.pp{left:20px}.px{right:20px}
.ar:focus-visible,.x:focus-visible,.pn:focus-visible,.nb:focus-visible,.cta:focus-visible{outline:2px solid currentColor;outline-offset:3px}
@media (max-width:899px){
  .vw{align-items:stretch}
  .panel{display:block;width:100%;height:100%;overflow-y:auto;overscroll-behavior:contain;transform:translateY(18px)}
  .stage{display:flex;height:auto;aspect-ratio:4 / 5;max-height:72vh}
  .track{flex:1 1 100%;height:auto}
  .ar,.pn{display:none}
  .info{overflow:visible;padding:24px 20px calc(28px + env(safe-area-inset-bottom,0px))}
  .t{font-size:30px}
  .nav{display:flex}
  .x{top:max(10px,env(safe-area-inset-top,0px));right:10px;width:40px;height:40px;background:rgba(20,20,22,.55)}
  .x svg{width:20px;height:20px}
}
@media (prefers-reduced-motion:reduce){
  .vw,.panel,.sl img,.cta,.pn{transition:none}
  .panel{transform:none}
}`;

  /* ---------- CSS del botón "Ir al final" (se monta en document.body) ---------- */
  const SKIP_CSS = `
button{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:12px 20px;border:0;border-radius:999px;background:var(--ink);color:var(--inv);font-family:var(--fb);font-size:12px;font-weight:500;line-height:1;letter-spacing:.08em;text-transform:uppercase;white-space:nowrap;cursor:pointer;box-shadow:0 6px 24px rgba(0,0,0,.22);opacity:0;transform:translateY(12px);transition:opacity .25s ease,transform .25s ease;pointer-events:none;-webkit-tap-highlight-color:transparent}
button.on{opacity:1;transform:none;pointer-events:auto}
button:focus-visible{outline:2px solid var(--ink);outline-offset:3px}
button svg{display:block;width:14px;height:14px}
@media (prefers-reduced-motion:reduce){button{transition:none}}`;

  /* ---------- Visor (se monta en document.body para cubrir toda la pantalla) ---------- */
  class Viewer {
    constructor(owner) {
      this.o = owner;
      this.h = null;
      this.i = -1;
      this.k = 0;
      this.raf = 0;
      this.lock = null;
      this.back = null;
      this.onKey = this.onKey.bind(this);
    }

    build() {
      const h = document.createElement('div');
      h.setAttribute('data-mg-mosaico-viewer', VERSION);
      h.style.cssText = 'position:fixed;inset:0;z-index:2147483000;display:none;';
      const r = h.attachShadow({ mode: 'open' });
      r.innerHTML = `<style>${VIEWER_CSS}</style>
<div class="vw" role="dialog" aria-modal="true">
  <div class="bd" data-a="close"></div>
  <button type="button" class="x" data-a="close">${ICON.close}</button>
  <button type="button" class="pn pp" data-a="pi">${ICON.left}</button>
  <button type="button" class="pn px" data-a="ni">${ICON.right}</button>
  <article class="panel">
    <div class="stage">
      <div class="track"></div>
      <button type="button" class="ar al" data-a="prev">${ICON.left}</button>
      <button type="button" class="ar ax" data-a="next">${ICON.right}</button>
      <div class="dots" aria-hidden="true"></div>
    </div>
    <div class="info">
      <p class="sub"></p>
      <h2 class="t"></h2>
      <div class="tx"></div>
      <div class="foot">
        <a class="cta"></a>
        <p class="cnt"></p>
        <div class="nav">
          <button type="button" class="nb" data-a="pi">${ICON.left}<span></span></button>
          <button type="button" class="nb" data-a="ni"><span></span>${ICON.right}</button>
        </div>
      </div>
    </div>
  </article>
</div>`;
      document.body.appendChild(h);
      this.h = h;
      this.r = r;
      const q = s => r.querySelector(s);
      this.vw = q('.vw');
      this.panel = q('.panel');
      this.track = q('.track');
      this.dots = q('.dots');
      this.al = q('.al');
      this.ax = q('.ax');
      this.sub = q('.sub');
      this.t = q('.t');
      this.tx = q('.tx');
      this.info = q('.info');
      this.cta = q('.cta');
      this.cnt = q('.cnt');
      this.nav = q('.nav');
      this.x = q('.x');

      r.addEventListener('click', e => {
        const b = e.target.closest('[data-a]');
        if (!b) return;
        const a = b.getAttribute('data-a');
        if (a === 'close') this.close();
        else if (a === 'prev') this.go(this.k - 1);
        else if (a === 'next') this.go(this.k + 1);
        else if (a === 'pi') this.step(-1);
        else if (a === 'ni') this.step(1);
      });

      this.cta.addEventListener('click', e => {
        if (this.o._cfg.linkMode !== 'event' || this.i < 0) return;
        e.preventDefault();
        const it = this.o._items[this.i];
        this.close();
        this.o.dispatchEvent(new CustomEvent('mgLink', { detail: { id: it.id, link: it.link } }));
      });

      this.track.addEventListener('scroll', () => {
        cancelAnimationFrame(this.raf);
        this.raf = requestAnimationFrame(() => {
          const w = this.track.clientWidth;
          if (!w || this.i < 0) return;
          const k = Math.round(this.track.scrollLeft / w);
          if (k !== this.k) { this.k = k; this.ui(); }
        });
      }, { passive: true });

      r.addEventListener('load', onImgLoad, true);
      r.addEventListener('error', onImgError, true);
    }

    style() {
      const c = this.o._cfg, C = c.colors, L = c.labels;
      const inherited = getComputedStyle(this.o).fontFamily || 'inherit';
      const body = str(c.fontBody) || inherited;
      const s = this.h.style;
      s.setProperty('--fb', body);
      s.setProperty('--ft', str(c.fontTitle) || body);
      s.setProperty('--ink', C.ink);
      s.setProperty('--mut', C.muted);
      s.setProperty('--panel', C.panel);
      s.setProperty('--stage', C.stage);
      s.setProperty('--bdp', C.backdrop);
      s.setProperty('--bb', C.border);
      s.setProperty('--dot', C.dot);
      s.setProperty('--doton', C.dotActive);
      this.x.setAttribute('aria-label', L.close);
      this.al.setAttribute('aria-label', L.prev);
      this.ax.setAttribute('aria-label', L.next);
      this.r.querySelector('.pp').setAttribute('aria-label', L.prevItem);
      this.r.querySelector('.px').setAttribute('aria-label', L.nextItem);
      const nb = this.r.querySelectorAll('.nb span');
      nb[0].textContent = L.prevItem;
      nb[1].textContent = L.nextItem;
    }

    open(i, from, k) {
      const items = this.o._items;
      if (!items.length) return;
      if (!this.h) this.build();
      this.style();
      const wasOpen = this.i >= 0;
      this.i = ((i % items.length) + items.length) % items.length;
      this.k = Math.max(0, Math.min(int(k, 0), items[this.i].images.length - 1));
      if (!wasOpen) {
        this.back = from || null;
        const de = document.documentElement, b = document.body;
        this.lock = [de.style.overflow, b.style.overflow];
        de.style.overflow = 'hidden';
        b.style.overflow = 'hidden';
        document.addEventListener('keydown', this.onKey, true);
        this.h.style.display = 'block';
      }
      this.fill();
      if (!wasOpen) {
        requestAnimationFrame(() => requestAnimationFrame(() => { if (this.i >= 0) this.vw.classList.add('on'); }));
        this.x.focus({ preventScroll: true });
      }
      const it = items[this.i];
      this.o.dispatchEvent(new CustomEvent('mgOpen', { detail: { id: it.id, index: this.i } }));
    }

    fill() {
      const it = this.o._items[this.i], c = this.o._cfg, L = c.labels, n = it.images.length, k0 = this.k;
      this.vw.setAttribute('aria-label', it.title || L.open);
      this.track.innerHTML = it.images.map((m, k) => {
        const s = viewSrc(m, int(c.quality, 80));
        const alt = it.alt + (n > 1 ? ` (${k + 1}/${n})` : '');
        return `<figure class="sl"><img src="${esc(s.src)}"${s.srcset ? ` srcset="${esc(s.srcset)}" sizes="${VIEW_SIZES}"` : ''} data-fb="${esc(m.url)}" alt="${esc(alt)}" loading="${Math.abs(k - k0) <= 1 ? 'eager' : 'lazy'}" decoding="async" draggable="false"></figure>`;
      }).join('');
      this.track.scrollLeft = k0 * this.track.clientWidth;
      this.track.querySelectorAll('img').forEach(im => { if (im.complete && im.naturalWidth) im.classList.add('ok'); });
      this.sub.textContent = it.subtitle;
      this.sub.hidden = !it.subtitle;
      this.t.textContent = it.title;
      this.t.hidden = !it.title;
      this.tx.innerHTML = paragraphs(it.text);
      this.tx.hidden = !it.text;
      if (it.link) {
        this.cta.setAttribute('href', it.link);
        this.cta.textContent = L.open;
        this.cta.hidden = false;
      } else {
        this.cta.removeAttribute('href');
        this.cta.hidden = true;
      }
      this.dots.innerHTML = n > 1 && n <= 12 ? '<i class="dot"></i>'.repeat(n) : '';
      const many = this.o._items.length > 1;
      this.r.querySelectorAll('.pn').forEach(b => { b.hidden = !many; });
      this.nav.hidden = !many;
      this.info.scrollTop = 0;
      this.panel.scrollTop = 0;
      this.ui();
    }

    ui() {
      const n = this.o._items[this.i].images.length, k = this.k;
      this.cnt.textContent = n > 1 ? `${k + 1} / ${n}` : '';
      this.cnt.hidden = n < 2;
      Array.prototype.forEach.call(this.dots.children, (d, j) => d.classList.toggle('on', j === k));
      this.al.hidden = k <= 0;
      this.ax.hidden = k >= n - 1;
      const nx = this.track.children[k + 1];
      const im = nx && nx.querySelector('img');
      if (im && im.loading === 'lazy') im.loading = 'eager';
    }

    go(k) {
      if (this.i < 0) return false;
      const n = this.o._items[this.i].images.length;
      if (k < 0 || k >= n) return false;
      this.k = k;
      this.track.scrollTo({ left: k * this.track.clientWidth, behavior: reduced() ? 'auto' : 'smooth' });
      this.ui();
      return true;
    }

    step(d) {
      if (this.i < 0 || this.o._items.length < 2) return;
      this.open(this.i + d, this.back);
    }

    onKey(e) {
      if (this.i < 0) return;
      if (e.key === 'Escape') { e.preventDefault(); this.close(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); if (!this.go(this.k + 1)) this.step(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); if (!this.go(this.k - 1)) this.step(-1); }
      else if (e.key === 'Tab') this.trap(e);
    }

    trap(e) {
      const f = Array.prototype.filter.call(this.r.querySelectorAll('button, a[href]'),
        el => !el.hidden && el.getClientRects().length > 0);
      if (!f.length) return;
      e.preventDefault();
      let j = f.indexOf(this.r.activeElement);
      j = e.shiftKey ? (j <= 0 ? f.length - 1 : j - 1) : (j >= f.length - 1 ? 0 : j + 1);
      f[j].focus();
    }

    close() {
      if (this.i < 0) return;
      this.i = -1;
      document.removeEventListener('keydown', this.onKey, true);
      this.vw.classList.remove('on');
      if (this.lock) {
        document.documentElement.style.overflow = this.lock[0];
        document.body.style.overflow = this.lock[1];
        this.lock = null;
      }
      setTimeout(() => {
        if (this.i < 0 && this.h) {
          this.h.style.display = 'none';
          this.track.innerHTML = '';
        }
      }, reduced() ? 0 : 300);
      if (this.back && this.back.isConnected) this.back.focus({ preventScroll: true });
      this.back = null;
    }

    destroy() {
      this.close();
      if (this.h) this.h.remove();
      this.h = null;
    }
  }

  /* ---------- Elemento ---------- */
  class MgMosaico extends HTMLElement {
    static get observedAttributes() { return ['items', 'config']; }

    constructor() {
      super();
      this._items = [];
      this._tiles = [];
      this._autoLeft = 0;
      this._cfg = merge(DEFAULTS, null);
      this._k = 4 / 3;
      this._bp = '';
      this._cols = 0;
      this._shown = 0;
      this._sizes = '33vw';
      this._viewer = null;
      this._onWin = null;
      this._paused = false;
      this._skip = null;
      this._skipBtn = null;
      this._sraf = 0;
      this._onScroll = () => {
        if (this._sraf) return;
        this._sraf = requestAnimationFrame(() => { this._sraf = 0; this._skipUpdate(); });
      };
      const r = this.attachShadow({ mode: 'open' });
      r.innerHTML = `<style>${GRID_CSS}</style><div class="mg"><div class="grid" role="list"></div><div class="sent" aria-hidden="true"></div><div class="more" hidden><button type="button" class="more-btn"></button></div></div>`;
      this._wrap = r.querySelector('.mg');
      this._grid = r.querySelector('.grid');
      this._moreWrap = r.querySelector('.more');
      this._moreBtn = r.querySelector('.more-btn');
      this._sent = r.querySelector('.sent');
      this._grid.addEventListener('click', e => {
        const t = e.target.closest('.tile');
        if (t) this._open(int(t.getAttribute('data-i'), -1), t);
      });
      this._moreBtn.addEventListener('click', () => this._more());
      r.addEventListener('load', onImgLoad, true);
      r.addEventListener('error', onImgError, true);
      this._ro = typeof ResizeObserver === 'function' ? new ResizeObserver(() => this._layout()) : null;
      this._io = typeof IntersectionObserver === 'function' ? new IntersectionObserver(() => this._auto(), { rootMargin: '0px 0px 400px 0px' }) : null;
      this._applyConfig();
    }

    connectedCallback() {
      if (this._io) this._io.observe(this._sent);
      if (this._ro) this._ro.observe(this);
      else if (!this._onWin) {
        this._onWin = () => this._layout();
        window.addEventListener('resize', this._onWin);
      }
      window.addEventListener('scroll', this._onScroll, { passive: true });
      window.addEventListener('resize', this._onScroll);
      this._layout();
      this._onScroll();
    }

    disconnectedCallback() {
      if (this._ro) this._ro.disconnect();
      if (this._io) this._io.disconnect();
      if (this._onWin) { window.removeEventListener('resize', this._onWin); this._onWin = null; }
      if (this._viewer) { this._viewer.destroy(); this._viewer = null; }
      window.removeEventListener('scroll', this._onScroll);
      window.removeEventListener('resize', this._onScroll);
      if (this._sraf) { cancelAnimationFrame(this._sraf); this._sraf = 0; }
      if (this._skip) { this._skip.remove(); this._skip = null; this._skipBtn = null; }
    }

    attributeChangedCallback(name, oldV, newV) {
      if (oldV === newV) return;
      if (name === 'config') {
        this._cfg = merge(DEFAULTS, parseJSON(newV, {}));
        this._applyConfig();
      } else if (name === 'items') {
        this._items = normItems(parseJSON(newV, []));
      }
      if (this._viewer) this._viewer.close();
      this._buildTiles();
      this._reset();
    }

    _buildTiles() {
      const c = this._cfg, t = [];
      this._items.forEach((it, p) => {
        if (c.photos === true) it.images.forEach((m, k) => t.push({ p, k }));
        else t.push({ p, k: -1 });
      });
      if (c.shuffle === true) {
        for (let i = t.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          const x = t[i]; t[i] = t[j]; t[j] = x;
        }
      }
      this._tiles = t;
    }

    _applyConfig() {
      const c = this._cfg, C = c.colors, s = this._wrap.style;
      const r = ratioOf(c.ratio);
      this._k = r.k;
      s.setProperty('--ratio', r.css);
      s.setProperty('--ph', C.placeholder);
      s.setProperty('--ink', C.ink);
      s.setProperty('--inv', C.panel);
      s.setProperty('--ov', C.overlayInk);
      s.setProperty('--bb', C.border);
      if (str(c.fontBody)) s.setProperty('--fb', c.fontBody); else s.removeProperty('--fb');
      if (str(c.fontTitle)) s.setProperty('--ft', c.fontTitle); else s.removeProperty('--ft');
      this._moreBtn.textContent = c.labels.more;
      if (this._skip) this._skipStyle();
    }

    _reset() {
      this._grid.innerHTML = '';
      this._shown = 0;
      this._autoLeft = this._autoBudget();
      this._paused = false;
      this._bp = '';
      this._cols = 0;
      this._layout();
    }

    _layout() {
      const w = this.getBoundingClientRect().width;
      if (!w) return;
      const c = this._cfg, B = c.breakpoints;
      const bp = w >= int(B.wide, 1280) ? 'wide' : w >= int(B.desktop, 900) ? 'desktop' : w >= int(B.tablet, 600) ? 'tablet' : 'mobile';
      const cols = Math.max(1, int(c.cols[bp], 3));
      const gap = Math.max(0, int(c.gap[bp], 2));
      const tw = Math.ceil(((w - gap * (cols - 1)) / cols) / 20) * 20;
      const sizes = `${tw}px`;
      if (sizes !== this._sizes) {
        this._sizes = sizes;
        this._grid.querySelectorAll('img[srcset]').forEach(im => { im.sizes = sizes; });
      }
      if (bp === this._bp && cols === this._cols) return;
      this._bp = bp;
      this._cols = cols;
      this._wrap.style.setProperty('--cols', String(cols));
      this._wrap.style.setProperty('--gap', `${gap}px`);
      this._wrap.setAttribute('data-bp', bp);
      this._fit();
    }

    _fit() {
      const n = this._tiles.length, cols = this._cols;
      const rows = Math.max(0, int(this._cfg.rows[this._bp], 0));
      let show = rows > 0 ? Math.max(this._shown, cols * rows) : n;
      show = Math.min(n, Math.ceil(show / cols) * cols);
      this._shown = show;
      this._sync();
    }

    _more(auto) {
      const rows = Math.max(1, int(this._cfg.more[this._bp], 2));
      this._shown = Math.min(this._tiles.length, this._shown + this._cols * rows);
      if (!auto) this._autoLeft = this._autoBudget();
      this._sync();
      if (auto && this._autoLeft > 0) requestAnimationFrame(() => this._auto());
    }

    _autoBudget() {
      const a = int(this._cfg.autoLoad, 0);
      if (!this._io) return 0;
      return a < 0 ? Infinity : a;
    }

    _auto() {
      const top = this._sent.getBoundingClientRect().top;
      if (this._paused) {
        if (top > window.innerHeight + 400) this._paused = false;
        return;
      }
      if (this._autoLeft <= 0 || !this._cols || this._shown >= this._tiles.length) return;
      if (top > window.innerHeight + 400) return;
      this._autoLeft--;
      this._more(true);
    }

    _skipUpdate() {
      let on = false;
      if (this._cfg.skip === true && this._tiles.length > 0) {
        const r = this.getBoundingClientRect();
        on = r.top < 0 && r.bottom > window.innerHeight + 40;
      }
      if (!on && !this._skip) return;
      if (!this._skip) this._skipBuild();
      this._skipBtn.classList.toggle('on', on);
      this._skipBtn.tabIndex = on ? 0 : -1;
    }

    _skipBuild() {
      const h = document.createElement('div');
      h.setAttribute('data-mg-mosaico-skip', VERSION);
      h.style.cssText = 'position:fixed;left:50%;bottom:calc(20px + env(safe-area-inset-bottom, 0px));transform:translateX(-50%);z-index:2147482000;pointer-events:none;';
      const r = h.attachShadow({ mode: 'open' });
      r.innerHTML = `<style>${SKIP_CSS}</style><button type="button" tabindex="-1"><span></span>${ICON.down}</button>`;
      document.body.appendChild(h);
      this._skip = h;
      this._skipBtn = r.querySelector('button');
      this._skipBtn.addEventListener('click', () => this._skipGo());
      this._skipStyle();
    }

    _skipStyle() {
      const c = this._cfg, s = this._skip.style;
      s.setProperty('--ink', c.colors.ink);
      s.setProperty('--inv', c.colors.panel);
      s.setProperty('--fb', str(c.fontBody) || getComputedStyle(this).fontFamily || 'inherit');
      this._skipBtn.querySelector('span').textContent = c.labels.skip;
    }

    _skipGo() {
      this._paused = true;
      const y = this.getBoundingClientRect().bottom + window.pageYOffset;
      window.scrollTo({ top: y, behavior: reduced() ? 'auto' : 'smooth' });
    }

    _sync() {
      const g = this._grid, have = g.children.length, n = this._shown;
      if (have < n) {
        g.insertAdjacentHTML('beforeend', this._tiles.slice(have, n).map((t, j) => this._tile(t, have + j)).join(''));
        for (let j = have; j < n; j++) {
          const im = g.children[j].querySelector('img');
          if (im && im.complete && im.naturalWidth) im.classList.add('ok');
        }
      } else {
        while (g.children.length > n) g.lastElementChild.remove();
      }
      this._moreWrap.hidden = n >= this._tiles.length || this._autoLeft > 0;
      if (this._cfg.skip === true) this._onScroll();
    }

    _tile(t, i) {
      const c = this._cfg, it = this._items[t.p], photo = t.k >= 0;
      const m = photo ? it.images[t.k] : it.cover;
      const s = tileSrc(m, this._k, int(c.quality, 80));
      const icons = photo ? '' : (it.pinned ? `<span class="ic">${ICON.pin}</span>` : '')
        + (it.images.length > 1 ? `<span class="ic">${ICON.gallery}</span>` : '');
      const label = [it.title, it.subtitle].filter(Boolean).join(' · ') || c.labels.open;
      const cap = !photo && it.overlay && (it.badge || it.title)
        ? `<span class="cap" aria-hidden="true">${it.badge ? `<span class="cap-k">${esc(it.badge)}</span>` : ''}${it.title ? `<span class="cap-t">${esc(it.title)}</span>` : ''}</span>`
        : '';
      const hov = c.hover !== false && (it.title || it.subtitle)
        ? `<span class="hov" aria-hidden="true">${it.title ? `<span class="hov-t">${esc(it.title)}</span>` : ''}${it.subtitle ? `<span class="hov-s">${esc(it.subtitle)}</span>` : ''}</span>`
        : '';
      return `<div class="cell" role="listitem"><button type="button" class="tile" data-i="${i}" aria-label="${esc(label)}">`
        + `<img src="${esc(s.src)}"${s.srcset ? ` srcset="${esc(s.srcset)}" sizes="${this._sizes}"` : ''} data-fb="${esc(m.url)}" alt="${esc(it.alt)}" loading="lazy" decoding="async" draggable="false">`
        + (icons ? `<span class="icons" aria-hidden="true">${icons}</span>` : '')
        + cap + hov
        + `</button></div>`;
    }

    _open(i, from) {
      const t = this._tiles[i];
      if (!t) return;
      if (this._cfg.viewer === false) {
        this.dispatchEvent(new CustomEvent('mgOpen', { detail: { id: this._items[t.p].id, index: t.p } }));
        return;
      }
      if (!this._viewer) this._viewer = new Viewer(this);
      this._viewer.open(t.p, from, Math.max(0, t.k));
    }
  }

  customElements.define(TAG, MgMosaico);
})();
