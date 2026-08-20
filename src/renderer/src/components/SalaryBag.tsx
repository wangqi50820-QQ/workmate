import { useAppState } from '../app-state'

export function SalaryBag() {
  const { snapshot } = useAppState()
  if (!snapshot) return null

  const progress = Math.round(snapshot.salary.workingProgress * 100)
  return (
    <section className="desk-widget salary-bag" aria-labelledby="salary-title">
      <div className="widget-label" id="salary-title">工资袋</div>
      <strong className="salary-value">
        ¥{snapshot.salary.earnedToday.toFixed(2)}
      </strong>
      <span>今日预计 ¥{snapshot.salary.expectedToday.toFixed(2)}</span>
      <div
        className="salary-progress"
        role="progressbar"
        aria-label="今日工钱进度"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
      >
        <span style={{ width: `${progress}%` }} />
      </div>
      <b>距发薪 {snapshot.daysUntilPayday} 天</b>
    </section>
  )
}
