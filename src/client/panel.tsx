/**
 * 项目文件面板与头部开关按钮。
 *
 * 面板注册在 shell.overlay(root 作用域,浮动右栏,additive);开关按钮注册
 * 在 conversation.session.header.utilities(session 作用域)。面板跟随当前
 * 会话的工作区目录(sessions 列表快照的 current → cwd)。
 */

import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react'
import type {
  ListResult, ReadResult, RemoveResult, ScopedFileMeta, WriteResult,
} from '../scoped-files.js'
import type { PanelStore } from './store.js'
import type { ProjectFilesCalls, SessionsFace } from './types.js'

/** 解包后的宿主调用面(错误直接抛 Error)。 */
export interface ProjectFilesApi {
  list(root: string): Promise<ListResult>
  read(root: string, name: string): Promise<ReadResult>
  write(root: string, name: string, content: string): Promise<WriteResult>
  remove(root: string, name: string): Promise<RemoveResult>
}

/** 面板组件的注入 props。 */
export interface PanelInjected {
  readonly api: ProjectFilesApi
  readonly sessions: SessionsFace
  readonly store: PanelStore
}

/** 面板组件实际收到的 props(含 slot 标准位,这里未用)。 */
export type PanelProps = PanelInjected & Record<string, unknown>

/** 开关按钮的注入 props。 */
export interface ToggleInjected {
  readonly store: PanelStore
}

/** 开关按钮实际收到的 props(session 作用域标准位含 sessionId,未用)。 */
export type ToggleProps = ToggleInjected & Record<string, unknown>

/** 字节数的人类可读形式。 */
function formatSize(size: number): string {
  if (size < 1024) return `${size} B`
  return `${(size / 1024).toFixed(1)} KB`
}

/** ISO 时间戳的本地可读形式(到分钟)。 */
function formatTime(mtimeIso: string): string {
  if (mtimeIso.length === 0) return ''
  const date = new Date(mtimeIso)
  if (Number.isNaN(date.getTime())) return mtimeIso
  const pad = (value: number): string => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** 读取当前会话的 cwd(undefined 表示没有当前会话或没有工作区)。 */
function useCurrentCwd(sessions: SessionsFace): string | undefined {
  return useSyncExternalStore(
    sessions.list.subscribe,
    () => {
      const snapshot = sessions.list.getSnapshot()
      if (snapshot.current === undefined) return undefined
      return snapshot.byId[snapshot.current]?.cwd
    },
    () => undefined,
  )
}

/** 面板外壳:标题、路径、关闭按钮与主体。 */
function PanelShell(props: { cwd: string | undefined; store: PanelStore; children: ReactNode }): ReactNode {
  const { cwd, store, children } = props
  return (
    <div className="dpf-panel" role="complementary" aria-label="项目文件">
      <div className="dpf-header">
        <span className="dpf-title">项目文件</span>
        <span className="dpf-path" title={cwd ?? ''}>{cwd ?? ''}</span>
        <button type="button" className="dpf-close" aria-label="关闭项目文件面板" onClick={() => { store.close() }}>✕</button>
      </div>
      <div className="dpf-body">{children}</div>
    </div>
  )
}

/** 单个候选文件行:名称、用途、修改时间与字节,缺失文件可新建。 */
function FileRow(props: {
  meta: ScopedFileMeta
  busy: boolean
  onOpen: () => void
  onCreate: () => void
}): ReactNode {
  const { meta, busy, onOpen, onCreate } = props
  return (
    <div className={meta.exists ? 'dpf-row' : 'dpf-row dpf-row-missing'} style={{ display: 'flex' }}>
      <button type="button" className="dpf-row" disabled={busy} onClick={meta.exists ? onOpen : onCreate}>
        <span className="dpf-row-main">
          <span className="dpf-row-name">{meta.name}</span>
          <div className="dpf-row-purpose">{meta.purpose}</div>
        </span>
        <span className="dpf-row-meta">
          {meta.exists ? `${formatTime(meta.mtimeIso)} · ${formatSize(meta.size)}` : '未创建'}
        </span>
      </button>
      {meta.exists
        ? null
        : (
          <span className="dpf-row-actions">
            <button type="button" className="dpf-iconbtn" disabled={busy} onClick={onCreate}>新建</button>
          </span>
        )}
    </div>
  )
}

/** 文件编辑视图:读取全文、编辑、保存、删除。 */
function FileEditor(props: { api: ProjectFilesApi; root: string; name: string; onBack: () => void }): ReactNode {
  const { api, root, name, onBack } = props
  const [content, setContent] = useState<string | undefined>(undefined)
  const [meta, setMeta] = useState<string>('')
  const [status, setStatus] = useState<{ error: boolean; text: string } | undefined>(undefined)
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    let cancelled = false
    setBusy(true)
    setStatus(undefined)
    api.read(root, name)
      .then(result => {
        if (cancelled) return
        setContent(result.content)
        setMeta(`最近写入:${formatTime(result.mtimeIso)} · ${formatSize(result.size)}`)
      })
      .catch((error: unknown) => {
        if (!cancelled) setStatus({ error: true, text: `读取失败:${error instanceof Error ? error.message : String(error)}` })
      })
      .finally(() => { if (!cancelled) setBusy(false) })
    return () => { cancelled = true }
  }, [api, root, name])

  const save = (): void => {
    if (content === undefined) return
    setBusy(true)
    setStatus(undefined)
    api.write(root, name, content)
      .then(result => {
        setStatus({ error: false, text: `已保存 · ${formatTime(result.mtimeIso)} · ${formatSize(result.size)}` })
      })
      .catch((error: unknown) => {
        setStatus({ error: true, text: `保存失败:${error instanceof Error ? error.message : String(error)}` })
      })
      .finally(() => { setBusy(false) })
  }

  const remove = (): void => {
    setBusy(true)
    setStatus(undefined)
    api.remove(root, name)
      .then(() => { onBack() })
      .catch((error: unknown) => {
        setStatus({ error: true, text: `删除失败:${error instanceof Error ? error.message : String(error)}` })
        setBusy(false)
      })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <div className="dpf-editor-head">
        <button type="button" className="dpf-btn" onClick={onBack}>← 返回</button>
        <span className="dpf-editor-name">{name}</span>
      </div>
      <div className="dpf-editor-meta">{content === undefined ? '读取中…' : meta}</div>
      <textarea
        className="dpf-editor"
        value={content ?? ''}
        disabled={content === undefined || busy}
        spellCheck={false}
        onChange={event => { setContent(event.target.value) }}
      />
      <div className="dpf-toolbar">
        <button type="button" className="dpf-btn dpf-btn-primary" disabled={content === undefined || busy} onClick={save}>保存</button>
        {confirmDelete
          ? (
            <>
              <button type="button" className="dpf-btn dpf-btn-danger" disabled={busy} onClick={remove}>确认删除</button>
              <button type="button" className="dpf-btn" disabled={busy} onClick={() => { setConfirmDelete(false) }}>取消</button>
            </>
          )
          : (
            <button type="button" className="dpf-btn dpf-btn-danger" disabled={content === undefined || busy} onClick={() => { setConfirmDelete(true) }}>删除</button>
          )}
        {status === undefined ? null : <span className={status.error ? 'dpf-status dpf-status-error' : 'dpf-status'}>{status.text}</span>}
      </div>
    </div>
  )
}

