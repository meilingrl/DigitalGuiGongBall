import { inflateSync } from 'node:zlib'
import { ApiError } from './errors.js'

const MAX_PNG_BYTES = 256 * 1024
const signature = Buffer.from('89504e470d0a1a0a', 'hex')

function invalid(): never { throw new ApiError(400, 'INVALID_PREVIEW', '预览必须是有效 PNG，尺寸不超过 1024 × 1024，文件不超过 256 KiB') }

function crc32(bytes: Buffer): number {
  let crc = 0xffffffff
  for (const byte of bytes) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0)
  }
  return (crc ^ 0xffffffff) >>> 0
}

/** Bounded non-interlaced 8-bit PNGs emitted by the canvas renderer. */
export function validatePng(bytes: Buffer): Buffer {
  if (bytes.length < 57 || bytes.length > MAX_PNG_BYTES || !bytes.subarray(0, 8).equals(signature)) invalid()
  let offset = 8
  let width = 0, height = 0, channels = 0
  let ended = false, dataEnded = false
  const data: Buffer[] = []
  while (offset < bytes.length) {
    if (offset + 12 > bytes.length) invalid()
    const length = bytes.readUInt32BE(offset)
    const end = offset + 12 + length
    if (end > bytes.length) invalid()
    const type = bytes.toString('latin1', offset + 4, offset + 8)
    if (!/^[A-Za-z]{4}$/.test(type) || type[2] !== type[2]!.toUpperCase()) invalid()
    if (crc32(bytes.subarray(offset + 4, end - 4)) !== bytes.readUInt32BE(end - 4)) invalid()
    const payload = bytes.subarray(offset + 8, end - 4)
    if (offset === 8) {
      if (type !== 'IHDR' || length !== 13) invalid()
      width = payload.readUInt32BE(0); height = payload.readUInt32BE(4)
      channels = ({ 0: 1, 2: 3, 4: 2, 6: 4 } as Record<number, number>)[payload[9]!] ?? 0
      if (!width || !height || width > 1024 || height > 1024 || !channels || payload[8] !== 8 || payload[10] !== 0 || payload[11] !== 0 || payload[12] !== 0) invalid()
    } else if (type === 'IDAT') {
      if (dataEnded) invalid()
      data.push(payload)
    } else if (type === 'IEND') {
      if (length !== 0 || !data.length || end !== bytes.length) invalid()
      ended = true
    } else {
      // Only ancillary chunks may occur beyond the mandatory critical chunks.
      if (type[0] === type[0]!.toUpperCase()) invalid()
      if (data.length) dataEnded = true
    }
    offset = end
  }
  if (!ended) invalid()
  const expected = (width * channels + 1) * height
  try {
    const compressed = Buffer.concat(data)
    // Node returns the engine alongside bytes with info:true; its overload
    // is absent from the bundled Node typings. bytesWritten detects trailing streams.
    const result = inflateSync(compressed, { maxOutputLength: expected, info: true }) as unknown as { buffer: Buffer; engine: { bytesWritten: number } }
    const pixels = result.buffer
    if (pixels.length !== expected || result.engine.bytesWritten !== compressed.length) invalid()
    for (let row = 0; row < height; row++) if (pixels[row * (width * channels + 1)]! > 4) invalid()
  } catch { invalid() }
  return bytes
}

export function decodePreview(dataUrl: string): Buffer {
  const prefix = 'data:image/png;base64,'
  if (!dataUrl.startsWith(prefix)) invalid()
  const encoded = dataUrl.slice(prefix.length)
  if (encoded.length > Math.ceil(MAX_PNG_BYTES / 3) * 4 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded)) invalid()
  const bytes = Buffer.from(encoded, 'base64')
  if (bytes.toString('base64') !== encoded) invalid()
  return validatePng(bytes)
}
