import { cleanTip, pickFiles, toast, loading, hideLoading, paint } from '../ui.js'
import { loadImage, fitMax, makeCanvas, canvasResult } from '../img.js'
import { saveResults } from '../platform.js'

const PRESETS = [['800x800', '800×800 主图'], ['1080x1440', '1080×1440 小红书'], ['1080x1920', '1080×1920 竖屏'], ['1920x1080', '1920×1080 横屏']]

export default {
  title: '批量改尺寸大小',
  render(root) {
    let list = [], done = false
    root.innerHTML = `<div class="card"><div class="card-title">目标分辨率（像素）</div>
        <div class="size-row"><input class="input" id="w" inputmode="numeric" placeholder="宽"><span class="x">×</span><input class="input" id="h" inputmode="numeric" placeholder="高" disabled></div>
        <label class="row switch"><span class="label">等比例（按宽度，每张自动算高）</span><input type="checkbox" id="lock" checked></label>
        <div class="chips" id="pre">${PRESETS.map(p => `<div class="chip" data-p="${p[0]}">${p[1]}</div>`).join('')}</div></div>
      <div class="card"><div class="card-title" id="cnt">图片（0/30）</div><div class="thumbs" id="thumbs"></div></div>
      ${cleanTip()}
      <div class="footer"><button class="btn ghost" id="left">上传图片</button><button class="btn" id="go">批量修改</button></div>`
    const $ = s => root.querySelector(s)
    const W = $('#w'), H = $('#h'), lock = $('#lock')

    const draw = () => {
      $('#cnt').textContent = `图片（${list.length}/30）`
      $('#left').textContent = done ? '全部保存' : '上传图片'
      $('#thumbs').innerHTML = list.map((it, i) => `<div class="thumb"><img src="${it.out ? it.out.url : it.url}"><div class="del" data-d="${i}">×</div>
        <div class="tag"><span>${it.msg || it.w + '×' + it.h}</span></div></div>`).join('') + '<div class="add-tile" id="add"><span class="plus">+</span><span>添加图片</span></div>'
      $('#add').onclick = choose
      root.querySelectorAll('[data-d]').forEach(n => { n.onclick = () => { list.splice(+n.dataset.d, 1); draw() } })
    }
    const syncH = () => { const f = list[0], v = parseInt(W.value); if (lock.checked && f && v) H.value = Math.round(v * f.h / f.w) }
    const choose = async () => {
      const files = await pickFiles({ multiple: true })
      for (const f of files) {
        try { const im = await loadImage(f); list.push({ im, url: im.src, w: im.naturalWidth, h: im.naturalHeight }) } catch (e) {}
      }
      list = list.slice(0, 30)
      if (!W.value && list[0]) { W.value = list[0].w; H.value = list[0].h }
      done = false; draw()
    }
    W.oninput = () => { done = false; syncH() }
    lock.onchange = () => { H.disabled = lock.checked; syncH() }
    $('#pre').onclick = e => { const c = e.target.closest('.chip'); if (!c) return; const [a, b] = c.dataset.p.split('x'); lock.checked = false; H.disabled = false; W.value = a; H.value = b }
    $('#left').onclick = () => (done ? saveResults(list.map(i => i.out)) : choose())
    $('#go').onclick = async () => {
      const w = parseInt(W.value), h = parseInt(H.value)
      if (!list.length) return toast('请先选择图片')
      if (!(w > 0) || (!lock.checked && !(h > 0))) return toast('请输入正确的尺寸')
      for (let i = 0; i < list.length; i++) {
        const it = list[i]
        loading(`处理中 ${i + 1}/${list.length}`); await paint()
        const f = fitMax(w, lock.checked ? Math.round(w * it.h / it.w) : h)
        const { c, ctx } = makeCanvas(f.w, f.h, '#ffffff')
        ctx.drawImage(it.im, 0, 0, f.w, f.h)
        it.out = await canvasResult(c, 'jpg', 0.92, 'resize')
        it.msg = `${f.w}×${f.h}`
      }
      hideLoading(); done = true; draw()
    }
    draw()
  }
}
