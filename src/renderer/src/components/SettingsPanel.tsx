import { useState, type FormEvent } from 'react'
import { useAppState } from '../app-state'

export function SettingsPanel({ onClose }: { onClose(): void }) {
  const { api } = useAppState()
  const [baseUrl, setBaseUrl] = useState('https://api.openai.com/v1')
  const [model, setModel] = useState('gpt-4o-mini')
  const [apiKey, setApiKey] = useState('')
  const [saved, setSaved] = useState(false)

  const close = (): void => {
    setApiKey('')
    onClose()
  }

  const submit = async (event: FormEvent): Promise<void> => {
    event.preventDefault()
    await api.setAiSession({ baseUrl, model, apiKey })
    setApiKey('')
    setSaved(true)
  }

  return (
    <div className="panel-backdrop">
      <section className="side-panel settings-panel" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <header>
          <div>
            <span className="eyebrow">设置不堆在桌面上</span>
            <h2 id="settings-title">工位设置</h2>
          </div>
          <button className="icon-button" aria-label="关闭设置" onClick={close}>×</button>
        </header>
        <form onSubmit={(event) => void submit(event)}>
          <label>
            AI Base URL
            <input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} />
          </label>
          <label>
            模型
            <input value={model} onChange={(event) => setModel(event.target.value)} />
          </label>
          <label>
            API Key
            <input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} autoComplete="off" />
          </label>
          <p>密钥只保留在本次运行的内存中，不写入工友的数据文件；重新打开设置也不会显示旧密钥。</p>
          <button disabled={!baseUrl.trim() || !model.trim() || !apiKey.trim()}>应用 AI 设置</button>
          {saved ? <small className="saved-note">已应用，密钥输入已清空。</small> : null}
        </form>
      </section>
    </div>
  )
}
