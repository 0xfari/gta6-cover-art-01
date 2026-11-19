"use strict";
/* Sunset Cover Studio — editor wiring.
   Owns the app state, the sidebar controls, drag-to-position on the
   canvas, the PNG export, and the deterministic ?shot= modes the maker
   uses for screenshots (?shot=cover renders a bare cover at export size,
   ?shot=editor opens the editor with a sample photo already loaded). */

const SLOT_IDS = ["A", "B", "C"];
const TITLE_COLORS = ["#ffffff", "#ffd319", "#ff2e88", "#22d3ee"];

const state = {
  sizeKey: "wide",
  layout: "triple",
  activePanel: 0,
  photos: { A: null, B: null, C: null },
  photoNames: { A: "Empty", B: "Empty", C: "Empty" },
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

const canvas = document.getElementById("cover");
const $ = (id) => document.getElementById(id);

function panelCount() {
  return state.layout === "solo" ? 1 : state.layout === "duo" ? 2 : 3;
}

function currentPanels() {
  return state.panels.slice(0, panelCount()).map((p) => ({
    photo: state.photos[p.photo] || null,
    zoom: p.zoom, ox: p.ox, oy: p.oy,
  }));
}

function renderCover() {
  drawCover(canvas, {
    sizeKey: state.sizeKey,
    layout: state.layout,
    panels: currentPanels(),
    caption: state.caption,
    tagline: state.tagline,
    captionScale: state.captionScale,
    captionColor: state.captionColor,
    tilt: state.tilt,
    grade: state.grade,
    halftone: state.halftone,
    grain: state.grain,
    frame: state.frame,
  });
  const size = COVER_SIZES[state.sizeKey];
  $("stageLabel").textContent =
    `${state.sizeKey[0].toUpperCase() + state.sizeKey.slice(1)} · ${size.w} × ${size.h}`;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${src}`));
    img.src = src;
  });
}

async function loadSampleInto(slotId, sampleId) {
  const sample = SAMPLE_PHOTOS.find((s) => s.id === sampleId) || SAMPLE_PHOTOS[0];
  const img = await loadImage(sample.src);
  state.photos[slotId] = img;
  state.photoNames[slotId] = sample.name;
  buildPhotoSlots();
  buildPanelPhotoSelect();
  renderCover();
}

function buildPhotoSlots() {
  const wrap = $("photoSlots");
  wrap.textContent = "";
  for (const id of SLOT_IDS) {
    const slot = document.createElement("div");
    slot.className = "slot" + (state.photos[id] ? " filled" : "");
    slot.id = `slot-${id}`;
    if (state.photos[id]) {
      const sample = SAMPLE_PHOTOS.find((s) => s.name === state.photoNames[id]);
      if (sample) slot.style.backgroundImage = `url(${sample.src})`;
    }
    const label = document.createElement("span");
    label.textContent = `Photo ${id} · ${state.photoNames[id]}`;
    slot.appendChild(label);
    const fileBtn = document.createElement("button");
    fileBtn.type = "button";
    fileBtn.textContent = "Upload";
    fileBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      fileInput(id).click();
    });
    slot.appendChild(fileBtn);
    const sampleBtn = document.createElement("button");
    sampleBtn.type = "button";
    sampleBtn.textContent = "Sample";
    sampleBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const next = SAMPLE_PHOTOS[SLOT_IDS.indexOf(id) % SAMPLE_PHOTOS.length];
      loadSampleInto(id, next.id);
    });
    slot.appendChild(sampleBtn);
    wrap.appendChild(slot);
  }
}

function fileInput(slotId) {
  let input = document.querySelector(`input[data-slot="${slotId}"]`);
  if (!input) {
    input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.dataset.slot = slotId;
    input.addEventListener("change", () => {
      const file = input.files && input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        loadImage(reader.result).then((img) => {
          state.photos[slotId] = img;
          state.photoNames[slotId] = file.name;
          buildPhotoSlots();
          renderCover();
        });
      };
      reader.readAsDataURL(file);
    });
    document.body.appendChild(input);
  }
  return input;
}

function buildPanelChips() {
  const wrap = $("panelChips");
  wrap.textContent = "";
  for (let i = 0; i < panelCount(); i++) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.textContent = `Panel ${i + 1}`;
    if (i === state.activePanel) chip.classList.add("on");
    chip.addEventListener("click", () => {
      state.activePanel = i;
      buildPanelChips();
      syncPanelControls();
    });
    wrap.appendChild(chip);
  }
}

function buildPanelPhotoSelect() {
  const sel = $("panelPhoto");
  sel.textContent = "";
  for (const id of SLOT_IDS) {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = `Photo ${id} · ${state.photoNames[id]}`;
    sel.appendChild(opt);
  }
  sel.value = state.panels[state.activePanel].photo;
}

function syncPanelControls() {
  const panel = state.panels[state.activePanel];
  $("panelPhoto").value = panel.photo;
  $("panelZoom").value = Math.round(panel.zoom * 100);
  $("zoomRead").textContent = `${Math.round(panel.zoom * 100)}%`;
}

function setSegmented(id, attr, value, onChange) {
  const group = $(id);
  group.querySelectorAll("button").forEach((b) => {
    b.classList.toggle("on", b.dataset[attr] === value);
    b.addEventListener("click", () => {
      group.querySelectorAll("button").forEach((x) => x.classList.remove("on"));
      b.classList.add("on");
      onChange(b.dataset[attr]);
    });
  });
}

/* Highlight the segmented buttons that match the current state. Used by
   the deterministic ?shot= modes, which set state without clicking. */
function syncSegmented(id, attr, value) {
  $(id).querySelectorAll("button").forEach((b) => {
    b.classList.toggle("on", b.dataset[attr] === value);
  });
}

function canvasPoint(ev) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((ev.clientX - rect.left) / rect.width) * canvas.width,
    y: ((ev.clientY - rect.top) / rect.height) * canvas.height,
  };
}

function hitPanel(x, y) {
  const { polys } = coverPanelPolygons(state.layout, canvas.width, canvas.height);
  for (let i = polys.length - 1; i >= 0; i--) {
    if (pointInPanel(x, y, polys[i])) return i;
  }
  return -1;
}

function wireDragging() {
  let drag = null;
  canvas.addEventListener("pointerdown", (ev) => {
    const p = canvasPoint(ev);
    const hit = hitPanel(p.x, p.y);
    if (hit < 0) return;
    state.activePanel = hit;
    buildPanelChips();
    syncPanelControls();
    drag = { x: p.x, y: p.y, panel: state.panels[hit] };
    canvas.setPointerCapture(ev.pointerId);
  });
  canvas.addEventListener("pointermove", (ev) => {
    if (!drag) return;
    const p = canvasPoint(ev);
    const { polys } = coverPanelPolygons(state.layout, canvas.width, canvas.height);
    const b = panelBounds(polys[state.activePanel]);
    drag.panel.ox += (p.x - drag.x) / b.w;
    drag.panel.oy += (p.y - drag.y) / b.h;
    drag.x = p.x; drag.y = p.y;
    renderCover();
    syncPanelControls();
  });
  const endDrag = () => { drag = null; };
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);
  canvas.addEventListener("wheel", (ev) => {
    ev.preventDefault();
    const panel = state.panels[state.activePanel];
    panel.zoom = Math.min(2.5, Math.max(1, panel.zoom * (ev.deltaY < 0 ? 1.06 : 0.94)));
    renderCover();
    syncPanelControls();
  }, { passive: false });
}

function wireControls() {
  setSegmented("sizePicker", "size", state.sizeKey, (v) => {
    state.sizeKey = v;
    renderCover();
  });
  setSegmented("layoutPicker", "layout", state.layout, (v) => {
    state.layout = v;
    if (state.activePanel >= panelCount()) state.activePanel = 0;
    buildPanelChips();
    renderCover();
  });
  setSegmented("gradePicker", "grade", state.grade, (v) => {
    state.grade = v;
    renderCover();
  });
  $("panelPhoto").addEventListener("change", (e) => {
    state.panels[state.activePanel].photo = e.target.value;
    renderCover();
  });
  $("panelZoom").addEventListener("input", (e) => {
    state.panels[state.activePanel].zoom = Number(e.target.value) / 100;
    $("zoomRead").textContent = `${e.target.value}%`;
    renderCover();
  });
  $("captionText").addEventListener("input", (e) => {
    state.caption = e.target.value;
    renderCover();
  });
  $("taglineText").addEventListener("input", (e) => {
    state.tagline = e.target.value;
    renderCover();
  });
  $("captionSize").addEventListener("input", (e) => {
    state.captionScale = Number(e.target.value) / 100;
    $("sizeRead").textContent = `${e.target.value}%`;
    renderCover();
  });
  $("tiltToggle").addEventListener("change", (e) => {
    state.tilt = e.target.checked;
    renderCover();
  });
  $("halftoneToggle").addEventListener("change", (e) => {
    state.halftone = e.target.checked;
    renderCover();
  });
  $("grainToggle").addEventListener("change", (e) => {
    state.grain = e.target.checked;
    renderCover();
  });
  $("frameToggle").addEventListener("change", (e) => {
    state.frame = e.target.checked;
    renderCover();
  });
  const sw = $("colorSwatches");
  for (const color of TITLE_COLORS) {
    const b = document.createElement("button");
    b.type = "button";
    b.style.background = color;
    b.setAttribute("aria-label", `Title colour ${color}`);
    if (color === state.captionColor) b.classList.add("on");
    b.addEventListener("click", () => {
      state.captionColor = color;
      sw.querySelectorAll("button").forEach((x) => x.classList.remove("on"));
      b.classList.add("on");
      renderCover();
    });
    sw.appendChild(b);
  }
  $("exportBtn").addEventListener("click", async () => {
    const btn = $("exportBtn");
    btn.disabled = true;
    btn.textContent = "Exporting…";
    try {
      const blob = await exportCoverPNG(canvas);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `sunset-cover-${state.sizeKey}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    } finally {
      btn.disabled = false;
      btn.textContent = "Export PNG";
    }
  });
  wireDragging();
}

