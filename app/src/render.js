"use strict";
/* Sunset Cover Studio — cover renderer.
   Draws a GTA-style multi-panel poster on a canvas: diagonal panels, a
   sunset or neon colour grade, bold poster lettering with a hard shadow,
   halftone dots, a vignette and film grain. Pure canvas, no libraries. */

const COVER_SIZES = {
  square: { w: 1080, h: 1080, label: "Square · 1080 × 1080" },
  portrait: { w: 1080, h: 1350, label: "Portrait · 1080 × 1350" },
  wide: { w: 1920, h: 1080, label: "Wide · 1920 × 1080" },
};

const COVER_GRADES = {
  sunset: { filter: "saturate(1.28) contrast(1.08) brightness(1.02)", label: "Sunset" },
  neon: { filter: "saturate(1.40) contrast(1.14) brightness(0.98)", label: "Neon" },
  noir: { filter: "grayscale(1) contrast(1.28) brightness(1.06)", label: "Noir" },
};

/* Small seeded PRNG so the film grain is identical on every render. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Diagonal panel polygons for a layout. Returns one polygon per panel,
   each a list of [x, y] corners, plus the slanted cut lines between them. */
function coverPanelPolygons(layout, w, h) {
  const slant = Math.round(h * 0.10);
  if (layout === "solo") {
    return { polys: [[[0, 0], [w, 0], [w, h], [0, h]]], cuts: [] };
  }
  if (layout === "duo") {
    const x1 = w / 2;
    return {
      polys: [
        [[0, 0], [x1 + slant, 0], [x1 - slant, h], [0, h]],
        [[x1 + slant, 0], [w, 0], [w, h], [x1 - slant, h]],
      ],
      cuts: [[[x1 + slant, 0], [x1 - slant, h]]],
    };
  }
  const x1 = w / 3, x2 = (2 * w) / 3;
  return {
    polys: [
      [[0, 0], [x1 + slant, 0], [x1 - slant, h], [0, h]],
      [[x1 + slant, 0], [x2 + slant, 0], [x2 - slant, h], [x1 - slant, h]],
      [[x2 + slant, 0], [w, 0], [w, h], [x2 - slant, h]],
    ],
    cuts: [
      [[x1 + slant, 0], [x1 - slant, h]],
      [[x2 + slant, 0], [x2 - slant, h]],
    ],
  };
}

function panelBounds(poly) {
  const xs = poly.map((p) => p[0]);
  const ys = poly.map((p) => p[1]);
  const x = Math.min.apply(null, xs), y = Math.min.apply(null, ys);
  return { x, y, w: Math.max.apply(null, xs) - x, h: Math.max.apply(null, ys) - y };
}

function pointInPanel(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1];
    const xj = poly[j][0], yj = poly[j][1];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/* Draw one photo into a panel: cover-fit into the panel's bounding box,
   scaled by zoom and shifted by ox/oy (fractions of the panel size). */
function drawPhotoInPanel(ctx, img, poly, zoom, ox, oy) {
  const b = panelBounds(poly);
  ctx.save();
  ctx.beginPath();
  poly.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
  ctx.clip();
  const scale = Math.max(b.w / img.width, b.h / img.height) * zoom;
  const dw = img.width * scale, dh = img.height * scale;
  const cx = b.x + b.w / 2 + ox * b.w, cy = b.y + b.h / 2 + oy * b.h;
  ctx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh);
  ctx.restore();
}

