// 圆形头像裁剪 / 快速裁剪：拖动 + 双指缩放 + 滑块缩放
import { uploadBox, cleanTip, pickFiles, toast, loading, hideLoading, paint, fail } from '../ui.js'
import { loadImage, makeCanvas, canvasResult } from '../img.js'
import { saveResults } from '../platform.js'

const RATIOS = [{ n: '原比例', r: 0 }, { n: '1:1', r: 1 }, { n: '3:4', r: 3 / 4 }, { n: '4:3', r: 4 / 3 }, { n: '9:16', r: 9 / 16 }, { n: '16:9', r: 16 / 9 }]

export default {
  title: q => (q.get('mode') === 'quick' ? '图片快速裁剪' : '图片圆形裁剪'),
  render(root, q) {
    const circle = q.get('mode') !== 'quick'
    let im = null, ri = 1, fw = 0, fh = 0, base = 1, zoom = 1, x = 0, y = 0, res = null
    const pointers = new Map()
    let start = null

    root.innerHTML = `<div class="card" id="box">${uploadBox(circle ? '选择要做成圆形头像的图片' : '选择要裁剪的图片')}</div>
      <div id="result"></div>${cleanTip()}
      <div class="footer"><button class="btn ghost" id="pick">上传图片</button><button class="btn" id="go" disabled>确认裁剪</button></div>`
    const $ = s => root.querySelector(s)

    const apply = () => {
      const s = base * zoom, dw = im.naturalWidth * s, dh = im.naturalHeight * s
      x = Math.min(0, Math.max(fw - dw, x)); y = Math.min(0, Math.max(fh - dh, y))
      const img = $('#cimg')
      img.style.cssText = `left:${x}px;top:${y}px;width:${dw}px;height:${dh}px`
      $('#zv').textContent = Math.round(zoom * 100) + '%'
      $('#zoom').value = Math.round(zoom * 100)
    }
    const setZoom = z => {
      z = Math.max(1, Math.min(5, z))
      const r = z / zoom, cx = fw / 2, cy = fh / 2
      x = cx - (cx - x) * r; y = cy - (cy - y) * r; zoom = z; apply()
    }
    const layout = () => {
      const maxW = $('#box').clientWidth - 32, maxH = window.innerHeight * 0.5
      const r = circle ? 1 : (RATIOS[ri].r || im.naturalWidth / im.naturalHeight)
      fw = maxW; fh = fw / r
      if (fh > maxH) { fh = maxH; fw = fh * r }
      fw = Math.floor(fw); fh = Math.floor(fh)
      const cb = $('#cbox'); cb.style.width = fw + 'px'; cb.style.height = fh + 'px'
      base = Math.max(fw / im.naturalWidth, fh / im.naturalHeight); zoom = 1
      x = (fw - im.naturalWidth * base) / 2; y = (fh - im.naturalHeight * base) / 2
      apply()
    }
    const choose = async () => {
      const [f] = await pickFiles()
      if (!f) return
      try {
        im = await loadImage(f)
        $('#box').innerHTML = `<div class="crop-box" id="cbox"><img id="cimg" src="${im.src}" draggable="false"><div class="mask ${circle ? 'round' : 'rect'}"></div></div>
          <div class="tip">单指拖动 · 双指缩放</div>
          <div class="row"><span class="label">缩放</span><span class="red" id="zv">100%</span></div>
          <input type="range" id="zoom" min="100" max="500" value="100">
          ${circle ? '' : `<div class="chips" id="ratios">${RATIOS.map((r, i) => `<div class="chip ${i === ri ? 'on' : ''}" data-i="${i}">${r.n}</div>`).join('')}</div>`}`
        $('#pick').textContent = '更换图片'; $('#go').disabled = false; $('#result').innerHTML = ''
        bind(); layout()
      } catch (e) { fail(e) }
    }
    const bind = () => {
      const cb = $('#cbox')
      $('#zoom').oninput = e => setZoom(e.target.value / 100)
      const rs = $('#ratios')
      if (rs) rs.onclick = e => { const c = e.target.closest('.chip'); if (!c) return; ri = +c.dataset.i; rs.querySelectorAll('.chip').forEach(n => n.classList.toggle('on', n === c)); layout() }
      cb.addEventListener('wheel', e => { e.preventDefault(); setZoom(zoom * (e.deltaY < 0 ? 1.08 : 0.92)) }, { passive: false })
      cb.addEventListener('pointerdown', e => {
        cb.setPointerCapture(e.pointerId); pointers.set(e.pointerId, [e.clientX, e.clientY]); begin()
      })
      cb.addEventListener('pointermove', e => {
        if (!pointers.has(e.pointerId)) return
        pointers.set(e.pointerId, [e.clientX, e.clientY])
        const p = [...pointers.values()]
        if (p.length >= 2 && start.d) {
          setZoom(start.z * Math.hypot(p[0][0] - p[1][0], p[0][1] - p[1][1]) / start.d)
        } else if (p.length === 1) {
          x = start.x + p[0][0] - start.px; y = start.y + p[0][1] - start.py; apply()
        }
      })
      const end = e => { pointers.delete(e.pointerId); begin() }
      cb.addEventListener('pointerup', end); cb.addEventListener('pointercancel', end)
    }
    const begin = () => {
      const p = [...pointers.values()]
      start = { x, y, z: zoom, px: p[0] ? p[0][0] : 0, py: p[0] ? p[0][1] : 0, d: p.length >= 2 ? Math.hypot(p[0][0] - p[1][0], p[0][1] - p[1][1]) : 0 }
    }

    root.addEventListener('click', e => { if (e.target.closest('#up')) choose() })
    $('#pick').onclick = choose
    $('#go').onclick = async () => {
      if (!im) return toast('请先选择图片')
      loading('裁剪中'); await paint()
      try {
        const s = base * zoom
        const sx = -x / s, sy = -y / s, sw = fw / s, sh = fh / s
        const k = Math.min(1, 2048 / Math.max(sw, sh))
        const ow = Math.max(1, Math.round(sw * k)), oh = Math.max(1, Math.round(sh * k))
        const { c, ctx } = makeCanvas(ow, oh, circle ? null : '#ffffff')
        if (circle) { ctx.beginPath(); ctx.arc(ow / 2, oh / 2, ow / 2, 0, Math.PI * 2); ctx.closePath(); ctx.clip() }
        ctx.drawImage(im, sx, sy, sw, sh, 0, 0, ow, oh)
        res = await canvasResult(c, circle ? 'png' : 'jpg', 0.95, circle ? 'avatar' : 'crop')
        hideLoading()
        $('#result').innerHTML = `<div class="card"><div class="card-title">裁剪结果 · ${ow}×${oh}</div>
          <div class="checker"><img src="${res.url}" style="${circle ? 'border-radius:50%' : ''}"></div>
          <button class="btn" id="save">保存到相册</button></div>`
        $('#save').onclick = () => saveResults([res])
        $('#result').scrollIntoView({ behavior: 'smooth' })
      } catch (e) { fail(e) }
    }
  }
}
