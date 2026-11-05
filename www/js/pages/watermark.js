import { banner, hero, cleanTip, go } from '../ui.js'

export default {
  title: '智能图片去水印',
  render(root) {
    root.innerHTML = `${banner()}
      ${hero('选择去水印方式')}
      <div class="ways">
        <div class="way normal" data-m="normal"><div class="badge free">免费</div><div class="way-icon">🧽</div>
          <div class="way-name">普通去水印</div><div class="way-desc">快速擦除常见水印</div><div class="way-btn">去使用</div></div>
        <div class="way pro" data-m="pro"><div class="badge">限免</div><div class="way-icon">✨</div>
          <div class="way-name">高级去水印</div><div class="way-desc">智能一键去除，支持涂抹</div><div class="way-btn">去使用</div></div>
      </div>
      <div class="card"><div class="card-title">使用方法</div>
        <div class="label" style="line-height:1.9;font-size:13px">1. 上传带水印的图片<br>2. 用手指涂抹水印区域（可调节画笔大小）<br>3. 点击「开始去除」，满意后保存</div></div>
      ${cleanTip()}`
    root.querySelectorAll('[data-m]').forEach(n => { n.onclick = () => go('/watermark-edit?mode=' + n.dataset.m) })
  }
}
