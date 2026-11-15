// LaMa 推理 Worker：onnxruntime-web（WASM），避免卡住界面
import * as ort from '../vendor/ort/ort.wasm.min.mjs'

ort.env.wasm.wasmPaths = new URL('../vendor/ort/', import.meta.url).href
ort.env.wasm.numThreads = self.crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency || 2) : 1
ort.env.wasm.proxy = false

let session = null

self.onmessage = async e => {
  const { id, type } = e.data
  try {
    if (type === 'init') {
      if (!session) {
        session = await ort.InferenceSession.create(new Uint8Array(e.data.model), {
          executionProviders: ['wasm'], graphOptimizationLevel: 'all'
        })
      }
      self.postMessage({ id, ok: true })
    } else if (type === 'run') {
      const input = new ort.Tensor('float32', e.data.input, [1, 4, 512, 512])
      const out = await session.run({ [session.inputNames[0]]: input })
      const data = out[session.outputNames[0]].data
      self.postMessage({ id, ok: true, output: data }, [data.buffer])
    }
  } catch (err) {
    self.postMessage({ id, ok: false, error: String((err && err.message) || err) })
  }
}
