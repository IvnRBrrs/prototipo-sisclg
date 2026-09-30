const RES = 512

function hash2D(ix: number, iy: number): number {
  let h = ix * 374761393 + iy * 668265263
  h = ((h ^ (h >> 13)) * 1274126177) | 0
  return ((h ^ (h >> 16)) & 0x7fffffff) / 0x7fffffff
}

function smoothNoise(x: number, y: number): number {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  const sx = fx * fx * (3 - 2 * fx)
  const sy = fy * fy * (3 - 2 * fy)
  return (
    hash2D(ix, iy) * (1 - sx) * (1 - sy) +
    hash2D(ix + 1, iy) * sx * (1 - sy) +
    hash2D(ix, iy + 1) * (1 - sx) * sy +
    hash2D(ix + 1, iy + 1) * sx * sy
  )
}

function fbm(x: number, y: number, octaves = 6, lacunarity = 2, gain = 0.5): number {
  let value = 0, amp = gain, freq = 1
  for (let i = 0; i < octaves; i++) {
    value += amp * smoothNoise(x * freq + i * 17.3, y * freq + i * 41.7)
    amp *= gain
    freq *= lacunarity
  }
  return value
}

function warpedFbm(x: number, y: number, warp = 2, octaves = 6): number {
  const dx = fbm(x + 1.7, y + 9.2, 3) * warp
  const dy = fbm(x + 8.3, y + 3.6, 3) * warp
  return fbm(x + dx, y + dy, octaves)
}

function clamp(v: number): number { return v < 0 ? 0 : v > 1 ? 1 : v }

function lerp(a: number, b: number, t: number): number { return a + (b - a) * t }

function toByte(v: number): number { return clamp(v) * 255 | 0 }

function createCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  return [c, c.getContext('2d')!]
}

function sphereUV(x: number, y: number, w: number, h: number) {
  const u = x / w, v = y / h
  const lon = u * 2 * Math.PI, lat = v * Math.PI
  const nx = (Math.sin(lat) * Math.cos(lon) + 1) / 2
  const ny = (Math.sin(lat) * Math.sin(lon) + 1) / 2
  const nz = (Math.cos(lat) + 1) / 2
  const latAngle = v * Math.PI
  const latNorm = (latAngle / Math.PI - 0.5) * 2
  return { u, v, lon, lat, nx, ny, nz, latAngle, latNorm }
}

export function generateMercuryTexture(): HTMLCanvasElement {
  const [c, ctx] = createCanvas(RES, RES / 2)
  const d = ctx.createImageData(RES, RES / 2)
  const p = d.data
  const sx = Math.random() * 100, sy = Math.random() * 100

  for (let y = 0; y < RES / 2; y++) {
    for (let x = 0; x < RES; x++) {
      const { nx, ny, latAngle } = sphereUV(x, y, RES, RES / 2)
      const raw = warpedFbm(nx * 8 + sx, ny * 8 + sy, 1.5, 6)

      let crater = 0
      for (let i = 0; i < 80; i++) {
        const cx = hash2D(i * 7 + 3, i * 13 + 7)
        const cy = hash2D(i * 11 + 5, i * 17 + 11)
        const cr = 0.005 + hash2D(i * 3, i * 5) * 0.12
        const dx = nx - cx, dy = ny - cy
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < cr) {
          const t2 = dist / cr
          crater += Math.sin(t2 * Math.PI) * 0.2 * (1 - t2)
          if (t2 < 0.15) crater -= 0.3 * (1 - t2 / 0.15)
        }
      }

      const rayNoise = smoothNoise(nx * 30 + sx, ny * 30 + sy) * 0.15
      const base = clamp((raw + crater) * 0.7 + rayNoise)
      const val = 90 + base * 140
      const brownish = smoothNoise(nx * 6 + sx, ny * 6 + sy) * 20

      const idx = (y * RES + x) * 4
      p[idx] = toByte((val + brownish) / 255)
      p[idx + 1] = toByte((val + brownish * 0.7) / 255)
      p[idx + 2] = toByte((val + brownish * 0.4) / 255)
      p[idx + 3] = 255
    }
  }
  ctx.putImageData(d, 0, 0)
  return c
}

