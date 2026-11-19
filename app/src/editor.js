// editor.js — UI wiring for Sunset Cover Studio.
// Owns the app state, binds every control, and implements the deterministic
// ?shot= modes the screenshot driver depends on. The canvas is drawn only
// through render.js.

import {
  COVER_SIZES,
  coverPanelPolygons,
  panelBounds,
  pointInPanel,
  drawCover,
  exportCoverPNG,
} from "./render.js";
import { sampleById, DEFAULT_SLOT_SAMPLES } from "./samples.js";

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const SWATCHES = ["#ffffff", "#ffd94d", "#ff5da2", "#35e0ff"];

const state = {
  sizeKey: "wide",
  layout: "triple",
  activePanel: 0,
  photos: { A: null, B: null, C: null },
  photoNames: { A: "", B: "", C: "" },
  panels: [
    { photo: "A", zoom: 1.15, ox: 0, oy: 0 },
    { photo: "B", zoom: 1.15, ox: 0, oy: 0 },
    { photo: "C", zoom: 1.15, ox: 0, oy: 0 },
  ],
  caption: "NEON SUNSET",
  tagline: "DRIVE INTO THE SUNSET",
  captionScale: 1,
  captionColor: "#ffffff",
  tilt: true,
  grade: "sunset",
  halftone: true,
  grain: true,
  frame: true,
};

const canvas = $("#cover");

function render() {
  drawCover(canvas, state);
  syncControls();
}

function syncControls() {
  const size = COVER_SIZES[state.sizeKey];
  $("#sizeLabel").textContent = `${cap(state.sizeKey)} · ${size.w} × ${size.h}`;
  $$("#sizeSeg button").forEach((b) =>
    b.classList.toggle("active", b.dataset.value === state.sizeKey),
  );
  $$("#layoutSeg button").forEach((b) =>
    b.classList.toggle("active", b.dataset.value === state.layout),
  );
  $$("#gradeSeg button").forEach((b) =>
    b.classList.toggle("active", b.dataset.value === state.grade),
  );
  $$("#panelChips button").forEach((b, i) =>
    b.classList.toggle("active", i === state.activePanel),
  );
  const panel = state.panels[state.activePanel];
  const select = $("#panelPhoto");
  Array.from(select.options).forEach((opt) => {
    if (!opt.value) opt.textContent = "— empty —";
    else opt.textContent = `Photo ${opt.value} · ${state.photoNames[opt.value] || opt.value}`;
  });
  select.value = panel.photo || "";
  $("#panelZoom").value = Math.round(panel.zoom * 100);
  $("#zoomVal").textContent = `${Math.round(panel.zoom * 100)}%`;
  $("#captionInput").value = state.caption;
  $("#taglineInput").value = state.tagline;
  $("#captionScale").value = Math.round(state.captionScale * 100);
  $("#scaleVal").textContent = `${Math.round(state.captionScale * 100)}%`;
  $$(".swatch").forEach((s) =>
    s.classList.toggle("active", s.dataset.color === state.captionColor),
  );
  $("#tiltToggle").checked = state.tilt;
  $("#halftoneToggle").checked = state.halftone;
  $("#grainToggle").checked = state.grain;
  $("#frameToggle").checked = state.frame;
  for (const key of ["A", "B", "C"]) {
    const label = $(`#slot-${key} .slot-name`);
    if (label) label.textContent = state.photoNames[key] || `Photo ${key}`;
    const thumb = $(`#slot-${key} .slot-thumb`);
    if (thumb) {
      const img = state.photos[key];
      if (img) {
        thumb.src = img.src;
        thumb.hidden = false;
      } else {
        thumb.hidden = true;
      }
    }
  }
}

function cap(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`failed to load ${src}`));
    img.src = src;
  });
}

