import { test } from 'node:test'
import assert from 'node:assert/strict'
import { imageDataUrlToBlob } from '../src/lib/download.js'

test('converts canvas PNG data to a binary downloadable file without changing its bytes', async () => {
  const signature = Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10)
  const blob = imageDataUrlToBlob(`data:image/png;base64,${Buffer.from(signature).toString('base64')}`)
  assert.equal(blob.type, 'image/png')
  assert.deepEqual(new Uint8Array(await blob.arrayBuffer()), signature)
})

test('does not disguise a non-image string as a PNG file', () => {
  assert.throws(() => imageDataUrlToBlob('data:text/html;base64,SGVsbG8='))
})
