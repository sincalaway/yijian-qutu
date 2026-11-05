// 服务端配置：AI 类功能需要后端。本地能做的全部不依赖这里。
export default {
  API_BASE: '', // 例如 'https://api.example.com'
  PATHS: {
    watermark: '/v1/watermark/auto', // POST multipart(file) -> { url }
    matting: '/v1/matting',          // POST multipart(file) -> { url }
    audio: '/v1/video/audio',
    text: '/v1/video/text',
    subtitle: '/v1/video/subtitle'
  }
}
