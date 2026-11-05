import { uploadBox, cleanTip, pickFiles, toast, loading, hideLoading, paint, fail } from '../ui.js'
import { loadImage, fitMax, makeCanvas, canvasResult } from '../img.js'
import { saveResults } from '../platform.js'

export default {
  title: '图片添加圆角',
  render(root) {
    let im = null, radius = 10
    root.innerHTML = `<div class="card" id="box">${uploadBox('上传图片')}</div>
      <div class="card"><div class="row"><span>圆角大小</span><span class="red" id="rv">10%</span></div>
        <input type="range" id="r" min="0" max="50" value="10"><div class="tip">导出为透明背景 PNG</div></div>
      ${cleanTip()}
      <div class="footer"><button class="btn ghost" id="pick">上传图片</button><button class="btn" id="go" disabled>生成并保存</button></div>`
    const $ = s => root.querySelector(s)
    const prev = () => {
      const img = $('#pimg'); if (!img) return
      img.style.borderRadius = (Math.min(img.clientWidth, img.clientHeight) * radius / 100) + 'px'
    }
    const choose = async () => {
      const [f] = await pickFiles(); if (!f) return
      try {
        im = await loadImage(f)
        $('#box').innerHTML = `<img class="preview" id="pimg" style="background:transparent" src="${im.src}">`
        $('#pimg').onload = prev; prev()
        $('#go').disabled = false
      } catch (e) { fail(e) }
    }
    root.addEventListener('click', e => { if (e.target.closest('#up')) choose() })
    $('#pick').onclick = choose
    $('#r').oninput = e => { radius = +e.target.value; $('#rv').textContent = radius + '%'; prev() }
    $('#go').onclick = async () => {
      if (!im) return toast('请先上传图片')
      loading('生成中'); await paint()
      try {
        const { w, h } = fitMax(im.naturalWidth, im.naturalHeight)
        const r = Math.min(w, h) * radius / 100
        const { c, ctx } = makeCanvas(w, h)
        ctx.beginPath(); ctx.moveTo(r, 0)
        ctx.arcTo(w, 0, w, h, r); ctx.arcTo(w, h, 0, h, r); ctx.arcTo(0, h, 0, 0, r); ctx.arcTo(0, 0, w, 0, r)
        ctx.closePath(); ctx.clip()
        ctx.drawImage(im, 0, 0, w, h)
        const res = await canvasResult(c, 'png', 1, 'rounded')
        hideLoading()
        saveResults([res])
      } catch (e) { fail(e) }
    }
  }
}
