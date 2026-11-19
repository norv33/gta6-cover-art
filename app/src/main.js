// Vice City Cover Studio — wires the editor page: photo loading, caption editing,
// panel crop controls, live preview and PNG export. Photos stay on the machine.
import { drawCover, renderCover, SIZES } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('preview');
const captionInput = document.getElementById('caption');
const tagInput = document.getElementById('tag');
const gradeInput = document.getElementById('grade');
const sizeSelect = document.getElementById('size');
const status = document.getElementById('status');
const panelName = document.getElementById('panel-name');

const state = {
  photos: [null, null, null],
  crops: [
    { zoom: 1, ox: 0, oy: 0 },
    { zoom: 1, ox: 0, oy: 0 },
    { zoom: 1, ox: 0, oy: 0 },
  ],
  caption: 'Sunset Heist',
  tag: 'Vice City',
  grade: 1,
  sizeId: 'square',
  active: 0,
};

const PANEL_NAMES = ['Hero panel (big)', 'Panel 2', 'Panel 3'];

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function currentSize() {
  return SIZES.find((s) => s.id === state.sizeId) || SIZES[0];
}

function redraw() {
  const size = currentSize();
  canvas.width = size.w;
  canvas.height = size.h;
  drawCover(canvas, state);
}

function setStatus(text) {
  status.textContent = text;
}

/** Sets a panel's photo from a File, then redraws. */
async function setPhoto(index, file) {
  if (!file || !file.type.startsWith('image/')) return;
  const url = URL.createObjectURL(file);
  try {
    state.photos[index] = await loadImage(url);
    updatePanelControls();
    setStatus(`Photo ${index + 1} loaded: ${file.name}`);
  } catch {
    setStatus('That file could not be read as an image.');
  }
  redraw();
}

/** Loads a sample photo into a panel. */
async function loadSample(index, name) {
  state.photos[index] = await loadImage(`samples/${name}.jpg`);
  updatePanelControls();
  redraw();
}

// One photo for all panels.
document.getElementById('photo-all').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    state.photos = [img, img, img];
    setStatus(`One photo loaded into all three panels: ${file.name}`);
  } catch {
    setStatus('That file could not be read as an image.');
  }
  redraw();
});

// Per-panel photo pickers.
for (let i = 0; i < 3; i++) {
  document.getElementById(`photo-${i}`).addEventListener('change', (e) => {
    setPhoto(i, e.target.files[0]);
  });
  document.getElementById(`sample-${i}`).addEventListener('click', () => {
    loadSample(i, i === 1 ? 'boulevard' : 'pier');
  });
}

// Click a panel in the preview to select it; drag to pan, wheel to zoom.
let dragging = false;
let lastX = 0, lastY = 0;
canvas.addEventListener('pointerdown', (e) => {
  const r = canvas.getBoundingClientRect();
  const x = ((e.clientX - r.left) / r.width) * canvas.width;
  const y = ((e.clientY - r.top) / r.height) * canvas.height;
  state.active = x < canvas.width * 0.5 && y < canvas.height * 0.74 ? 0 : (y < canvas.height * 0.4 ? 1 : 2);
  updatePanelControls();
  dragging = true;
  lastX = e.clientX; lastY = e.clientY;
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const crop = state.crops[state.active];
  crop.ox += (e.clientX - lastX) / canvas.clientWidth;
  crop.oy += (e.clientY - lastY) / canvas.clientHeight;
  crop.ox = Math.max(-0.5, Math.min(0.5, crop.ox));
  crop.oy = Math.max(-0.5, Math.min(0.5, crop.oy));
  lastX = e.clientX; lastY = e.clientY;
  updatePanelControls();
  redraw();
});
canvas.addEventListener('pointerup', () => { dragging = false; });
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const crop = state.crops[state.active];
  crop.zoom = Math.max(1, Math.min(3, crop.zoom * (e.deltaY < 0 ? 1.08 : 0.93)));
  updatePanelControls();
  redraw();
}, { passive: false });

// Panel crop sliders.
function updatePanelControls() {
  const crop = state.crops[state.active];
  panelName.textContent = PANEL_NAMES[state.active];
  document.getElementById('zoom').value = crop.zoom;
  document.getElementById('panx').value = crop.ox;
  document.getElementById('pany').value = crop.oy;
  document.getElementById('zoom-val').textContent = `${crop.zoom.toFixed(2)}x`;
}
document.getElementById('zoom').addEventListener('input', (e) => {
  state.crops[state.active].zoom = parseFloat(e.target.value);
  updatePanelControls();
  redraw();
});
document.getElementById('panx').addEventListener('input', (e) => {
  state.crops[state.active].ox = parseFloat(e.target.value);
  redraw();
});
document.getElementById('pany').addEventListener('input', (e) => {
  state.crops[state.active].oy = parseFloat(e.target.value);
  redraw();
});
document.querySelectorAll('[data-panel]').forEach((btn) => {
  btn.addEventListener('click', () => {
    state.active = parseInt(btn.dataset.panel, 10);
    updatePanelControls();
  });
});

