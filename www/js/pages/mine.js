import { modal, toast, cleanTip } from '../ui.js'
import { shareApp, addDesktop, isNative } from '../platform.js'
import * as store from '../store.js'

export default {
  title: '我的',
  tab: true,
  render(root) {
    root.innerHTML = `
      <div class="banner user"><div class="avatar">取</div>
        <div><div class="banner-title" style="font-size:18px">一键取图用户</div>
        <div class="banner-sub">24 小时内处理记录 <span id="cnt">${store.count()}</span> 条</div></div></div>
      <div class="card menu">
        <div class="m-row" data-a="clear"><span>清除处理记录</span><span class="arrow">›</span></div>
        <div class="m-row" data-a="desk"><span>${isNative ? '桌面快捷方式' : '添加到桌面'}</span><span class="arrow">›</span></div>
        <div class="m-row" data-a="share"><span>分享给好友</span><span class="arrow">›</span></div>
        <div class="m-row" data-a="feedback"><span>意见反馈</span><span class="arrow">›</span></div>
        <div class="m-row" data-a="about"><span>关于我们</span><span class="arrow">›</span></div>
      </div>
      ${cleanTip()}`
    const acts = {
      async clear() {
        if (!(await modal({ title: '清除处理记录', content: '将删除本机所有处理结果（系统也会在 24 小时后自动清除）。' }))) return
        const n = await store.cleanExpired(true)
        root.querySelector('#cnt').textContent = '0'
        toast(`已清除 ${n} 条`)
      },
      desk: addDesktop,
      share: shareApp,
      feedback() { window.open('https://github.com/sincalaway/yijian-qutu/issues', '_blank') },
      about() { modal({ title: '关于一键取图', content: '免费实用的图片处理工具集合。图片全部在本机处理，不上传服务器，结果 24 小时后自动清除。', cancel: false }) }
    }
    root.querySelectorAll('[data-a]').forEach(n => { n.onclick = () => acts[n.dataset.a]() })
  }
}
