/**
 * 客户端本地的最小服务类型面。
 *
 * 第三方插件不依赖 harness 客户端包的生成类型(它们随版本演进),这里按
 * 结构需要声明用到的那一小部分:remote 挂载、sessions 列表快照、slots
 * 注册。运行时契约由 dsh-client-runtime / ui-slots / api-gateway 提供。
 */

import type { ListResult, ReadResult, RemoveResult, WriteResult } from '../scoped-files.js'

/** 一个 strict zod 编解码器(客户端描述符用)。 */
export interface StrictCodec {
  readonly mode: 'strict'
  readonly typeSymbol: string
  // zod v4 schema:只需要 parse 能力,不做版本级类型断言。
  readonly schema: { parse(value: unknown): unknown }
}

/** 一个调用参数描述符。 */
export interface ParameterDescriptor {
  readonly name: string
  readonly wire: string
  readonly source: 'json'
  readonly codec: StrictCodec
}

/** 一个远端调用描述符(Typert InvocationDescriptor 的直调子集)。 */
export interface InvocationDescriptorLike {
  readonly id: string
  readonly service: string
  readonly namespace: string
  readonly method: string
  readonly invocation: { readonly kind: 'direct' }
  readonly parameters: readonly ParameterDescriptor[]
  readonly result: StrictCodec
}

/** ctx.remote 的最小面:$mount 与挂载后的 projectFiles 命名空间。 */
export interface RemoteFace {
  $mount(contribution: { package: string; descriptors: readonly InvocationDescriptorLike[] }): Promise<() => Promise<void>>
  projectFiles: ProjectFilesCalls
}

/** RPC 结果的共用外形。 */
export type RpcResult<T> = { ok: true; value: T } | { ok: false; error: { code: string; message: string } }

/** projectFiles 命名空间挂载后的调用面。 */
export interface ProjectFilesCalls {
  list(root: string): Promise<RpcResult<ListResult>>
  read(root: string, name: string): Promise<RpcResult<ReadResult>>
  write(root: string, name: string, content: string): Promise<RpcResult<WriteResult>>
  removeFile(root: string, name: string): Promise<RpcResult<RemoveResult>>
}

/** 会话摘要中本插件关心的字段。 */
export interface SessionSummaryLike {
  readonly cwd?: string
}

/** sessions 列表快照中本插件关心的字段。 */
export interface SessionListStateLike {
  readonly current: string | undefined
  readonly byId: Readonly<Record<string, SessionSummaryLike | undefined>>
}

/** ctx.sessions 的最小面:可订阅的列表快照。 */
export interface SessionsFace {
  readonly list: {
    getSnapshot(): SessionListStateLike
    subscribe(fn: () => void): () => void
  }
}

/** ctx.slots 的最小面:等待声明 + 注册组件。 */
export interface SlotsFace {
  inject(slotName: string, register: () => unknown): unknown
  register(options: Record<string, unknown>, component: unknown): unknown
}

/** 浏览器端 cordis 上下文的最小面(effect / inject 为 cordis 标准能力)。 */
export interface ClientContext {
  effect(setup: () => (() => void) | void, name?: string): unknown
  inject(deps: readonly string[], callback: (ctx: ClientContext) => void): unknown
  readonly remote: RemoteFace
  readonly sessions: SessionsFace
  readonly slots: SlotsFace
}
