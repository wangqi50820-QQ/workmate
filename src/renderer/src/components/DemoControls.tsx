import type { DemoEventKind } from '../../../shared/contracts'
import { useAppState } from '../app-state'

const demos: Array<{ kind: DemoEventKind; label: string }> = [
  { kind: 'broadcast', label: '演示实时工钱广播' },
  { kind: 'sedentary', label: '演示久坐提醒' },
  { kind: 'water', label: '演示喝水提醒' },
  { kind: 'off-work', label: '演示下班提醒' },
  { kind: 'payday', label: '演示发薪提醒' },
]

export function DemoControls() {
  const { api } = useAppState()

  return (
    <section className="demo-controls" aria-labelledby="demo-controls-title">
      <div>
        <h3 id="demo-controls-title">路演控制台</h3>
        <p>立即走一遍真实提醒通道，不修改系统时间和你的发薪日。</p>
      </div>
      <div className="demo-grid">
        {demos.map(({ kind, label }) => (
          <button key={kind} type="button" onClick={() => void api.triggerDemo(kind)}>
            {label}
          </button>
        ))}
      </div>
    </section>
  )
}
