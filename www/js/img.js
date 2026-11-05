// 图片处理通用工具（浏览器 Canvas）
import * as store from './store.js'

export const MAX_SIDE = 4096

export function fmtSize(b) {
  if (!b) return '0 KB'
  if (b < 1024) return b + ' B'
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB'
  return (b / 1048576).toFixed(2) + ' MB'
}

export function extOf(file) {
  const t = (file && file.type) || ''
  let e = t.split('/')[1] || ((file && file.name) || '').split('.').pop() || 'img'
  e = e.toUpperCase()
  if (e === 'JPEG') e = 'JPG'
  if (e === 'X-MS-BMP') e = 'BMP'
  return e
}

export function loadImage(src) {
  return new Promise((res, rej) => {
    const im = new Image()
    im.onload = () => res(im)
    im.onerror = () => rej(new Error('图片加载失败'))
    im.src = src instanceof Blob ? URL.createObjectURL(src) : src
  })
}

export function fitMax(w, h, max) {
  const s = Math.min(1, (max || MAX_SIDE) / Math.max(w, h))
  return { w: Math.max(1, Math.round(w * s)), h: Math.max(1, Math.round(h * s)), s }
}

export function makeCanvas(w, h, bg) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d', { willReadFrequently: true })
  if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h) }
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  return { c, ctx }
}

const MIME = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', bmp: 'image/bmp' }

export async function toBlob(c, type = 'jpg', q = 0.92) {
  type = type.toLowerCase()
  if (type === 'bmp') return encodeBMP(c)
  const b = await new Promise(r => c.toBlob(r, MIME[type] || MIME.jpg, q))
  if (!b) throw new Error('导出失败')
  if (type === 'webp' && b.type !== 'image/webp') throw new Error('当前浏览器不支持导出 WEBP')
  return b
}

export function encodeBMP(c) {
  const w = c.width, h = c.height
  const src = c.getContext('2d').getImageData(0, 0, w, h).data
  const rowSize = Math.ceil(w * 3 / 4) * 4
  const dataSize = rowSize * h
  const buf = new ArrayBuffer(54 + dataSize)
  const dv = new DataView(buf)
  dv.setUint8(0, 0x42); dv.setUint8(1, 0x4D)
  dv.setUint32(2, 54 + dataSize, true); dv.setUint32(10, 54, true)
  dv.setUint32(14, 40, true); dv.setInt32(18, w, true); dv.setInt32(22, h, true)
  dv.setUint16(26, 1, true); dv.setUint16(28, 24, true); dv.setUint32(34, dataSize, true)
  dv.setInt32(38, 2835, true); dv.setInt32(42, 2835, true)
  const out = new Uint8Array(buf)
  for (let y = 0; y < h; y++) {
    const row = 54 + (h - 1 - y) * rowSize
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4, o = row + x * 3, a = src[i + 3] / 255
      out[o] = Math.round(src[i + 2] * a + 255 * (1 - a))
      out[o + 1] = Math.round(src[i + 1] * a + 255 * (1 - a))
      out[o + 2] = Math.round(src[i] * a + 255 * (1 - a))
    }
  }
  return new Blob([buf], { type: 'image/bmp' })
}

export function fileName(prefix, ext) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext.toLowerCase()}`
}

// 统一结果对象
export function result(blob, prefix, ext) {
  const name = fileName(prefix || 'qutu', ext || (blob.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg'))
  store.record(name)
  return { blob, url: URL.createObjectURL(blob), name, size: blob.size }
}

// 画布 → 结果
export async function canvasResult(c, type, q, prefix) {
  const b = await toBlob(c, type, q)
  return result(b, prefix, type)
}
