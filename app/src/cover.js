// Vice City Cover Studio — the cover drawing engine (written from scratch).
// Draws a multi-panel GTA-style poster on any 2D canvas: diagonal photo panels,
// a neon sunset grade, and bold display lettering. No network, no assets beyond
// the photos the user loads and the vendored font.

export const SIZES = [
  { id: 'square', label: '1080 x 1080', w: 1080, h: 1080 },
  { id: 'portrait', label: '1080 x 1350', w: 1080, h: 1350 },
  { id: 'wide', label: '1920 x 1080', w: 1920, h: 1080 },
];

/** Panel polygons (fractions of W/H) for each aspect. The polygons tile the
 *  area above the caption band with no gaps; shared edges are computed once. */
export function layoutFor(w, h) {
  const band = 0.26 * h; // caption band height
  const top = h - band;
  if (h > w) {
    // Portrait 1080 x 1350: tall hero, two panels below it.
    const yA = top * 0.60, yB = top * 0.55; // hero bottom edge, left -> right
    const xMid = 0.55 * w;
    const yMid = yA + (yB - yA) * 0.55; // hero edge height at xMid
    return {
      band,
      panels: [
        [[0, 0], [w, 0], [w, yB], [0, yA]],
        [[0, yA], [xMid, yMid], [xMid, top], [0, top]],
        [[xMid, yMid], [w, yB], [w, top], [xMid, top]],
      ],
    };
  }
  if (w > h * 1.4) {
    // Wide 1920 x 1080: three diagonal panels side by side.
    const x1 = 0.48 * w, x2 = 0.76 * w;
    const x1b = 0.44 * w, x2b = 0.72 * w;
    return {
      band,
      panels: [
        [[0, 0], [x1, 0], [x1b, top], [0, top]],
        [[x1, 0], [x2, 0], [x2b, top], [x1b, top]],
        [[x2, 0], [w, 0], [w, top], [x2b, top]],
      ],
    };
  }
  // Square 1080 x 1080: tall hero left, two stacked panels right.
  const x1 = 0.62 * w, x1b = 0.56 * w;
  const yMid = 0.40 * top;
  const xAtMid = x1 + (x1b - x1) * (yMid / top); // hero right edge at yMid
  return {
    band,
    panels: [
      [[0, 0], [x1, 0], [x1b, top], [0, top]],
      [[x1, 0], [w, 0], [w, yMid], [xAtMid, yMid]],
      [[xAtMid, yMid], [w, yMid], [w, top], [x1b, top]],
    ],
  };
}

/** Deterministic pseudo-random stream (LCG) for the grain — same art every run. */
function seededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Draws one photo into a polygon panel with cover-fit, zoom and pan.
 *  The crop centres on the photo's 40%-height line (faces sit in the top
 *  half of most photos) instead of its middle, clamped to the valid range. */
