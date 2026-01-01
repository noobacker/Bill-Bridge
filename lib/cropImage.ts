// Helper to crop an image file to a square or circle using canvas
export default function getCroppedImg(file: File, croppedAreaPixels: any, cropShape: 'rect' | 'round'): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = croppedAreaPixels.width;
        canvas.height = croppedAreaPixels.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject('No canvas context');
        if (cropShape === 'round') {
          ctx.save();
          ctx.beginPath();
          ctx.arc(
            croppedAreaPixels.width / 2,
            croppedAreaPixels.height / 2,
            Math.min(croppedAreaPixels.width, croppedAreaPixels.height) / 2,
            0,
            2 * Math.PI
          );
          ctx.closePath();
          ctx.clip();
        }
        ctx.drawImage(
          img,
          croppedAreaPixels.x,
          croppedAreaPixels.y,
          croppedAreaPixels.width,
          croppedAreaPixels.height,
          0,
          0,
          croppedAreaPixels.width,
          croppedAreaPixels.height
        );
        if (cropShape === 'round') ctx.restore();
        canvas.toBlob(blob => {
          if (blob) resolve(blob);
          else reject('Failed to crop image');
        }, 'image/png');
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
} 