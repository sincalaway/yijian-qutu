#!/usr/bin/env bash
# 下载 AI 去水印所需文件（不入库）：onnxruntime-web 运行时 + LaMa 量化模型
set -euo pipefail
cd "$(dirname "$0")/.."
ORT_VER=1.22.0
MODEL_URL=https://huggingface.co/g-ronimo/lama/resolve/main/lama_512_int8.onnx
mkdir -p www/vendor/ort www/models
if [ ! -f www/vendor/ort/ort-wasm-simd-threaded.wasm ]; then
  tmp=$(mktemp -d)
  curl -fsSL "https://registry.npmjs.org/onnxruntime-web/-/onnxruntime-web-${ORT_VER}.tgz" | tar xz -C "$tmp"
  cp "$tmp/package/dist/ort.wasm.min.mjs" "$tmp/package/dist/ort-wasm-simd-threaded.mjs" "$tmp/package/dist/ort-wasm-simd-threaded.wasm" www/vendor/ort/
  cp "$tmp/package/LICENSE" www/vendor/ort/LICENSE 2>/dev/null || true
  rm -rf "$tmp"
fi
if [ ! -f www/models/lama_512_int8.onnx ]; then
  curl -fL --retry 3 -o www/models/lama_512_int8.onnx "$MODEL_URL"
fi
ls -la www/vendor/ort www/models
# 生成 ≤25MB 分片（Cloudflare Pages 单文件上限 25MiB）
# 仅 Cloudflare 部署时：SPLIT_MODEL=1 bash scripts/fetch-ai.sh（会删除整文件）
if [ "${SPLIT_MODEL:-}" = 1 ] && [ ! -f www/models/lama_512_int8.onnx.part2 ]; then
  split -b 21000000 -d -a 1 www/models/lama_512_int8.onnx www/models/lama_512_int8.onnx.part
fi
if [ "${SPLIT_MODEL:-}" = 1 ]; then rm -f www/models/lama_512_int8.onnx; fi