/* Empty panel placeholder: dark fill, dashed edge and a short hint. */
function drawEmptyPanel(ctx, poly, index, w) {
  const b = panelBounds(poly);
  ctx.save();
  ctx.beginPath();
  poly.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = "#171226";
  ctx.fillRect(b.x, b.y, b.w, b.h);
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = Math.max(2, w * 0.002);
  ctx.setLineDash([14, 10]);
  ctx.strokeRect(b.x + 14, b.y + 14, b.w - 28, b.h - 28);
  ctx.setLineDash([]);
  ctx.fillStyle = "rgba(244,238,252,0.75)";
  ctx.font = `700 ${Math.round(w * 0.02)}px "Segoe UI", Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`PANEL ${index + 1} — LOAD A PHOTO`, b.x + b.w / 2, b.y + b.h / 2);
  ctx.restore();
}

/* Colour grade over the whole cover, drawn after the photos. */
function drawCoverGrade(ctx, w, h, grade) {
  ctx.save();
  if (grade === "sunset") {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "rgba(255,120,40,0.16)");
    g.addColorStop(0.55, "rgba(255,60,120,0.10)");
    g.addColorStop(1, "rgba(120,20,90,0.18)");
    ctx.globalCompositeOperation = "overlay";
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "soft-light";
    ctx.fillStyle = "rgba(255,150,60,0.10)";
    ctx.fillRect(0, 0, w, h);
  } else if (grade === "neon") {
    const c = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(w, h) * 0.75);
    c.addColorStop(0, "rgba(34,211,238,0.22)");
    c.addColorStop(1, "rgba(34,211,238,0)");
    ctx.globalCompositeOperation = "soft-light";
    ctx.fillStyle = c;
    ctx.fillRect(0, 0, w, h);
    const m = ctx.createRadialGradient(w, h, 0, w, h, Math.max(w, h) * 0.75);
    m.addColorStop(0, "rgba(255,46,136,0.24)");
    m.addColorStop(1, "rgba(255,46,136,0)");
    ctx.fillStyle = m;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "overlay";
    ctx.fillStyle = "rgba(20,10,60,0.12)";
    ctx.fillRect(0, 0, w, h);
  } else {
    ctx.globalCompositeOperation = "soft-light";
    ctx.fillStyle = "rgba(255,205,150,0.10)";
    ctx.fillRect(0, 0, w, h);
  }
  ctx.restore();
}

/* White divider lines along the panel cuts, with a dark edge underneath. */
function drawPanelDividers(ctx, cuts, w) {
  const lw = Math.max(4, w * 0.004);
  for (const [a, b] of cuts) {
    ctx.save();
    ctx.lineCap = "round";
    ctx.strokeStyle = "rgba(8,4,18,0.85)";
    ctx.lineWidth = lw + 3;
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = lw;
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    ctx.restore();
  }
}

function drawCoverFrame(ctx, w, h) {
  const lw = Math.max(5, w * 0.006);
  ctx.save();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = lw;
  ctx.strokeRect(lw / 2, lw / 2, w - lw, h - lw);
  ctx.restore();
}

/* Halftone dots across the top of the cover. */
function drawHalftoneDots(ctx, w, h) {
  const gap = Math.max(10, w * 0.014);
  const r = Math.max(1.5, w * 0.0016);
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.10)";
  for (let y = gap / 2; y < h * 0.30; y += gap) {
    const row = Math.round(y / gap);
    for (let x = gap / 2 + (row % 2 ? gap / 2 : 0); x < w; x += gap) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/* Bold poster title with a hard pink offset shadow and a dark outline,
   plus a tracked tagline above it. Wraps to at most two lines. */
function drawPosterTitle(ctx, w, h, caption, tagline, opts) {
  const pad = w * 0.05;
  const base = w * 0.115 * (opts.captionScale || 1);
  const fontFor = (size) => `900 ${Math.round(size)}px "Arial Black", "Helvetica Neue", Impact, sans-serif`;
  const maxW = w - pad * 2;
  const words = (caption || "UNTITLED").toUpperCase().split(/\s+/).filter(Boolean);
  let size = base, lines = [];
  while (size > base * 0.55) {
    ctx.font = fontFor(size);
    lines = [];
    let line = "";
    for (const word of words) {
      const next = line ? line + " " + word : word;
      if (ctx.measureText(next).width <= maxW || !line) line = next;
      else { lines.push(line); line = word; }
    }
    if (line) lines.push(line);
    if (lines.length <= 2) break;
    size *= 0.9;
  }
  const lineH = size * 1.02;
  const blockH = lines.length * lineH;
  const anchorX = pad, anchorY = h - pad * 1.15 - blockH + size * 0.82;
  ctx.save();
  ctx.translate(anchorX, anchorY);
  if (opts.tilt !== false) ctx.rotate(-0.035);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.lineJoin = "round";
  ctx.font = fontFor(size);
  // tagline, letterspaced by hand, above the title
  if (tagline) {
    const tag = tagline.toUpperCase().split("").join("  ");
    ctx.font = `700 ${Math.round(size * 0.20)}px "Segoe UI", Arial, sans-serif`;
    ctx.fillStyle = "#ffd319";
    ctx.fillText(tag, 0, -size * 1.02);
    ctx.font = fontFor(size);
  }
  const shadow = "#ff2e88";
  const outline = "rgba(12,4,24,0.92)";
  const fill = opts.captionColor || "#ffffff";
  lines.forEach((line, i) => {
    const y = i * lineH;
    ctx.fillStyle = shadow;
    ctx.fillText(line, size * 0.045, y + size * 0.045);
    ctx.strokeStyle = outline;
    ctx.lineWidth = size * 0.10;
    ctx.strokeText(line, 0, y);
    ctx.fillStyle = fill;
    ctx.fillText(line, 0, y);
  });
  ctx.restore();
}

function drawVignette(ctx, w, h) {
  const g = ctx.createRadialGradient(
    w / 2, h * 0.45, Math.max(w, h) * 0.35,
    w / 2, h * 0.5, Math.max(w, h) * 0.78
  );
  g.addColorStop(0, "rgba(4,2,10,0)");
  g.addColorStop(1, "rgba(4,2,10,0.32)");
  ctx.save();
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/* Deterministic film grain: same seed, same specks, every render. */
function drawFilmGrain(ctx, w, h) {
  const rnd = mulberry32(1337);
  const count = Math.round((w * h) / 1100);
  ctx.save();
  for (let i = 0; i < count; i++) {
    const x = rnd() * w, y = rnd() * h;
    ctx.fillStyle = rnd() > 0.5 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)";
    ctx.fillRect(x, y, 1.4, 1.4);
  }
  ctx.restore();
}

/* Draw the whole cover onto a canvas sized to the chosen export size.
   state: { sizeKey, layout, panels: [{photo, zoom, ox, oy}],
   caption, tagline, captionScale, captionColor, tilt, grade,
   halftone, grain, frame } — photo is an HTMLImageElement or null. */
function drawCover(canvas, state) {
  const size = COVER_SIZES[state.sizeKey] || COVER_SIZES.wide;
  const w = size.w, h = size.h;
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  const ctx = canvas.getContext("2d");
  const grade = COVER_GRADES[state.grade] || COVER_GRADES.sunset;
  const { polys, cuts } = coverPanelPolygons(state.layout || "triple", w, h);
  ctx.save();
  ctx.fillStyle = "#0d0a14";
  ctx.fillRect(0, 0, w, h);
  polys.forEach((poly, i) => {
    const panel = (state.panels || [])[i] || {};
    if (panel.photo) {
      ctx.filter = grade.filter;
      drawPhotoInPanel(ctx, panel.photo, poly, panel.zoom || 1.15, panel.ox || 0, panel.oy || 0);
      ctx.filter = "none";
    } else {
      drawEmptyPanel(ctx, poly, i, w);
    }
  });
  ctx.restore();
  drawCoverGrade(ctx, w, h, state.grade || "sunset");
  drawPanelDividers(ctx, cuts, w);
  if (state.frame !== false) drawCoverFrame(ctx, w, h);
  if (state.halftone !== false) drawHalftoneDots(ctx, w, h);
  drawPosterTitle(ctx, w, h, state.caption, state.tagline, {
    captionScale: state.captionScale || 1,
    captionColor: state.captionColor || "#ffffff",
    tilt: state.tilt,
  });
  drawVignette(ctx, w, h);
  if (state.grain !== false) drawFilmGrain(ctx, w, h);
}

/* Export the cover canvas as a PNG blob. */
function exportCoverPNG(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("export failed"))), "image/png");
  });
}