async function loadSampleIntoSlot(slot, sampleId) {
  const sample = sampleById(sampleId);
  if (!sample) return;
  try {
    const img = await loadImage(sample.src);
    state.photos[slot] = img;
    state.photoNames[slot] = sample.name;
  } catch {
    state.photos[slot] = null;
    state.photoNames[slot] = "";
  }
}

function bindSeg(id, key) {
  $$(`#${id} button`).forEach((b) => {
    b.addEventListener("click", () => {
      state[key] = b.dataset.value;
      render();
    });
  });
}

function bindSlots() {
  for (const key of ["A", "B", "C"]) {
    const fileInput = $(`#file-${key}`);
    $(`#slot-${key} .slot-upload`).addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", () => {
      const file = fileInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          state.photos[key] = img;
          state.photoNames[key] = file.name.replace(/\.[^.]+$/, "");
          render();
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
    $(`#slot-${key} .slot-sample`).addEventListener("click", async () => {
      await loadSampleIntoSlot(key, DEFAULT_SLOT_SAMPLES[key]);
      render();
    });
  }
}

function bindPanels() {
  $$("#panelChips button").forEach((b, i) => {
    b.addEventListener("click", () => {
      state.activePanel = i;
      render();
    });
  });
  const select = $("#panelPhoto");
  for (const key of ["A", "B", "C"]) {
    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = `Photo ${key}`;
    select.appendChild(opt);
  }
  const empty = document.createElement("option");
  empty.value = "";
  empty.textContent = "— empty —";
  select.prepend(empty);
  select.addEventListener("change", () => {
    state.panels[state.activePanel].photo = select.value || null;
    render();
  });
  $("#panelZoom").addEventListener("input", (e) => {
    state.panels[state.activePanel].zoom = Number(e.target.value) / 100;
    render();
  });
}

function bindCaption() {
  $("#captionInput").addEventListener("input", (e) => {
    state.caption = e.target.value;
    render();
  });
  $("#taglineInput").addEventListener("input", (e) => {
    state.tagline = e.target.value;
    render();
  });
  $("#captionScale").addEventListener("input", (e) => {
    state.captionScale = Number(e.target.value) / 100;
    render();
  });
  $$(".swatch").forEach((s) => {
    s.addEventListener("click", () => {
      state.captionColor = s.dataset.color;
      render();
    });
  });
  $("#tiltToggle").addEventListener("change", (e) => {
    state.tilt = e.target.checked;
    render();
  });
}

function bindFinish() {
  $("#halftoneToggle").addEventListener("change", (e) => {
    state.halftone = e.target.checked;
    render();
  });
  $("#grainToggle").addEventListener("change", (e) => {
    state.grain = e.target.checked;
    render();
  });
  $("#frameToggle").addEventListener("change", (e) => {
    state.frame = e.target.checked;
    render();
  });
}

