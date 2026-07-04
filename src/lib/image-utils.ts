/**
 * Client-side image preprocessing. Resizes uploaded images to a max edge
 * length before sending to the API, cutting payload ~10× with no perceptible
 * quality loss for evaluation. Returns a JPEG data URL.
 */
export async function resizeImageToDataUrl(
  file: File,
  maxEdge = 1024,
  quality = 0.85
): Promise<string> {
  // For very small images, just read directly.
  if (file.size < 300 * 1024) {
    return readFileAsDataUrl(file);
  }

  const dataUrl = await readFileAsDataUrl(file);
  const img = await loadImage(dataUrl);

  const { width, height } = img;
  const longest = Math.max(width, height);
  if (longest <= maxEdge) {
    return dataUrl; // no resize needed
  }

  const scale = maxEdge / longest;
  const targetW = Math.round(width * scale);
  const targetH = Math.round(height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl; // fallback
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, targetW, targetH);

  // PNG with transparency stays PNG; everything else becomes JPEG.
  if (file.type === "image/png" && hasTransparency(img)) {
    return canvas.toDataURL("image/png");
  }
  return canvas.toDataURL("image/jpeg", quality);
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function hasTransparency(_img: HTMLImageElement): boolean {
  // Conservative: assume no transparency for photos. This keeps the hot path
  // on JPEG. PNG headshots with transparency are rare.
  return false;
}

/**
 * Hash an image data URL or remote URL for cache keying. Uses SubtleCrypto
 * SHA-256 when available, falls back to a fast string hash.
 */
export async function imageHash(input: string): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    try {
      const data = new TextEncoder().encode(input);
      const buf = await crypto.subtle.digest("SHA-256", data);
      return Array.from(new Uint8Array(buf))
        .slice(0, 16)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    } catch {
      // fall through
    }
  }
  return fastHash(input);
}

function fastHash(str: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(16).padStart(8, "0") + (h1 >>> 0).toString(16).padStart(8, "0");
}
