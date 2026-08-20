import {
  mkdir,
  open,
  readFile,
  rename,
  rm,
} from 'node:fs/promises'
import { dirname } from 'node:path'
import {
  AppStateSchema,
  type AppState,
} from '../shared/domain/config'

export interface JsonStore {
  read(): Promise<AppState>
  update(mutator: (draft: AppState) => AppState): Promise<AppState>
}

export function createJsonStore(
  filePath: string,
  defaults: AppState,
): JsonStore {
  const validatedDefaults = AppStateSchema.parse(structuredClone(defaults))
  let queue: Promise<void> = Promise.resolve()

  const writeAtomic = async (state: AppState): Promise<void> => {
    const temporaryPath = `${filePath}.tmp`
    await mkdir(dirname(filePath), { recursive: true })
    const handle = await open(temporaryPath, 'w')

    try {
      await handle.writeFile(`${JSON.stringify(state, null, 2)}\n`, 'utf8')
      await handle.sync()
    } finally {
      await handle.close()
    }

    try {
      await rename(temporaryPath, filePath)
    } catch (error) {
      await rm(temporaryPath, { force: true })
      throw error
    }
  }

  const restoreDefaults = async (): Promise<AppState> => {
    const restored = structuredClone(validatedDefaults)
    await writeAtomic(restored)
    return restored
  }

  const readFromDisk = async (): Promise<AppState> => {
    let contents: string

    try {
      contents = await readFile(filePath, 'utf8')
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return restoreDefaults()
      }
      throw error
    }

    try {
      return AppStateSchema.parse(JSON.parse(contents))
    } catch {
      const quarantinePath = `${filePath}.corrupt-${Date.now()}`
      await rename(filePath, quarantinePath)
      return restoreDefaults()
    }
  }

  const serialize = <T>(operation: () => Promise<T>): Promise<T> => {
    const result = queue.then(operation)
    queue = result.then(
      () => undefined,
      () => undefined,
    )
    return result
  }

  return {
    read: () => serialize(readFromDisk),
    update: (mutator) =>
      serialize(async () => {
        const current = await readFromDisk()
        const draft = structuredClone(current)
        const next = AppStateSchema.parse(mutator(draft))
        await writeAtomic(next)
        return next
      }),
  }
}
