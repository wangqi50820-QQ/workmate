import { useState, type FormEvent } from 'react'
import { useAppState } from '../app-state'

export function CheckInStamp() {
  const { api, snapshot, setSnapshot } = useAppState()
  const [text, setText] = useState('')
  if (!snapshot) return null

  const submit = async (event: FormEvent): Promise<void> => {
    event.preventDefault()
    const normalized = text.trim()
    if (!normalized) return
    setSnapshot(await api.createCheckIn(normalized))
    setText('')
  }

  const today = snapshot.generatedAt.slice(0, 10)
  const todayCount = snapshot.checkIns.filter((entry) =>
    entry.createdAt.startsWith(today),
  ).length

  return (
    <section className="desk-widget checkin-stamp" aria-labelledby="checkin-title">
      <div className="widget-label" id="checkin-title">打卡章 · 今日 {todayCount}</div>
      <form onSubmit={(event) => void submit(event)}>
        <label>
          今天完成的小事
          <input
            maxLength={80}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="哪怕只是一件小事"
          />
        </label>
        <button disabled={!text.trim()}>盖章</button>
      </form>
    </section>
  )
}
