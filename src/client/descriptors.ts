/**
 * 手写的 projectFiles 客户端调用描述符。
 *
 * 宿主端以 SRC 模式暴露方法,wire 字段名就是宿主方法的参数名
 * (cwd/scope/dir/name/content);客户端 $mount 时用 strict zod schema
 * 对出入参做边界校验。描述符与宿主实现(src/index.ts)一一对应。
 */

import { z } from 'zod'
import type { InvocationDescriptorLike, ParameterDescriptor, StrictCodec } from './types.js'

const stringParameter = (name: string, typeSymbol: string): ParameterDescriptor => ({
  name,
  wire: name,
  source: 'json',
  codec: { mode: 'strict', typeSymbol, schema: z.string() },
})

const cwdParameter = stringParameter('cwd', 'dsh-context-inspector#Cwd')
const scopeParameter = stringParameter('scope', 'dsh-context-inspector#Scope')
const dirParameter = stringParameter('dir', 'dsh-context-inspector#Dir')
const nameParameter = stringParameter('name', 'dsh-context-inspector#Name')
const contentParameter = stringParameter('content', 'dsh-context-inspector#Content')

const instructionFileMeta = z.object({
  name: z.string(),
  exists: z.boolean(),
  size: z.number(),
  mtimeIso: z.string(),
  local: z.boolean(),
  duplicateOf: z.string().optional(),
  oversized: z.boolean().optional(),
})

const instructionLayer = z.object({
  scope: z.enum(['global', 'project']),
  dir: z.string(),
  displayDir: z.string(),
  isCwd: z.boolean(),
  files: z.array(instructionFileMeta),
})

const skillRootMeta = z.object({
  displayPath: z.string(),
  level: z.enum(['project', 'user']),
  exists: z.boolean(),
  skillCount: z.number().optional(),
  skills: z.array(z.object({ name: z.string(), path: z.string() })).optional(),
})

const overviewResult = z.object({
  cwd: z.string(),
  projectRoot: z.string(),
  cwdRel: z.string(),
  layers: z.array(instructionLayer),
  skills: z.array(skillRootMeta),
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

/** 业务失败状态(宿主以数据返回用户可见失败,替代抛错)。 */
const failureStatus = z.object({
  ok: z.literal(false),
  code: z.string(),
  text: z.string(),
  params: z.record(z.string(), z.string()).optional(),
  level: z.literal('error'),
})

/** 各端点的返回:成功数据或失败状态。 */
const overviewOutcome = z.union([overviewResult, failureStatus])
const readOutcome = z.union([readResult, failureStatus])
const writeOutcome = z.union([writeResult, failureStatus])
const removeOutcome = z.union([removeResult, failureStatus])

const resultCodec = (symbol: string, schema: { parse(value: unknown): unknown }): StrictCodec =>
  ({ mode: 'strict', typeSymbol: symbol, schema })

const addressParameters = [cwdParameter, scopeParameter, dirParameter, nameParameter]
const rootParameter = stringParameter('root', 'dsh-context-inspector#SkillRoot')
const skillPathParameter = stringParameter('skillPath', 'dsh-context-inspector#SkillPath')

/** 构造 projectFiles 命名空间的全部调用描述符。 */
export function buildDescriptors(): readonly InvocationDescriptorLike[] {
  return [
    {
      id: 'dsh-context-inspector#projectFiles/overview',
      service: 'projectFiles',
      namespace: 'projectFiles',
      method: 'overview',
      invocation: { kind: 'direct' },
      parameters: [cwdParameter],
      result: resultCodec('dsh-context-inspector#OverviewResult', overviewOutcome),
    },
    {
      id: 'dsh-context-inspector#projectFiles/readFile',
      service: 'projectFiles',
      namespace: 'projectFiles',
      method: 'readFile',
      invocation: { kind: 'direct' },
      parameters: addressParameters,
      result: resultCodec('dsh-context-inspector#ReadResult', readOutcome),
    },
    {
      id: 'dsh-context-inspector#projectFiles/readSkillFile',
      service: 'projectFiles',
      namespace: 'projectFiles',
      method: 'readSkillFile',
      invocation: { kind: 'direct' },
      parameters: [cwdParameter, rootParameter, skillPathParameter],
      result: resultCodec('dsh-context-inspector#ReadResult', readOutcome),
    },
    {
      id: 'dsh-context-inspector#projectFiles/writeSkillFile',
      service: 'projectFiles',
      namespace: 'projectFiles',
      method: 'writeSkillFile',
      invocation: { kind: 'direct' },
      parameters: [cwdParameter, rootParameter, skillPathParameter, contentParameter],
      result: resultCodec('dsh-context-inspector#WriteResult', writeOutcome),
    },
    {
      id: 'dsh-context-inspector#projectFiles/writeFile',
      service: 'projectFiles',
      namespace: 'projectFiles',
      method: 'writeFile',
      invocation: { kind: 'direct' },
      parameters: [...addressParameters, contentParameter],
      result: resultCodec('dsh-context-inspector#WriteResult', writeOutcome),
    },
    {
      id: 'dsh-context-inspector#projectFiles/removeFile',
      service: 'projectFiles',
      namespace: 'projectFiles',
      method: 'removeFile',
      invocation: { kind: 'direct' },
      parameters: addressParameters,
      result: resultCodec('dsh-context-inspector#RemoveResult', removeOutcome),
    },
  ]
}
