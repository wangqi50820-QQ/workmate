import { useState, type FormEvent } from 'react'
import { useAppState } from '../app-state'
import { PixelCompanion } from './PixelCompanion'

export function TreeHole({ onClose }: { onClose(): void }) {
  const { api, snapshot, setSnapshot } = useAppState()
  const [text, setText] = useState('')
  const [consented, setConsented] = useState(false)
  const [listening, setListening] = useState(false)
  const [reply, setReply] = useState<{ text: string; fallback: boolean } | null>(
    null,
  )
  const [confirmClear, setConfirmClear] = useState(false)
  if (!snapshot) return null

  const submit = async (event: FormEvent): Promise<void> => {
    event.preventDefault()
    if (!text.trim() || !consented) return
    setListening(true)
    try {
      const result = await api.submitTreeHole(text.trim())
      setReply({ text: result.text, fallback: result.source === 'fallback' })
      setText('')
    } finally {
      setListening(false)
    }
  }

  return (
    <div className="panel-backdrop">
      <section className="side-panel tree-hole" role="dialog" aria-modal="true" aria-labelledby="tree-hole-title">
        <header>
          <div>
            <span className="eyebrow">记忆瓶 · 只存在这台电脑</span>
            <h2 id="tree-hole-title">和工友说说</h2>
          </div>
          <button className="icon-button" aria-label="关闭记忆瓶" onClick={onClose}>×</button>
        </header>

        <PixelCompanion
          mood={listening ? 'listening' : 'idle'}
          message={listening ? '你说，我认真听着。' : '不急着振作，先说出来。'}
        />
        <form onSubmit={(event) => void submit(event)}>
          <label>
            想对工友说的话
            <textarea
              maxLength={1000}
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="今天最想吐槽什么？"
            />
          </label>
          <label className="consent-line">
            <input
              type="checkbox"
              checked={consented}
              onChange={(event) => setConsented(event.target.checked)}
            />
            我知道这段话可能发送到当前配置的 AI 端点；没有配置或失败时会使用本地回应。
          </label>
          <button disabled={!text.trim() || !consented || listening}>
            {listening ? '工友在听…' : '放进记忆瓶'}
          </button>
        </form>

        {reply ? (
          <blockquote className="companion-reply">
            {reply.text}
            {reply.fallback ? <small>本地回应</small> : null}
          </blockquote>
        ) : null}

        <div className="memory-heading">
          <h3>最近记得的事</h3>
          {snapshot.memories.length ? (
            confirmClear ? (
              <span className="confirm-actions">
                <button
                  onClick={() =>
                    void api.clearMemories().then((next) => {
                      setSnapshot(next)
                      setConfirmClear(false)
                    })
                  }
                >
                  确认清空
                </button>
                <button onClick={() => setConfirmClear(false)}>取消</button>
              </span>
            ) : (
              <button onClick={() => setConfirmClear(true)}>清空记忆瓶</button>
            )
          ) : null}
        </div>
        <ul className="memory-list">
          {snapshot.memories.map((memory) => (
            <li key={memory.id}>
              <div><b>你说：</b>{memory.userText}</div>
              <p>{memory.reply}</p>
              <button
                aria-label={`删除记忆：${memory.userText}`}
                onClick={() => void api.deleteMemory(memory.id).then(setSnapshot)}
              >
                删除
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
