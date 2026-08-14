/**
 * dsh-project-files 浏览器端插件。
 *
 * 职责:把手写的 projectFiles 调用描述符挂载到 ctx.remote($mount),
 * 然后向两个 slot 注册 UI —— shell.overlay 的右侧浮动面板,和
 * conversation.session.header.utilities 的开关按钮。两个注册都走
 * slots.inject:等 slot 声明方(ui-layout / ui-conversation)就绪后再注册,
 * 因此与其它插件可独立加载、也可合并加载,互不占用对方的座位。
 */

import type {
  ListResult, ReadResult, RemoveResult, WriteResult,
} from '../scoped-files.js'
import { buildDescriptors } from './descriptors.js'
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
    list: async (root: string): Promise<ListResult> => unwrap(await calls.list(root)),
    read: async (root: string, name: string): Promise<ReadResult> => unwrap(await calls.read(root, name)),
    write: async (root: string, name: string, content: string): Promise<WriteResult> =>
      unwrap(await calls.write(root, name, content)),
    remove: async (root: string, name: string): Promise<RemoveResult> => unwrap(await calls.removeFile(root, name)),
  }
}

/**
 * 插件主体:样式注入 → 挂载远端描述符 → 注册面板与开关按钮。
 * @param ctx - 浏览器端 cordis 上下文。
 */
export async function apply(ctx: ClientContext): Promise<void> {
  ensureStyles()

  const disposeRemote = await ctx.remote.$mount({
    package: 'dsh-project-files',
    descriptors: buildDescriptors(),
  })
  ctx.effect(() => () => { void disposeRemote() }, 'dsh-project-files: 远端描述符挂载')

  const store = createPanelStore()

  // 远端命名空间服务 remote.projectFiles 由上面的 $mount 创建,不能写进静态
  // inject(那会在 apply 之前等待一个尚不存在的服务,永远挂起)。改用动态
  // inject:$mount 完成后命名空间已存在,回调立即触发,且回调上下文允许
  // 访问 ctx.remote.projectFiles。
  ctx.inject(['remote', 'remote.projectFiles'], (namespaceCtx: ClientContext): void => {
    const api = createApi(namespaceCtx)

    ctx.slots.inject('shell.overlay', () => ctx.slots.register({
      name: 'shell.overlay',
      id: 'dsh-project-files',
      order: 20,
      inject: (): Record<string, unknown> => ({ api, sessions: ctx.sessions, store }),
    }, ProjectFilesPanel))

    ctx.slots.inject('conversation.session.header.utilities', () => ctx.slots.register({
      name: 'conversation.session.header.utilities',
      id: 'dsh-project-files',
      order: 30,
      inject: (): Record<string, unknown> => ({ store }),
    }, ProjectFilesToggle))
  })
}