export function generateVenusTexture(): HTMLCanvasElement {
  const [c, ctx] = createCanvas(RES, RES / 2)
  const d = ctx.createImageData(RES, RES / 2)
  const p = d.data
  const sx = Math.random() * 100

  for (let y = 0; y < RES / 2; y++) {
    for (let x = 0; x < RES; x++) {
      const { nx, ny, lon } = sphereUV(x, y, RES, RES / 2)
      const qx = fbm(nx * 4 + sx + Math.sin(lon * 0.8) * 0.5, ny * 4 + sx + Math.cos(lon * 0.6) * 0.5, 3) * 2
      const qy = fbm(nx * 4 + sx + 5 + Math.cos(lon * 0.7) * 0.4, ny * 4 + sx + 3 + Math.sin(lon * 0.5) * 0.4, 3) * 2
      const n = fbm(nx * 3 + sx + qx, ny * 3 + sx + qy, 5)

      const base = 0.7 + n * 0.22
      const r = base + 0.05
      const g = base + 0.02
      const b = base - 0.12

      const band = Math.sin(ny * 20 + n * 3 + sx) * 0.04
      const idx = (y * RES + x) * 4
      p[idx] = toByte(r + band)
      p[idx + 1] = toByte(g + band)
      p[idx + 2] = toByte(b + band * 0.5)
      p[idx + 3] = 255
    }
  }
  ctx.putImageData(d, 0, 0)
  return c
}

export function generateEarthTexture(): HTMLCanvasElement {
  const [c, ctx] = createCanvas(RES, RES / 2)
  const d = ctx.createImageData(RES, RES / 2)
  const p = d.data
  const sx = Math.random() * 100

  for (let y = 0; y < RES / 2; y++) {
    for (let x = 0; x < RES; x++) {
      const { nx, ny, nz, latNorm, lat } = sphereUV(x, y, RES, RES / 2)

      const warp = 2.5
      const dx = fbm(nx * 2.5 + sx + 1.7, ny * 2.5 + sx + 9.2, 3) * warp
      const dy = fbm(nx * 2.5 + sx + 8.3, ny * 2.5 + sx + 3.6, 3) * warp
      const elev = fbm(nx * 3 + sx + dx, ny * 3 + sx + dy, 6)

      const latFactor = 1 - Math.abs(latNorm)
      const poleIce = Math.max(0, 1 - Math.abs(latNorm) * 5)
      const iceCap = Math.pow(poleIce, 0.5) * 0.5

      let r: number, g: number, b: number

      if (elev < 0.42) {
        const depth = elev / 0.42
        r = 8 + depth * 25
        g = 30 + depth * 70
        b = 80 + depth * 130
      } else if (elev < 0.48) {
        const t = (elev - 0.42) / 0.06
        r = lerp(33, 60, t)
        g = lerp(100, 110, t)
        b = lerp(210, 30, t)
      } else if (elev < 0.55) {
        const t = (elev - 0.48) / 0.07
        const detail = fbm(nx * 8 + sx, ny * 8 + sx, 3) * 0.3 + 0.7
        r = lerp(60, 110, t) * detail
        g = lerp(110, 150, t) * detail
        b = lerp(30, 40, t) * detail
      } else if (elev < 0.62) {
        const t = (elev - 0.55) / 0.07
        const detail = smoothNoise(nx * 12 + sx, ny * 12 + sx) * 0.2 + 0.8
        r = lerp(110, 160, t) * detail
        g = lerp(150, 170, t) * detail
        b = lerp(40, 50, t) * detail
      } else if (elev < 0.7) {
        const t = (elev - 0.62) / 0.08
        r = lerp(160, 190, t)
        g = lerp(170, 185, t)
        b = lerp(50, 70, t)
      } else if (elev < 0.82) {
        const t = (elev - 0.7) / 0.12
        const desert = smoothNoise(nx * 6 + sx + 10, ny * 6 + sx + 10)
        if (desert > 0.55 && latNorm < 0.3 && latNorm > -0.3) {
          r = lerp(190, 210, t)
          g = lerp(185, 200, t)
          b = lerp(70, 110, t)
        } else {
          r = lerp(190, 210, t)
          g = lerp(185, 190, t)
          b = lerp(70, 90, t)
        }
      } else {
        r = 220 + smoothNoise(nx * 15 + sx, ny * 15 + sx) * 20
        g = 220 + smoothNoise(nx * 15 + sx, ny * 15 + sx) * 20
        b = 225 + smoothNoise(nx * 15 + sx, ny * 15 + sx) * 15
      }

      if (elev > 0.42 && iceCap > 0.05) {
        const mix = Math.min(1, iceCap * 3)
        r = lerp(r, 240, mix)
        g = lerp(g, 245, mix)
        b = lerp(b, 250, mix)
      }

      const idx = (y * RES + x) * 4
      p[idx] = toByte(r / 255 + smoothNoise(nx * 20 + sx, ny * 20 + sx) * 0.03)
      p[idx + 1] = toByte(g / 255 + smoothNoise(nx * 20 + sx, ny * 20 + sx) * 0.03)
      p[idx + 2] = toByte(b / 255 + smoothNoise(nx * 20 + sx, ny * 20 + sx) * 0.03)
      p[idx + 3] = 255
    }
  }
  ctx.putImageData(d, 0, 0)
  return c
}

