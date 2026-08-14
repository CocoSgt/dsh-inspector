/**
 * 「约束文件」面板与头部开关按钮(dsh-context-inspector)。
 *
 * 面板注册在 shell.overlay(root 作用域,浮动右栏,additive);开关按钮注册
 * 在 conversation.session.header.utilities(session 作用域)。面板跟随当前
 * 会话的工作区目录(sessions 列表快照的 current → cwd)。
 *
 * 概览视图按 harness 真实载入顺序展示指引链:全局 $DSH_HOME/AGENTS.md →
 * 项目根 → … → cwd,每层就地新建缺失候选;技能根目录作为次级分区只读展示。
 * 编辑视图带脏态守卫(未保存不静默丢弃)与 Cmd/Ctrl+S 保存。
 */

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import {
  BASE_CANDIDATES,
  type InstructionFileMeta,
  type InstructionLayer,
  type OverviewResult,
  type ReadResult,
  type RemoveResult,
  type WriteResult,
} from '../scoped-files.js'
import type { EditTarget, FileEditTarget, SkillEditTarget, PanelStore } from './store.js'
import type { SessionsFace } from './types.js'

/** 解包后的宿主调用面(错误直接抛 Error)。 */
export interface ProjectFilesApi {
  overview(cwd: string): Promise<OverviewResult>
  readFile(cwd: string, scope: string, dir: string, name: string): Promise<ReadResult>
  readSkillFile(cwd: string, root: string, skillPath: string): Promise<ReadResult>
  writeSkillFile(cwd: string, root: string, skillPath: string, content: string): Promise<WriteResult>
  writeFile(cwd: string, scope: string, dir: string, name: string, content: string): Promise<WriteResult>
  removeFile(cwd: string, scope: string, dir: string, name: string): Promise<RemoveResult>
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
  'AGENTS.md': '# 项目指引\n\n## 约定\n\n- \n',
  'CLAUDE.md': '# 项目指引\n\n## 约定\n\n- \n',
  'AGENTS.local.md': '<!-- 本地覆盖层:只对这台机器生效,建议加入 .gitignore -->\n\n- \n',
  'CLAUDE.local.md': '<!-- 本地覆盖层:只对这台机器生效,建议加入 .gitignore -->\n\n- \n',
}

/** 新建候选的一句话说明。 */
const CANDIDATE_NOTES: Readonly<Record<string, string>> = {
  'AGENTS.md': '推荐 · dsh 首选指引',
  'CLAUDE.md': '兼容 Claude Code 项目',
  'AGENTS.local.md': '本地覆盖 · 建议 gitignore',
  'CLAUDE.local.md': '本地覆盖 · 建议 gitignore',
}

