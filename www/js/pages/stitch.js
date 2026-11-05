import { hero, cleanTip, pickFiles, toast, loading, hideLoading, paint, fail } from '../ui.js'
import { loadImage, fmtSize, makeCanvas, canvasResult, MAX_SIDE } from '../img.js'
import { saveResults } from '../platform.js'

export default {
  title: '图片拼接',
  render(root) {
    let list = []
    let res = null
    root.innerHTML = `${hero('高清拼图', '横拼 · 竖拼 · 长图')}
      <div class="card"><div class="row" style="margin-bottom:8px"><span class="card-title" style="margin:0" id="cnt">图片（0/20）</span><span class="tip" style="margin:0">按顺序拼接，点「←」前移</span></div>
        <div class="thumbs" id="thumbs"></div></div>
      <div id="result"></div>
      ${cleanTip()}
      <div class="footer"><button class="btn green" id="h">横向拼接</button><button class="btn pink" id="v">竖向拼接</button></div>`
    const $ = s => root.querySelector(s)

    const draw = () => {
      $('#cnt').textContent = `图片（${list.length}/20）`
      $('#thumbs').innerHTML = list.map((it, i) => `<div class="thumb"><img src="${it.url}"><div class="del" data-d="${i}">×</div>
        <div class="tag"><span>${i + 1}</span>${i ? `<span data-m="${i}" style="padding:0 6px;font-weight:700;cursor:pointer">←</span>` : ''}</div></div>`).join('') +
        (list.length < 20 ? '<div class="add-tile" id="add"><span class="plus">+</span><span>添加图片</span></div>' : '')
      const add = $('#add'); if (add) add.onclick = choose
      root.querySelectorAll('[data-d]').forEach(n => { n.onclick = () => { list.splice(+n.dataset.d, 1); clear() } })
      root.querySelectorAll('[data-m]').forEach(n => { n.onclick = () => { const i = +n.dataset.m; [list[i - 1], list[i]] = [list[i], list[i - 1]]; clear() } })
    }
    const clear = () => { res = null; $('#result').innerHTML = ''; draw() }
    const choose = async () => {
      const files = await pickFiles({ multiple: true })
      list = list.concat(files.map(f => ({ file: f, url: URL.createObjectURL(f) }))).slice(0, 20)
      clear()
    }
    const stitch = async dir => {
      if (list.length < 2) return toast('至少添加 2 张图片')
      loading('拼接中'); await paint()
      try {
        const ims = await Promise.all(list.map(it => loadImage(it.url)))
        let rects, W, H
        if (dir === 'h') {
          const base = Math.min(2400, ...ims.map(i => i.naturalHeight)); let x = 0
          rects = ims.map(i => { const w = i.naturalWidth * base / i.naturalHeight; const r = { x, y: 0, w, h: base }; x += w; return r })
          W = x; H = base
        } else {
          const base = Math.min(2400, ...ims.map(i => i.naturalWidth)); let y = 0
          rects = ims.map(i => { const h = i.naturalHeight * base / i.naturalWidth; const r = { x: 0, y, w: base, h }; y += h; return r })
          W = base; H = y
        }
        const s = Math.min(1, (MAX_SIDE * 2) / Math.max(W, H))
        const cw = Math.round(W * s), ch = Math.round(H * s)
        const { c, ctx } = makeCanvas(cw, ch, '#ffffff')
        ims.forEach((im, i) => { const r = rects[i]; ctx.drawImage(im, Math.round(r.x * s), Math.round(r.y * s), Math.ceil(r.w * s), Math.ceil(r.h * s)) })
        res = await canvasResult(c, 'jpg', 0.92, 'stitch')
        hideLoading()
        $('#result').innerHTML = `<div class="card"><div class="card-title">${dir === 'h' ? '横向' : '竖向'}拼接 · ${cw}×${ch} · ${fmtSize(res.size)}</div>
          <div class="scroll-box"><img class="preview" src="${res.url}"></div><button class="btn" id="save">保存到相册</button></div>`
        $('#save').onclick = () => saveResults([res])
        $('#result').scrollIntoView({ behavior: 'smooth' })
      } catch (e) { fail(e) }
    }
    $('#h').onclick = () => stitch('h')
    $('#v').onclick = () => stitch('v')
    draw()
  }
}
