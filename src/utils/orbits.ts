export interface MoonData {
  name: string
  orbitRadius: number
  size: number
  periodDays: number
  color: string
}

export interface PlanetData {
  name: string
  orbitRadius: number
  size: number
  periodDays: number
  meanAnomalyJ2000: number
  eccentricity: number
  longitudePerihelion: number
  axialTilt: number
  rotationPeriodHours: number
  orbitalInclination: number
  color: string
  hasRings?: boolean
  moons?: MoonData[]
}

interface PlanetEntry {
  name: string
  orbitRadius: number
  size: number
  periodDays: number
  meanAnomalyJ2000: number
  eccentricity: number
  longitudePerihelion: number
  axialTilt: number
  rotationPeriodHours: number
  orbitalInclination: number
  color: string
  hasRings?: boolean
  moons?: MoonData[]
}

const planetaryData: PlanetEntry[] = [
  // M₀ = L - ϖ at J2000.0 (degrees)
  // Source: NASA JPL planetary orbital elements
  {
    name: 'Mercúrio',
    orbitRadius: 2.2,
    size: 0.22,
    periodDays: 87.97,
    meanAnomalyJ2000: 174.796,
    eccentricity: 0.2056,
    longitudePerihelion: 77.456,
    axialTilt: 0.034,
    rotationPeriodHours: 1407.6,
    orbitalInclination: 7.0,
    color: '#b0b0b0',
  },
  {
    name: 'Vênus',
    orbitRadius: 3.2,
    size: 0.42,
    periodDays: 224.7,
    meanAnomalyJ2000: 50.420,
    eccentricity: 0.0068,
    longitudePerihelion: 131.56,
    axialTilt: 177.4,
    rotationPeriodHours: -5832.6,
    orbitalInclination: 3.39,
    color: '#e8cda0',
  },
  {
    name: 'Terra',
    orbitRadius: 4.4,
    size: 0.45,
    periodDays: 365.25,
    meanAnomalyJ2000: 357.524,
    eccentricity: 0.0167,
    longitudePerihelion: 102.94,
    axialTilt: 23.44,
    rotationPeriodHours: 24.0,
    orbitalInclination: 0.0,
    color: '#4488ff',
    moons: [
      { name: 'Lua', orbitRadius: 0.9, size: 0.12, periodDays: 27.32, color: '#ccc' },
    ],
  },
  {
    name: 'Marte',
    orbitRadius: 5.8,
    size: 0.3,
    periodDays: 687.0,
    meanAnomalyJ2000: 19.393,
    eccentricity: 0.0934,
    longitudePerihelion: 336.06,
    axialTilt: 25.19,
    rotationPeriodHours: 24.6,
    orbitalInclination: 1.85,
    color: '#cc6644',
    moons: [
      { name: 'Fobos', orbitRadius: 0.6, size: 0.04, periodDays: 1.0, color: '#998877' },
      { name: 'Deimos', orbitRadius: 0.9, size: 0.03, periodDays: 3.0, color: '#887766' },
    ],
  },
  {
    name: 'Júpiter',
    orbitRadius: 8.5,
    size: 1.4,
    periodDays: 4332.6,
    meanAnomalyJ2000: 20.021,
    eccentricity: 0.0484,
    longitudePerihelion: 14.33,
    axialTilt: 3.13,
    rotationPeriodHours: 9.9,
    orbitalInclination: 1.3,
    color: '#d4a06a',
    moons: [
      { name: 'Io', orbitRadius: 1.2, size: 0.08, periodDays: 5.0, color: '#ccaa33' },
      { name: 'Europa', orbitRadius: 1.6, size: 0.07, periodDays: 10.0, color: '#ccbbaa' },
      { name: 'Ganimedes', orbitRadius: 2.1, size: 0.1, periodDays: 20.0, color: '#aa9977' },
      { name: 'Calisto', orbitRadius: 2.8, size: 0.09, periodDays: 40.0, color: '#776655' },
    ],
  },
  {
    name: 'Saturno',
    orbitRadius: 11.5,
    size: 1.15,
    periodDays: 10759.0,
    meanAnomalyJ2000: 316.885,
    eccentricity: 0.0538,
    longitudePerihelion: 93.06,
    axialTilt: 26.73,
    rotationPeriodHours: 10.7,
    orbitalInclination: 2.49,
    color: '#e8d5a0',
    hasRings: true,
  },
  {
    name: 'Urano',
    orbitRadius: 15.0,
    size: 0.65,
    periodDays: 30688.5,
    meanAnomalyJ2000: 140.222,
    eccentricity: 0.0473,
    longitudePerihelion: 173.01,
    axialTilt: 97.77,
    rotationPeriodHours: -17.2,
    orbitalInclination: 0.77,
    color: '#88ccdd',
    hasRings: true,
  },
  {
    name: 'Netuno',
    orbitRadius: 18.0,
    size: 0.6,
    periodDays: 60182.0,
    meanAnomalyJ2000: 256.760,
    eccentricity: 0.0086,
    longitudePerihelion: 48.12,
    axialTilt: 28.32,
    rotationPeriodHours: 16.1,
    orbitalInclination: 1.77,
    color: '#3344cc',
    moons: [
      { name: 'Tritão', orbitRadius: 1.0, size: 0.06, periodDays: 15.0, color: '#bbaacc' },
    ],
  },
]

const DAYS_PER_SECOND = 3
const J2000_MS = new Date('2000-01-01T12:00:00Z').getTime()

export function getDaysSinceJ2000(): number {
  return (Date.now() - J2000_MS) / 86400000
}

function solveKepler(M: number, e: number, tol = 1e-8): number {
  let E = M
  for (let i = 0; i < 20; i++) {
    const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E))
    E -= dE
    if (Math.abs(dE) < tol) break
  }
  return E
}

function trueAnomalyFromEccentric(E: number, e: number): number {
  return 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2))
}

export function getPlanetAngle(data: PlanetData, elapsedSeconds: number): number {
  const daysSinceEpoch = getDaysSinceJ2000()
  const totalDays = daysSinceEpoch + elapsedSeconds * DAYS_PER_SECOND
  const meanMotion = (2 * Math.PI) / data.periodDays

  const M0rad = (data.meanAnomalyJ2000 * Math.PI) / 180
  const M = M0rad + meanMotion * totalDays
  const Mnorm = M % (2 * Math.PI)

  const E = solveKepler(Mnorm, data.eccentricity)
  const nu = trueAnomalyFromEccentric(E, data.eccentricity)

  const varpiRad = (data.longitudePerihelion * Math.PI) / 180
  return nu + varpiRad
}

export function getMoonAngle(moon: MoonData, _parentPeriodDays: number, elapsedSeconds: number): number {
  const daysSinceEpoch = getDaysSinceJ2000()
  const totalDays = daysSinceEpoch + elapsedSeconds * DAYS_PER_SECOND
  const initialAngle = ((moon.name.length * 47 + 13) * Math.PI) / 180
  const meanMotion = (2 * Math.PI) / moon.periodDays
  return initialAngle + meanMotion * totalDays
}

export function getPlanets(): PlanetData[] {
  return planetaryData
}