export function generateEarthCloudTexture(): HTMLCanvasElement {
  const [c, ctx] = createCanvas(RES, RES / 2)
  const d = ctx.createImageData(RES, RES / 2)
  const p = d.data
  const sx = Math.random() * 200

  for (let y = 0; y < RES / 2; y++) {
    for (let x = 0; x < RES; x++) {
      const { nx, ny, lon } = sphereUV(x, y, RES, RES / 2)
      const warp = 1.5
      const qx = fbm(nx * 3 + sx, ny * 3 + sx, 3) * warp
      const qy = fbm(nx * 3 + sx + 3, ny * 3 + sx + 7, 3) * warp
      const n = fbm(nx * 4 + sx + qx, ny * 4 + sx + qy, 5)
      const cloud = Math.max(0, (n - 0.3) / 0.35)
      const alpha = cloud * 0.6

      const idx = (y * RES + x) * 4
      p[idx] = 255; p[idx + 1] = 255; p[idx + 2] = 255
      p[idx + 3] = clamp(alpha) * 255 | 0
    }
  }
  ctx.putImageData(d, 0, 0)
  return c
}

export function generateMoonTexture(): HTMLCanvasElement {
  const [c, ctx] = createCanvas(RES, RES / 2)
  const d = ctx.createImageData(RES, RES / 2)
  const p = d.data
  const sx = Math.random() * 100

  for (let y = 0; y < RES / 2; y++) {
    for (let x = 0; x < RES; x++) {
      const { nx, ny } = sphereUV(x, y, RES, RES / 2)
      const base = warpedFbm(nx * 5 + sx, ny * 5 + sx, 1.5, 6)

      const maria = fbm(nx * 3 + sx + 10, ny * 3 + sx + 10, 4)
      const mariaMask = Math.max(0, Math.sin(maria * Math.PI) * 0.3)

      let crater = 0
      for (let i = 0; i < 60; i++) {
        const cx = hash2D(i * 7 + 3, i * 13 + 7)
        const cy = hash2D(i * 11 + 5, i * 17 + 11)
        const cr = 0.008 + hash2D(i * 3, i * 5) * 0.15
        const dx = nx - cx, dy = ny - cy
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < cr) {
          const t2 = dist / cr
          crater += Math.sin(t2 * Math.PI) * 0.18 * (1 - t2)
          if (t2 < 0.1) crater -= 0.25 * (1 - t2 / 0.1)
        }
      }

      const gray = clamp(base * 0.5 + crater * 0.25 - mariaMask)
      const val = 110 + gray * 110

      const idx = (y * RES + x) * 4
      p[idx] = toByte((val + 5) / 255)
      p[idx + 1] = toByte(val / 255)
      p[idx + 2] = toByte((val - 5) / 255)
      p[idx + 3] = 255
    }
  }
  ctx.putImageData(d, 0, 0)
  return c
}

export function generateMarsTexture(): HTMLCanvasElement {
  const [c, ctx] = createCanvas(RES, RES / 2)
  const d = ctx.createImageData(RES, RES / 2)
  const p = d.data
  const sx = Math.random() * 100

  for (let y = 0; y < RES / 2; y++) {
    for (let x = 0; x < RES; x++) {
      const { nx, ny, latNorm } = sphereUV(x, y, RES, RES / 2)

      const warp = 2
      const qx = fbm(nx * 3 + sx, ny * 3 + sx, 3) * warp
      const qy = fbm(nx * 3 + sx + 5, ny * 3 + sx + 5, 3) * warp
      const n = fbm(nx * 4 + sx + qx, ny * 4 + sx + qy, 6)
      const detail = fbm(nx * 15 + sx + 50, ny * 15 + sx + 50, 3) * 0.08

      const polarCap = Math.max(0, 1 - Math.abs(latNorm) * 8)
      const polar = Math.pow(polarCap, 0.6) * 0.5

      const r = 0.55 + n * 0.38 + detail + polar * 0.3
      const g = 0.18 + n * 0.25 + detail * 0.7 + polar * 0.2
      const b = 0.06 + n * 0.15 + detail * 0.3 + polar * 0.15

      const idx = (y * RES + x) * 4
      p[idx] = toByte(r)
      p[idx + 1] = toByte(g)
      p[idx + 2] = toByte(b)
      p[idx + 3] = 255
    }
  }
  ctx.putImageData(d, 0, 0)
  return c
}