async function doExport() {
  const blob = await exportCoverPNG(canvas);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `gta6-cover-${state.sizeKey}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function bindExportAndShuffle() {
  $("#exportBtn").addEventListener("click", doExport);
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === "e" || e.key === "E")) {
      e.preventDefault();
      doExport();
    }
  });
  $("#shuffleBtn").addEventListener("click", () => {
    const grades = ["sunset", "neon", "noir"];
    const layouts = ["triple", "duo", "solo"];
    state.grade = grades[Math.floor(Math.random() * grades.length)];
    state.layout = layouts[Math.floor(Math.random() * layouts.length)];
    render();
  });
}

function canvasPoint(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) * canvas.width) / rect.width,
    y: ((e.clientY - rect.top) * canvas.height) / rect.height,
  };
}

function bindCanvasDrag() {
  let dragging = false;
  let last = null;
  canvas.addEventListener("pointerdown", (e) => {
    const p = canvasPoint(e);
    const { polys } = coverPanelPolygons(state.layout, canvas.width, canvas.height);
    for (let i = 0; i < polys.length; i++) {
      if (pointInPanel(p.x, p.y, polys[i])) {
        state.activePanel = i;
        dragging = true;
        last = p;
        canvas.setPointerCapture(e.pointerId);
        render();
        break;
      }
    }
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!dragging || !last) return;
    const p = canvasPoint(e);
    const panel = state.panels[state.activePanel];
    const photo = panel.photo ? state.photos[panel.photo] : null;
    if (!photo) return;
    const { polys } = coverPanelPolygons(state.layout, canvas.width, canvas.height);
    const b = panelBounds(polys[state.activePanel]);
    const iw = photo.naturalWidth || photo.width;
    const ih = photo.naturalHeight || photo.height;
    const scale = Math.max(b.w / iw, b.h / ih) * panel.zoom;
    const dw = iw * scale;
    const dh = ih * scale;
    if (dw > b.w) panel.ox += ((p.x - last.x) * 2) / (dw - b.w);
    if (dh > b.h) panel.oy += ((p.y - last.y) * 2) / (dh - b.h);
    panel.ox = Math.max(-1, Math.min(1, panel.ox));
    panel.oy = Math.max(-1, Math.min(1, panel.oy));
    last = p;
    render();
  });
  const stop = () => {
    dragging = false;
    last = null;
  };
  canvas.addEventListener("pointerup", stop);
  canvas.addEventListener("pointercancel", stop);
  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    const panel = state.panels[state.activePanel];
    panel.zoom *= e.deltaY < 0 ? 1.08 : 1 / 1.08;
    panel.zoom = Math.max(1, Math.min(2.5, panel.zoom));
    render();
  }, { passive: false });
}

// ---- deterministic ?shot= modes (screenshot driver) ----

function applyShotParams() {
  const q = new URLSearchParams(window.location.search);
  const photos = q.get("photos");
  if (photos) {
    const ids = photos.split(",");
    for (let i = 0; i < 3; i++) {
      if (ids[i]) state.panels[i].photo = ["A", "B", "C"][i];
    }
  }
  if (q.get("caption") !== null) state.caption = q.get("caption");
  if (q.get("tagline") !== null) state.tagline = q.get("tagline");
  if (q.get("size") && COVER_SIZES[q.get("size")]) state.sizeKey = q.get("size");
  if (q.get("grade")) state.grade = q.get("grade");
  if (q.get("layout")) state.layout = q.get("layout");
  const crops = q.get("crops");
  if (crops) {
    crops.split("|").forEach((part, i) => {
      if (i > 2) return;
      const [z, ox, oy] = part.split(",").map(Number);
      if (!Number.isNaN(z)) state.panels[i].zoom = z;
      if (!Number.isNaN(ox)) state.panels[i].ox = ox;
      if (!Number.isNaN(oy)) state.panels[i].oy = oy;
    });
  }
  return q.get("shot");
}

async function boot() {
  bindSeg("sizeSeg", "sizeKey");
  bindSeg("layoutSeg", "layout");
  bindSeg("gradeSeg", "grade");
  bindSlots();
  bindPanels();
  bindCaption();
  bindFinish();
  bindExportAndShuffle();
  bindCanvasDrag();

  const shot = applyShotParams();
  const q = new URLSearchParams(window.location.search);
  const photoIds = (q.get("photos") || "").split(",").filter(Boolean);
  const toLoad = photoIds.length
    ? photoIds
    : [DEFAULT_SLOT_SAMPLES.A, DEFAULT_SLOT_SAMPLES.B, DEFAULT_SLOT_SAMPLES.C];
  const slots = ["A", "B", "C"];
  await Promise.all(
    toLoad.map((id, i) => loadSampleIntoSlot(slots[i], id)),
  );
  // Keep the slot names in sync with what was actually loaded.
  slots.forEach((key, i) => {
    const sample = sampleById(toLoad[i]);
    if (sample && state.photos[key]) state.photoNames[key] = sample.name;
  });

  if (shot === "cover") document.body.classList.add("shot");
  render();
  if (shot) window.__shotReady = true;
}

boot();
