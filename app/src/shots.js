// Fixed scenes for screenshots: ?shot=editor shows the editor with sample photos
// loaded; ?shot=cover shows the cover alone on the page. `photo` picks the sample
// for all panels; `photo0`, `photo1`, `photo2` pick one per panel. window.__shotReady
// is set once the cover has been painted.
export async function runShot(shot, query, load) {
  const fallback = query.get('photo') ?? 'pier';
  const samples = [
    query.get('photo0') ?? fallback,
    query.get('photo1') ?? fallback,
    query.get('photo2') ?? fallback,
  ];
  const caption = query.get('caption') ?? 'Sunset Heist';
  const tag = query.get('tag') ?? 'Vice City';
  if (shot === 'cover') document.body.classList.add('shot-cover');
  await load(samples, caption, tag);
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
