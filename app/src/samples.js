// samples.js — the three built-in sample photos.
// Each was drawn from scratch for this app (no stock, no Rockstar art).
// `src` is relative to app/index.html.

export const SAMPLES = [
  { id: "sunset-pier", name: "Sunset Pier", src: "samples/sunset-pier.jpg" },
  { id: "palm-dusk", name: "Palm Dusk", src: "samples/palm-dusk.jpg" },
  { id: "neon-street", name: "Neon Street", src: "samples/neon-street.jpg" },
];

export function sampleById(id) {
  return SAMPLES.find((s) => s.id === id) || null;
}

// Default sample per photo slot (A/B/C) when the app boots with no
// ?photos= param — the same assignment the screenshot driver uses.
export const DEFAULT_SLOT_SAMPLES = {
  A: "neon-street",
  B: "sunset-pier",
  C: "palm-dusk",
};