export function generateJupiterTexture(): HTMLCanvasElement {
  const [c, ctx] = createCanvas(RES, RES / 2)
  const d = ctx.createImageData(RES, RES / 2)
  const p = d.data
  const sx = Math.random() * 100

  for (let y = 0; y < RES / 2; y++) {
    for (let x = 0; x < RES; x++) {
      const { u, v, latNorm, lon } = sphereUV(x, y, RES, RES / 2)

      const turb = fbm(lon * 0.2 + sx, latNorm * 0.3 + sx, 4) * 0.15
      const raw = (latNorm * 6 + Math.sin(lon * 0.15) * 0.5 + turb)

      let band = Math.sin(raw * Math.PI) * 0.5 + 0.5
      band = band * 0.8 + smoothNoise(latNorm * 15 + sx, u * 8 + sx) * 0.2

      const r = 0.5 + band * 0.45
      const g = 0.3 + band * 0.45
      const b = 0.05 + band * 0.25

      let spotR = 0, spotG = 0, spotB = 0
      const sxSpot = 0.58 + Math.sin(sx * 0.1) * 0.02
      const sySpot = -0.22
      const dx = (latNorm - sySpot) * 3
      const dy = (u - sxSpot) * 5
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < 0.18) {
        const t2 = dist / 0.18
        const intensity = (1 - t2) * 0.25
        spotR = intensity * 0.6
        spotG = intensity * 0.2
        spotB = intensity * 0.05
        if (dist < 0.06) {
          const t3 = dist / 0.06
          const inner = (1 - t3) * 0.2
          spotR += inner
          spotG += inner * 0.6
          spotB += inner * 0.2
        }
      }

      const idx = (y * RES + x) * 4
      p[idx] = toByte(r + spotR)
      p[idx + 1] = toByte(g + spotG)
      p[idx + 2] = toByte(b + spotB)
      p[idx + 3] = 255
    }
  }
  ctx.putImageData(d, 0, 0)
  return c
}

export function generateSaturnTexture(): HTMLCanvasElement {
  const [c, ctx] = createCanvas(RES, RES / 2)
  const d = ctx.createImageData(RES, RES / 2)
  const p = d.data
  const sx = Math.random() * 100

  for (let y = 0; y < RES / 2; y++) {
    for (let x = 0; x < RES; x++) {
      const { u, latNorm, lon } = sphereUV(x, y, RES, RES / 2)

      const turb = fbm(lon * 0.15 + sx, latNorm * 0.25 + sx, 4) * 0.1
      const raw = latNorm * 5 + Math.sin(lon * 0.1 + sx) * 0.3 + turb

      let band = Math.sin(raw * Math.PI) * 0.5 + 0.5
      band = band * 0.85 + smoothNoise(latNorm * 12 + sx, u * 6 + sx) * 0.15

      const r = 0.65 + band * 0.3
      const g = 0.55 + band * 0.35
      const b = 0.2 + band * 0.25

      const idx = (y * RES + x) * 4
      p[idx] = toByte(r)
      p[idx + 1] = toByte(g)
      p[idx + 2] = toByte(b)
      p[idx + 3] = 255
    }
  }
  ctx.putImageData(d, 0, 0)
  return c
}

export function generateUranusTexture(): HTMLCanvasElement {
  const [c, ctx] = createCanvas(RES, RES / 2)
  const d = ctx.createImageData(RES, RES / 2)
  const p = d.data
  const sx = Math.random() * 100

  for (let y = 0; y < RES / 2; y++) {
    for (let x = 0; x < RES; x++) {
      const { u, latNorm, lon } = sphereUV(x, y, RES, RES / 2)

      const band = Math.sin(latNorm * 6 + Math.sin(lon * 0.3 + sx) * 0.3 + sx) * 0.5 + 0.5
      const detail = smoothNoise(latNorm * 25 + sx, u * 12 + sx) * 0.06

      const r = 0.38 + band * 0.1 + detail
      const g = 0.58 + band * 0.15 + detail
      const b = 0.7 + band * 0.18 + detail

      const idx = (y * RES + x) * 4
      p[idx] = toByte(r)
      p[idx + 1] = toByte(g)
      p[idx + 2] = toByte(b)
      p[idx + 3] = 255
    }
  }
  ctx.putImageData(d, 0, 0)
  return c
}

