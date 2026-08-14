/**
 * 手写的 projectFiles 客户端调用描述符。
 *
 * 宿主端以 SRC 模式暴露方法,wire 字段名就是宿主方法的参数名
 * (root/name/content);客户端 $mount 时用 strict zod schema 对出入参
 * 做边界校验。描述符与宿主实现(src/index.ts)一一对应。
 */

import { z } from 'zod'
import type { InvocationDescriptorLike, ParameterDescriptor, StrictCodec } from './types.js'

const stringCodec = (typeSymbol: string): StrictCodec =>
  ({ mode: 'strict', typeSymbol, schema: z.string() })

const rootParameter: ParameterDescriptor = {
  name: 'root',
  wire: 'root',
  source: 'json',
  codec: stringCodec('dsh-project-files#Root'),
}

const nameParameter: ParameterDescriptor = {
  name: 'name',
  wire: 'name',
  source: 'json',
  codec: stringCodec('dsh-project-files#ScopedFileName'),
}

const contentParameter: ParameterDescriptor = {
  name: 'content',
  wire: 'content',
  source: 'json',
  codec: stringCodec('dsh-project-files#FileContent'),
}

const scopedFileMeta = z.object({
  name: z.string(),
  purpose: z.string(),
  exists: z.boolean(),
  size: z.number(),
  mtimeIso: z.string(),
})

const listResult = z.object({
  root: z.string(),
  files: z.array(scopedFileMeta),
})

const readResult = z.object({
  content: z.string(),
  size: z.number(),
  mtimeIso: z.string(),
})

const writeResult = z.object({
  size: z.number(),
  mtimeIso: z.string(),
})

const removeResult = z.object({
  removed: z.boolean(),
})

const resultCodec = (symbol: string, schema: { parse(value: unknown): unknown }): StrictCodec =>
  ({ mode: 'strict', typeSymbol: symbol, schema })

/** 构造 projectFiles 命名空间的全部调用描述符。 */
export function buildDescriptors(): readonly InvocationDescriptorLike[] {
  return [
    {
      id: 'dsh-project-files#projectFiles/list',
      service: 'projectFiles',
      namespace: 'projectFiles',
      method: 'list',
      invocation: { kind: 'direct' },
      parameters: [rootParameter],
      result: resultCodec('dsh-project-files#ListResult', listResult),
    },
    {
      id: 'dsh-project-files#projectFiles/read',
      service: 'projectFiles',
      namespace: 'projectFiles',
      method: 'read',
      invocation: { kind: 'direct' },
      parameters: [rootParameter, nameParameter],
      result: resultCodec('dsh-project-files#ReadResult', readResult),
    },
    {
      id: 'dsh-project-files#projectFiles/write',
      service: 'projectFiles',
      namespace: 'projectFiles',
      method: 'write',
      invocation: { kind: 'direct' },
      parameters: [rootParameter, nameParameter, contentParameter],
      result: resultCodec('dsh-project-files#WriteResult', writeResult),
    },
    {
      id: 'dsh-project-files#projectFiles/removeFile',
      service: 'projectFiles',
      namespace: 'projectFiles',
      method: 'removeFile',
      invocation: { kind: 'direct' },
      parameters: [rootParameter, nameParameter],
      result: resultCodec('dsh-project-files#RemoveResult', removeResult),
    },
  ]
}
