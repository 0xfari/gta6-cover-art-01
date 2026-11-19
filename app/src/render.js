// render.js — cover renderer for Sunset Cover Studio (GTA 6 cover art).
// Pure canvas drawing: no network, no DOM besides the canvas passed in.
// All geometry derives from the cover size, so the same code draws the
// 1080x1080, 1080x1350 and 1920x1080 exports.

export const COVER_SIZES = {
  square: { w: 1080, h: 1080 },
  portrait: { w: 1080, h: 1350 },
  wide: { w: 1920, h: 1080 },
};

export const COVER_GRADES = {
  sunset: "saturate(1.28) contrast(1.06) sepia(0.22) brightness(1.02)",
  neon: "saturate(1.65) contrast(1.14) hue-rotate(-6deg) brightness(1.0)",
  noir: "grayscale(1) contrast(1.18) brightness(0.9)",
};

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function tracePath(ctx, poly) {
  ctx.beginPath();
  ctx.moveTo(poly[0][0], poly[0][1]);
  for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i][0], poly[i][1]);
  ctx.closePath();
}

export function coverPanelPolygons(layout, w, h) {
  const slant = Math.round(h * 0.1);
  if (layout === "solo") {
    return { polys: [[[0, 0], [w, 0], [w, h], [0, h]]], cuts: [] };
  }
  if (layout === "duo") {
    const x = Math.round(w / 2);
    return {
      polys: [
        [[0, 0], [x + slant, 0], [x, h], [0, h]],
        [[x + slant, 0], [w, 0], [w, h], [x, h]],
      ],
      cuts: [{ x1: x + slant, y1: 0, x2: x, y2: h }],
    };
  }
  // triple (default)
  const a = Math.round(w / 3);
  const b = Math.round((2 * w) / 3);
  return {
    polys: [
      [[0, 0], [a + slant, 0], [a, h], [0, h]],
      [[a + slant, 0], [b + slant, 0], [b, h], [a, h]],
      [[b + slant, 0], [w, 0], [w, h], [b, h]],
    ],
    cuts: [
      { x1: a + slant, y1: 0, x2: a, y2: h },
      { x1: b + slant, y1: 0, x2: b, y2: h },
    ],
  };
}

export function panelBounds(poly) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of poly) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

