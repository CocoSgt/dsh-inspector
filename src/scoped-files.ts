/**
 * 作用域指引文件白名单与共享类型。
 * 每个条目固定一个文件名与中文用途说明;宿主端与客户端共用这份清单,
 * 白名单同时就是路径安全边界(名单内文件名不含路径分隔符,无法穿越)。
 */

/** 一个候选作用域文件的静态描述。 */
export interface ScopedFileSpec {
  /** 工作区根目录下的文件名(不允许包含路径分隔符)。 */
  readonly name: string
  /** 该文件的用途说明(中文,展示给用户)。 */
  readonly purpose: string
}

/** 受支持的作用域指引文件清单(展示顺序即清单顺序)。 */
export const SCOPED_FILE_SPECS: readonly ScopedFileSpec[] = [
  { name: 'AGENTS.md', purpose: '代理工具通用项目指引(dsh 等会读取)' },
  { name: 'CLAUDE.md', purpose: 'Claude Code 项目指引' },
  { name: 'GEMINI.md', purpose: 'Gemini CLI 项目指引' },
  { name: 'COPILOT-INSTRUCTIONS.md', purpose: 'GitHub Copilot 指引' },
  { name: '.cursorrules', purpose: 'Cursor 编辑器规则文件' },
]

/** 按文件名建索引的白名单集合。 */
export const SCOPED_FILE_NAMES: ReadonlySet<string> = new Set(SCOPED_FILE_SPECS.map(spec => spec.name))

/** 一个作用域文件的当前状态(list 返回行)。 */
export interface ScopedFileMeta {
  /** 文件名。 */
  readonly name: string
  /** 用途说明。 */
  readonly purpose: string
  /** 文件当前是否存在。 */
  readonly exists: boolean
  /** 文件字节数(不存在为 0)。 */
  readonly size: number
  /** 最近修改时间(ISO 8601,不存在为空字符串)。 */
  readonly mtimeIso: string
}

/** projectFiles/list 的返回。 */
export interface ListResult {
  /** 本次检查的工作区根目录。 */
  readonly root: string
  /** 全部候选文件的状态。 */
  readonly files: readonly ScopedFileMeta[]
}

/** projectFiles/read 的返回。 */
export interface ReadResult {
  /** 文件全文。 */
  readonly content: string
  /** 文件字节数。 */
  readonly size: number
  /** 最近修改时间(ISO 8601)。 */
  readonly mtimeIso: string
}

/** projectFiles/write 的返回。 */
export interface WriteResult {
  /** 写入后的字节数。 */
  readonly size: number
  /** 写入时间(ISO 8601)。 */
  readonly mtimeIso: string
}

/** projectFiles/removeFile 的返回。 */
export interface RemoveResult {
  /** 是否删除了已存在的文件。 */
  readonly removed: boolean
}