function drawPanelPhoto(ctx, poly, photo, crop, w, h) {
  const xs = poly.map((p) => p[0]);
  const ys = poly.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  const y0 = Math.min(...ys), y1 = Math.max(...ys);
  const pw = x1 - x0, ph = y1 - y0;
  ctx.save();
  ctx.beginPath();
  poly.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
  ctx.clip();
  if (photo) {
    const base = Math.max(pw / photo.naturalWidth, ph / photo.naturalHeight);
    const scale = base * (crop.zoom || 1);
    const dw = photo.naturalWidth * scale;
    const dh = photo.naturalHeight * scale;
    const dySmart = Math.max(ph - dh, Math.min(0, ph / 2 - 0.40 * dh));
    const dx = x0 + (pw - dw) / 2 + (crop.ox || 0) * pw;
    const dy = y0 + dySmart + (crop.oy || 0) * ph;
    ctx.filter = 'saturate(1.35) contrast(1.12) brightness(1.06) sepia(0.18)';
    ctx.drawImage(photo, dx, dy, dw, dh);
    ctx.filter = 'none';
  } else {
    // Placeholder: deep violet with diagonal stripes and a label.
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, '#3a1c5e');
    g.addColorStop(1, '#160a26');
    ctx.fillStyle = g;
    ctx.fillRect(x0, y0, pw, ph);
    ctx.strokeStyle = 'rgba(255, 120, 200, 0.25)';
    ctx.lineWidth = Math.max(2, w * 0.004);
    for (let d = -ph; d < pw; d += w * 0.06) {
      ctx.beginPath();
      ctx.moveTo(x0 + d, y0);
      ctx.lineTo(x0 + d + ph, y1);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.font = `bold ${Math.round(Math.min(pw, ph) * 0.09)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('+ ADD PHOTO', x0 + pw / 2, y0 + ph / 2);
  }
  ctx.restore();
}

/** The neon sunset grade: warm top, magenta middle, violet bottom, plus vignette. */
function gradePanel(ctx, poly, grade, w, h) {
  const xs = poly.map((p) => p[0]);
  const ys = poly.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  const y0 = Math.min(...ys), y1 = Math.max(...ys);
  const pw = x1 - x0, ph = y1 - y0;
  ctx.save();
  ctx.beginPath();
  poly.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
  ctx.clip();
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, `rgba(255, 176, 66, ${0.16 * grade})`);
  g.addColorStop(0.5, `rgba(255, 82, 130, ${0.22 * grade})`);
  g.addColorStop(1, `rgba(96, 32, 168, ${0.36 * grade})`);
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = g;
  ctx.fillRect(x0, y0, pw, ph);
  ctx.globalCompositeOperation = 'source-over';
  const v = ctx.createRadialGradient(
    x0 + pw / 2, y0 + ph / 2, Math.min(pw, ph) * 0.35,
    x0 + pw / 2, y0 + ph / 2, Math.max(pw, ph) * 0.75,
  );
  v.addColorStop(0, 'rgba(8, 0, 18, 0)');
  v.addColorStop(1, `rgba(8, 0, 18, ${0.40 * grade})`);
  ctx.fillStyle = v;
  ctx.fillRect(x0, y0, pw, ph);
  ctx.restore();
}

/** Bright divider strokes along every panel edge. */
function strokePanels(ctx, panels, w) {
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.lineWidth = Math.max(3, w * 0.004);
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = w * 0.004;
  for (const poly of panels) {
    ctx.beginPath();
    poly.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.closePath();
    ctx.stroke();
  }
  ctx.restore();
}

/** Deterministic film grain over the whole cover. */
function grain(ctx, w, h) {
  const rnd = seededRandom(20261119);
  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = '#ffffff';
  const step = Math.max(3, Math.round(w / 360));
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      if (rnd() > 0.5) ctx.fillRect(x, y, 1, 1);
    }
  }
  ctx.restore();
}

/** Fits the caption font (Anton) to the band width. */
function fitFont(ctx, text, maxWidth, startSize) {
  let size = startSize;
  ctx.font = `${size}px Anton, sans-serif`;
  while (size > 12 && ctx.measureText(text).width > maxWidth) {
    size -= 4;
    ctx.font = `${size}px Anton, sans-serif`;
  }
  return size;
}

/** The caption band: dark ground, neon top line, tag + big caption. */
function drawCaptionBand(ctx, w, h, band, caption, tag) {
  const y0 = h - band;
  const g = ctx.createLinearGradient(0, y0, 0, h);
  g.addColorStop(0, '#1c0b2e');
  g.addColorStop(1, '#0a0414');
  ctx.fillStyle = g;
  ctx.fillRect(0, y0, w, band);
  const neon = ctx.createLinearGradient(0, 0, w, 0);
  neon.addColorStop(0, '#ff2e88');
  neon.addColorStop(0.5, '#ff7a3d');
  neon.addColorStop(1, '#ffb03d');
  ctx.fillStyle = neon;
  ctx.fillRect(0, y0, w, Math.max(3, h * 0.004));
  const pad = w * 0.045;
  const text = (caption || 'SUNSET HEIST').trim().toUpperCase();
  const tagText = (tag || 'VICE CITY').trim().toUpperCase();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  // Tag line, letterspaced neon pink.
  const tagSize = Math.round(band * 0.16);
  ctx.font = `${tagSize}px Anton, sans-serif`;
  ctx.fillStyle = '#ff5fa2';
  const ls = tagSize * 0.35;
  let tx = pad;
  for (const ch of tagText) {
    ctx.fillText(ch, tx, y0 + band * 0.26);
    tx += ctx.measureText(ch).width + ls;
  }
  // Big caption: white fill, thick dark outline, slight tilt.
  ctx.save();
  ctx.translate(pad, y0 + band * 0.88);
  ctx.rotate(-0.015);
  const capSize = fitFont(ctx, text, w - pad * 2, Math.round(band * 0.52));
  ctx.font = `${capSize}px Anton, sans-serif`;
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(3, capSize * 0.09);
  ctx.strokeStyle = '#12041f';
  ctx.strokeText(text, 0, 0);
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(255, 46, 136, 0.55)';
  ctx.shadowBlur = capSize * 0.12;
  ctx.fillText(text, 0, 0);
  ctx.restore();
  // Neon underline under the caption.
  const uw = Math.min(w * 0.34, ctx.measureText(text).width * 0.9);
  const ug = ctx.createLinearGradient(pad, 0, pad + uw, 0);
  ug.addColorStop(0, '#ff2e88');
  ug.addColorStop(1, '#ffb03d');
  ctx.fillStyle = ug;
  ctx.fillRect(pad, h - band * 0.07, uw, Math.max(3, band * 0.03));
}

/** Draws the whole cover. `state`: { photos[3], crops[3], caption, tag, grade }.
 *  Photos are HTMLImageElements or null. Deterministic: same inputs, same pixels. */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const { panels, band } = layoutFor(w, h);
  ctx.fillStyle = '#0a0414';
  ctx.fillRect(0, 0, w, h);
  const grade = state.grade == null ? 1 : state.grade;
  panels.forEach((poly, i) => {
    drawPanelPhoto(ctx, poly, state.photos[i] || null, state.crops[i] || {}, w, h);
    gradePanel(ctx, poly, grade, w, h);
  });
  strokePanels(ctx, panels, w);
  drawCaptionBand(ctx, w, h, band, state.caption, state.tag);
  grain(ctx, w, h);
}

/** Renders the cover at an export size into a fresh canvas. */
export function renderCover(size, state) {
  const canvas = document.createElement('canvas');
  canvas.width = size.w;
  canvas.height = size.h;
  drawCover(canvas, state);
  return canvas;
}
