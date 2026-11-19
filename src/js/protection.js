import { SITE_SETTINGS } from './data.js';

export function applyImageProtection(imgEl, wrapperEl) {
  if (!SITE_SETTINGS.enablePhotoProtection) return;

  if (imgEl) {
    imgEl.draggable = false;
    imgEl.classList.add('protected-media');
    imgEl.addEventListener('dragstart', (e) => e.preventDefault());
    imgEl.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  if (wrapperEl) {
    wrapperEl.classList.add('protected-media');
    wrapperEl.addEventListener('contextmenu', (e) => e.preventDefault());
    wrapperEl.addEventListener('dragstart', (e) => e.preventDefault());
  }
}

export async function downloadProtectedPhoto(photo) {
  if (!photo || !photo.src) return false;
  const safeName = `${(photo.id || 'photograph').replace(/[^a-z0-9-_]/gi, '-')}-jihad.jpg`;

  try {
    const response = await fetch(photo.src, { mode: 'cors' });
    if (!response.ok) throw new Error('Fetch failed');
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = safeName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
    return true;
  } catch {
    const fallbackLink = document.createElement('a');
    fallbackLink.href = photo.src;
    fallbackLink.download = safeName;
    fallbackLink.rel = 'noopener noreferrer';
    document.body.appendChild(fallbackLink);
    fallbackLink.click();
    fallbackLink.remove();
    return false;
  }
}
