// Captures the PWA install screenshots and the OG image from a running build.
//   npm run build && npx vite preview --port 4173   (in another terminal)
//   node scripts/screenshots.mjs [http://localhost:4173]
// Uses the locally installed Chrome over the DevTools protocol, so phone shots get true
// device metrics (headless --window-size cannot go below ~500px on Windows).
import { spawn } from 'node:child_process'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = process.argv[2] ?? 'http://localhost:4173'
const PORT = 9333

// A filled-in draft so the questionnaire shot shows a real date range, not an empty form.
const iso = (d) => d.toISOString().slice(0, 10)
const checkIn = new Date()
checkIn.setDate(checkIn.getDate() + 24)
const checkOut = new Date(checkIn)
checkOut.setDate(checkOut.getDate() + 5)
const draft = {
  destination: 'כרתים, יוון',
  hotelMode: 'pick_for_me',
  checkIn: iso(checkIn),
  checkOut: iso(checkOut),
  flexibleDays: 1,
}

const phone = { width: 390, height: 844, scale: 2, mobile: true }
const shots = [
  { file: 'public/screenshots/home-narrow.png', path: '/', ...phone },
  { file: 'public/screenshots/search-narrow.png', path: '/search?step=dates', ...phone, draft },
  { file: 'public/screenshots/home-wide.png', path: '/', width: 1440, height: 900, scale: 1, mobile: false },
  { file: 'public/og.png', path: '/', width: 1200, height: 630, scale: 1, mobile: false },
]

const profile = await mkdtemp(join(tmpdir(), 'rm-shots-'))
const chrome = spawn(CHROME, ['--headless=new', '--hide-scrollbars', '--no-first-run', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let target
for (let i = 0; i < 40 && !target; i++) {
  await sleep(250)
  try {
    const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
    target = list.find((t) => t.type === 'page')
  } catch {
    /* Chrome still starting */
  }
}
if (!target) throw new Error('Chrome did not start')

const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let nextId = 0
const pending = new Map()
const waiters = new Map()
ws.addEventListener('message', (e) => {
  const msg = JSON.parse(e.data)
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg)
    pending.delete(msg.id)
  } else if (msg.method && waiters.has(msg.method)) {
    waiters.get(msg.method)()
    waiters.delete(msg.method)
  }
})
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = ++nextId
    pending.set(id, (msg) => (msg.error ? reject(new Error(`${method}: ${msg.error.message}`)) : resolve(msg.result)))
    ws.send(JSON.stringify({ id, method, params }))
  })
const once = (method) => new Promise((r) => waiters.set(method, r))

await send('Page.enable')
for (const shot of shots) {
  await send('Emulation.setDeviceMetricsOverride', {
    width: shot.width,
    height: shot.height,
    deviceScaleFactor: shot.scale,
    mobile: shot.mobile,
  })
  await send('Emulation.setTouchEmulationEnabled', { enabled: shot.mobile })
  // Start each shot from the same origin with clean storage (plus the draft, when given).
  let loaded = once('Page.loadEventFired')
  await send('Page.navigate', { url: `${BASE}/` })
  await loaded
  await send('Runtime.evaluate', {
    expression: `localStorage.clear(); ${shot.draft ? `localStorage.setItem('rm.search-draft.v1', ${JSON.stringify(JSON.stringify(shot.draft))})` : ''}`,
  })
  loaded = once('Page.loadEventFired')
  await send('Page.navigate', { url: BASE + shot.path })
  await loaded
  await sleep(1800) // fonts, lazy routes and the entrance animation
  const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
  await writeFile(shot.file, Buffer.from(data, 'base64'))
  console.log(`✓ ${shot.file} ${shot.width * shot.scale}x${shot.height * shot.scale}`)
}

ws.close()
chrome.kill()