// Caption, tag, grade, size.
captionInput.addEventListener('input', () => { state.caption = captionInput.value; redraw(); });
tagInput.addEventListener('input', () => { state.tag = tagInput.value; redraw(); });
gradeInput.addEventListener('input', () => {
  state.grade = parseFloat(gradeInput.value);
  document.getElementById('grade-val').textContent = `${Math.round(state.grade * 100)}%`;
  redraw();
});
sizeSelect.addEventListener('change', () => { state.sizeId = sizeSelect.value; redraw(); });

// Export: one PNG per chosen size, all three in one click.
function downloadCanvas(canvasEl, name) {
  return new Promise((resolve) => {
    canvasEl.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      resolve(blob ? blob.size : 0);
    }, 'image/png');
  });
}
// Export: one PNG per chosen size. "Export all" packs the three PNGs into a
// single ZIP (stored, no compression) so one click always yields one download:
// browsers routinely block the second and third of three simultaneous downloads.
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
/** Builds a stored (uncompressed) ZIP from [{ name, data: Uint8Array }]. */
function buildZip(files) {
  const parts = [];
  const central = [];
  let offset = 0;
  const enc = new TextEncoder();
  for (const { name, data } of files) {
    const nameBytes = enc.encode(name);
    const crc = crc32(data);
    const head = new DataView(new ArrayBuffer(30));
    head.setUint32(0, 0x04034b50, true);
    head.setUint16(4, 20, true);
    head.setUint16(6, 0x0800, true); // UTF-8 filenames
    head.setUint16(8, 0, true); // stored
    head.setUint16(10, 0, true);
    head.setUint16(12, 0, true);
    head.setUint32(14, crc, true);
    head.setUint32(18, data.length, true);
    head.setUint32(22, data.length, true);
    head.setUint16(26, nameBytes.length, true);
    head.setUint16(28, 0, true);
    parts.push(head.buffer, nameBytes, data);
    const cent = new DataView(new ArrayBuffer(46));
    cent.setUint32(0, 0x02014b50, true);
    cent.setUint16(4, 20, true);
    cent.setUint16(6, 20, true);
    cent.setUint16(8, 0x0800, true);
    cent.setUint16(10, 0, true);
    cent.setUint16(12, 0, true);
    cent.setUint16(14, 0, true);
    cent.setUint32(16, crc, true);
    cent.setUint32(20, data.length, true);
    cent.setUint32(24, data.length, true);
    cent.setUint16(28, nameBytes.length, true);
    cent.setUint32(42, offset, true);
    central.push(cent.buffer, nameBytes);
    offset += 30 + nameBytes.length + data.length;
  }
  const centralSize = central.reduce((n, b) => n + b.byteLength, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, centralSize, true);
  end.setUint32(16, offset, true);
  return new Blob([...parts, ...central, end.buffer], { type: 'application/zip' });
}
async function exportSize(size) {
  const out = renderCover(size, state);
  const bytes = await downloadCanvas(out, `cover-${size.w}x${size.h}.png`);
  return bytes;
}
document.getElementById('export-one').addEventListener('click', async () => {
  const size = currentSize();
  const bytes = await exportSize(size);
  setStatus(`Saved cover-${size.w}x${size.h}.png (${Math.round(bytes / 1024)} KB)`);
});
document.getElementById('export-all').addEventListener('click', async () => {
  const files = [];
  for (const size of SIZES) {
    const out = renderCover(size, state);
    const blob = await new Promise((resolve) => out.toBlob(resolve, 'image/png'));
    files.push({ name: `cover-${size.w}x${size.h}.png`, data: new Uint8Array(await blob.arrayBuffer()) });
  }
  const zip = buildZip(files);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(zip);
  a.download = 'covers.zip';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  setStatus(`Saved covers.zip with all three sizes (${Math.round(zip.size / 1024)} KB total)`);
});

// Fixed scenes for screenshots (?shot=cover / ?shot=editor).
const params = new URLSearchParams(location.search);
const shot = params.get('shot');
async function start() {
  await document.fonts.load('100px Anton');
  await document.fonts.ready;
  if (shot) {
    const sizeParam = params.get('size');
    if (sizeParam && SIZES.some((s) => s.id === sizeParam)) {
      state.sizeId = sizeParam;
      sizeSelect.value = sizeParam;
    }
    await runShot(shot, params, async (samples, text, tag) => {
      const imgs = [];
      for (const name of samples) imgs.push(await loadImage(`samples/${name}.jpg`));
      state.photos = imgs;
      state.caption = text;
      state.tag = tag || 'Vice City';
      captionInput.value = text;
      tagInput.value = state.tag;
      redraw();
    });
  } else {
    updatePanelControls();
    redraw();
  }
}
start();