/** shell.overlay 面板主体。 */
export function ProjectFilesPanel(props: PanelProps): ReactNode {
  const { api, sessions, store } = props
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
  const cwd = useCurrentCwd(sessions)
  const [files, setFiles] = useState<readonly ScopedFileMeta[] | undefined>(undefined)
  const [listError, setListError] = useState<string | undefined>(undefined)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!state.open || cwd === undefined) {
      setFiles(undefined)
      setListError(undefined)
      return
    }
    let cancelled = false
    setLoading(true)
    setListError(undefined)
    api.list(cwd)
      .then(result => { if (!cancelled) setFiles(result.files) })
      .catch((error: unknown) => {
        if (!cancelled) setListError(error instanceof Error ? error.message : String(error))
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [api, state.open, cwd])

  if (!state.open) return null

  if (cwd === undefined) {
    return (
      <PanelShell cwd={undefined} store={store}>
        <div className="dpf-hint">当前没有打开的会话工作区。<br />打开一个位于项目目录中的会话后,这里会显示该项目的指引文件。</div>
      </PanelShell>
    )
  }

  if (state.selected !== undefined) {
    return (
      <PanelShell cwd={cwd} store={store}>
        <FileEditor api={api} root={cwd} name={state.selected} onBack={() => { store.select(undefined) }} />
      </PanelShell>
    )
  }

  return (
    <PanelShell cwd={cwd} store={store}>
      {loading && files === undefined ? <div className="dpf-hint">加载中…</div> : null}
      {listError !== undefined ? <div className="dpf-status dpf-status-error">加载失败:{listError}</div> : null}
      {files === undefined ? null : files.map(meta => (
        <FileRow
          key={meta.name}
          meta={meta}
          busy={loading}
          onOpen={() => { store.select(meta.name) }}
          onCreate={() => { store.select(meta.name) }}
        />
      ))}
    </PanelShell>
  )
}

/** 会话头部工具位的开关按钮。 */
export function ProjectFilesToggle(props: ToggleProps): ReactNode {
  const { store } = props
  const open = useSyncExternalStore(store.subscribe, () => store.getSnapshot().open, () => false)
  return (
    <button
      type="button"
      className={open ? 'dpf-toggle dpf-toggle-active' : 'dpf-toggle'}
      aria-pressed={open}
      title="查看/编辑当前项目的指引文件(CLAUDE.md、AGENTS.md 等)"
      onClick={() => { store.toggle() }}
    >
      <span aria-hidden="true">📄</span>
      <span>项目文件</span>
    </button>
  )
}
