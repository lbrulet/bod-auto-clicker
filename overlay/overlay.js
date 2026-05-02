const params = new URLSearchParams(window.location.search);
const offsetX = parseInt(params.get('offsetX') || '0');
const offsetY = parseInt(params.get('offsetY') || '0');

const sel = document.getElementById('selection');
const sizeLabel = document.getElementById('size-label');

let startX = 0, startY = 0, dragging = false;

document.addEventListener('mousedown', (e) => {
  startX = e.clientX;
  startY = e.clientY;
  dragging = true;
  sel.style.display = 'block';
  sizeLabel.style.display = 'block';
  updateSel(e.clientX, e.clientY);
});

document.addEventListener('mousemove', (e) => {
  if (!dragging) return;
  updateSel(e.clientX, e.clientY);
});

document.addEventListener('mouseup', (e) => {
  if (!dragging) return;
  dragging = false;

  const x = Math.min(e.clientX, startX);
  const y = Math.min(e.clientY, startY);
  const w = Math.abs(e.clientX - startX);
  const h = Math.abs(e.clientY - startY);

  if (w > 10 && h > 10) {
    window.overlayAPI.confirm({ x: x + offsetX, y: y + offsetY, width: w, height: h });
  } else {
    window.overlayAPI.cancel();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') window.overlayAPI.cancel();
});

function updateSel(mx, my) {
  const x = Math.min(mx, startX);
  const y = Math.min(my, startY);
  const w = Math.abs(mx - startX);
  const h = Math.abs(my - startY);

  sel.style.left   = x + 'px';
  sel.style.top    = y + 'px';
  sel.style.width  = w + 'px';
  sel.style.height = h + 'px';

  sizeLabel.textContent = `${w} × ${h}`;
  sizeLabel.style.left = (x + w + 6) + 'px';
  sizeLabel.style.top  = (y + h + 6) + 'px';
}