export function generateNeptuneTexture(): HTMLCanvasElement {
  const [c, ctx] = createCanvas(RES, RES / 2)
  const d = ctx.createImageData(RES, RES / 2)
  const p = d.data
  const sx = Math.random() * 100

  for (let y = 0; y < RES / 2; y++) {
    for (let x = 0; x < RES; x++) {
      const { u, v, latNorm, lon } = sphereUV(x, y, RES, RES / 2)

      const band = Math.sin(latNorm * 5 + Math.sin(lon * 0.25 + sx) * 0.5 + sx) * 0.5 + 0.5
      const detail = fbm(u * 10 + sx, v * 10 + sx, 3) * 0.05

      const r = 0.08 + band * 0.15 + detail
      const g = 0.1 + band * 0.25 + detail
      const b = 0.4 + band * 0.45 + detail

      const stormX = 0.28, stormY = 0.3
      const dx = (u - stormX) * 4
      const dy = (latNorm - stormY) * 6
      const sd = Math.sqrt(dx * dx + dy * dy)
      let storm = 0
      if (sd < 0.1) {
        const t2 = sd / 0.1
        storm = (1 - t2) * 0.12
        if (sd < 0.03) {
          storm += (1 - sd / 0.03) * 0.08
        }
      }

      const idx = (y * RES + x) * 4
      p[idx] = toByte(r + storm)
      p[idx + 1] = toByte(g + storm * 0.6)
      p[idx + 2] = toByte(b + storm)
      p[idx + 3] = 255
    }
  }
  ctx.putImageData(d, 0, 0)
  return c
}

export function generateSunTexture(): HTMLCanvasElement {
  const [c, ctx] = createCanvas(RES, RES / 2)
  const d = ctx.createImageData(RES, RES / 2)
  const p = d.data
  const sx = Math.random() * 100

  for (let y = 0; y < RES / 2; y++) {
    for (let x = 0; x < RES; x++) {
      const { u, v } = sphereUV(x, y, RES, RES / 2)
      const nx = (x / RES) * 4, ny = (y / (RES / 2)) * 4

      const n = warpedFbm(nx + sx, ny + sx, 2, 5)
      const fine = fbm(nx * 4 + sx, ny * 4 + sx, 3) * 0.15

      const limbDark = 1 - Math.pow(Math.abs(v * 2 - 1), 0.6) * 0.35
      const brightCenter = Math.exp(-((u - 0.5) ** 2 + (v - 0.5) ** 2) * 2) * 0.15

      const val = clamp(0.6 + n * 0.4 + fine + brightCenter) * limbDark

      const r = 1.0 * val
      const g = (0.7 + n * 0.2) * val
      const b = (0.2 + n * 0.1) * val

      const idx = (y * RES + x) * 4
      const spots = fbm(nx * 2 + sx + 10, ny * 2 + sx + 10, 2)
      if (spots > 0.65) {
        const sf = (spots - 0.65) / 0.35
        p[idx] = toByte(r + sf * 0.3)
        p[idx + 1] = toByte(g + sf * 0.25)
        p[idx + 2] = toByte(b + sf * 0.1)
      } else {
        p[idx] = toByte(r)
        p[idx + 1] = toByte(g)
        p[idx + 2] = toByte(b)
      }
      p[idx + 3] = 255
    }
  }
  ctx.putImageData(d, 0, 0)
  return c
}

const MOON_RES = 512

