import { useAppState } from '../app-state'

export function ReminderControls() {
  const { api, snapshot, setSnapshot } = useAppState()
  if (!snapshot) return null

  const acknowledge = async (kind: 'water' | 'sedentary'): Promise<void> => {
    const startedAt =
      kind === 'water'
        ? snapshot.acknowledged.waterStartedAt
        : snapshot.acknowledged.sedentaryStartedAt
    setSnapshot(await api.acknowledge(`${kind}:${startedAt}`))
  }

  return (
    <section className="care-controls" aria-label="身体提醒">
      <button onClick={() => void acknowledge('water')}>
        <span aria-hidden="true">🥤</span> 已喝水
      </button>
      <button onClick={() => void acknowledge('sedentary')}>
        <span aria-hidden="true">🪑</span> 我起来了
      </button>
    </section>
  )
}
