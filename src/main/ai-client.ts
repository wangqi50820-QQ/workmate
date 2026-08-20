import type { MemoryEntry } from '../shared/contracts'

const DEFAULT_ENDPOINT = 'https://api.openai.com/v1/chat/completions'
const DEFAULT_TIMEOUT_MS = 8000

export interface EmpathyRequest {
  statement: string
  memory?: MemoryEntry
}

export interface EmpathyResult {
  text: string
  source: 'remote' | 'fallback'
  memoryId?: string
}

export interface AiClientOptions {
  apiKey?: string
  endpoint?: string
  model?: string
  timeoutMs?: number
  fetchImpl?: typeof fetch
}

const normalizeWhitespace = (value: string): string =>
  value.trim().replace(/\s+/g, ' ')

const limitRemoteText = (value: string): string => {
  const normalized = normalizeWhitespace(value)
  const sentences = normalized.match(/[^。！？.!?]+[。！？.!?]?/g) ?? []
  const limitedSentences = sentences
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .slice(0, 3)
    .join('')

  return Array.from(limitedSentences).slice(0, 240).join('').trim()
}

const fallbackText = (statement: string): string => {
  const normalized = normalizeWhitespace(statement)

  if (/改稿|改方案|改了.*版/.test(normalized)) {
    return '改来改去确实磨人。先把这一版交出去，别顺手把自己也否定了。'
  }
  if (/加班|熬夜|下不了班/.test(normalized)) {
    return '加班不是你的勋章，是今天的活太多了。能收尾就收尾，别把整个人也押在工位上。'
  }
  if (/疲惫|好累|很累|困了|没力气/.test(normalized)) {
    return '累了就是累了，不用再证明自己能扛。先喘口气，剩下的我们慢慢来。'
  }
  if (/生气|气死|恼火|窝火/.test(normalized)) {
    return '这事搁谁身上都来气。先让火气落一点，再决定什么值得回应。'
  }

  return '我听见了。你不用马上振作，先把这件事放在这里，我们一起缓一缓。'
}

const memoryIdFor = (request: EmpathyRequest): Pick<EmpathyResult, 'memoryId'> =>
  request.memory ? { memoryId: request.memory.id } : {}

const fallbackResult = (request: EmpathyRequest): EmpathyResult => ({
  text: fallbackText(request.statement),
  source: 'fallback',
  ...memoryIdFor(request),
})

const responseContent = (value: unknown): string | null => {
  if (!value || typeof value !== 'object') {
    return null
  }

  const choices = (value as { choices?: unknown }).choices
  if (!Array.isArray(choices) || choices.length === 0) {
    return null
  }

  const first = choices[0]
  if (!first || typeof first !== 'object') {
    return null
  }

  const message = (first as { message?: unknown }).message
  if (!message || typeof message !== 'object') {
    return null
  }

  const content = (message as { content?: unknown }).content
  return typeof content === 'string' ? content : null
}

export function createAiClient(options: AiClientOptions = {}) {
  const fetchImpl = options.fetchImpl ?? fetch
  const endpoint = options.endpoint ?? DEFAULT_ENDPOINT
  const model = options.model ?? 'gpt-4o-mini'
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const apiKey = options.apiKey?.trim()

  return {
    async respond(request: EmpathyRequest): Promise<EmpathyResult> {
      if (!apiKey) {
        return fallbackResult(request)
      }

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), timeoutMs)
      const userContent = [
        `当前倾诉：${normalizeWhitespace(request.statement)}`,
        request.memory
          ? `相关记忆：${normalizeWhitespace(request.memory.userText)}`
          : null,
      ]
        .filter((part): part is string => part !== null)
        .join('\n')

      try {
        const response = await fetchImpl(endpoint, {
          method: 'POST',
          headers: {
            authorization: `Bearer ${apiKey}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: 'system',
                content:
                  '你是用户桌面上的工友，一个嘴硬心软的老友。先共情，再最多给一点轻建议；只回复一到三句，禁止说教、空洞鸡汤和夸张承诺。',
              },
              { role: 'user', content: userContent },
            ],
            temperature: 0.7,
            max_tokens: 180,
          }),
          signal: controller.signal,
        })

        if (!response.ok) {
          return fallbackResult(request)
        }

        const text = limitRemoteText(responseContent(await response.json()) ?? '')
        if (!text) {
          return fallbackResult(request)
        }

        return {
          text,
          source: 'remote',
          ...memoryIdFor(request),
        }
      } catch {
        return fallbackResult(request)
      } finally {
        clearTimeout(timeout)
      }
    },
  }
}
