/**
 * dsh-context-inspector 浏览器端插件。
 *
 * 职责:把手写的 projectFiles 调用描述符挂载到 ctx.remote($mount),
 * 注册 zh/en 词典到 ctx.locale,然后向两个 slot 注册 UI —— shell.overlay
 * 的右侧浮动面板,和 conversation.session.header.utilities 的开关按钮。
 * 两个注册都走 slots.inject:等 slot 声明方(ui-layout / ui-conversation)
 * 就绪后再注册,因此与其它插件可独立加载、也可合并加载,互不占用对方的
 * 座位;注册声明 locale: NS,框架把 t 标准位放进组件 props(locale 切换时
 * t 身份变化,组件随之重渲染)。
 */

import type {
  OverviewResult, ReadResult, RemoveResult, RpcOutcome, WriteResult,
} from '../scoped-files.js'
import { buildDescriptors } from './descriptors.js'
import { en, NS, zh } from './locales.js'
import { ProjectFilesPanel, ProjectFilesToggle, type ProjectFilesApi } from './panel.js'
import { createPanelStore } from './store.js'
import { ensureStyles } from './styles.js'
import type { ClientContext, RpcResult } from './types.js'

/** 需要的服务:remote 挂载面、会话列表快照、slot 注册面。 */
export const inject = ['remote', 'sessions', 'slots']

/** 解包 RPC 结果,失败转成 Error。 */
function unwrap<T>(result: RpcResult<T>): T {
  if (result.ok) return result.value
  throw new Error(`${result.error.code}: ${result.error.message}`)
}

/** 组装解包后的调用面。 */
function createApi(ctx: ClientContext): ProjectFilesApi {
  const calls = ctx.remote.projectFiles
  return {
    overview: async (cwd: string): Promise<RpcOutcome<OverviewResult>> => unwrap(await calls.overview(cwd)),
    readFile: async (cwd: string, scope: string, dir: string, name: string): Promise<RpcOutcome<ReadResult>> =>
      unwrap(await calls.readFile(cwd, scope, dir, name)),
    readSkillFile: async (cwd: string, root: string, skillPath: string): Promise<RpcOutcome<ReadResult>> =>
      unwrap(await calls.readSkillFile(cwd, root, skillPath)),
    writeSkillFile: async (cwd: string, root: string, skillPath: string, content: string): Promise<RpcOutcome<WriteResult>> =>
      unwrap(await calls.writeSkillFile(cwd, root, skillPath, content)),
    writeFile: async (cwd: string, scope: string, dir: string, name: string, content: string): Promise<RpcOutcome<WriteResult>> =>
      unwrap(await calls.writeFile(cwd, scope, dir, name, content)),
    removeFile: async (cwd: string, scope: string, dir: string, name: string): Promise<RpcOutcome<RemoveResult>> =>
      unwrap(await calls.removeFile(cwd, scope, dir, name)),
  }
}

/**
 * 插件主体:样式注入 → 挂载远端描述符 → 注册词典 → 注册面板与开关按钮。
 * @param ctx - 浏览器端 cordis 上下文。
 */
export async function apply(ctx: ClientContext): Promise<void> {
  ensureStyles()

  const disposeRemote = await ctx.remote.$mount({
    package: 'dsh-context-inspector',
    descriptors: buildDescriptors(),
  })
  ctx.effect(() => () => { void disposeRemote() }, 'dsh-context-inspector: remote descriptor mount')

  const store = createPanelStore()

  // 注册 zh/en 词典(动态 inject:locale 服务由宿主 dsh-client-locale 提供)。
  // 晚到注册会 bump revision,已挂载的出口随之取到词典。
  ctx.inject(['locale'], (localeCtx: ClientContext): void => {
    ctx.effect(() => {
      const dispose = localeCtx.locale.register(NS, { zh, en })
      return () => { if (typeof dispose === 'function') dispose() }
    }, 'dsh-context-inspector: register dictionaries')
  })

  // 远端命名空间服务 remote.projectFiles 由上面的 $mount 创建,不能写进静态
  // inject(那会在 apply 之前等待一个尚不存在的服务,永远挂起)。改用动态
  // inject:$mount 完成后命名空间已存在,回调立即触发,且回调上下文允许
  // 访问 ctx.remote.projectFiles。
  ctx.inject(['remote', 'remote.projectFiles'], (namespaceCtx: ClientContext): void => {
    const api = createApi(namespaceCtx)

    ctx.slots.inject('shell.overlay', () => ctx.slots.register({
      name: 'shell.overlay',
      id: 'dsh-context-inspector',
      order: 20,
      locale: NS,
      inject: (): Record<string, unknown> => ({ api, sessions: ctx.sessions, store }),
    }, ProjectFilesPanel))

    ctx.slots.inject('conversation.session.header.utilities', () => ctx.slots.register({
      name: 'conversation.session.header.utilities',
      id: 'dsh-context-inspector',
      order: 30,
      locale: NS,
      inject: (): Record<string, unknown> => ({ store }),
    }, ProjectFilesToggle))
  })
}
