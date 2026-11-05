// 处理记录 & 24 小时自动清除（App 内缓存文件同步删除）
import { isNative, plugin } from './platform.js'

const KEY = 'qt_records'
const TTL = 24 * 3600 * 1000

function list() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch (e) { return [] }
}
function setList(l) { localStorage.setItem(KEY, JSON.stringify(l.slice(-500))) }

export function record(name, file) {
  const l = list()
  l.push({ n: name, f: file || '', t: Date.now() })
  setList(l)
}

export async function cleanExpired(all) {
  const now = Date.now()
  const keep = []
  let removed = 0
  for (const it of list()) {
    if (all || now - it.t > TTL) {
      removed++
      if (isNative && it.f) {
        try { await plugin('Filesystem').deleteFile({ path: it.f, directory: 'CACHE' }) } catch (e) {}
      }
    } else keep.push(it)
  }
  setList(keep)
  return removed
}

export const count = () => list().length

export default { record, cleanExpired, count }
