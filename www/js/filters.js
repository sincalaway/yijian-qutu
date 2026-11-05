// 像素级滤镜：锐化、色彩、隐形水印（LSB）

function sharpen(imageData, amount) {
  const a = amount || 0.5
  const w = imageData.width, h = imageData.height, d = imageData.data
  const src = new Uint8ClampedArray(d)
  const w4 = w * 4
  const c = 1 + 4 * a
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w4 + x * 4
      for (let k = 0; k < 3; k++) {
        const j = i + k
        d[j] = src[j] * c - a * (src[j - 4] + src[j + 4] + src[j - w4] + src[j + w4])
      }
    }
  }
}

function colorBoost(imageData, sat, contrast) {
  const d = imageData.data
  const s = sat || 1.1, ct = contrast || 1.05
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2]
    const gray = 0.299 * r + 0.587 * g + 0.114 * b
    d[i] = ((gray + (r - gray) * s) - 128) * ct + 128
    d[i + 1] = ((gray + (g - gray) * s) - 128) * ct + 128
    d[i + 2] = ((gray + (b - gray) * s) - 128) * ct + 128
  }
}

function utf8Encode(str) {
  const out = []
  for (let i = 0; i < str.length; i++) {
    let c = str.charCodeAt(i)
    if (c >= 0xd800 && c <= 0xdbff && i + 1 < str.length) {
      c = 0x10000 + ((c - 0xd800) << 10) + (str.charCodeAt(++i) - 0xdc00)
    }
    if (c < 0x80) out.push(c)
    else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63))
    else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63))
    else out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63))
  }
  return out
}

function utf8Decode(bytes) {
  let s = '', i = 0
  while (i < bytes.length) {
    const b = bytes[i++]
    let c
    if (b < 0x80) c = b
    else if (b < 0xe0) c = ((b & 31) << 6) | (bytes[i++] & 63)
    else if (b < 0xf0) c = ((b & 15) << 12) | ((bytes[i++] & 63) << 6) | (bytes[i++] & 63)
    else c = ((b & 7) << 18) | ((bytes[i++] & 63) << 12) | ((bytes[i++] & 63) << 6) | (bytes[i++] & 63)
    if (c > 0xffff) { c -= 0x10000; s += String.fromCharCode(0xd800 + (c >> 10), 0xdc00 + (c & 1023)) }
    else s += String.fromCharCode(c)
  }
  return s
}

// 魔数 'QT' + 2 字节长度 + 内容，写入蓝色通道最低位
function embedText(imageData, text) {
  const body = utf8Encode(text).slice(0, 65535)
  const bytes = [0x51, 0x54, (body.length >> 8) & 255, body.length & 255].concat(body)
  const d = imageData.data
  if (bytes.length * 8 > d.length / 4) throw new Error('图片太小，放不下这么多文字')
  for (let b = 0; b < bytes.length; b++) {
    for (let bit = 0; bit < 8; bit++) {
      const px = (b * 8 + bit) * 4 + 2
      d[px] = (d[px] & 0xfe) | ((bytes[b] >> (7 - bit)) & 1)
    }
  }
}

function readText(imageData) {
  const d = imageData.data
  const total = d.length / 4
  const readByte = idx => {
    let v = 0
    for (let bit = 0; bit < 8; bit++) {
      const p = idx * 8 + bit
      if (p >= total) return -1
      v = (v << 1) | (d[p * 4 + 2] & 1)
    }
    return v
  }
  if (readByte(0) !== 0x51 || readByte(1) !== 0x54) return null
  const len = (readByte(2) << 8) | readByte(3)
  const out = []
  for (let i = 0; i < len; i++) out.push(readByte(4 + i))
  return utf8Decode(out)
}

export { sharpen, colorBoost, embedText, readText }
