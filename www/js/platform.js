// 运行环境：浏览器 / PWA / Capacitor Android
import { toast, loading, hideLoading, modal } from './ui.js'
import * as store from './store.js'

const C = window.Capacitor
export const isNative = !!(C && C.isNativePlatform && C.isNativePlatform())
export function plugin(name) {
  return (C && C.Plugins && C.Plugins[name]) || (C && C.registerPlugin && C.registerPlugin(name))
}

let installEvt = null
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e })

export function initPlatform() {
  if (!isNative) return
  document.documentElement.classList.add('native')
  try {
    plugin('App').addListener('backButton', () => {
      const h = location.hash.replace('#', '')
      if (h && h !== '/' && h !== '') history.back()
      else plugin('App').exitApp()
    })
  } catch (e) {}
}

function blobToBase64(blob) {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(String(r.result).split(',')[1])
    r.onerror = rej
    r.readAsDataURL(blob)
  })
}

// 保存结果：App 内调起系统分享面板（可选「保存到相册/文件」），网页端直接下载
export async function saveResults(results) {
  const list = (results || []).filter(Boolean)
  if (!list.length) return toast('没有可保存的图片')
  if (isNative) {
    loading('准备中')
    try {
      const FS = plugin('Filesystem')
      const uris = []
      for (const r of list) {
        const path = 'qutu/' + r.name
        const w = await FS.writeFile({ path, data: await blobToBase64(r.blob), directory: 'CACHE', recursive: true })
        uris.push(w.uri)
        store.record(r.name, path)
      }
      hideLoading()
      await plugin('Share').share({ title: '保存图片', files: uris, dialogTitle: '保存到相册 / 发送' })
    } catch (e) {
      hideLoading()
      if (!/cancel/i.test((e && e.message) || '')) toast('保存失败：' + ((e && e.message) || e))
    }
    return
  }
  const mobile = /Android|iPhone|iPad/i.test(navigator.userAgent)
  if (mobile && navigator.canShare && list.length <= 10) {
    const files = list.map(r => new File([r.blob], r.name, { type: r.blob.type }))
    if (navigator.canShare({ files })) {
      try { await navigator.share({ files }); return } catch (e) { if (e.name === 'AbortError') return }
    }
  }
  for (const r of list) {
    const a = document.createElement('a')
    a.href = r.url
    a.download = r.name
    document.body.appendChild(a)
    a.click()
    a.remove()
    await new Promise(s => setTimeout(s, 350))
  }
  toast(`已下载 ${list.length} 张`)
}

export async function shareApp() {
  const data = { title: '一键取图', text: '免费实用的图片处理工具', url: isNative ? 'https://sincalaway.github.io/yijian-qutu/' : location.href.split('#')[0] }
  try {
    if (isNative) return await plugin('Share').share(data)
    if (navigator.share) return await navigator.share(data)
    await navigator.clipboard.writeText(data.url)
    toast('链接已复制，发给好友吧')
  } catch (e) {}
}

export async function addDesktop() {
  if (isNative) return toast('已经是 App 啦，可在桌面直接打开')
  if (installEvt) {
    installEvt.prompt()
    installEvt = null
    return
  }
  modal({ title: '添加到桌面', content: '打开浏览器菜单，选择「添加到主屏幕 / 安装应用」，下次一键打开。', cancel: false, confirmText: '知道了' })
}
