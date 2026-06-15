const MAX_EDGE = 1200
const QUALITY = 0.82

export function compressImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const img = new window.Image()

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Failed to load image for compression'))
    }

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)

      let { width, height } = img
      if (Math.max(width, height) > MAX_EDGE) {
        if (width >= height) {
          height = Math.round((height * MAX_EDGE) / width)
          width = MAX_EDGE
        } else {
          width = Math.round((width * MAX_EDGE) / height)
          height = MAX_EDGE
        }
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('Canvas 2D context unavailable')); return }
      ctx.drawImage(img, 0, 0, width, height)

      const baseName = file.name.replace(/\.[^.]+$/, '')

      canvas.toBlob(
        (webpBlob) => {
          if (webpBlob) {
            resolve(new File([webpBlob], `${baseName}.webp`, { type: 'image/webp' }))
            return
          }
          // Fallback: WebP unsupported — try JPEG
          canvas.toBlob(
            (jpegBlob) => {
              if (jpegBlob) {
                resolve(new File([jpegBlob], `${baseName}.jpg`, { type: 'image/jpeg' }))
              } else {
                reject(new Error('Image compression produced no output'))
              }
            },
            'image/jpeg',
            QUALITY
          )
        },
        'image/webp',
        QUALITY
      )
    }

    img.src = objectUrl
  })
}