/** 字节数的人类可读形式。 */
function formatSize(size: number): string {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
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

/** 面板外壳:标题、路径、关闭按钮、主体。 */
function PanelShell(props: {
  cwd: string | undefined
  store: PanelStore
  children: ReactNode
}): ReactNode {
  const { cwd, store, children } = props
  return (
    <div className="dpf-panel" role="complementary" aria-label="约束文件">
      <div className="dpf-header">
        <span className="dpf-title">约束文件</span>
        <span className="dpf-path" title={cwd ?? ''}>{cwd ?? ''}</span>
        <button type="button" className="dpf-close" aria-label="关闭约束文件面板" onClick={() => { store.close() }}>✕</button>
      </div>
      <div className="dpf-body">{children}</div>
    </div>
  )
}

/** 一层的标题信息。 */
function layerTitle(layer: InstructionLayer): { title: string; tags: string[] } {
  if (layer.scope === 'global') {
    return { title: layer.displayDir, tags: ['全局 · 所有会话'] }
  }
  if (layer.dir === '') {
    const tags = ['项目根']
    if (layer.isCwd) tags.push('当前工作目录')
    return { title: layer.displayDir, tags }
  }
  return { title: `${layer.dir}/`, tags: layer.isCwd ? ['当前工作目录'] : [] }
}

/** 一个存在的指引文件行:名称、状态徽标、修改时间与字节,点击进入编辑。 */
function FileRow(props: { meta: InstructionFileMeta; onOpen: () => void }): ReactNode {
  const { meta, onOpen } = props
  const chips: { text: string; tone: 'muted' | 'warn' }[] = []
  if (meta.local) chips.push({ text: '本地 · 不入库', tone: 'muted' })
  if (meta.duplicateOf !== undefined) chips.push({ text: `与 ${meta.duplicateOf} 相同 · 折叠为一份`, tone: 'muted' })
  if (meta.oversized === true) chips.push({ text: '超 1MB · 不会载入', tone: 'warn' })
  return (
    <button type="button" className="dpf-row" onClick={onOpen}>
      <span className="dpf-row-main">
        <span className="dpf-row-name">{meta.name}</span>
        {chips.map(chip => (
          <span key={chip.text} className={chip.tone === 'warn' ? 'dpf-chip dpf-chip-warn' : 'dpf-chip'}>{chip.text}</span>
        ))}
      </span>
      <span className="dpf-row-meta">{`${formatTime(meta.mtimeIso)} · ${formatSize(meta.size)}`}</span>
    </button>
  )
}

/** 一层(一个目录)的卡片:标题、已存在文件、就地新建缺失候选。 */
function LayerCard(props: {
  layer: InstructionLayer
  onOpen: (meta: InstructionFileMeta) => void
  onCreate: (name: string) => void
}): ReactNode {
  const { layer, onOpen, onCreate } = props
  const [choosing, setChoosing] = useState(false)
  const { title, tags } = layerTitle(layer)
  const existing = layer.files.filter(meta => meta.exists)
  const missing = layer.files.filter(meta => !meta.exists)
  // 全局层没有候选可选(只认 AGENTS.md);项目层默认只推荐缺失的候选。
  const creatable = missing.filter(meta => FILE_TEMPLATES[meta.name] !== undefined)
  return (
    <section className="dpf-layer">
      <div className="dpf-layer-head">
        <span className="dpf-layer-title" title={title}>{title}</span>
        {tags.map(tag => <span key={tag} className="dpf-tag">{tag}</span>)}
        {creatable.length > 0 && (
          <button
            type="button"
            className="dpf-newbtn"
            aria-expanded={choosing}
            onClick={() => { setChoosing(value => !value) }}
          >
            {choosing ? '收起' : '＋ 新建'}
          </button>
        )}
      </div>
      {existing.length === 0 && !choosing
        ? <div className="dpf-layer-empty">此层暂无指引文件</div>
        : existing.map(meta => <FileRow key={meta.name} meta={meta} onOpen={() => { onOpen(meta) }} />)}
      {choosing && (
        <div className="dpf-choose">
          {creatable.map(meta => (
            <button
              key={meta.name}
              type="button"
              className="dpf-choose-row"
              onClick={() => { setChoosing(false); onCreate(meta.name) }}
            >
              <span className="dpf-row-name">{meta.name}</span>
              <span className="dpf-choose-note">{CANDIDATE_NOTES[meta.name] ?? ''}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

/** 文件编辑视图:读取全文、编辑、保存、删除;脏态守卫 + Cmd/Ctrl+S。 */
function FileEditor(props: {
  api: ProjectFilesApi
  cwd: string
  target: FileEditTarget
  store: PanelStore
  onBack: () => void
}): ReactNode {
  const { api, cwd, target, store, onBack } = props
  const [content, setContent] = useState<string | undefined>(undefined)
  const [baseline, setBaseline] = useState<string>('')
  const [meta, setMeta] = useState<string>('')
  const [status, setStatus] = useState<{ error: boolean; text: string } | undefined>(undefined)
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const dirty = content !== undefined && content !== baseline
  const dirtyRef = useRef(dirty)
  dirtyRef.current = dirty

  useEffect(() => {
    let cancelled = false
    setStatus(undefined)
    setConfirmDelete(false)
    setConfirmDiscard(false)
    if (target.create) {
      const template = FILE_TEMPLATES[target.name] ?? ''
      setContent(template)
      setBaseline('')
      setMeta('新建:保存后才会创建这个文件')
      return () => { cancelled = true }
    }
    setBusy(true)
    api.readFile(cwd, target.scope, target.dir, target.name)
      .then(result => {
        if (cancelled) return
        setContent(result.content)
        setBaseline(result.content)
        setMeta(`最近写入:${formatTime(result.mtimeIso)} · ${formatSize(result.size)}`)
      })
      .catch((error: unknown) => {
        if (!cancelled) setStatus({ error: true, text: `读取失败:${error instanceof Error ? error.message : String(error)}` })
      })
      .finally(() => { if (!cancelled) setBusy(false) })
    return () => { cancelled = true }
  }, [api, cwd, target])

  const save = (): void => {
    if (content === undefined || busy) return
    setBusy(true)
    setStatus(undefined)
    api.writeFile(cwd, target.scope, target.dir, target.name, content)
      .then(result => {
        setBaseline(content)
        setMeta(`最近写入:${formatTime(result.mtimeIso)} · ${formatSize(result.size)}`)
        setStatus({ error: false, text: '已保存 · 更新会在会话的下一步注入' })
        if (target.create) store.edit({ ...target, create: false })
      })
      .catch((error: unknown) => {
        setStatus({ error: true, text: `保存失败:${error instanceof Error ? error.message : String(error)}` })
      })
      .finally(() => { setBusy(false) })
  }

  const remove = (): void => {
    setBusy(true)
    setStatus(undefined)
    api.removeFile(cwd, target.scope, target.dir, target.name)
      .then(() => { onBack() })
      .catch((error: unknown) => {
        setStatus({ error: true, text: `删除失败:${error instanceof Error ? error.message : String(error)}` })
        setBusy(false)
      })
  }

  const requestBack = (): void => {
    if (dirtyRef.current) setConfirmDiscard(true)
    else onBack()
  }

  const displayDir = target.scope === 'global' ? '~/.dsh' : target.dir === '' ? '项目根' : target.dir
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <div className="dpf-editor-head">
        <button type="button" className="dpf-btn" onClick={requestBack}>← 返回</button>
        <span className="dpf-editor-name">
          {displayDir} / {target.name}
          {dirty ? <span className="dpf-dirty" title="有未保存的修改">●</span> : null}
        </span>
      </div>
      <div className="dpf-editor-meta">{content === undefined ? '读取中…' : meta}</div>
      {confirmDiscard && (
        <div className="dpf-guard">
          <span>有未保存的修改。</span>
          <button type="button" className="dpf-btn dpf-btn-primary" onClick={() => { setConfirmDiscard(false); save() }}>保存并返回</button>
          <button type="button" className="dpf-btn dpf-btn-danger" onClick={onBack}>放弃修改</button>
          <button type="button" className="dpf-btn" onClick={() => { setConfirmDiscard(false) }}>继续编辑</button>
        </div>
      )}
      <textarea
        className="dpf-editor"
        value={content ?? ''}
        disabled={content === undefined || busy}
        spellCheck={false}
        onChange={event => { setContent(event.target.value) }}
        onKeyDown={event => {
          if ((event.metaKey || event.ctrlKey) && event.key === 's') {
            event.preventDefault()
            save()
          }
        }}
      />
      <div className="dpf-toolbar">
        <button type="button" className="dpf-btn dpf-btn-primary" disabled={content === undefined || busy || (!dirty && !target.create)} onClick={save}>
          {target.create ? '保存并创建' : '保存'}
        </button>
        {target.create ? null : confirmDelete
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
  const [overview, setOverview] = useState<OverviewResult | undefined>(undefined)
  const [listError, setListError] = useState<string | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (!state.open || cwd === undefined) {
      setOverview(undefined)
      setListError(undefined)
      return
    }
    let cancelled = false
    setLoading(true)
    setListError(undefined)
    api.overview(cwd)
      .then(result => { if (!cancelled) setOverview(result) })
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
        <div className="dpf-hint">当前没有打开的会话工作区。<br />打开一个位于项目目录中的会话后,这里会显示该会话实际生效的指引链与技能。</div>
      </PanelShell>
    )
  }

  // 从编辑视图返回时重拉概览:保存/删除可能改变了存在性与去重状态。
  const back = (): void => { store.edit(undefined); setRefreshKey(n => n + 1) }

  if (state.editing !== undefined) {
    return (
      <PanelShell cwd={cwd} store={store}>
        {state.editing.kind === 'skill'
          ? <SkillFileEditor api={api} cwd={cwd} target={state.editing} onBack={back} />
          : <FileEditor api={api} cwd={cwd} target={state.editing} store={store} onBack={back} />}
      </PanelShell>
    )
  }

  return (
    <PanelShell cwd={cwd} store={store}>
      {loading && overview === undefined ? <div className="dpf-hint">加载中…</div> : null}
      {listError !== undefined ? <div className="dpf-status dpf-status-error">加载失败:{listError}</div> : null}
      {overview === undefined ? null : (
        <>
          <div className="dpf-caption">
            按载入顺序排列;越靠下越具体,对模型的优先级越高。
          </div>
          {overview.layers.map(layer => (
            <LayerCard
              key={`${layer.scope}:${layer.dir}`}
              layer={layer}
              onOpen={meta => {
                store.edit({ scope: layer.scope, dir: layer.dir, name: meta.name, create: false })
              }}
              onCreate={name => {
                store.edit({ scope: layer.scope, dir: layer.dir, name, create: true })
              }}
            />
          ))}
          <div className="dpf-footnote">
            {overview.cwdRel === ''
              ? '子目录里的指引文件不会预载:模型读写某个子目录中的文件时,该目录的指引才会按需注入。'
              : '当前工作目录之下的子目录指引不会预载:模型读写该子目录中的文件时才会按需注入。'}
          </div>
          <h3 className="dpf-section-title">技能目录</h3>
          <div className="dpf-caption">技能由 dsh 自动扫描并实时监听,放进目录即生效;此处只展示状态。</div>
          {overview.skills.map(skill => (
            <SkillRootRow
              key={skill.displayPath}
              skill={skill}
              onOpenSkill={(root, entry) => {
                store.edit({ kind: 'skill', root, path: entry.path, name: entry.name })
              }}
            />
          ))}
        </>
      )}
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
      title={`查看/编辑当前会话实际载入的指引链(${BASE_CANDIDATES.join(' / ')} 及本地覆盖层)与技能目录状态`}
      onClick={() => { store.toggle() }}
    >
      <span aria-hidden="true">☰</span>
      <span>约束文件</span>
    </button>
  )
}

/** 一个技能根目录行:有技能时可点击展开技能名清单。 */
function SkillRootRow({ skill, onOpenSkill }: {
  skill: OverviewResult['skills'][number]
  onOpenSkill: (root: string, entry: { name: string; path: string }) => void
}): ReactNode {
  const [expanded, setExpanded] = useState(false)
  const expandable = skill.exists && (skill.skills?.length ?? 0) > 0
  const row = (
    <>
      <span className="dpf-row-main">
        <span className="dpf-row-name">{skill.displayPath}/</span>
        <span className="dpf-chip">{skill.level === 'project' ? '项目级' : '用户级 · 所有项目'}</span>
      </span>
      <span className="dpf-row-meta">
        {skill.exists ? `${skill.skillCount ?? 0} 个技能${expandable ? (expanded ? ' ▾' : ' ▸') : ''}` : '未创建'}
      </span>
    </>
  )
  if (!expandable) return <div className="dpf-dirrow">{row}</div>
  return (
    <div>
      <button
        type="button"
        className="dpf-dirrow dpf-dirrow-btn"
        aria-expanded={expanded}
        onClick={() => { setExpanded(value => !value) }}
      >{row}</button>
      {expanded && (
        <div className="dpf-skill-list">
          {(skill.skills ?? []).map(entry => (
            <button
              key={entry.path}
              type="button"
              className="dpf-skill-pill dpf-skill-pill-btn"
              title={`查看/编辑 ${skill.displayPath}/${entry.path}`}
              onClick={() => { onOpenSkill(skill.displayPath, entry) }}
            >/{entry.name}</button>
          ))}
        </div>
      )}
    </div>
  )
}

/** 技能文件编辑视图:读取/编辑/保存 SKILL.md,脏态守卫 + Cmd/Ctrl+S,无删除。 */
function SkillFileEditor(props: {
  api: ProjectFilesApi
  cwd: string
  target: SkillEditTarget
  onBack: () => void
}): ReactNode {
  const { api, cwd, target, onBack } = props
  const [content, setContent] = useState<string | undefined>(undefined)
  const [baseline, setBaseline] = useState('')
  const [meta, setMeta] = useState('')
  const [status, setStatus] = useState<{ error: boolean; text: string } | undefined>(undefined)
  const [busy, setBusy] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const dirty = content !== undefined && content !== baseline

  useEffect(() => {
    let cancelled = false
    setStatus(undefined)
    setBusy(true)
    api.readSkillFile(cwd, target.root, target.path)
      .then(result => {
        if (cancelled) return
        setContent(result.content)
        setBaseline(result.content)
        setMeta(`最近写入:${formatTime(result.mtimeIso)} · ${formatSize(result.size)}`)
      })
      .catch((error: unknown) => {
        if (!cancelled) setStatus({ error: true, text: `读取失败:${error instanceof Error ? error.message : String(error)}` })
      })
      .finally(() => { if (!cancelled) setBusy(false) })
    return () => { cancelled = true }
  }, [api, cwd, target])

  const save = (): void => {
    if (content === undefined || busy || !dirty) return
    setBusy(true)
    setStatus(undefined)
    api.writeSkillFile(cwd, target.root, target.path, content)
      .then(result => {
        setBaseline(content)
        setMeta(`最近写入:${formatTime(result.mtimeIso)} · ${formatSize(result.size)}`)
        setStatus({ error: false, text: '已保存(经引用链接写入的会直达来源文件)' })
      })
      .catch((error: unknown) => {
        setStatus({ error: true, text: `保存失败:${error instanceof Error ? error.message : String(error)}` })
      })
      .finally(() => { setBusy(false) })
  }
  const requestBack = (): void => {
    if (dirty) setConfirmDiscard(true)
    else onBack()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <div className="dpf-editor-head">
        <button type="button" className="dpf-btn" onClick={requestBack}>← 返回</button>
        <span className="dpf-editor-name">
          /{target.name}
          {dirty ? <span className="dpf-dirty" title="有未保存的修改">●</span> : null}
        </span>
      </div>
      <div className="dpf-editor-meta">
        {content === undefined ? '读取中…' : `${target.root}/${target.path} · ${meta}`}
      </div>
      {confirmDiscard && (
        <div className="dpf-guard">
          <span>有未保存的修改。</span>
          <button type="button" className="dpf-btn dpf-btn-primary" onClick={() => { setConfirmDiscard(false); save() }}>保存并返回</button>
          <button type="button" className="dpf-btn dpf-btn-danger" onClick={onBack}>放弃修改</button>
          <button type="button" className="dpf-btn" onClick={() => { setConfirmDiscard(false) }}>继续编辑</button>
        </div>
      )}
      <textarea
        className="dpf-editor"
        value={content ?? ''}
        disabled={content === undefined || busy}
        spellCheck={false}
        onChange={event => { setContent(event.target.value) }}
        onKeyDown={event => {
          if ((event.metaKey || event.ctrlKey) && event.key === 's') {
            event.preventDefault()
            save()
          }
        }}
      />
      <div className="dpf-toolbar">
        <button type="button" className="dpf-btn dpf-btn-primary" disabled={!dirty || busy} onClick={save}>保存</button>
        {status === undefined ? null : <span className={status.error ? 'dpf-status dpf-status-error' : 'dpf-status'}>{status.text}</span>}
      </div>
    </div>
  )
}
