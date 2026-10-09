// Finds Blender and runs build_body.py with it, without opening Blender's window.
// Usage: npm run build:body
//
// Blender is looked for in the folder named by BLENDER_PATH (the full path to
// blender.exe) if that is set, and otherwise in E:\XhoreTools, where this
// project keeps its large tools.
import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(here, '..', '..')
const TOOLS_FOLDER = process.env.XHORE_TOOLS ?? 'E:\\XhoreTools'

function findBlender() {
  if (process.env.BLENDER_PATH) return process.env.BLENDER_PATH
  if (!existsSync(TOOLS_FOLDER)) return null
  const folders = readdirSync(TOOLS_FOLDER)
    .filter((name) => name.startsWith('blender-'))
    .sort()
    .reverse()
  for (const folder of folders) {
    const executable = join(TOOLS_FOLDER, folder, 'blender.exe')
    if (existsSync(executable)) return executable
  }
  return null
}

const blender = findBlender()
if (!blender || !existsSync(blender)) {
  console.error(
    `Could not find Blender. Expected a "blender-..." folder inside ${TOOLS_FOLDER}, ` +
      'or set BLENDER_PATH to the full path of blender.exe.',
  )
  process.exit(1)
}

// The body file belongs to the avatar kit, which every screen and game loads it through.
const output = join(projectRoot, 'shared', 'avatar-kit', 'assets', 'body-male.glb')
const previews = join(here, 'previews')

console.log(`Building the body with ${blender}`)
console.log('This takes about a minute.')

const run = spawnSync(
  blender,
  [
    '--background',
    '--python-exit-code',
    '1',
    '--python',
    join(here, 'build_body.py'),
    '--',
    '--out',
    output,
    '--previews',
    previews,
  ],
  { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
)

// Blender and MPFB print a great deal. Show the script's own report, and
// everything only when something went wrong.
const lines = `${run.stdout ?? ''}\n${run.stderr ?? ''}`.split(/\r?\n/)
const report = lines.filter((line) => line.startsWith('REPORT') || line === 'DONE')
for (const line of report) console.log(line.replace(/^REPORT /, '  '))

if (run.status !== 0 || !report.includes('DONE')) {
  console.error('\nThe build failed. The last lines Blender printed were:\n')
  console.error(lines.filter((line) => line.trim() !== '').slice(-40).join('\n'))
  process.exit(1)
}

console.log(`\nBody file:        ${output}`)
console.log(`Checking pictures: ${previews}`)
