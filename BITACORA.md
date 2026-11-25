# Bitácora — web pública Marisa Gutiérrez

Sitio: marisagutierrez.com · Wix Studio · Velo · Premium + dominio propio
Site ID: `72a3e404-4b8e-4e0a-9203-6ed1d9e1b563`
Repo: `Jal2026/marisanueva` (los cambios se suben directamente a `main`)

---

## 25/11/2026 — Mosaico de trabajos tipo Instagram (home, sección 2)

### Decisión técnica
Se usa un **Custom Element**, no un iframe HTML:
- En la web publicada se renderiza dentro de la página: la altura crece con "Ver más" y el visor ocupa toda la pantalla.
- Requiere Premium, dominio conectado y no mostrar anuncios. El sitio los cumple.
- En el editor y en la vista previa Wix lo renderiza dentro de un iframe, así que se comprueba en la web publicada.

### Archivos
| Archivo | Versión actual |
|---|---|
| `src/public/custom-elements/mg-mosaico.js` | v1.1.0 |
| `src/pages/Inicio.c1dmp.js` | v1.4.0 |

### Montaje en Studio
- Custom Element → Choose Source → **Velo file** → `mg-mosaico.js`
- Tag Name: **`mg-mosaico`**
- ID: **`mosaico`**
- Ancho: Stretch (100 % de la sección)

### Datos (CMS)
Colección **"Trabajos Web v2"** (`Import1`).

| Campo CMS | Uso en el mosaico |
|---|---|
| `visible` | filtro: solo `true` |
| `enPortada` | primero en el orden + icono de destacado |
| `orden` | orden ascendente (los vacíos van al final) |
| `proyecto` | título y texto alternativo |
| `subCategoria` + `ubicacion` | subtítulo ("Oficina · Madrid") |
| `descripcion` | texto del visor |
| `imagenDePortada` | miniatura (si falta, se usa la 1ª de la galería) |
| `galeria1` | galería del visor (solo elementos `type: 'image'`) |

`trabajosItem` ya no se usa (v1.4.0).

### Comportamiento actual por punto de corte de Studio
| Punto de corte | Columnas | Filas al cargar | "Ver más" añade |
|---|---|---|---|
| Escritorio (≥ 1001 px) | 6 | 6 (36 imágenes) | 2 filas (12) |
| Tablet (751–1000 px) | 4 | 3 (12 imágenes) | 2 filas (8) |
| Móvil (≤ 750 px) | 3 | 9 (27 imágenes) | 3 filas (9) |

Miniaturas en proporción 3:4. Separación entre imágenes: 4 px en escritorio y tablet, 2 px en móvil.

### Altura del Custom Element (carga inicial, medida)
| Punto de corte | Ancho | Alto |
|---|---|---|
| Escritorio | 1440 px | 1997 px |
| Tablet | 1000 px | 1070 px |
| Móvil | 390 px | 1626 px |

Con otro ancho de lienzo, la altura cambia en proporción, porque las miniaturas mantienen su proporción 3:4.

### Funciones del widget
- Iconos en la miniatura: destacado (`enPortada`) y galería (más de una imagen).
- En escritorio, al pasar el ratón: velo con título y subtítulo.
- Visor a pantalla completa: en escritorio, foto a la izquierda y texto a la derecha; en móvil, deslizamiento. Se maneja con flechas, teclado (← → Esc) y navegación entre proyectos. Bloquea el scroll de fondo.
- Imágenes servidas por Wix en el tamaño justo (`srcset`) y con carga diferida. El formato de URL se tomó del código de `@wix/image-kit` 1.131.0; si una variante redimensionada falla, se carga la original.
- Textos de la interfaz en español e inglés, según el idioma activo (Wix Multilingual).
- `seoMarkup`: lista de proyectos para buscadores.

### Historial de cambios
| Commit | Cambio |
|---|---|
| `182d6f3` | mg-mosaico v1.0.0 + Inicio v1.0.0 |
| `1c87de5` | mg-mosaico v1.1.0: "Ver más" añade 2 filas en escritorio y 3 en móvil |
| `45bd915` | Inicio v1.1.0: puntos de corte del mosaico alineados con Studio (1001 / 751) |
| `de3ffb0` | Inicio v1.2.0: filas al cargar → escritorio 4, móvil 7 |
| `d6c9617` | Inicio v1.3.0: filas al cargar → escritorio 6, móvil 9 |
| `fb206ec` | Inicio v1.4.0: quitado el botón "Explorar proyecto" del visor |

### Notas
- **v1.1.0 del widget:** el cambio del paso de "Ver más" salió de una mala interpretación de la petición, que se refería a las filas al cargar. Se dejó como está: la reversión se interrumpió a petición de Jal.
- **Inicio v1.4.0:** la escucha del evento `mgLink` y `linkMode: 'event'` siguen en el código, pero ya no tienen efecto porque no se envía ningún enlace.
- **Página de prueba (v1.0.0, privada):** https://claude.ai/artifact/Cnr3YgbUD5UtCR12X3Gr5F