export function generateLuaTexture(): HTMLCanvasElement {
  const [c, ctx] = createCanvas(MOON_RES, MOON_RES / 2)
  const d = ctx.createImageData(MOON_RES, MOON_RES / 2)
  const p = d.data
  const sx = Math.random() * 100

  for (let y = 0; y < MOON_RES / 2; y++) {
    for (let x = 0; x < MOON_RES; x++) {
      const { nx, ny } = sphereUV(x, y, MOON_RES, MOON_RES / 2)
      const raw = warpedFbm(nx * 6 + sx, ny * 6 + sx, 1.5, 5)

      let crater = 0
      for (let i = 0; i < 60; i++) {
        const cx = hash2D(i * 7 + 3, i * 13 + 7)
        const cy = hash2D(i * 11 + 5, i * 17 + 11)
        const cr = 0.008 + hash2D(i * 3, i * 5) * 0.15
        const dx = nx - cx, dy = ny - cy
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < cr) {
          const t2 = dist / cr
          crater += Math.sin(t2 * Math.PI) * 0.25 * (1 - t2)
          if (t2 < 0.12) crater -= 0.35 * (1 - t2 / 0.12)
        }
      }

      const base = clamp((raw + crater) * 0.65)
      const maria = fbm(nx * 3 + sx + 5, ny * 3 + sx + 5, 4)
      let val: number
      if (maria > 0.55) {
        val = 60 + base * 60
      } else {
        val = 100 + base * 100
      }

      const idx = (y * MOON_RES + x) * 4
      p[idx] = toByte((val + 10) / 255)
      p[idx + 1] = toByte((val + 8) / 255)
      p[idx + 2] = toByte((val + 5) / 255)
      p[idx + 3] = 255
    }
  }
  ctx.putImageData(d, 0, 0)
  return c
}

export function generateFobosTexture(): HTMLCanvasElement {
  const [c, ctx] = createCanvas(MOON_RES, MOON_RES / 2)
  const d = ctx.createImageData(MOON_RES, MOON_RES / 2)
  const p = d.data
  const sx = Math.random() * 100

  for (let y = 0; y < MOON_RES / 2; y++) {
    for (let x = 0; x < MOON_RES; x++) {
      const { nx, ny } = sphereUV(x, y, MOON_RES, MOON_RES / 2)
      const raw = warpedFbm(nx * 8 + sx, ny * 8 + sx, 1.2, 5)

      let crater = 0
      for (let i = 0; i < 40; i++) {
        const cx = hash2D(i * 5 + 1, i * 9 + 3)
        const cy = hash2D(i * 7 + 2, i * 11 + 5)
        const cr = 0.01 + hash2D(i * 2, i * 4) * 0.12
        const dx = nx - cx, dy = ny - cy
        if (Math.sqrt(dx * dx + dy * dy) < cr) crater += 0.2
      }

      const base = clamp((raw + crater) * 0.6)
      const r = 80 + base * 80
      const g = 60 + base * 60
      const b = 45 + base * 50

      const idx = (y * MOON_RES + x) * 4
      p[idx] = toByte(r / 255); p[idx + 1] = toByte(g / 255); p[idx + 2] = toByte(b / 255); p[idx + 3] = 255
    }
  }
  ctx.putImageData(d, 0, 0)
  return c
}

export function generateDeimosTexture(): HTMLCanvasElement {
  const [c, ctx] = createCanvas(MOON_RES, MOON_RES / 2)
  const d = ctx.createImageData(MOON_RES, MOON_RES / 2)
  const p = d.data
  const sx = Math.random() * 100

  for (let y = 0; y < MOON_RES / 2; y++) {
    for (let x = 0; x < MOON_RES; x++) {
      const { nx, ny } = sphereUV(x, y, MOON_RES, MOON_RES / 2)
      const raw = warpedFbm(nx * 5 + sx, ny * 5 + sx, 1, 4)
      const base = clamp(raw * 0.7 + 0.15)

      const r = 140 + base * 70
      const g = 130 + base * 65
      const b = 115 + base * 60

      const idx = (y * MOON_RES + x) * 4
      p[idx] = toByte(r / 255); p[idx + 1] = toByte(g / 255); p[idx + 2] = toByte(b / 255); p[idx + 3] = 255
    }
  }
  ctx.putImageData(d, 0, 0)
  return c
}

