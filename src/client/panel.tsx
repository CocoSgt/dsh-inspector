/**
 * 项目文件面板与头部开关按钮。
 *
 * 面板注册在 shell.overlay(root 作用域,浮动右栏,additive);开关按钮注册
 * 在 conversation.session.header.utilities(session 作用域)。面板跟随当前
 * 会话的工作区目录(sessions 列表快照的 current → cwd)。
 */

import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react'
import {
  GROUP_LABELS, GROUP_ORDER, type ScopedFileGroup,
  type ListResult, type ReadResult, type RemoveResult, type ScopedFileMeta, type WriteResult,
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

/** 新建文件时预填的初始模板(保存才落盘,直接放弃则不产生文件)。 */
const FILE_TEMPLATES: Readonly<Record<string, string>> = {
  'AGENTS.md': '# AGENTS.md\n\n## 项目约定\n\n- \n',
  'CLAUDE.md': '# CLAUDE.md\n\n## 项目约定\n\n- \n',
  'AGENTS.local.md': '# AGENTS.local.md(本地覆盖层,建议加入 .gitignore)\n\n',
  'CLAUDE.local.md': '# CLAUDE.local.md(本地覆盖层,建议加入 .gitignore)\n\n',
  'hooks.json': '{\n  "hooks": {}\n}\n',
  'codex-hooks.json': '{\n  "hooks": {}\n}\n',
  '.env': '# dsh 启动时加载的环境变量\n',
}

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

/** 面板外壳:标题、路径、新建与关闭按钮、主体。 */
function PanelShell(props: {
  cwd: string | undefined
  store: PanelStore
  onNew?: () => void
  children: ReactNode
}): ReactNode {
  const { cwd, store, onNew, children } = props
  return (
    <div className="dpf-panel" role="complementary" aria-label="项目文件">
      <div className="dpf-header">
        <span className="dpf-title">项目文件</span>
        <span className="dpf-path" title={cwd ?? ''}>{cwd ?? ''}</span>
        {onNew === undefined ? null : (
          <button type="button" className="dpf-iconbtn" onClick={onNew}>＋ 新建</button>
        )}
        <button type="button" className="dpf-close" aria-label="关闭项目文件面板" onClick={() => { store.close() }}>✕</button>
      </div>
      <div className="dpf-body">{children}</div>
    </div>
  )
}

/** 单个已存在文件行:路径、用途、修改时间与字节,点击进入编辑。 */
function FileRow(props: { meta: ScopedFileMeta; busy: boolean; onOpen: () => void }): ReactNode {
  const { meta, busy, onOpen } = props
  return (
    <button type="button" className="dpf-row" disabled={busy} onClick={onOpen}>
      <span className="dpf-row-main">
        <span className="dpf-row-name">{meta.path}</span>
        <div className="dpf-row-purpose">{meta.purpose}</div>
      </span>
      <span className="dpf-row-meta">{`${formatTime(meta.mtimeIso)} · ${formatSize(meta.size)}`}</span>
    </button>
  )
}

/** 目录条目行:只展示条目数,不支持内容读写。 */
function DirRow(props: { meta: ScopedFileMeta }): ReactNode {
  const { meta } = props
  return (
    <div className="dpf-dirrow">
      <span className="dpf-row-main">
        <span className="dpf-row-name">{meta.path}/</span>
        <div className="dpf-row-purpose">{meta.purpose}</div>
      </span>
      <span className="dpf-row-meta">
        {meta.entries !== undefined ? `${meta.entries} 项 · ${formatTime(meta.mtimeIso)}` : formatTime(meta.mtimeIso)}
      </span>
    </div>
  )
}

/** 文件编辑视图:读取全文、编辑、保存、删除;传入 template 即为新建模式。 */
function FileEditor(props: {
  api: ProjectFilesApi
  root: string
  name: string
  /** 新建模式:预填模板,保存才落盘。undefined 为编辑已存在文件。 */
  template?: string
  onBack: () => void
}): ReactNode {
  const { api, root, name, template, onBack } = props
  const [content, setContent] = useState<string | undefined>(undefined)
  const [meta, setMeta] = useState<string>('')
  const [status, setStatus] = useState<{ error: boolean; text: string } | undefined>(undefined)
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    let cancelled = false
    setStatus(undefined)
    if (template !== undefined) {
      // 新建模式:不落盘,直接给模板;保存时才 write。
      setContent(template)
      setMeta('新建:保存后才会创建这个文件')
      return () => { cancelled = true }
    }
    setBusy(true)
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
  }, [api, root, name, template])

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
        <button type="button" className="dpf-btn dpf-btn-primary" disabled={content === undefined || busy} onClick={save}>
          {template === undefined ? '保存' : '保存并创建'}
        </button>
        {template !== undefined ? null : confirmDelete
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
  const [showCreate, setShowCreate] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

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
  }, [api, state.open, cwd, refreshKey])

  if (!state.open) return null

  if (cwd === undefined) {
    return (
      <PanelShell cwd={undefined} store={store}>
        <div className="dpf-hint">当前没有打开的会话工作区。<br />打开一个位于项目目录中的会话后,这里会显示该项目里 dsh 会读写的文件。</div>
      </PanelShell>
    )
  }

  const openCreate = (): void => { setShowCreate(true) }
  const closeCreate = (): void => { setShowCreate(false) }
  // 从编辑视图返回时重拉清单:保存/删除可能改变了存在性。
  const back = (): void => { store.select(undefined); closeCreate(); setRefreshKey(n => n + 1) }

  if (state.selected !== undefined) {
    const missing = files?.find(meta => meta.path === state.selected)?.exists === false
      && FILE_TEMPLATES[state.selected] !== undefined
    return (
      <PanelShell cwd={cwd} store={store}>
        <FileEditor
          api={api}
          root={cwd}
          name={state.selected}
          template={missing ? FILE_TEMPLATES[state.selected] : undefined}
          onBack={back}
        />
      </PanelShell>
    )
  }

  // 新建视图:列出现存条目之外、还能创建的白名单文件(带模板的文件条目)。
  if (showCreate && files !== undefined) {
    const creatable = files.filter(meta => meta.kind === 'file' && !meta.exists)
    return (
      <PanelShell cwd={cwd} store={store}>
        <div className="dpf-create-head">
          <span className="dpf-create-title">新建项目文件</span>
          <button type="button" className="dpf-btn" onClick={closeCreate}>返回</button>
        </div>
        {creatable.length === 0
          ? <div className="dpf-hint">白名单里的文件都已经在项目里了。</div>
          : GROUP_ORDER.map(group => {
            const entries = creatable.filter(meta => meta.group === (group as ScopedFileGroup))
            if (entries.length === 0) return null
            return (
              <section key={group} className="dpf-group">
                <h3 className="dpf-group-title">{GROUP_LABELS[group]}</h3>
                {entries.map(meta => (
                  <button
                    key={meta.path}
                    type="button"
                    className="dpf-row"
                    onClick={() => { store.select(meta.path) }}
                  >
                    <span className="dpf-row-main">
                      <span className="dpf-row-name">{meta.path}</span>
                      <div className="dpf-row-purpose">{meta.purpose}</div>
                    </span>
                    <span className="dpf-row-meta">创建</span>
                  </button>
                ))}
              </section>
            )
          })}
      </PanelShell>
    )
  }

  return (
    <PanelShell cwd={cwd} store={store} onNew={openCreate}>
      {loading && files === undefined ? <div className="dpf-hint">加载中…</div> : null}
      {listError !== undefined ? <div className="dpf-status dpf-status-error">加载失败:{listError}</div> : null}
      {files === undefined ? null : (() => {
        // 只展示项目里实际存在的条目;不存在的压根不占位置。
        const existing = files.filter(meta => meta.exists)
        if (existing.length === 0) {
          return (
            <div className="dpf-hint">
              这个项目目录里暂时没有 dsh 的项目文件。<br />
              <button type="button" className="dpf-iconbtn" onClick={openCreate}>＋ 新建一个</button>
            </div>
          )
        }
        return GROUP_ORDER.map(group => {
          const entries = existing.filter(meta => meta.group === (group as ScopedFileGroup))
          if (entries.length === 0) return null
          return (
            <section key={group} className="dpf-group">
              <h3 className="dpf-group-title">{GROUP_LABELS[group]}</h3>
              {entries.map(meta => meta.kind === 'dir'
                ? <DirRow key={meta.path} meta={meta} />
                : (
                  <FileRow
                    key={meta.path}
                    meta={meta}
                    busy={loading}
                    onOpen={() => { store.select(meta.path) }}
                  />
                ))}
            </section>
          )
        })
      })()}
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
      title="查看/编辑当前项目里 dsh 会读写的文件(AGENTS.md、hooks.json、.env 等)"
      onClick={() => { store.toggle() }}
    >
      <span aria-hidden="true">📄</span>
      <span>项目文件</span>
    </button>
  )
}
