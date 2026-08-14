/**
 * dsh-project-files 宿主端:projectFiles 网关服务。
 *
 * 继承 TypertRemoteService 后,Typert Gateway 以 SRC 模式自动发现本服务:
 * 不需要生成式 TYPERT 清单,方法上的 @Remote() 装饰器与构造时绑定的
 * 服务键 'projectFiles' 即构成 wire 端点 projectFiles/<method>。
 *
 * 路径安全:所有方法只接受「工作区根目录 + 白名单文件名」二元组。
 * 文件名必须命中 SCOPED_FILE_NAMES(白名单内文件名均不含路径分隔符,
 * 天然杜绝目录穿越);根目录必须是已存在的绝对路径目录,最终路径还会
 * 再做一次 resolve 后的前缀校验。
 *
 * 重要:Gateway 通过 Function.prototype.toString 读取方法参数名作为
 * wire 字段名,因此本文件的公开方法必须保持「简单标识符参数」形态
 * (不解构、无默认值、无剩余参数),且构建产物不得压缩改写参数名。
 */

import { statSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs'
import { isAbsolute, resolve, sep } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import {
  SCOPED_FILE_NAMES,
  SCOPED_FILE_SPECS,
  type ListResult,
  type ReadResult,
  type RemoveResult,
  type ScopedFileMeta,
  type WriteResult,
} from './scoped-files.js'

export type {
  ListResult,
  ReadResult,
  RemoveResult,
  ScopedFileMeta,
  ScopedFileSpec,
  WriteResult,
} from './scoped-files.js'
export { SCOPED_FILE_NAMES, SCOPED_FILE_SPECS } from './scoped-files.js'

/** 校验并解析根目录:必须是存在的绝对路径目录。 */
function checkRoot(root: string): string {
  if (typeof root !== 'string' || root.length === 0 || root.includes('\0')) {
    throw new Error('projectFiles: root 必须是非空字符串')
  }
  if (!isAbsolute(root)) {
    throw new Error(`projectFiles: root 必须是绝对路径,收到 ${JSON.stringify(root)}`)
  }
  let stats
  try {
    stats = statSync(root)
  } catch {
    throw new Error(`projectFiles: 工作区目录不可访问: ${root}`)
  }
  if (!stats.isDirectory()) throw new Error(`projectFiles: root 不是目录: ${root}`)
  return resolve(root)
}

/** 校验文件名在白名单内,并返回根目录下的完整路径。 */
function checkTarget(root: string, name: string): string {
  if (typeof name !== 'string' || !SCOPED_FILE_NAMES.has(name)) {
    throw new Error(`projectFiles: 不支持的作用域文件名: ${JSON.stringify(name)}`)
  }
  const target = resolve(root, name)
  // 白名单文件名不含分隔符,这里的前缀校验是纵深防御。
  if (target !== root + sep + name) {
    throw new Error('projectFiles: 解析后的路径越出了工作区根目录')
  }
  return target
}

/** 读取文件统计,不存在返回 undefined。 */
function statOf(target: string): { size: number; mtimeIso: string } | undefined {
  try {
    const stats = statSync(target)
    return { size: stats.size, mtimeIso: stats.mtime.toISOString() }
  } catch {
    return undefined
  }
}

/** 弱(src-json)调用描述符:参数与结果都按 JSON 原样过wire,不做 zod 校验。 */
interface WeakInvocation {
  readonly id: string
  readonly service: 'projectFiles'
  readonly namespace: 'projectFiles'
  readonly method: string
  readonly invocation: { readonly kind: 'direct' }
  readonly parameters: ReadonlyArray<{
    readonly name: string
    readonly wire: string
    readonly source: 'json'
    readonly codec: { readonly mode: 'src-json' }
  }>
  readonly result: { readonly mode: 'src-json' }
}

/** ctx.typert 注册面(宿主 dsh-typert-registry 提供;本包不依赖其类型)。 */
interface TypertRegistryLike {
  register(contribution: unknown): unknown
}

function jsonParameter(name: string): WeakInvocation['parameters'][number] {
  return { name, wire: name, source: 'json', codec: { mode: 'src-json' } }
}

/**
 * 宿主端弱类型 TYPERT 清单:把 projectFiles/* 端点作为 strict 定义注册进
 * 宿主的 typert registry。
 *
 * 为什么必须走注册而不能只靠 @Remote/SRC 发现:第三方插件解析到自己
 * node_modules 里的 @deepseek-ai/dsh-typert-protocol 副本,装饰器标记写进
 * 那份副本的模块私有 WeakMap;宿主 Gateway 用的是宿主侧另一份副本,
 * remoteMethods 读不到任何标记,SRC 发现会得到 0 个端点(浏览器里
 * projectFiles/* 全部 404)。清单是纯数据,跨副本可见,Gateway 的
 * strict 定义路径直接命中。官方 registry 明确保留手动
 * ctx.typert.register() 给无 ./typert 构件的贡献。
 */
const TYPERT_MANIFEST = {
  package: 'dsh-project-files',
  face: 'host',
  schemas: [],
  model: { services: [], events: [], objects: [] },
  invocations: [
    {
      id: 'dsh-project-files#projectFiles/list',
      service: 'projectFiles',
      namespace: 'projectFiles',
      method: 'list',
      invocation: { kind: 'direct' },
      parameters: [jsonParameter('root')],
      result: { mode: 'src-json' },
    },
    {
      id: 'dsh-project-files#projectFiles/read',
      service: 'projectFiles',
      namespace: 'projectFiles',
      method: 'read',
      invocation: { kind: 'direct' },
      parameters: [jsonParameter('root'), jsonParameter('name')],
      result: { mode: 'src-json' },
    },
    {
      id: 'dsh-project-files#projectFiles/write',
      service: 'projectFiles',
      namespace: 'projectFiles',
      method: 'write',
      invocation: { kind: 'direct' },
      parameters: [jsonParameter('root'), jsonParameter('name'), jsonParameter('content')],
      result: { mode: 'src-json' },
    },
    {
      id: 'dsh-project-files#projectFiles/removeFile',
      service: 'projectFiles',
      namespace: 'projectFiles',
      method: 'removeFile',
      invocation: { kind: 'direct' },
      parameters: [jsonParameter('root'), jsonParameter('name')],
      result: { mode: 'src-json' },
    },
  ] satisfies WeakInvocation[],
} as const

/**
 * projectFiles 网关服务:作用域指引文件的列出/读取/写入/删除。
 * @param ctx - 宿主 Cordis 上下文。
 */
export class ProjectFilesGateway extends TypertRemoteService {
  /** 注册 'projectFiles' 服务键;typert registry 就绪后补登记弱清单。 */
  constructor(ctx: Context) {
    super(ctx, 'projectFiles')
    // 动态 inject:typert 不在场的组合(如 ACP 示例配置)里静默跳过,
    // 不阻塞 boot;register 返回的 disposer 作为回调返回值参与卸载。
    ctx.inject(['typert'], (typertCtx: Context) =>
      (typertCtx as unknown as { typert: TypertRegistryLike }).typert.register(TYPERT_MANIFEST))
  }

  /** 列出当前工作区全部候选作用域文件的状态。 */
  @Remote
  list(root: string): ListResult {
    const resolvedRoot = checkRoot(root)
    const files: ScopedFileMeta[] = SCOPED_FILE_SPECS.map(spec => {
      const stats = statOf(checkTarget(resolvedRoot, spec.name))
      return {
        name: spec.name,
        purpose: spec.purpose,
        exists: stats !== undefined,
        size: stats?.size ?? 0,
        mtimeIso: stats?.mtimeIso ?? '',
      }
    })
    return { root: resolvedRoot, files }
  }

  /** 读取一个作用域文件的全文与元信息。 */
  @Remote
  read(root: string, name: string): ReadResult {
    const resolvedRoot = checkRoot(root)
    const target = checkTarget(resolvedRoot, name)
    const stats = statOf(target)
    if (stats === undefined) throw new Error(`projectFiles: 文件不存在: ${name}`)
    return {
      content: readFileSync(target, 'utf8'),
      size: stats.size,
      mtimeIso: stats.mtimeIso,
    }
  }

  /** 写入(新建或覆盖)一个作用域文件,返回写入后的元信息。 */
  @Remote
  write(root: string, name: string, content: string): WriteResult {
    const resolvedRoot = checkRoot(root)
    const target = checkTarget(resolvedRoot, name)
    if (typeof content !== 'string') throw new Error('projectFiles: content 必须是字符串')
    writeFileSync(target, content, 'utf8')
    const stats = statOf(target)
    if (stats === undefined) throw new Error(`projectFiles: 写入后无法读取状态: ${name}`)
    return { size: stats.size, mtimeIso: stats.mtimeIso }
  }

  /** 删除一个作用域文件;文件本就不存在时 removed 为 false。命名为 removeFile:客户端命名空间服务的原型上已占用 remove。 */
  @Remote
  removeFile(root: string, name: string): RemoveResult {
    const resolvedRoot = checkRoot(root)
    const target = checkTarget(resolvedRoot, name)
    if (statOf(target) === undefined) return { removed: false }
    unlinkSync(target)
    return { removed: true }
  }
}

export default ProjectFilesGateway