export function generateIoTexture(): HTMLCanvasElement {
  const [c, ctx] = createCanvas(MOON_RES, MOON_RES / 2)
  const d = ctx.createImageData(MOON_RES, MOON_RES / 2)
  const p = d.data
  const sx = Math.random() * 100

  for (let y = 0; y < MOON_RES / 2; y++) {
    for (let x = 0; x < MOON_RES; x++) {
      const { nx, ny } = sphereUV(x, y, MOON_RES, MOON_RES / 2)
      const n = warpedFbm(nx * 4 + sx, ny * 4 + sx, 2, 5)

      let r = 0.6 + n * 0.3, g = 0.3 + n * 0.25, b = 0.05 + n * 0.1

      const sulfur = fbm(nx * 6 + sx + 3, ny * 6 + sx + 7, 3)
      if (sulfur > 0.55) {
        const s = (sulfur - 0.55) / 0.45
        r = lerp(r, 0.9, s * 0.5)
        g = lerp(g, 0.6, s * 0.4)
        b = lerp(b, 0.1, s * 0.3)
      }

      const whitePatch = fbm(nx * 8 + sx + 10, ny * 8 + sx + 10, 2)
      if (whitePatch > 0.7) {
        const w = (whitePatch - 0.7) / 0.3
        r = lerp(r, 1, w * 0.6)
        g = lerp(g, 1, w * 0.6)
        b = lerp(b, 1, w * 0.6)
      }

      const idx = (y * MOON_RES + x) * 4
      p[idx] = toByte(r); p[idx + 1] = toByte(g); p[idx + 2] = toByte(b); p[idx + 3] = 255
    }
  }
  ctx.putImageData(d, 0, 0)
  return c
}

export function generateEuropaTexture(): HTMLCanvasElement {
  const [c, ctx] = createCanvas(MOON_RES, MOON_RES / 2)
  const d = ctx.createImageData(MOON_RES, MOON_RES / 2)
  const p = d.data
  const sx = Math.random() * 100

  for (let y = 0; y < MOON_RES / 2; y++) {
    for (let x = 0; x < MOON_RES; x++) {
      const { nx, ny } = sphereUV(x, y, MOON_RES, MOON_RES / 2)
      const n = warpedFbm(nx * 3 + sx, ny * 3 + sx, 1.5, 4)

      const ice = 0.8 + n * 0.15
      let r = ice, g = ice + 0.02, b = ice + 0.05

      const crack = fbm(nx * 12 + sx, ny * 12 + sx, 4)
      if (crack > 0.58) {
        const ck = (crack - 0.58) / 0.42
        r = lerp(r, 0.5, ck * 0.4)
        g = lerp(g, 0.4, ck * 0.35)
        b = lerp(b, 0.25, ck * 0.3)
      }

      const brownPatch = fbm(nx * 4 + sx + 5, ny * 4 + sx + 5, 3)
      if (brownPatch > 0.6) {
        const bp = (brownPatch - 0.6) / 0.4
        r = lerp(r, 0.5, bp * 0.3)
        g = lerp(g, 0.35, bp * 0.25)
        b = lerp(b, 0.15, bp * 0.2)
      }

      const idx = (y * MOON_RES + x) * 4
      p[idx] = toByte(r); p[idx + 1] = toByte(g); p[idx + 2] = toByte(b); p[idx + 3] = 255
    }
  }
  ctx.putImageData(d, 0, 0)
  return c
}

export function generateGanimedesTexture(): HTMLCanvasElement {
  const [c, ctx] = createCanvas(MOON_RES, MOON_RES / 2)
  const d = ctx.createImageData(MOON_RES, MOON_RES / 2)
  const p = d.data
  const sx = Math.random() * 100

  for (let y = 0; y < MOON_RES / 2; y++) {
    for (let x = 0; x < MOON_RES; x++) {
      const { nx, ny, latNorm } = sphereUV(x, y, MOON_RES, MOON_RES / 2)
      const raw = warpedFbm(nx * 5 + sx, ny * 5 + sx, 1.5, 5)

      const dark = fbm(nx * 4 + sx + 3, ny * 4 + sx + 7, 3)
      let r: number, g: number, b: number
      if (dark > 0.55) {
        const dk = (dark - 0.55) / 0.45
        r = 0.25 + raw * 0.2 + dk * 0.1
        g = 0.2 + raw * 0.18 + dk * 0.08
        b = 0.15 + raw * 0.15 + dk * 0.05
      } else {
        r = 0.45 + raw * 0.3
        g = 0.4 + raw * 0.28
        b = 0.3 + raw * 0.25
      }

      const pole = Math.abs(latNorm)
      if (pole > 0.7) {
        const pf = (pole - 0.7) / 0.3
        r = lerp(r, 0.7, pf * 0.5)
        g = lerp(g, 0.7, pf * 0.5)
        b = lerp(b, 0.7, pf * 0.5)
      }

      const idx = (y * MOON_RES + x) * 4
      p[idx] = toByte(r); p[idx + 1] = toByte(g); p[idx + 2] = toByte(b); p[idx + 3] = 255
    }
  }
  ctx.putImageData(d, 0, 0)
  return c
}

