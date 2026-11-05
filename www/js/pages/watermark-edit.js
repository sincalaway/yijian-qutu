import { uploadBox, pickFiles, toast, loading, hideLoading, paint, modal, fail } from '../ui.js'
import { loadImage, fitMax, makeCanvas, canvasResult } from '../img.js'
import { rasterize, inpaint } from '../inpaint.js'
import { saveResults } from '../platform.js'
import config from '../config.js'

export default {
  title: q => (q.get('mode') === 'pro' ? '高级去水印' : '普通去水印'),
  render(root, q) {
    const pro = q.get('mode') === 'pro'
    let work = null, wctx = null   // 处理分辨率的画布（当前结果）
    let view = null, vctx = null, vw = 0, vh = 0, k = 1
    let strokes = [], cur = null, history = [], brush = 24, edited = false

    root.innerHTML = `<div class="editor">
      <div class="stage" id="stage">${uploadBox('上传带水印的图片')}</div>
      <div class="panel">
        <div class="row"><span class="label">画笔大小</span><span class="brush-dot" id="dot" style="width:24px;height:24px"></span></div>
        <input type="range" id="brush" min="8" max="80" value="24">
        <div class="tools">
          <div class="t" id="tPick">🖼<span>换图</span></div>
          <div class="t off" id="tUndo">↶<span>撤销</span></div>
          <div class="t off" id="tClear">⌫<span>清除涂抹</span></div>
          ${pro ? '<div class="t" id="tAuto">✨<span>一键去除</span></div>' : ''}
          <div class="t" id="tSave">⤓<span>保存</span></div>
        </div>
        <div class="clean-tip">涂抹红色区域覆盖水印 · 数据 24 小时后系统自动清除</div>
      </div>
      <div class="footer"><button class="btn ghost" id="pick">上传图片</button><button class="btn ${pro ? 'pink' : ''}" id="go" disabled>开始去除</button></div>
    </div>`
    const $ = s => root.querySelector(s)

    const sync = () => {
      $('#tUndo').classList.toggle('off', !(strokes.length || history.length))
      $('#tClear').classList.toggle('off', !strokes.length)
      $('#go').disabled = !strokes.length
    }
    const redraw = () => {
      if (!vctx) return
      vctx.clearRect(0, 0, vw, vh)
      vctx.drawImage(work, 0, 0, vw, vh)
      vctx.lineCap = 'round'; vctx.lineJoin = 'round'
      vctx.strokeStyle = vctx.fillStyle = 'rgba(255,40,60,0.5)'
      for (const s of strokes) {
        if (s.pts.length === 1) {
          vctx.beginPath(); vctx.arc(s.pts[0][0] / k, s.pts[0][1] / k, s.r / k, 0, Math.PI * 2); vctx.fill(); continue
        }
        vctx.lineWidth = s.r * 2 / k
        vctx.beginPath()
        s.pts.forEach((p, i) => (i ? vctx.lineTo(p[0] / k, p[1] / k) : vctx.moveTo(p[0] / k, p[1] / k)))
        vctx.stroke()
      }
    }
    const layout = () => {
      const stage = $('#stage')
      const maxW = stage.clientWidth - 32, maxH = window.innerHeight * 0.55
      vw = maxW; vh = vw * work.height / work.width
      if (vh > maxH) { vh = maxH; vw = vh * work.width / work.height }
      vw = Math.floor(vw); vh = Math.floor(vh); k = work.width / vw
      const dpr = window.devicePixelRatio || 2
      view.width = vw * dpr; view.height = vh * dpr
      view.style.width = vw + 'px'; view.style.height = vh + 'px'
      vctx = view.getContext('2d'); vctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      redraw()
    }
    const setWork = src => {
      const f = fitMax(src.width || src.naturalWidth, src.height || src.naturalHeight, 1600)
      const m = makeCanvas(f.w, f.h, '#ffffff'); m.ctx.drawImage(src, 0, 0, f.w, f.h)
      work = m.c; wctx = m.ctx
    }
    const choose = async () => {
      const [f] = await pickFiles()
      if (!f) return
      try {
        const im = await loadImage(f)
        setWork(im); strokes = []; history = []; edited = false
        if (!view) {
          $('#stage').innerHTML = '<canvas id="view"></canvas>'
          view = $('#view'); bindDraw()
        }
        layout(); sync()
      } catch (e) { fail(e) }
    }
    const pos = e => { const r = view.getBoundingClientRect(); return [(e.clientX - r.left) * k, (e.clientY - r.top) * k] }
    const bindDraw = () => {
      view.addEventListener('pointerdown', e => { view.setPointerCapture(e.pointerId); cur = { r: brush / 2 * k, pts: [pos(e)] }; strokes.push(cur); redraw() })
      view.addEventListener('pointermove', e => { if (!cur) return; cur.pts.push(pos(e)); redraw() })
      const end = () => { if (cur) { cur = null; sync() } }
      view.addEventListener('pointerup', end); view.addEventListener('pointercancel', end)
    }

    root.addEventListener('click', e => { if (e.target.closest('#up')) choose() })
    $('#pick').onclick = choose
    $('#tPick').onclick = choose
    $('#brush').oninput = e => { brush = +e.target.value; $('#dot').style.width = $('#dot').style.height = brush + 'px' }
    $('#tUndo').onclick = () => {
      if (strokes.length) strokes.pop()
      else if (history.length) { wctx.putImageData(history.pop(), 0, 0) }
      redraw(); sync()
    }
    $('#tClear').onclick = () => { strokes = []; redraw(); sync() }
    $('#go').onclick = async () => {
      if (!strokes.length) return toast('请先涂抹水印区域')
      loading('去除中'); await paint()
      try {
        const id = wctx.getImageData(0, 0, work.width, work.height)
        history.push(new ImageData(new Uint8ClampedArray(id.data), id.width, id.height))
        if (history.length > 8) history.shift()
        const mask = rasterize(strokes, work.width, work.height, pro ? 2 : 0)
        inpaint(id.data, work.width, work.height, mask, pro ? 8 : 3)
        wctx.putImageData(id, 0, 0)
        strokes = []; edited = true
        hideLoading(); redraw(); sync()
        toast('已去除，可继续涂抹')
      } catch (e) { fail(e) }
    }
    if (pro) $('#tAuto').onclick = async () => {
      if (!work) return toast('请先上传图片')
      if (!config.API_BASE) return modal({ title: '一键去除', content: '一键识别需接入服务端 AI 模型（js/config.js）。现在可直接涂抹水印区域，点「开始去除」。', cancel: false })
      loading('智能识别中')
      try {
        const blob = await new Promise(r => work.toBlob(r, 'image/jpeg', 0.95))
        const fd = new FormData(); fd.append('file', blob, 'image.jpg')
        const r = await fetch(config.API_BASE + config.PATHS.watermark, { method: 'POST', body: fd })
        const { url } = await r.json()
        const im = await loadImage(url)
        history.push(wctx.getImageData(0, 0, work.width, work.height))
        wctx.drawImage(im, 0, 0, work.width, work.height)
        edited = true; hideLoading(); redraw(); sync()
      } catch (e) { fail(e) }
    }
    $('#tSave').onclick = async () => {
      if (!work) return toast('请先上传图片')
      if (!edited) return toast('还没有去除过水印')
      try { await saveResults([await canvasResult(work, 'jpg', 0.95, 'nowatermark')]) } catch (e) { fail(e) }
    }
    const onResize = () => { if (work && view) layout() }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }
}
