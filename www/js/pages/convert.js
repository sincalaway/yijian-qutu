import { hero, cleanTip, pickFiles, toast, loading, hideLoading, paint, esc } from '../ui.js'
import { loadImage, fmtSize, fitMax, makeCanvas, canvasResult, extOf } from '../img.js'
import { saveResults } from '../platform.js'

const FORMATS = ['JPG', 'PNG', 'WEBP', 'BMP']

export default {
  title: '图片格式转换',
  render(root) {
    let target = 'PNG'
    let list = []
    let done = false
    root.innerHTML = `${hero('图片格式转换', '优雅·高效·专业')}
      <div class="card"><div class="card-title">转换为</div>
        <div class="chips" id="fmts">${FORMATS.map(f => `<div class="chip fmt ${f === target ? 'on' : ''}" data-f="${f}">${f}</div>`).join('')}</div>
        <div class="tip">支持 JPG、PNG、WEBP、BMP 互转，单次最多 20 张</div></div>
      <div id="main"></div>
      ${cleanTip()}
      <div class="footer" id="foot" style="display:none"><button class="btn ghost" id="left">选择图片</button><button class="btn" id="go">开始转换</button></div>`
    const $ = q => root.querySelector(q)

    const draw = () => {
      $('#foot').style.display = list.length ? 'flex' : 'none'
      $('#left').textContent = done ? '全部保存' : '选择图片'
      if (!list.length) {
        $('#main').innerHTML = `<div class="card center-card"><div class="cam-circle">📷</div>
          <div class="pick-title">选择图片文件</div><div class="pick-sub">从相册或拍照选择，可多选</div>
          <button class="btn" style="width:180px;margin-top:20px" id="pick2">选择图片</button></div>`
        $('#pick2').onclick = choose
        return
      }
      $('#main').innerHTML = `<div class="card"><div class="row"><span class="card-title" style="margin:0">已选 ${list.length} 张</span><span class="link" id="more">+ 继续添加</span></div>
        ${list.map((it, i) => `<div class="item"><img src="${it.out ? it.out.url : it.url}"><div class="item-main"><div>${it.ext} · ${fmtSize(it.file.size)}</div>
        <div class="item-out ${it.out ? 'ok' : ''}">${esc(it.msg || '→ ' + target)}</div></div><span class="item-del" data-i="${i}">✕</span></div>`).join('')}</div>`
      $('#more').onclick = choose
      root.querySelectorAll('.item-del').forEach(n => { n.onclick = () => { list.splice(+n.dataset.i, 1); draw() } })
    }
    const choose = async () => {
      const files = await pickFiles({ multiple: true })
      if (!files.length) return
      list = list.concat(files.map(f => ({ file: f, url: URL.createObjectURL(f), ext: extOf(f) }))).slice(0, 20)
      done = false
      draw()
    }
    $('#fmts').onclick = e => {
      const c = e.target.closest('.chip'); if (!c) return
      target = c.dataset.f
      root.querySelectorAll('#fmts .chip').forEach(n => n.classList.toggle('on', n === c))
      list.forEach(it => { it.out = null; it.msg = '' }); done = false; draw()
    }
    $('#left').onclick = () => (done ? saveResults(list.map(i => i.out)) : choose())
    $('#go').onclick = async () => {
      if (!list.length) return toast('请先选择图片')
      const t = target.toLowerCase()
      for (let i = 0; i < list.length; i++) {
        const it = list[i]
        loading(`转换中 ${i + 1}/${list.length}`); await paint()
        try {
          const im = await loadImage(it.url)
          const { w, h } = fitMax(im.naturalWidth, im.naturalHeight)
          const { c, ctx } = makeCanvas(w, h, (t === 'jpg' || t === 'bmp') ? '#ffffff' : null)
          ctx.drawImage(im, 0, 0, w, h)
          it.out = await canvasResult(c, t, 0.92, 'convert')
          it.msg = `${target} · ${fmtSize(it.out.size)}`
        } catch (e) { it.out = null; it.msg = '失败：' + (e.message || e) }
      }
      hideLoading(); done = true; draw()
    }
    draw()
  }
}
