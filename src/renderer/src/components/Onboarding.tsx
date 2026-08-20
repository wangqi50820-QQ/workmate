import { useMemo, useState, type FormEvent } from 'react'
import { AppConfigSchema, type AppConfig } from '../../../shared/domain/config'
import { useAppState } from '../app-state'

const weekdayOptions = [
  [1, '星期一'], [2, '星期二'], [3, '星期三'], [4, '星期四'],
  [5, '星期五'], [6, '星期六'], [0, '星期日'],
] as const

type NumberField =
  | 'monthlySalary'
  | 'payday'
  | 'sedentaryMinutes'
  | 'waterMinutes'
  | 'broadcastMinutes'

export function Onboarding({ config }: { config: AppConfig }) {
  const { api, setSnapshot } = useAppState()
  const [form, setForm] = useState({
    monthlySalary: String(config.monthlySalary),
    payday: String(config.payday),
    weekdays: config.weekdays,
    workStart: config.workStart,
    lunchStart: config.lunchStart,
    lunchEnd: config.lunchEnd,
    workEnd: config.workEnd,
    sedentaryMinutes: String(config.sedentaryMinutes),
    waterMinutes: String(config.waterMinutes),
    broadcastMinutes: String(config.broadcastMinutes),
  })
  const [saving, setSaving] = useState(false)
  const [showError, setShowError] = useState(false)

  const parsed = useMemo(
    () =>
      AppConfigSchema.safeParse({
        ...config,
        onboardingComplete: true,
        monthlySalary: Number(form.monthlySalary),
        payday: Number(form.payday),
        weekdays: [...form.weekdays].sort((left, right) => left - right),
        workStart: form.workStart,
        lunchStart: form.lunchStart,
        lunchEnd: form.lunchEnd,
        workEnd: form.workEnd,
        sedentaryMinutes: Number(form.sedentaryMinutes),
        waterMinutes: Number(form.waterMinutes),
        broadcastMinutes: Number(form.broadcastMinutes),
      }),
    [config, form],
  )

  const setNumber = (field: NumberField, value: string): void => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const toggleWeekday = (day: number): void => {
    setForm((current) => ({
      ...current,
      weekdays: current.weekdays.includes(day)
        ? current.weekdays.filter((currentDay) => currentDay !== day)
        : [...current.weekdays, day],
    }))
  }

  const submit = async (event: FormEvent): Promise<void> => {
    event.preventDefault()
    setShowError(true)
    if (!parsed.success) return

    setSaving(true)
    try {
      setSnapshot(await api.updateConfig(parsed.data))
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="onboarding-shell">
      <form className="onboarding-card" onSubmit={(event) => void submit(event)}>
        <div>
          <span className="eyebrow">工位登记处 · 只保存在本机</span>
          <h1>先把你的工位调顺手</h1>
          <p>三分钟设好，工友才知道什么时候陪你挣钱、提醒和下班。</p>
        </div>

        <fieldset>
          <legend>你的工作时间</legend>
          <div className="weekday-grid">
            {weekdayOptions.map(([day, label]) => (
              <label key={day} className="weekday-chip">
                <input
                  type="checkbox"
                  checked={form.weekdays.includes(day)}
                  onChange={() => toggleWeekday(day)}
                />
                {label}
              </label>
            ))}
          </div>
          <div className="field-grid field-grid--four">
            {([
              ['workStart', '上班时间'],
              ['lunchStart', '午休开始'],
              ['lunchEnd', '午休结束'],
              ['workEnd', '下班时间'],
            ] as const).map(([field, label]) => (
              <label key={field}>
                {label}
                <input
                  type="time"
                  value={form[field]}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      [field]: event.target.value,
                    }))
                  }
                />
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>今天怎么算工钱</legend>
          <div className="field-grid">
            <label>
              月薪
              <input
                inputMode="decimal"
                value={form.monthlySalary}
                onChange={(event) => setNumber('monthlySalary', event.target.value)}
              />
            </label>
            <label>
              发薪日
              <input
                inputMode="numeric"
                value={form.payday}
                onChange={(event) => setNumber('payday', event.target.value)}
              />
            </label>
          </div>
        </fieldset>

        <fieldset>
          <legend>工友怎么提醒你</legend>
          <div className="field-grid field-grid--three">
            {([
              ['sedentaryMinutes', '久坐提醒（分钟）'],
              ['waterMinutes', '喝水提醒（分钟）'],
              ['broadcastMinutes', '广播间隔（分钟）'],
            ] as const).map(([field, label]) => (
              <label key={field}>
                {label}
                <input
                  inputMode="numeric"
                  value={form[field]}
                  onChange={(event) => setNumber(field, event.target.value)}
                />
              </label>
            ))}
          </div>
        </fieldset>

        {showError && !parsed.success ? (
          <p className="form-error" role="alert">
            检查一下金额、发薪日和工作时间顺序。
          </p>
        ) : null}
        <button className="primary-button" disabled={!parsed.success || saving}>
          {saving ? '正在摆好工位…' : '开始和工友上班'}
        </button>
      </form>
    </main>
  )
}
