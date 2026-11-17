// AI 去水印：LaMa（Samsung Research，Apache-2.0）量化版 lama_512_int8.onnx（62MB），本机运行
// 模型来源：https://huggingface.co/g-ronimo/lama ；APK 内置，网页版首次使用下载后缓存
import { isNative } from './platform.js'

const MODEL_LOCAL = new URL('../models/lama_512_int8.onnx', import.meta.url).href
const MODEL_REMOTE = 'https://huggingface.co/g-ronimo/lama/resolve/main/lama_512_int8.onnx'
const MODEL_PARTS = [0, 1, 2].map(i => new URL(`../models/lama_512_int8.onnx.part${i}`, import.meta.url).href) // Cloudflare Pages 单文件 ≤25MB，分片托管
const MODEL_BYTES = 62074990
const CACHE = 'qutu-models-v1'
const SIZE = 512

let worker = null, ready = null, seq = 0
const waiting = new Map()

function call(msg, transfer) {
  return new Promise((res, rej) => {
    const id = ++seq
    waiting.set(id, { res, rej })
    worker.postMessage({ ...msg, id }, transfer || [])
  })
}

async function download(url, onProgress) {
  const r = await fetch(url)
  if (!r.ok) throw new Error('HTTP ' + r.status)
  const total = +r.headers.get('content-length') || MODEL_BYTES
  if (!r.body || !r.body.getReader) return { buf: await r.arrayBuffer(), res: null }
  const reader = r.body.getReader(), parts = []
  let got = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    parts.push(value); got += value.length
    onProgress && onProgress(Math.min(1, got / total))
  }
  const buf = new Uint8Array(got)
  let o = 0
  for (const p of parts) { buf.set(p, o); o += p.length }
  return { buf: buf.buffer, type: r.headers.get('content-type') }
}

// 分片下载后拼接
async function downloadParts(onProgress) {
  const bufs = []
  let done = 0
  for (const url of MODEL_PARTS) {
    const g = await download(url, p => onProgress && onProgress(Math.min(1, (done + p * (MODEL_BYTES / MODEL_PARTS.length)) / MODEL_BYTES)))
    bufs.push(new Uint8Array(g.buf)); done += g.buf.byteLength
  }
  const out = new Uint8Array(done)
  let o = 0
  for (const b of bufs) { out.set(b, o); o += b.length }
  if (done !== MODEL_BYTES) throw new Error('模型分片不完整')
  return { buf: out.buffer }
}

async function loadModel(onProgress) {
  const hasCache = !isNative && 'caches' in self
  if (hasCache) {
    try {
      const c = await caches.open(CACHE)
      const hit = (await c.match(MODEL_LOCAL)) || (await c.match(MODEL_REMOTE))
      if (hit) return await hit.arrayBuffer()
    } catch (e) {}
  }
  let got = null, from = MODEL_LOCAL
  try {
    got = await download(MODEL_LOCAL, onProgress)
    if (got.buf.byteLength !== MODEL_BYTES) throw new Error('not model') // Cloudflare 对不存在的路径会回退到首页
  } catch (e) {
    try { got = await downloadParts(onProgress) } catch (e2) {
      from = MODEL_REMOTE
      got = await download(MODEL_REMOTE, onProgress)
    }
  }
  if (got.buf.byteLength < 1e7) throw new Error('模型文件不完整')
  if (hasCache) {
    try { const c = await caches.open(CACHE); await c.put(from, new Response(got.buf.slice(0))) } catch (e) {}
  }
  return got.buf
}

