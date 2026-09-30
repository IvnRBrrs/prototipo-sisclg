const MAX_THUMB_WIDTH = 200

export function createThumbnail(base64Data: string, type: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, MAX_THUMB_WIDTH / img.width)
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)

      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('Canvas 2D not available')); return }
      ctx.imageSmoothingEnabled = true
      ctx.drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL(type, 0.7).split(',')[1])
    }
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = `data:${type};base64,${base64Data}`
  })
}
