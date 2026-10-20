import { decode, Image } from 'imagescript'

export function rgbToHEX(color: Uint8ClampedArray) {
  return '#' + ((1 << 24) + (color[0] << 16) + (color[1] << 8) + color[2]).toString(16).slice(1)
}

export function hexToRGB(color: string) {
  const rgb = parseInt(color.substring(1), 16)
  const r = rgb >> 16
  const g = rgb - (r << 16) >> 8
  const b = rgb - (r << 16) - (g << 8)
  return new Uint8ClampedArray([r, g, b])
}

export function preventSimilarColor(color: string, reference: string, brighten = false) {
  function changeColor(color: string, reference: string, brighten: boolean, recursionDepth = 0, originalColor = color) {
    const stepSize = 20
    const maxDepth = Math.ceil(255 / stepSize)
    if (recursionDepth + 1 >= maxDepth) { return changeColor(originalColor, reference, !brighten) }

    const clrRGB = hexToRGB(color)
    const refRGB = hexToRGB(reference)
    const difference = Math.abs(clrRGB[0] - refRGB[0]) + Math.abs(clrRGB[1] - refRGB[1]) + Math.abs(clrRGB[2] - refRGB[2])
    if (difference > 75) { return color }

    const changed = rgbToHEX(clrRGB.map((value) => brighten ? value + stepSize : value - stepSize))
    if (changed === color) { return changeColor(originalColor, reference, !brighten) }
    return changeColor(changed, reference, brighten, recursionDepth + 1, originalColor)
  }
  try {
    return changeColor(color, reference, brighten)
  } catch {
    return color
  }
}

export async function findDominantColor(url: string) {
  const response = await fetch(url)
  const arrayBuffer = await response.arrayBuffer()
  const imageBuffer = Buffer.from(arrayBuffer)
  const img = await decode(imageBuffer) as Image
  const hex = img.dominantColor(true, false)
  return `#${hex.toString(16).padStart(8, '0').substring(0, 6)}`
}
