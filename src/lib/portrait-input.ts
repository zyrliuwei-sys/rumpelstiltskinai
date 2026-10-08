/** Local-only image preparation: nothing leaves the browser until Generate. */
export async function preparePortrait(file: File) {
  if (
    !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
    file.size > 10 * 1024 * 1024
  )
    throw new Error('invalid');
  const bitmap = await createImageBitmap(file);
  try {
    if (Math.min(bitmap.width, bitmap.height) < 300) throw new Error('small');
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    if (Math.min(canvas.width, canvas.height) < 300) throw new Error('small');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('invalid');
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const value = canvas.toDataURL('image/jpeg', 0.88);
    if (value.length > 2_800_000) throw new Error('large');
    return value;
  } finally {
    bitmap.close();
  }
}
