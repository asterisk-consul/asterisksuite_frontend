import { readdir, readFile } from 'node:fs/promises'
import { extname, join } from 'node:path'

const extensions = new Set(['.vue', '.ts', '.js', '.mjs', '.json'])
const mojibake = /(?:Ã.|Â.|â[\u0080-\uFFFF])/u
const affected = []

async function scan(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      await scan(path)
      continue
    }
    if (!extensions.has(extname(path))) continue
    const content = await readFile(path, 'utf8')
    if (mojibake.test(content)) affected.push(path)
  }
}

await scan('app')

if (affected.length) {
  console.error('Se detectaron textos con posible codificación UTF-8 dañada:')
  for (const path of affected) console.error(`- ${path}`)
  process.exit(1)
}

console.log('Codificación UTF-8 verificada')
