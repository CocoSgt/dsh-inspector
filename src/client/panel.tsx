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
 *
 * 双语:两个 slot 注册都声明 locale: NS,框架把 t 标准位放进组件 props
 * (locale 切换时 t 身份变化触发重渲染);t 沿 props 下传到各子组件。新建
 * 文件的种子模板同样经 t 读取 —— 模板是落盘文件的内容,跟随 UI 语言,且
 * 只在新建(文件尚不存在)时取,已存在文件的编辑不会被重新模板化。
 */

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import {
  BASE_CANDIDATES,
  type FailureStatus,
  type InstructionFileMeta,
  type InstructionLayer,
  type OverviewResult,
  type ReadResult,
  type RemoveResult,
  type RpcOutcome,
  type WriteResult,
} from '../scoped-files.js'
import type { Key } from './locales.js'
import type { EditTarget, FileEditTarget, SkillEditTarget, PanelStore } from './store.js'
import type { SessionsFace } from './types.js'

/**
 * slot locale 标准位(t)的本地类型。第三方命名空间进不了宿主
 * LocaleNamespaceMap 的合并表,PropsLocale 对它退化为 object,因此这里按
 * 结构声明,键域收窄到本插件词典。
 */
type LocaleProps = { readonly t: TFunc }

/** 组件树内传递的翻译函数(调用时读取当前 locale)。 */
type TFunc = (key: Key, params?: Readonly<Record<string, unknown>>) => string

/** 解包后的宿主调用面(封套错误直接抛 Error;业务失败以 FailureStatus 返回)。 */
export interface ProjectFilesApi {
  overview(cwd: string): Promise<RpcOutcome<OverviewResult>>
  readFile(cwd: string, scope: string, dir: string, name: string): Promise<RpcOutcome<ReadResult>>
  readSkillFile(cwd: string, root: string, skillPath: string): Promise<RpcOutcome<ReadResult>>
  writeSkillFile(cwd: string, root: string, skillPath: string, content: string): Promise<RpcOutcome<WriteResult>>
  writeFile(cwd: string, scope: string, dir: string, name: string, content: string): Promise<RpcOutcome<WriteResult>>
  removeFile(cwd: string, scope: string, dir: string, name: string): Promise<RpcOutcome<RemoveResult>>
}

/** 面板组件的注入 props。 */
export interface PanelInjected {
  readonly api: ProjectFilesApi
  readonly sessions: SessionsFace
  readonly store: PanelStore
}

/** 面板组件实际收到的 props(含 locale 标准位 t)。 */
export type PanelProps = PanelInjected & LocaleProps & Record<string, unknown>

/** 开关按钮的注入 props。 */
export interface ToggleInjected {
  readonly store: PanelStore
}

/** 开关按钮实际收到的 props(session 作用域标准位含 sessionId,未用)。 */
export type ToggleProps = ToggleInjected & LocaleProps & Record<string, unknown>

/** 支持就地新建的候选文件名(模板内容在词典里,跟随 UI 语言)。 */
const TEMPLATE_NAMES: readonly string[] = ['AGENTS.md', 'CLAUDE.md', 'AGENTS.local.md', 'CLAUDE.local.md']

/** 业务失败状态判定(ok:false 的失败以数据过 wire,不走 RPC 错误封套)。 */
function isFailure(value: unknown): value is FailureStatus {
  return typeof value === 'object' && value !== null && (value as { ok?: unknown }).ok === false
}

/**
 * 宿主失败状态的本地化文案:词典命中 code 用翻译(带插值参数),缺键时
 * 退回宿主随 wire 带来的中文兜底文案(bind 翻译缺键返回键本身)。
 */
function hostText(t: TFunc, failure: FailureStatus): string {
  const translated = t(failure.code as Key, failure.params)
  return translated === failure.code ? failure.text : translated
}

/** 新建候选文件时按当前语言取种子模板;键缺失(非候选名)返回空串。 */
function templateOf(name: string, t: TFunc): string {
  const key = `template.${name}` as Key
  const value = t(key)
  return value === key ? '' : value
}

/** 新建候选的一句话说明(local 两个候选共用一条)。 */
function candidateNote(name: string, t: TFunc): string {
  if (name === 'AGENTS.local.md' || name === 'CLAUDE.local.md') return t('candidate.local')
  const key = `candidate.${name}` as Key
  const value = t(key)
  return value === key ? '' : value
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
  t: TFunc
  children: ReactNode
}): ReactNode {
  const { cwd, store, t, children } = props
  return (
    <div className="dpf-panel" role="complementary" aria-label={t('panel.title')}>
      <div className="dpf-header">
        <span className="dpf-title">{t('panel.title')}</span>
        <span className="dpf-path" title={cwd ?? ''}>{cwd ?? ''}</span>
        <button type="button" className="dpf-close" aria-label={t('panel.close')} onClick={() => { store.close() }}>✕</button>
      </div>
      <div className="dpf-body">{children}</div>
    </div>
  )
}

