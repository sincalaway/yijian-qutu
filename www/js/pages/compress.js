import { uploadBox, cleanTip, pickFiles, toast, loading, hideLoading, paint, sheet, fail, esc } from '../ui.js'
import { loadImage, fmtSize, fitMax, makeCanvas, canvasResult, MAX_SIDE } from '../img.js'
import { saveResults } from '../platform.js'

export default {
  title: '图片压缩',
  render(root) {
    const s = { file: null, im: null, w: 0, h: 0, size: 0, quality: 80, scale: 80, custom: false, tw: 0, th: 0, result: null }
    root.innerHTML = `
      <div class="card" id="top">${uploadBox('上传图片')}</div>
      <div class="card"><div class="info-grid">
        <div class="info"><div class="info-title">原图信息</div>
          <div class="row"><span class="label">大小</span><span class="val" id="oSize">-</span></div>
          <div class="row"><span class="label">尺寸</span><span class="val" id="oDim">-</span></div></div>
        <div class="info est"><div class="info-title">预计调整后</div>
          <div class="row"><span class="label">大小</span><span class="val red" id="eSize">-</span></div>
          <div class="row"><span class="label">尺寸</span><span class="val red" id="eDim">-</span></div></div>
      </div></div>
      <div class="card">
        <div class="row"><span>压缩比例</span><span class="red" id="qv">80%</span></div>
        <input type="range" id="q" min="5" max="100" value="80">
        <div class="row"><span>尺寸比例</span><span class="red" id="sv">80%</span></div>
        <input type="range" id="sc" min="10" max="100" value="80">
        <div class="link" id="customBtn" style="text-align:center;padding:10px 0 2px">点击自定义尺寸大小 ›</div>
        <div class="tip">提示：压缩比例越小，压缩质量越高</div>
      </div>
      <div id="result"></div>
      ${cleanTip()}
      <div class="footer"><button class="btn ghost" id="pick">上传图片</button><button class="btn" id="go">一键压缩</button></div>`
    const $ = q => root.querySelector(q)

    const calc = () => {
      if (!s.w) return
      if (!s.custom) { s.tw = Math.max(1, Math.round(s.w * s.scale / 100)); s.th = Math.max(1, Math.round(s.h * s.scale / 100)) }
      const f = fitMax(s.tw, s.th); s.tw = f.w; s.th = f.h
      const est = s.size * (s.tw * s.th) / (s.w * s.h) * Math.pow(s.quality / 100, 1.6)
      $('#eSize').textContent = '约 ' + fmtSize(Math.min(est, s.size))
      $('#eDim').textContent = `${s.tw}×${s.th}`
    }
    const choose = async () => {
      const [f] = await pickFiles()
      if (!f) return
      try {
        s.file = f; s.im = await loadImage(f); s.w = s.im.naturalWidth; s.h = s.im.naturalHeight; s.size = f.size; s.custom = false
        $('#top').innerHTML = `<img class="preview" src="${s.im.src}">`
        $('#oSize').textContent = fmtSize(s.size); $('#oDim').textContent = `${s.w}×${s.h}`
        $('#sv').textContent = s.scale + '%'
        $('#result').innerHTML = ''
        calc()
      } catch (e) { fail(e) }
    }
    root.addEventListener('click', e => { if (e.target.closest('#up')) choose() })
    $('#pick').onclick = choose
    $('#q').oninput = e => { s.quality = +e.target.value; $('#qv').textContent = s.quality + '%'; calc() }
    $('#sc').oninput = e => { s.scale = +e.target.value; s.custom = false; $('#sv').textContent = s.scale + '%'; calc() }

    $('#customBtn').onclick = () => {
      if (!s.im) return toast('请先上传图片')
      const { root: m, close } = sheet(`<div class="card-title">自定义尺寸（像素）</div>
        <div class="size-row"><input class="input" id="iw" inputmode="numeric" value="${s.tw}"><span class="x">×</span><input class="input" id="ih" inputmode="numeric" value="${s.th}"></div>
        <label class="row switch"><span class="label">锁定宽高比</span><input type="checkbox" id="lock" checked></label>
        <button class="btn" id="ok">确定</button>`)
      const iw = m.querySelector('#iw'), ih = m.querySelector('#ih'), lock = m.querySelector('#lock')
      iw.oninput = () => { const v = parseInt(iw.value); if (lock.checked && v) ih.value = Math.max(1, Math.round(v * s.h / s.w)) }
      ih.oninput = () => { const v = parseInt(ih.value); if (lock.checked && v) iw.value = Math.max(1, Math.round(v * s.w / s.h)) }
      m.querySelector('#ok').onclick = () => {
        const tw = parseInt(iw.value), th = parseInt(ih.value)
        if (!(tw > 0 && th > 0)) return toast('请输入正确的宽高')
        if (Math.max(tw, th) > MAX_SIDE) return toast('单边最大 ' + MAX_SIDE + ' 像素')
        s.custom = true; s.tw = tw; s.th = th
        $('#sv').textContent = '自定义'
        close(); calc()
      }
    }

    $('#go').onclick = async () => {
      if (!s.im) return toast('请先上传图片')
      loading('压缩中'); await paint()
      try {
        const { c, ctx } = makeCanvas(s.tw, s.th, '#ffffff')
        ctx.drawImage(s.im, 0, 0, s.tw, s.th)
        s.result = await canvasResult(c, 'jpg', Math.max(0.05, s.quality / 100), 'compress')
        const saved = Math.max(0, Math.round((1 - s.result.size / s.size) * 100))
        hideLoading()
        $('#result').innerHTML = `<div class="card"><div class="card-title">压缩完成 · 减小 ${saved}%</div>
          <img class="preview" src="${s.result.url}">
          <div class="row"><span class="label">压缩后</span><span class="val red">${esc(fmtSize(s.result.size))} · ${s.tw}×${s.th}</span></div>
          <button class="btn" id="save">保存到相册</button></div>`
        $('#save').onclick = () => saveResults([s.result])
        $('#result').scrollIntoView({ behavior: 'smooth' })
      } catch (e) { fail(e) }
    }
  }
}
