/**
 * Reduce y comprime las fotos antes de subirlas (el servidor acepta máx. 3 MB por imagen).
 * Corrige la orientación de la cámara (EXIF) y entrega siempre un JPEG.
 */
const LADO_MAX = 1600;
const MAX_BYTES = 2_500_000;

async function decodificar(archivo) {
  if ('createImageBitmap' in window) {
    try {
      // 'from-image' aplica la orientación EXIF de la foto.
      return await createImageBitmap(archivo, { imageOrientation: 'from-image' });
    } catch {
      // Algunos navegadores no aceptan la opción o el formato: se intenta con <img>.
    }
  }
  const url = URL.createObjectURL(archivo);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    return img;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

function aBlob(canvas, calidad) {
  return new Promise((resolver) => canvas.toBlob(resolver, 'image/jpeg', calidad));
}

/**
 * @param {File} archivo
 * @returns {Promise<Blob|null>} JPEG listo para subir, o null si no se pudo leer
 */
export async function comprimir(archivo) {
  try {
    const img = await decodificar(archivo);
    const ancho = img.width || img.naturalWidth;
    const alto = img.height || img.naturalHeight;
    if (!ancho || !alto) return null;

    const escala = Math.min(1, LADO_MAX / Math.max(ancho, alto));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(ancho * escala);
    canvas.height = Math.round(alto * escala);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff'; // las partes transparentes de un PNG quedan blancas, no negras
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    if (typeof img.close === 'function') img.close();

    let calidad = 0.82;
    let blob;
    do {
      blob = await aBlob(canvas, calidad);
      calidad -= 0.15;
    } while (blob && blob.size > MAX_BYTES && calidad > 0.3);
    return blob;
  } catch {
    return null;
  }
}
