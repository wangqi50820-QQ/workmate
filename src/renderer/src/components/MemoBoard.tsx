import { useState, type FormEvent } from 'react'
import { useAppState } from '../app-state'

export function MemoBoard() {
  const { api, snapshot, setSnapshot } = useAppState()
  const [text, setText] = useState('')
  const [remindAt, setRemindAt] = useState('')
  if (!snapshot) return null

  const submit = async (event: FormEvent): Promise<void> => {
    event.preventDefault()
    const normalized = text.trim()
    if (!normalized) return
    setSnapshot(
      await api.createMemo({
        text: normalized,
        remindAt: remindAt ? new Date(remindAt).toISOString() : null,
      }),
    )
    setText('')
    setRemindAt('')
  }

  return (
    <section className="desk-widget memo-board" aria-labelledby="memo-title">
      <div className="widget-label" id="memo-title">便签板</div>
      <form onSubmit={(event) => void submit(event)}>
        <label>
          新便签
          <input
            maxLength={200}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="记一件待办"
          />
        </label>
        <label className="compact-label">
          提醒时间（可选）
          <input
            type="datetime-local"
            value={remindAt}
            onChange={(event) => setRemindAt(event.target.value)}
          />
        </label>
        <button disabled={!text.trim()}>贴上便签</button>
      </form>
      <ul className="memo-list">
        {snapshot.memos.slice(0, 3).map((memo) => (
          <li key={memo.id} className={memo.completedAt ? 'is-complete' : ''}>
            <span>{memo.text}</span>
            <div>
              <button
                aria-label={`${memo.completedAt ? '恢复' : '完成'}便签：${memo.text}`}
                onClick={() =>
                  void api
                    .updateMemo(memo.id, { completed: !memo.completedAt })
                    .then(setSnapshot)
                }
              >
                {memo.completedAt ? '↶' : '✓'}
              </button>
              <button
                aria-label={`删除便签：${memo.text}`}
                onClick={() => void api.deleteMemo(memo.id).then(setSnapshot)}
              >
                ×
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
