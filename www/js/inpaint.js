// 涂抹去水印：把笔迹栅格化成遮罩，再从边缘向内逐层扩散填充（onion-peel inpainting）

function rasterize(strokes, w, h, dilate) {
  const m = new Uint8Array(w * h)
  const d = dilate || 0
  const stamp = (cx, cy, r) => {
    const x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(w - 1, Math.ceil(cx + r))
    const y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(h - 1, Math.ceil(cy + r))
    const r2 = r * r
    for (let y = y0; y <= y1; y++) {
      const dy = y - cy
      for (let x = x0; x <= x1; x++) {
        const dx = x - cx
        if (dx * dx + dy * dy <= r2) m[y * w + x] = 1
      }
    }
  }
  strokes.forEach(s => {
    const r = s.r + d
    const p = s.pts
    stamp(p[0][0], p[0][1], r)
    for (let i = 1; i < p.length; i++) {
      const ax = p[i - 1][0], ay = p[i - 1][1], bx = p[i][0], by = p[i][1]
      const dist = Math.hypot(bx - ax, by - ay)
      const n = Math.max(1, Math.ceil(dist / Math.max(1, r / 2)))
      for (let j = 1; j <= n; j++) stamp(ax + (bx - ax) * j / n, ay + (by - ay) * j / n, r)
    }
  })
  return m
}

function inpaint(data, w, h, mask, smoothPasses) {
  const known = new Uint8Array(w * h)
  let todo = []
  for (let i = 0; i < w * h; i++) {
    if (mask[i]) todo.push(i)
    else known[i] = 1
  }
  const region = todo.slice()
  let guard = 0
  while (todo.length && guard++ < 5000) {
    const next = []
    const fill = []
    for (let t = 0; t < todo.length; t++) {
      const i = todo[t]
      const x = i % w, y = (i / w) | 0
      let r = 0, g = 0, b = 0, n = 0
      for (let dy = -1; dy <= 1; dy++) {
        const ny = y + dy
        if (ny < 0 || ny >= h) continue
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue
          const nx = x + dx
          if (nx < 0 || nx >= w) continue
          const j = ny * w + nx
          if (known[j]) {
            const k = j * 4
            const wt = (dx && dy) ? 0.7 : 1
            r += data[k] * wt; g += data[k + 1] * wt; b += data[k + 2] * wt; n += wt
          }
        }
      }
      if (n > 0) fill.push(i, r / n, g / n, b / n)
      else next.push(i)
    }
    if (!fill.length) break
    for (let f = 0; f < fill.length; f += 4) {
      const i = fill[f], k = i * 4
      data[k] = fill[f + 1]; data[k + 1] = fill[f + 2]; data[k + 2] = fill[f + 3]; data[k + 3] = 255
      known[i] = 1
    }
    todo = next
  }
  // 平滑，消除扩散留下的条纹
  const passes = smoothPasses || 0
  for (let p = 0; p < passes; p++) {
    for (let t = 0; t < region.length; t++) {
      const i = region[t]
      const x = i % w, y = (i / w) | 0
      let r = 0, g = 0, b = 0, n = 0
      for (let dy = -1; dy <= 1; dy++) {
        const ny = y + dy
        if (ny < 0 || ny >= h) continue
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx
          if (nx < 0 || nx >= w) continue
          const k = (ny * w + nx) * 4
          r += data[k]; g += data[k + 1]; b += data[k + 2]; n++
        }
      }
      const k = i * 4
      data[k] = r / n; data[k + 1] = g / n; data[k + 2] = b / n
    }
  }
}

export { rasterize, inpaint }