// 准备模型（只加载一次）。onStatus(text)
export function prepare(onStatus) {
  if (ready) return ready
  ready = (async () => {
    worker = new Worker(new URL('./lama-worker.js', import.meta.url), { type: 'module' })
    worker.onmessage = e => {
      const w = waiting.get(e.data.id); if (!w) return
      waiting.delete(e.data.id)
      e.data.ok ? w.res(e.data) : w.rej(new Error(e.data.error))
    }
    worker.onerror = e => { waiting.forEach(w => w.rej(new Error(e.message || 'AI 模块加载失败'))); waiting.clear() }
    onStatus && onStatus(isNative ? '加载 AI 模型' : '准备 AI 模型')
    const buf = await loadModel(p => onStatus && onStatus(`下载 AI 模型 ${Math.round(p * 100)}%（仅首次，62MB）`))
    onStatus && onStatus('初始化 AI 模型')
    await call({ type: 'init', model: buf }, [buf])
  })()
  ready.catch(() => { ready = null; if (worker) worker.terminate(); worker = null })
  return ready
}

export const isPrepared = () => !!ready

// 把遮罩分成若干块（相距较远的水印各自单独修复，保证分辨率）
function regions(mask, w, h) {
  const G = 8, gw = Math.ceil(w / G), gh = Math.ceil(h / G)
  const grid = new Uint8Array(gw * gh)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (mask[y * w + x]) grid[((y / G) | 0) * gw + ((x / G) | 0)] = 1
  const seen = new Uint8Array(gw * gh), boxes = []
  for (let s = 0; s < grid.length; s++) {
    if (!grid[s] || seen[s]) continue
    let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1
    const st = [s]; seen[s] = 1
    while (st.length) {
      const i = st.pop(), x = i % gw, y = (i / gw) | 0
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        const nx = x + dx, ny = y + dy
        if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue
        const j = ny * gw + nx
        if (grid[j] && !seen[j]) { seen[j] = 1; st.push(j) }
      }
    }
    boxes.push([x0 * G, y0 * G, Math.min(w, (x1 + 1) * G), Math.min(h, (y1 + 1) * G)])
  }
  const crop = b => {
    const bw = b[2] - b[0], bh = b[3] - b[1]
    const s = Math.max(Math.min(512, Math.max(w, h)), Math.round(Math.max(bw, bh) * 1.25 + 48))
    const cw = Math.min(w, s), ch = Math.min(h, s)
    let cx = Math.round((b[0] + b[2]) / 2 - cw / 2), cy = Math.round((b[1] + b[3]) / 2 - ch / 2)
    cx = Math.max(0, Math.min(w - cw, cx)); cy = Math.max(0, Math.min(h - ch, cy))
    return [cx, cy, cw, ch]
  }
  // 大区域切成 ≤384px 的小块逐块修复，让每块都能以原分辨率送进 512×512 模型
  const CH = 384, out = []
  for (const b of boxes) {
    const nx = Math.ceil((b[2] - b[0]) / CH), ny = Math.ceil((b[3] - b[1]) / CH)
    const sx = (b[2] - b[0]) / nx, sy = (b[3] - b[1]) / ny
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const box = [Math.round(b[0] + i * sx), Math.round(b[1] + j * sy), Math.round(b[0] + (i + 1) * sx), Math.round(b[1] + (j + 1) * sy)]
      out.push({ box, crop: crop(box) })
    }
  }
  return out
}


const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c }

