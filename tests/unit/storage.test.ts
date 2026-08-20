import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createJsonStore } from '../../src/main/storage'
import { defaultAppState } from '../../src/shared/domain/config'

const temporaryDirectories: string[] = []

async function createTestPath(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'gongyou-store-'))
  temporaryDirectories.push(directory)
  return join(directory, 'state.json')
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { force: true, recursive: true }),
    ),
  )
})

describe('JSON state storage', () => {
  it('persists an update when the store is reopened', async () => {
    const filePath = await createTestPath()
    const defaults = defaultAppState(new Date('2026-08-20T08:00:00.000Z'))
    const store = createJsonStore(filePath, defaults)

    await store.update((state) => ({
      ...state,
      config: { ...state.config, monthlySalary: 12000 },
    }))

    const reopened = createJsonStore(filePath, defaults)
    expect((await reopened.read()).config.monthlySalary).toBe(12000)
  })

  it('quarantines invalid JSON and restores validated defaults', async () => {
    const filePath = await createTestPath()
    const defaults = defaultAppState(new Date('2026-08-20T08:00:00.000Z'))
    await writeFile(filePath, '{not-valid-json', 'utf8')

    const store = createJsonStore(filePath, defaults)
    const restored = await store.read()
    const siblingNames = await readdir(join(filePath, '..'))
    const persisted = JSON.parse(await readFile(filePath, 'utf8'))

    expect(restored.config.monthlySalary).toBe(10000)
    expect(persisted.schemaVersion).toBe(1)
    expect(
      siblingNames.some((name) => name.startsWith('state.json.corrupt-')),
    ).toBe(true)
  })

  it('serializes concurrent updates without dropping either change', async () => {
    const filePath = await createTestPath()
    const defaults = defaultAppState(new Date('2026-08-20T08:00:00.000Z'))
    const store = createJsonStore(filePath, defaults)

    await Promise.all([
      store.update((state) => ({
        ...state,
        config: { ...state.config, monthlySalary: 18000 },
      })),
      store.update((state) => ({
        ...state,
        config: { ...state.config, payday: 28 },
      })),
    ])

    const state = await store.read()
    expect(state.config.monthlySalary).toBe(18000)
    expect(state.config.payday).toBe(28)
  })
})
