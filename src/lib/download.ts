export function imageDataUrlToBlob(data: string): Blob {
  if (!data.startsWith('data:image/png;base64,')) throw new Error('无法识别三维画面格式')
  const binary = atob(data.slice('data:image/png;base64,'.length))
  return new Blob([Uint8Array.from(binary, character => character.charCodeAt(0))], { type: 'image/png' })
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.hidden = true
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  // WebKit may consume the object URL after the click handler returns.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