// canvas：要修复的画布（原地修改）；mask：Uint8Array(w*h)，1 = 需要修复
export async function lamaInpaint(canvas, mask, onStatus) {
  await prepare(onStatus)
  const W = canvas.width, H = canvas.height, ctx = canvas.getContext('2d')
  const list = regions(mask, W, H)
  for (let r = 0; r < list.length; r++) {
    const [cx, cy, cw, ch] = list[r].crop, [bx0, by0, bx1, by1] = list[r].box
    onStatus && onStatus(list.length > 1 ? `AI 修复中 ${r + 1}/${list.length}` : 'AI 修复中')
    // 遮罩画布（原分辨率）
    // mc：送进模型的遮罩（裁剪框内全部水印）；pc：本块要贴回的部分
    const mc = mk(cw, ch), mctx = mc.getContext('2d'), pc = mk(cw, ch), pctx = pc.getContext('2d')
    const md = mctx.createImageData(cw, ch), pd = pctx.createImageData(cw, ch)
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
      if (!mask[(cy + y) * W + cx + x]) continue
      const k = (y * cw + x) * 4
      md.data[k] = md.data[k + 1] = md.data[k + 2] = md.data[k + 3] = 255
      const gx = cx + x, gy = cy + y
      if (gx >= bx0 - 2 && gx < bx1 + 2 && gy >= by0 - 2 && gy < by1 + 2) pd.data[k] = pd.data[k + 1] = pd.data[k + 2] = pd.data[k + 3] = 255
    }
    mctx.putImageData(md, 0, 0); pctx.putImageData(pd, 0, 0)
    // 缩放到 512×512
    const ic = mk(SIZE, SIZE), ictx = ic.getContext('2d')
    ictx.imageSmoothingQuality = 'high'
    ictx.drawImage(canvas, cx, cy, cw, ch, 0, 0, SIZE, SIZE)
    const sc = mk(SIZE, SIZE), sctx = sc.getContext('2d')
    sctx.drawImage(mc, 0, 0, cw, ch, 0, 0, SIZE, SIZE)
    const px = ictx.getImageData(0, 0, SIZE, SIZE).data, mp = sctx.getImageData(0, 0, SIZE, SIZE).data
    const N = SIZE * SIZE, input = new Float32Array(N * 4)
    const m512 = new Uint8Array(N)
    for (let i = 0; i < N; i++) if (mp[i * 4 + 3] > 8) m512[i] = 1
    // 遮罩向外扩 3px，覆盖水印的抗锯齿边缘
    const dil = new Uint8Array(N)
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
      if (!m512[y * SIZE + x]) continue
      for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
        const nx = x + dx, ny = y + dy
        if (nx >= 0 && ny >= 0 && nx < SIZE && ny < SIZE) dil[ny * SIZE + nx] = 1
      }
    }
    for (let i = 0; i < N; i++) {
      const m = dil[i], k = i * 4
      input[i] = m ? 0 : px[k] / 255
      input[N + i] = m ? 0 : px[k + 1] / 255
      input[2 * N + i] = m ? 0 : px[k + 2] / 255
      input[3 * N + i] = m
    }
    const { output } = await call({ type: 'run', input }, [input.buffer])
    let mx = 0
    for (let i = 0; i < 4096; i++) if (output[i * 61 % (3 * N)] > mx) mx = output[i * 61 % (3 * N)]
    const scale = mx > 2 ? 1 : 255
    const od = ictx.createImageData(SIZE, SIZE)
    for (let i = 0; i < N; i++) {
      const k = i * 4
      od.data[k] = output[i] * scale; od.data[k + 1] = output[N + i] * scale; od.data[k + 2] = output[2 * N + i] * scale; od.data[k + 3] = 255
    }
    ictx.putImageData(od, 0, 0)
    // 只把遮罩区域（羽化边缘）贴回原图
    const rc = mk(cw, ch), rctx = rc.getContext('2d')
    rctx.imageSmoothingQuality = 'high'
    rctx.drawImage(ic, 0, 0, SIZE, SIZE, 0, 0, cw, ch)
    const fc = mk(cw, ch), fctx = fc.getContext('2d')
    const grow = Math.max(2, Math.round(cw / SIZE * 3))
    fctx.filter = `blur(${Math.max(1, grow / 2)}px)`
    for (let a = 0; a < 8; a++) fctx.drawImage(pc, Math.cos(a * Math.PI / 4) * grow, Math.sin(a * Math.PI / 4) * grow)
    fctx.drawImage(pc, 0, 0)
    fctx.filter = 'none'
    rctx.globalCompositeOperation = 'destination-in'
    rctx.drawImage(fc, 0, 0)
    ctx.drawImage(rc, cx, cy)
  }
}