/** 一层的标题信息。 */
function layerTitle(layer: InstructionLayer, t: TFunc): { title: string; tags: string[] } {
  if (layer.scope === 'global') {
    return { title: layer.displayDir, tags: [t('layer.global')] }
  }
  if (layer.dir === '') {
    const tags = [t('layer.projectRoot')]
    if (layer.isCwd) tags.push(t('layer.cwd'))
    return { title: layer.displayDir, tags }
  }
  return { title: `${layer.dir}/`, tags: layer.isCwd ? [t('layer.cwd')] : [] }
}

/** 一个存在的指引文件行:名称、状态徽标、修改时间与字节,点击进入编辑。 */
function FileRow(props: { meta: InstructionFileMeta; t: TFunc; onOpen: () => void }): ReactNode {
  const { meta, t, onOpen } = props
  const chips: { text: string; tone: 'muted' | 'warn' }[] = []
  if (meta.local) chips.push({ text: t('chip.local'), tone: 'muted' })
  if (meta.duplicateOf !== undefined) chips.push({ text: t('chip.duplicate', { name: meta.duplicateOf }), tone: 'muted' })
  if (meta.oversized === true) chips.push({ text: t('chip.oversized'), tone: 'warn' })
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
  t: TFunc
  onOpen: (meta: InstructionFileMeta) => void
  onCreate: (name: string) => void
}): ReactNode {
  const { layer, t, onOpen, onCreate } = props
  const [choosing, setChoosing] = useState(false)
  const { title, tags } = layerTitle(layer, t)
  const existing = layer.files.filter(meta => meta.exists)
  const missing = layer.files.filter(meta => !meta.exists)
  // 全局层没有候选可选(只认 AGENTS.md);项目层默认只推荐缺失的候选。
  const creatable = missing.filter(meta => TEMPLATE_NAMES.includes(meta.name))
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
            {choosing ? t('layer.collapse') : t('layer.new')}
          </button>
        )}
      </div>
      {existing.length === 0 && !choosing
        ? <div className="dpf-layer-empty">{t('layer.empty')}</div>
        : existing.map(meta => <FileRow key={meta.name} meta={meta} t={t} onOpen={() => { onOpen(meta) }} />)}
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
              <span className="dpf-choose-note">{candidateNote(meta.name, t)}</span>
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
  t: TFunc
  onBack: () => void
}): ReactNode {
  const { api, cwd, target, store, t, onBack } = props
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
      // 模板在新建进入编辑视图时按当前语言读取;此后语言切换不会覆盖
      // 已输入的内容(t 不在依赖里,也不会重跑此 effect)。
      setContent(templateOf(target.name, t))
      setBaseline('')
      setMeta(t('editor.creating'))
      return () => { cancelled = true }
    }
    setBusy(true)
    api.readFile(cwd, target.scope, target.dir, target.name)
      .then(result => {
        if (cancelled) return
        if (isFailure(result)) {
          setContent('')
          setStatus({ error: true, text: `${t('err.read')}: ${hostText(t, result)}` })
          return
        }
        setContent(result.content)
        setBaseline(result.content)
        setMeta(t('editor.lastWrite', { time: formatTime(result.mtimeIso), size: formatSize(result.size) }))
      })
      .catch((error: unknown) => {
        if (!cancelled) setStatus({ error: true, text: `${t('err.read')}: ${error instanceof Error ? error.message : String(error)}` })
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
        if (isFailure(result)) {
          setStatus({ error: true, text: `${t('err.write')}: ${hostText(t, result)}` })
          return
        }
        setBaseline(content)
        setMeta(t('editor.lastWrite', { time: formatTime(result.mtimeIso), size: formatSize(result.size) }))
        setStatus({ error: false, text: t('status.saved') })
        if (target.create) store.edit({ ...target, create: false })
      })
      .catch((error: unknown) => {
        setStatus({ error: true, text: `${t('err.write')}: ${error instanceof Error ? error.message : String(error)}` })
      })
      .finally(() => { setBusy(false) })
  }

  const remove = (): void => {
    setBusy(true)
    setStatus(undefined)
    api.removeFile(cwd, target.scope, target.dir, target.name)
      .then(result => {
        if (isFailure(result)) {
          setStatus({ error: true, text: `${t('err.delete')}: ${hostText(t, result)}` })
          setBusy(false)
          return
        }
        onBack()
      })
      .catch((error: unknown) => {
        setStatus({ error: true, text: `${t('err.delete')}: ${error instanceof Error ? error.message : String(error)}` })
        setBusy(false)
      })
  }

  const requestBack = (): void => {
    if (dirtyRef.current) setConfirmDiscard(true)
    else onBack()
  }

  const displayDir = target.scope === 'global' ? '~/.dsh' : target.dir === '' ? t('layer.projectRoot') : target.dir
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <div className="dpf-editor-head">
        <button type="button" className="dpf-btn" onClick={requestBack}>{t('editor.back')}</button>
        <span className="dpf-editor-name">
          {displayDir} / {target.name}
          {dirty ? <span className="dpf-dirty" title={t('editor.dirty')}>●</span> : null}
        </span>
      </div>
      <div className="dpf-editor-meta">{content === undefined ? t('editor.loading') : meta}</div>
      {confirmDiscard && (
        <div className="dpf-guard">
          <span>{t('guard.unsaved')}</span>
          <button type="button" className="dpf-btn dpf-btn-primary" onClick={() => { setConfirmDiscard(false); save() }}>{t('guard.saveBack')}</button>
          <button type="button" className="dpf-btn dpf-btn-danger" onClick={onBack}>{t('guard.discard')}</button>
          <button type="button" className="dpf-btn" onClick={() => { setConfirmDiscard(false) }}>{t('guard.keepEditing')}</button>
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
          {target.create ? t('editor.saveNew') : t('editor.save')}
        </button>
        {target.create ? null : confirmDelete
          ? (
            <>
              <button type="button" className="dpf-btn dpf-btn-danger" disabled={busy} onClick={remove}>{t('editor.confirmDelete')}</button>
              <button type="button" className="dpf-btn" disabled={busy} onClick={() => { setConfirmDelete(false) }}>{t('editor.cancel')}</button>
            </>
          )
          : (
            <button type="button" className="dpf-btn dpf-btn-danger" disabled={content === undefined || busy} onClick={() => { setConfirmDelete(true) }}>{t('editor.delete')}</button>
          )}
        {status === undefined ? null : <span className={status.error ? 'dpf-status dpf-status-error' : 'dpf-status'}>{status.text}</span>}
      </div>
    </div>
  )
}

