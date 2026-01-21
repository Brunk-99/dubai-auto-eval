// Image compression and handling utilities

// Kleinere Bilder für localStorage-Kompatibilität (5MB Limit)
const MAX_WIDTH = 800;
const MAX_HEIGHT = 800;
const QUALITY = 0.6;

export async function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        // Calculate new dimensions
        if (width > height) {
          if (width > MAX_WIDTH) {
            height = (height * MAX_WIDTH) / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = (width * MAX_HEIGHT) / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to base64 JPEG
        const base64 = canvas.toDataURL('image/jpeg', QUALITY);
        console.log(`[Image] Compressed to ${width}x${height}, ~${Math.round(base64.length/1024)}KB`);
        resolve(base64);
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target.result;
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export function isValidImageType(file) {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
  return validTypes.includes(file.type.toLowerCase());
}

export function getImageSizeKB(base64String) {
  // Rough estimate of base64 size
  const padding = (base64String.match(/=/g) || []).length;
  const base64Length = base64String.length;
  const sizeInBytes = (base64Length * 0.75) - padding;
  return Math.round(sizeInBytes / 1024);
}
