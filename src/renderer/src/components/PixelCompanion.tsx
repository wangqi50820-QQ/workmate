export type CompanionMood =
  | 'idle'
  | 'listening'
  | 'focus'
  | 'sleepy'
  | 'celebrate'

const moodNames: Record<CompanionMood, string> = {
  idle: '待机',
  listening: '认真听',
  focus: '陪你专注',
  sleepy: '有点困',
  celebrate: '庆祝',
}

export function PixelCompanion({
  mood = 'idle',
  message = '我在，慢慢来。',
}: {
  mood?: CompanionMood
  message?: string
}) {
  return (
    <div className={`companion companion--${mood}`}>
      <div className="companion-bubble">{message}</div>
      <div
        className="pixel-person"
        role="img"
        aria-label={`工友状态：${moodNames[mood]}`}
      >
        <span className="pixel-person__hair" />
        <span className="pixel-person__face" />
        <span className="pixel-person__eye pixel-person__eye--left" />
        <span className="pixel-person__eye pixel-person__eye--right" />
        <span className="pixel-person__mouth" />
        <span className="pixel-person__body" />
        <span className="pixel-person__badge">友</span>
        <span className="pixel-person__arm pixel-person__arm--left" />
        <span className="pixel-person__arm pixel-person__arm--right" />
        <span className="pixel-person__leg pixel-person__leg--left" />
        <span className="pixel-person__leg pixel-person__leg--right" />
      </div>
    </div>
  )
}