export function pointInPanel(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

export function drawPhotoInPanel(ctx, photo, poly, zoom, ox, oy) {
  const b = panelBounds(poly);
  const iw = photo.naturalWidth || photo.width;
  const ih = photo.naturalHeight || photo.height;
  const base = Math.max(b.w / iw, b.h / ih);
  const scale = base * zoom;
  const dw = iw * scale;
  const dh = ih * scale;
  // Pan convention: ox = +1 shows the photo's left edge flush with the
  // panel's left edge (leftmost view); ox = -1 shows the rightmost view.
  // oy = +1 shows the top, oy = -1 the bottom. 0 is centred.
  const cx = b.x + b.w / 2 + ox * (dw - b.w) / 2;
  const cy = b.y + b.h / 2 + oy * (dh - b.h) / 2;
  ctx.save();
  tracePath(ctx, poly);
  ctx.clip();
  ctx.drawImage(photo, cx - dw / 2, cy - dh / 2, dw, dh);
  ctx.restore();
}

export function drawEmptyPanel(ctx, poly) {
  const b = panelBounds(poly);
  ctx.save();
  tracePath(ctx, poly);
  ctx.clip();
  const g = ctx.createLinearGradient(b.x, b.y, b.x, b.y + b.h);
  g.addColorStop(0, "#1a1030");
  g.addColorStop(1, "#0a0618");
  ctx.fillStyle = g;
  ctx.fillRect(b.x, b.y, b.w, b.h);
  ctx.setLineDash([10, 8]);
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 2;
  ctx.strokeRect(b.x + 14, b.y + 14, b.w - 28, b.h - 28);
  ctx.setLineDash([]);
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = `600 ${Math.max(16, Math.round(b.w * 0.035))}px Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("ADD PHOTO", b.x + b.w / 2, b.y + b.h / 2);
  ctx.restore();
}

export function drawCoverGrade(ctx, w, h, grade) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  if (grade === "neon") {
    g.addColorStop(0, "rgba(0,220,255,0.10)");
    g.addColorStop(0.55, "rgba(255,0,120,0.05)");
    g.addColorStop(1, "rgba(255,0,120,0.20)");
  } else if (grade === "noir") {
    g.addColorStop(0, "rgba(255,255,255,0.06)");
    g.addColorStop(1, "rgba(0,0,0,0.38)");
  } else {
    g.addColorStop(0, "rgba(255,120,40,0.12)");
    g.addColorStop(0.55, "rgba(255,80,120,0.05)");
    g.addColorStop(1, "rgba(120,20,90,0.24)");
  }
  ctx.save();
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

export function drawPanelDividers(ctx, cuts) {
  ctx.save();
  ctx.lineCap = "round";
  for (const c of cuts) {
    ctx.beginPath();
    ctx.moveTo(c.x1, c.y1);
    ctx.lineTo(c.x2, c.y2);
    ctx.strokeStyle = "rgba(8,2,16,0.85)";
    ctx.lineWidth = 7;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(c.x1, c.y1);
    ctx.lineTo(c.x2, c.y2);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }
  ctx.restore();
}

export function drawCoverFrame(ctx, w, h) {
  const t = Math.max(6, Math.round(w * 0.011));
  ctx.save();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = t;
  ctx.strokeRect(t / 2, t / 2, w - t, h - t);
  ctx.restore();
}

export function drawHalftoneDots(ctx, w, h) {
  const band = Math.round(h * 0.3);
  const step = Math.max(12, Math.round(w / 90));
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.13)";
  for (let y = step / 2; y < band; y += step) {
    const fade = 1 - y / band;
    for (let x = step / 2; x < w; x += step) {
      const r = Math.max(0.6, step * 0.16 * fade + 0.5);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

const TITLE_FONT = '"Arial Black", "Liberation Sans", Arial, sans-serif';

function wrapWords(ctx, words, maxWidth) {
  const lines = [];
  let line = "";
  for (const word of words) {
    const test = line ? line + " " + word : word;
    if (ctx.measureText(test).width <= maxWidth || !line) line = test;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// Shrink the title until it fits: at most 2 lines, each within maxWidth,
// and the whole block within maxHeight. Returns the size that fits.
function fitTitle(ctx, text, maxWidth, maxHeight, baseSize) {
  const words = text.split(/\s+/).filter(Boolean);
  for (let size = baseSize; size >= 36; size -= 4) {
    ctx.font = `900 ${size}px ${TITLE_FONT}`;
    const lines = wrapWords(ctx, words, maxWidth);
    if (lines.length > 2) continue;
    const lineHeight = size * 1.04;
    if (lines.length * lineHeight > maxHeight) continue;
    const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
    if (widest > maxWidth) continue;
    return { size, lines, lineHeight };
  }
  const size = 36;
  ctx.font = `900 ${size}px ${TITLE_FONT}`;
  const lines = wrapWords(ctx, words, maxWidth).slice(0, 2);
  return { size, lines, lineHeight: size * 1.04 };
}

export function drawCaptionScrim(ctx, w, h) {
  const top = h * 0.6;
  const g = ctx.createLinearGradient(0, top, 0, h);
  g.addColorStop(0, "rgba(8,2,18,0)");
  g.addColorStop(0.55, "rgba(8,2,18,0.35)");
  g.addColorStop(1, "rgba(8,2,18,0.62)");
  ctx.save();
  ctx.fillStyle = g;
  ctx.fillRect(0, top, w, h - top);
  ctx.restore();
}

export function drawPosterTitle(ctx, state, w, h) {
  const baseBySize = { wide: 170, square: 150, portrait: 150 };
  const baseSize = baseBySize[state.sizeKey] || 150;
  const target = Math.round(baseSize * (state.captionScale || 1));
  const maxWidth = w * 0.92;
  const maxHeight = h * 0.27;
  const title = (state.caption || "").trim() || "UNTITLED";
  const fit = fitTitle(ctx, title.toUpperCase(), maxWidth, maxHeight, target);
  const blockH = fit.lines.length * fit.lineHeight;
  const bottom = h * 0.945;
  const top = bottom - blockH;
  const cx = w / 2;

  ctx.save();
  ctx.translate(cx, top + blockH / 2);
  if (state.tilt) ctx.rotate(-0.06);
  ctx.translate(-cx, -(top + blockH / 2));
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  const tag = (state.tagline || "").trim().toUpperCase();
  if (tag) {
    // Keep the tagline inside the frame: shrink its tracking first, then
    // its size, until it fits (portrait "VICE CITY NIGHTS" ran edge to edge).
    let tagSize = Math.max(18, Math.round(fit.size * 0.26));
    let tracking = Math.round(tagSize * 0.45);
    const tagCap = maxWidth * 0.94;
    ctx.font = `700 ${tagSize}px Arial, sans-serif`;
    for (;;) {
      try {
        ctx.letterSpacing = `${tracking}px`;
      } catch {
        // letterSpacing unsupported: plain tagline still draws fine.
      }
      if (ctx.measureText(tag).width <= tagCap || (tracking <= 0 && tagSize <= 18)) break;
      if (tracking > 0) tracking = Math.max(0, tracking - 2);
      else {
        tagSize = Math.max(18, tagSize - 2);
        ctx.font = `700 ${tagSize}px Arial, sans-serif`;
      }
    }
    ctx.fillStyle = "#ffd94d";
    ctx.fillText(tag, cx, top - tagSize * 0.9);
    try {
      ctx.letterSpacing = "0px";
    } catch {
      // ignore
    }
  }

  ctx.font = `900 ${fit.size}px ${TITLE_FONT}`;
  const shadow = Math.max(4, Math.round(fit.size * 0.055));
  let y = top + fit.size;
  for (const line of fit.lines) {
    ctx.fillStyle = "#ff2e88";
    ctx.fillText(line, cx + shadow, y + shadow);
    ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(10,0,20,0.92)";
    ctx.lineWidth = Math.max(3, Math.round(fit.size * 0.085));
    ctx.strokeText(line, cx, y);
    ctx.fillStyle = state.captionColor || "#ffffff";
    ctx.fillText(line, cx, y);
    y += fit.lineHeight;
  }
  ctx.restore();
}

export function drawVignette(ctx, w, h) {
  const r = Math.hypot(w, h) / 2;
  const g = ctx.createRadialGradient(w / 2, h / 2, r * 0.45, w / 2, h / 2, r);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.30)");
  ctx.save();
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

export function drawFilmGrain(ctx, w, h, seed = 1337) {
  const rand = mulberry32(seed);
  const s = 160;
  const tile = document.createElement("canvas");
  tile.width = s;
  tile.height = s;
  const tctx = tile.getContext("2d");
  const img = tctx.createImageData(s, s);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(rand() * 255);
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  tctx.putImageData(img, 0, 0);
  ctx.save();
  ctx.globalAlpha = 0.055;
  ctx.fillStyle = ctx.createPattern(tile, "repeat");
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

export function drawCover(canvas, state) {
  const size = COVER_SIZES[state.sizeKey] || COVER_SIZES.wide;
  const w = size.w;
  const h = size.h;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  const { polys, cuts } = coverPanelPolygons(state.layout || "triple", w, h);
  const grade = COVER_GRADES[state.grade] || COVER_GRADES.sunset;

  for (let i = 0; i < polys.length; i++) {
    const panel = state.panels[i] || { photo: null, zoom: 1, ox: 0, oy: 0 };
    const photo = panel.photo ? state.photos[panel.photo] : null;
    ctx.save();
    ctx.filter = grade;
    if (photo) {
      drawPhotoInPanel(ctx, photo, polys[i], panel.zoom || 1, panel.ox || 0, panel.oy || 0);
    } else {
      drawEmptyPanel(ctx, polys[i]);
    }
    ctx.restore();
  }
  ctx.filter = "none";
  drawCoverGrade(ctx, w, h, state.grade || "sunset");
  drawPanelDividers(ctx, cuts);
  if (state.frame !== false) drawCoverFrame(ctx, w, h);
  if (state.halftone !== false) drawHalftoneDots(ctx, w, h);
  drawCaptionScrim(ctx, w, h);
  drawVignette(ctx, w, h);
  drawPosterTitle(ctx, state, w, h);
  if (state.grain !== false) drawFilmGrain(ctx, w, h, 1337);
}

export function exportCoverPNG(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("toBlob returned null"));
    }, "image/png");
  });
}