export function generateCalistoTexture(): HTMLCanvasElement {
  const [c, ctx] = createCanvas(MOON_RES, MOON_RES / 2)
  const d = ctx.createImageData(MOON_RES, MOON_RES / 2)
  const p = d.data
  const sx = Math.random() * 100

  for (let y = 0; y < MOON_RES / 2; y++) {
    for (let x = 0; x < MOON_RES; x++) {
      const { nx, ny } = sphereUV(x, y, MOON_RES, MOON_RES / 2)
      const raw = warpedFbm(nx * 5 + sx, ny * 5 + sx, 1.5, 5)

      let crater = 0
      for (let i = 0; i < 80; i++) {
        const cx = hash2D(i * 3 + 7, i * 7 + 3)
        const cy = hash2D(i * 5 + 11, i * 11 + 5)
        const cr = 0.005 + hash2D(i * 2, i * 3) * 0.18
        const dx = nx - cx, dy = ny - cy
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < cr) {
          const t2 = dist / cr
          crater += Math.sin(t2 * Math.PI) * 0.3 * (1 - t2)
          if (t2 < 0.1) crater -= 0.4 * (1 - t2 / 0.1)
        }
      }

      const base = clamp((raw + crater) * 0.55)
      const val = base * 0.5 + 0.05

      const brightCenter = fbm(nx * 2 + sx, ny * 2 + sx, 3)
      let r = val, g = val * 0.9, b = val * 0.8
      if (brightCenter > 0.6) {
        const bc = (brightCenter - 0.6) / 0.4
        r = lerp(r, val + 0.3, bc * 0.4)
        g = lerp(g, val * 0.9 + 0.25, bc * 0.4)
        b = lerp(b, val * 0.8 + 0.2, bc * 0.4)
      }

      const idx = (y * MOON_RES + x) * 4
      p[idx] = toByte(r); p[idx + 1] = toByte(g); p[idx + 2] = toByte(b); p[idx + 3] = 255
    }
  }
  ctx.putImageData(d, 0, 0)
  return c
}

export function generateTritaoTexture(): HTMLCanvasElement {
  const [c, ctx] = createCanvas(MOON_RES, MOON_RES / 2)
  const d = ctx.createImageData(MOON_RES, MOON_RES / 2)
  const p = d.data
  const sx = Math.random() * 100

  for (let y = 0; y < MOON_RES / 2; y++) {
    for (let x = 0; x < MOON_RES; x++) {
      const { nx, ny } = sphereUV(x, y, MOON_RES, MOON_RES / 2)
      const n = warpedFbm(nx * 4 + sx, ny * 4 + sx, 2, 5)

      const cantaloupe = fbm(nx * 10 + sx, ny * 10 + sx, 3)
      const ridge = Math.abs(cantaloupe - 0.5) * 0.3

      const pink = 0.6 + n * 0.25 + ridge
      let r = pink, g = 0.5 + n * 0.2 + ridge * 0.7, b = 0.5 + n * 0.2 + ridge * 0.5

      const darkStreak = fbm(nx * 6 + sx + 3, ny * 6 + sx + 5, 3)
      if (darkStreak > 0.6) {
        const ds = (darkStreak - 0.6) / 0.4
        r = lerp(r, 0.3, ds * 0.3)
        g = lerp(g, 0.2, ds * 0.25)
        b = lerp(b, 0.25, ds * 0.2)
      }

      const idx = (y * MOON_RES + x) * 4
      p[idx] = toByte(r); p[idx + 1] = toByte(g); p[idx + 2] = toByte(b); p[idx + 3] = 255
    }
  }
  ctx.putImageData(d, 0, 0)
  return c
}

export function generateStarTexture(): HTMLCanvasElement {
  const [c, ctx] = createCanvas(512, 512)
  const d = ctx.createImageData(512, 512)
  const p = d.data

  for (let y = 0; y < 512; y++) {
    for (let x = 0; x < 512; x++) {
      const idx = (y * 512 + x) * 4
      const b = Math.random()
      if (b > 0.995) {
        p[idx] = 255; p[idx + 1] = 255; p[idx + 2] = 255; p[idx + 3] = 255
      } else {
        p[idx] = 0; p[idx + 1] = 0; p[idx + 2] = 0; p[idx + 3] = 0
      }
    }
  }
  ctx.putImageData(d, 0, 0)
  return c
}