/** shell.overlay 面板主体。 */
export function ProjectFilesPanel(props: PanelProps): ReactNode {
  const { api, sessions, store, t } = props
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
      .then(result => {
        if (cancelled) return
        if (isFailure(result)) {
          setListError(hostText(t, result))
          return
        }
        setOverview(result)
      })
      .catch((error: unknown) => {
        if (!cancelled) setListError(error instanceof Error ? error.message : String(error))
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [api, state.open, cwd, refreshKey])

  if (!state.open) return null

  if (cwd === undefined) {
    return (
      <PanelShell cwd={undefined} store={store} t={t}>
        <div className="dpf-hint">{t('panel.noSession.title')}<br />{t('panel.noSession.body')}</div>
      </PanelShell>
    )
  }

  // 从编辑视图返回时重拉概览:保存/删除可能改变了存在性与去重状态。
  const back = (): void => { store.edit(undefined); setRefreshKey(n => n + 1) }

  if (state.editing !== undefined) {
    return (
      <PanelShell cwd={cwd} store={store} t={t}>
        {state.editing.kind === 'skill'
          ? <SkillFileEditor api={api} cwd={cwd} target={state.editing} t={t} onBack={back} />
          : <FileEditor api={api} cwd={cwd} target={state.editing} store={store} t={t} onBack={back} />}
      </PanelShell>
    )
  }

  return (
    <PanelShell cwd={cwd} store={store} t={t}>
      {loading && overview === undefined ? <div className="dpf-hint">{t('panel.loading')}</div> : null}
      {listError !== undefined ? <div className="dpf-status dpf-status-error">{`${t('panel.err.load')}: ${listError}`}</div> : null}
      {overview === undefined ? null : (
        <>
          <div className="dpf-caption">
            {t('panel.caption')}
          </div>
          {overview.layers.map(layer => (
            <LayerCard
              key={`${layer.scope}:${layer.dir}`}
              layer={layer}
              t={t}
              onOpen={meta => {
                store.edit({ scope: layer.scope, dir: layer.dir, name: meta.name, create: false })
              }}
              onCreate={name => {
                store.edit({ scope: layer.scope, dir: layer.dir, name, create: true })
              }}
            />
          ))}
          <div className="dpf-footnote">
            {overview.cwdRel === '' ? t('panel.footnote.root') : t('panel.footnote.cwd')}
          </div>
          <h3 className="dpf-section-title">{t('panel.skills.title')}</h3>
          <div className="dpf-caption">{t('panel.skills.caption')}</div>
          {overview.skills.map(skill => (
            <SkillRootRow
              key={skill.displayPath}
              skill={skill}
              t={t}
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
  const { store, t } = props
  const open = useSyncExternalStore(store.subscribe, () => store.getSnapshot().open, () => false)
  return (
    <button
      type="button"
      className={open ? 'dpf-toggle dpf-toggle-active' : 'dpf-toggle'}
      aria-pressed={open}
      title={t('toggle.title', { names: BASE_CANDIDATES.join(' / ') })}
      onClick={() => { store.toggle() }}
    >
      <span aria-hidden="true">☰</span>
      <span>{t('toggle.label')}</span>
    </button>
  )
}

/** 一个技能根目录行:有技能时可点击展开技能名清单。 */
function SkillRootRow({ skill, t, onOpenSkill }: {
  skill: OverviewResult['skills'][number]
  t: TFunc
  onOpenSkill: (root: string, entry: { name: string; path: string }) => void
}): ReactNode {
  const [expanded, setExpanded] = useState(false)
  const expandable = skill.exists && (skill.skills?.length ?? 0) > 0
  const row = (
    <>
      <span className="dpf-row-main">
        <span className="dpf-row-name">{skill.displayPath}/</span>
        <span className="dpf-chip">{skill.level === 'project' ? t('skill.level.project') : t('skill.level.user')}</span>
      </span>
      <span className="dpf-row-meta">
        {skill.exists ? `${t('skill.count', { count: skill.skillCount ?? 0 })}${expandable ? (expanded ? ' ▾' : ' ▸') : ''}` : t('skill.notCreated')}
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
              title={t('skill.open', { path: `${skill.displayPath}/${entry.path}` })}
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
  t: TFunc
  onBack: () => void
}): ReactNode {
  const { api, cwd, target, t, onBack } = props
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
        if (isFailure(result)) {
          setContent('')
          setStatus({ error: true, text: `${t('err.read')}: ${hostText(t, result)}` })
          return
        }
        setContent(result.content)
        setBaseline(result.content)
        setMeta(t('editor.lastWrite', { time: formatTime(result.mtimeIso), size: formatSize(result.size) }))
      })
      .catch((error: unknown) => {
        if (!cancelled) setStatus({ error: true, text: `${t('err.read')}: ${error instanceof Error ? error.message : String(error)}` })
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
        if (isFailure(result)) {
          setStatus({ error: true, text: `${t('err.write')}: ${hostText(t, result)}` })
          return
        }
        setBaseline(content)
        setMeta(t('editor.lastWrite', { time: formatTime(result.mtimeIso), size: formatSize(result.size) }))
        setStatus({ error: false, text: t('status.savedSkill') })
      })
      .catch((error: unknown) => {
        setStatus({ error: true, text: `${t('err.write')}: ${error instanceof Error ? error.message : String(error)}` })
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
        <button type="button" className="dpf-btn" onClick={requestBack}>{t('editor.back')}</button>
        <span className="dpf-editor-name">
          /{target.name}
          {dirty ? <span className="dpf-dirty" title={t('editor.dirty')}>●</span> : null}
        </span>
      </div>
      <div className="dpf-editor-meta">
        {content === undefined ? t('editor.loading') : `${target.root}/${target.path} · ${meta}`}
      </div>
      {confirmDiscard && (
        <div className="dpf-guard">
          <span>{t('guard.unsaved')}</span>
          <button type="button" className="dpf-btn dpf-btn-primary" onClick={() => { setConfirmDiscard(false); save() }}>{t('guard.saveBack')}</button>
          <button type="button" className="dpf-btn dpf-btn-danger" onClick={onBack}>{t('guard.discard')}</button>
          <button type="button" className="dpf-btn" onClick={() => { setConfirmDiscard(false) }}>{t('guard.keepEditing')}</button>
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
        <button type="button" className="dpf-btn dpf-btn-primary" disabled={!dirty || busy} onClick={save}>{t('editor.save')}</button>
        {status === undefined ? null : <span className={status.error ? 'dpf-status dpf-status-error' : 'dpf-status'}>{status.text}</span>}
      </div>
    </div>
  )
}
