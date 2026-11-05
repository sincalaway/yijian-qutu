// 粘贴链接取图：图片直链直接下载；网页链接解析 og:image / <img>
// App 内启用 CapacitorHttp，不受跨域限制；网页版受浏览器 CORS 限制
import { hero, cleanTip, toast, loading, hideLoading, modal } from '../ui.js'
import { result } from '../img.js'
import { saveResults, isNative } from '../platform.js'

async function fetchImage(url) {
  const r = await fetch(url)
  if (!r.ok) throw new Error('HTTP ' + r.status)
  const b = await r.blob()
  if (!/^image\//.test(b.type)) return { html: await b.text() }
  if (b.size < 3 * 1024) throw new Error('太小')
  return { blob: b }
}

function extractImages(html, base) {
  const out = new Set()
  const add = u => { try { if (u && !u.startsWith('data:')) out.add(new URL(u.trim(), base).href) } catch (e) {} }
  const meta = /<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)(?::src)?["'][^>]*>/gi
  let m
  while ((m = meta.exec(html))) { const c = /content=["']([^"']+)["']/i.exec(m[0]); if (c) add(c[1]) }
  const img = /<img[^>]+>/gi
  while ((m = img.exec(html))) {
    const tag = m[0]
    const s = /(?:data-src|data-original|src)=["']([^"']+)["']/i.exec(tag)
    if (s) add(s[1])
    const ss = /srcset=["']([^"']+)["']/i.exec(tag)
    if (ss) { const last = ss[1].split(',').pop().trim().split(' ')[0]; add(last) }
  }
  return [...out].slice(0, 40)
}

export default {
  title: '粘贴链接取图',
  render(root) {
    let imgs = []
    root.innerHTML = `${hero('粘贴链接 🔥', '复制链接 · 一键取图')}
      <div class="card"><textarea class="ta" id="ta" placeholder="粘贴图片链接或网页链接，支持多条"></textarea>
        <div class="row" style="justify-content:flex-end;gap:20px"><span class="link" id="paste">粘贴</span><span class="label" id="clear" style="cursor:pointer">清空</span></div></div>
      <div id="list"></div>${cleanTip('所有处理数据 24 小时后系统自动清除')}
      <div class="footer"><button class="btn ghost" id="paste2">粘贴链接</button><button class="btn" id="go">一键取图</button></div>`
    const $ = s => root.querySelector(s)
    const paste = async () => {
      try { $('#ta').value = await navigator.clipboard.readText() } catch (e) { toast('请长按输入框粘贴') }
    }
    const draw = () => {
      if (!imgs.length) { $('#list').innerHTML = ''; return }
      $('#list').innerHTML = `<div class="card"><div class="row"><span class="card-title" style="margin:0">取到 ${imgs.length} 张</span><span class="link" id="saveAll">全部保存</span></div>
        <div class="thumbs" style="margin-top:8px">${imgs.map((r, i) => `<div class="thumb"><img src="${r.url}"><div class="del" data-d="${i}">×</div></div>`).join('')}</div></div>`
      $('#saveAll').onclick = () => saveResults(imgs)
      root.querySelectorAll('[data-d]').forEach(n => { n.onclick = () => { imgs.splice(+n.dataset.d, 1); draw() } })
    }
    $('#paste').onclick = paste; $('#paste2').onclick = paste
    $('#clear').onclick = () => { $('#ta').value = ''; imgs = []; draw() }
    $('#go').onclick = async () => {
      const urls = $('#ta').value.match(/https?:\/\/[^\s"'<>，。；]+/g) || []
      if (!urls.length) return toast('未识别到链接')
      loading('解析中')
      let blocked = false
      for (const u of urls) {
        try {
          const r = await fetchImage(u)
          if (r.blob) { imgs.push(result(r.blob, 'link')); continue }
          const list = extractImages(r.html, u)
          for (let i = 0; i < list.length; i++) {
            loading(`下载 ${i + 1}/${list.length}`)
            try { const x = await fetchImage(list[i]); if (x.blob) imgs.push(result(x.blob, 'link')) } catch (e) {}
          }
        } catch (e) { blocked = true }
      }
      hideLoading(); draw()
      if (!imgs.length) {
        modal({
          title: '未取到图片',
          content: blocked && !isNative ? '网页版受浏览器跨域限制，部分网站无法读取。安装 App 版可直接解析网页图片。' : '这个链接里没有找到可下载的图片。',
          cancel: false
        })
      }
    }
  }
}
