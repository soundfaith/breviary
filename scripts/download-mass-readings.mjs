import fs from 'node:fs'

const years = [2025, 2026, 2027]
const entries = {}
for (const year of years) {
  for (let month = 1; month <= 12; month += 1) {
    const days = new Date(year, month, 0).getDate()
    for (let day = 1; day <= days; day += 1) {
      const monthDay = `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const url = `https://cpbjr.github.io/catholic-readings-api/readings/${year}/${monthDay}.json`
      try {
        const response = await fetch(url)
        if (!response.ok) continue
        const record = await response.json()
        entries[record.date] = {
          date: record.date,
          season: record.season,
          readings: record.readings,
          usccbLink: record.usccbLink,
        }
      } catch {
        // Missing source dates remain absent from the local coverage.
      }
    }
  }
}

fs.mkdirSync('frontend/data', { recursive: true })
fs.writeFileSync('frontend/data/mass-readings.json', `${JSON.stringify({
  id: 'us-catholic-mass-readings',
  source: 'https://github.com/cpbjr/catholic-readings-api',
  schedule: 'United States Catholic Mass readings, citation metadata only',
  years,
  entries,
}, null, 2)}\n`)
console.log(`Saved ${Object.keys(entries).length} daily reading records.`)