/* Deterministic screenshot modes (?shot=cover | ?shot=editor). The maker
   drives these from a browser to take the entry's screenshots. */
async function runShotMode() {
  const q = new URLSearchParams(location.search);
  const shot = q.get("shot");
  if (!shot) return false;
  const photoIds = (q.get("photos") || q.get("photo") || "sunset-pier").split(",");
  const caption = q.get("caption") || "NEON SUNSET";
  const tagline = q.get("tagline") || "DRIVE INTO THE SUNSET";
  const size = q.get("size") || "wide";
  const grade = q.get("grade") || "sunset";
  const layout = q.get("layout") || "triple";
  if (COVER_SIZES[size]) state.sizeKey = size;
  if (COVER_GRADES[grade]) state.grade = grade;
  if (["triple", "duo", "solo"].includes(layout)) state.layout = layout;
  state.caption = caption;
  state.tagline = tagline;
  // a different sample in each slot, so the panels read as a collage
  for (let i = 0; i < SLOT_IDS.length; i++) {
    await loadSampleInto(SLOT_IDS[i], photoIds[i % photoIds.length]);
  }
  // panel crops: portrait panels are tall, so show the lower, busier part;
  // a crops= param overrides per panel as zoom,ox,oy|zoom,ox,oy|...
  const defaultCrops =
    state.sizeKey === "portrait"
      ? [[1.5, 0, -0.22], [1.5, 0, -0.18], [1.2, 0.05, 0.08]]
      : [[1.15, -0.12, 0.05], [1.3, 0.1, -0.06], [1.2, 0.05, 0.08]];
  const crops = (q.get("crops") || "")
    .split("|")
    .map((c) => c.split(",").map(Number));
  for (let i = 0; i < 3; i++) {
    const c = crops[i];
    const [zoom, ox, oy] =
      c && c.length === 3 && c.every((n) => Number.isFinite(n)) ? c : defaultCrops[i];
    state.panels[i] = { photo: SLOT_IDS[i], zoom, ox, oy };
  }
  syncSegmented("sizePicker", "size", state.sizeKey);
  syncSegmented("layoutPicker", "layout", state.layout);
  syncSegmented("gradePicker", "grade", state.grade);
  buildPanelChips();
  syncPanelControls();
  if (shot === "cover") {
    document.body.classList.add("shot");
    canvas.style.width = `${COVER_SIZES[state.sizeKey].w}px`;
    canvas.style.height = `${COVER_SIZES[state.sizeKey].h}px`;
  } else {
    $("captionText").value = caption;
    $("taglineText").value = tagline;
  }
  renderCover();
  window.__shotReady = true;
  document.body.setAttribute("data-ready", "1");
  return true;
}

async function boot() {
  buildPhotoSlots();
  buildPanelChips();
  buildPanelPhotoSelect();
  wireControls();
  renderCover();
  // preload the first sample so the editor never opens empty
  await loadSampleInto("A", "sunset-pier");
  await runShotMode();
}

boot();
