// =====================================================
// PAGE CODE — Inicio v1.1.0 — 25/11/2026
// v1.1.0: breakpoints del mosaico alineados con Studio (1001 / 751)
// Mosaico de trabajos → custom element mg-mosaico v1.1.0
// -----------------------------------------------------
// Archivo:   src/pages/Inicio.c1dmp.js
// Elemento:  Custom Element · ID: mosaico · Tag: mg-mosaico
//            Source: Velo file → public/custom-elements/mg-mosaico.js
// Datos:     CMS "Trabajos Web v2" (Import1)
//            proyecto, subCategoria, ubicacion, descripcion,
//            imagenDePortada, galeria1, orden, visible,
//            enPortada, trabajosItem
// =====================================================

import wixData from 'wix-data';
import wixLocationFrontend from 'wix-location-frontend';
import wixWindowFrontend from 'wix-window-frontend';

const TAG = '[Inicio v1.1.0]';
const EL = '#mosaico';
const COL_TRABAJOS = 'Import1';

const LABELS = {
  es: {
    more: 'Ver más proyectos',
    open: 'Explorar proyecto',
    close: 'Cerrar',
    prev: 'Imagen anterior',
    next: 'Imagen siguiente',
    prevItem: 'Proyecto anterior',
    nextItem: 'Proyecto siguiente'
  },
  en: {
    more: 'More projects',
    open: 'Explore project',
    close: 'Close',
    prev: 'Previous image',
    next: 'Next image',
    prevItem: 'Previous project',
    nextItem: 'Next project'
  }
};

$w.onReady(async function () {
  const el = $w(EL);
  const lang = wixWindowFrontend.multilingual.currentLanguage || 'es';

  el.setAttribute('config', JSON.stringify({
    linkMode: 'event',
    breakpoints: { wide: 1001, desktop: 751, tablet: 751 },
    labels: LABELS[lang] || LABELS.es
  }));

  el.on('mgLink', (event) => {
    const link = event.detail && event.detail.link;
    if (link) wixLocationFrontend.to(link);
  });

  try {
    const res = await wixData.query(COL_TRABAJOS)
      .eq('visible', true)
      .limit(1000)
      .find();
    const items = ordenar(res.items).map(aItem).filter(Boolean);
    el.setAttribute('items', JSON.stringify(items));
    el.seoMarkup = seo(items);
  } catch (err) {
    console.error(TAG, 'Error cargando trabajos:', err);
  }
});

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function limpio(v) {
  return (v === undefined || v === null) ? '' : String(v).trim();
}

// enPortada primero → orden numérico ascendente → orden de la consulta
function ordenar(rows) {
  return rows
    .map((r, i) => ({ r, i }))
    .sort((a, b) => {
      const pa = a.r.enPortada === true ? 0 : 1;
      const pb = b.r.enPortada === true ? 0 : 1;
      if (pa !== pb) return pa - pb;
      const oa = typeof a.r.orden === 'number' ? a.r.orden : Infinity;
      const ob = typeof b.r.orden === 'number' ? b.r.orden : Infinity;
      if (oa !== ob) return oa < ob ? -1 : 1;
      return a.i - b.i;
    })
    .map(x => x.r);
}

function aItem(r) {
  const galeria = Array.isArray(r.galeria1)
    ? r.galeria1
      .filter(g => g && g.type === 'image' && typeof g.src === 'string' && g.src)
      .map(g => g.src)
    : [];
  const cover = r.imagenDePortada || galeria[0];
  if (!cover) return null;
  const proyecto = limpio(r.proyecto);
  return {
    id: r._id,
    title: proyecto,
    subtitle: [limpio(r.subCategoria), limpio(r.ubicacion)].filter(Boolean).join(' · '),
    text: limpio(r.descripcion),
    cover,
    images: galeria,
    pinned: r.enPortada === true,
    link: limpio(r.trabajosItem),
    alt: proyecto
  };
}

function esc(v) {
  return String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function seo(items) {
  return '<ul>' + items.map(it => {
    const name = it.link ? `<a href="${esc(it.link)}">${esc(it.title)}</a>` : esc(it.title);
    return `<li>${name}${it.subtitle ? ' — ' + esc(it.subtitle) : ''}</li>`;
  }).join('') + '</ul>';
}
