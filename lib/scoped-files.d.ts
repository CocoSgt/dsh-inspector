/**
 * dsh 原生项目文件白名单与共享类型。
 *
 * 清单里的每一个条目都是 DeepSeek Harness(dsh)自身会在项目目录里读写的
 * 文件/目录,来源为 harness 各官方包的实测行为(dsh-agent-instructions、
 * dsh-hooks-claude-code、dsh-hooks-codex、dsh-skill-filesystem、宿主启动
 * 环境加载)。dsh **没有**独立的「规则/规范」文件机制——规则类内容承载在
 * 指引文件(AGENTS.md/CLAUDE.md)里,不单列。
 *
 * 每个条目固定一个相对路径与中文用途说明;宿主端与客户端共用这份清单,
 * 白名单同时就是路径安全边界(名单内路径均为固定字面量,不含 `..` 与
 * 绝对路径,无法穿越)。
 */
/** 条目所属的功能分组(展示顺序见 GROUP_ORDER)。 */
export type ScopedFileGroup = 'instructions' | 'hooks' | 'skills' | 'env' | 'sessions';
/** 条目形态:文件可读/写/删,目录仅展示存在性与条目数。 */
export type ScopedFileKind = 'file' | 'dir';
/** 一个 dsh 原生项目文件的静态描述。 */
export interface ScopedFileSpec {
    /** 工作区根目录下的相对路径(POSIX 分隔符,白名单固定字面量)。 */
    readonly path: string;
    /** 功能分组。 */
    readonly group: ScopedFileGroup;
    /** 文件或目录。 */
    readonly kind: ScopedFileKind;
    /** 用途说明(中文,展示给用户)。 */
    readonly purpose: string;
}
/** 分组展示顺序。 */
export declare const GROUP_ORDER: readonly ScopedFileGroup[];
/** 分组的中文标题。 */
export declare const GROUP_LABELS: Readonly<Record<ScopedFileGroup, string>>;
/**
 * 受支持的 dsh 原生项目文件清单(展示顺序即清单顺序)。
 *
 * 指引:dsh-agent-instructions 自项目根(最近的 .git 祖先)逐级向 cwd 合并,
 * AGENTS.md 为首选、CLAUDE.md 为一等候选,两者内容去重;*.local.md 为
 * 不入库的本地覆盖层。Hooks:两种方言均相对启动 cwd 读取、进程级只读一次。
 */
export declare const SCOPED_FILE_SPECS: readonly ScopedFileSpec[];
/** 按相对路径建索引的白名单集合。 */
export declare const SCOPED_FILE_PATHS: ReadonlySet<string>;
/** 按相对路径取条目描述的映射。 */
export declare const SCOPED_FILE_BY_PATH: ReadonlyMap<string, ScopedFileSpec>;
/** 一个项目文件的当前状态(list 返回行)。 */
export interface ScopedFileMeta {
    /** 相对路径。 */
    readonly path: string;
    /** 功能分组。 */
    readonly group: ScopedFileGroup;
    /** 文件或目录。 */
    readonly kind: ScopedFileKind;
    /** 用途说明。 */
    readonly purpose: string;
    /** 当前是否存在。 */
    readonly exists: boolean;
    /** 文件字节数(目录恒为 0)。 */
    readonly size: number;
    /** 目录顶层条目数(仅 kind 为 'dir' 且存在时给出;文件条目省略此字段)。 */
    readonly entries?: number;
    /** 最近修改时间(ISO 8601,不存在为空字符串)。 */
    readonly mtimeIso: string;
}
/** projectFiles/list 的返回。 */
export interface ListResult {
    /** 本次检查的工作区根目录。 */
    readonly root: string;
    /** 全部候选文件的状态。 */
    readonly files: readonly ScopedFileMeta[];
}
/** projectFiles/read 的返回。 */
export interface ReadResult {
    /** 文件全文。 */
    readonly content: string;
    /** 文件字节数。 */
    readonly size: number;
    /** 最近修改时间(ISO 8601)。 */
    readonly mtimeIso: string;
}
/** projectFiles/write 的返回。 */
export interface WriteResult {
    /** 写入后的字节数。 */
    readonly size: number;
    /** 写入时间(ISO 8601)。 */
    readonly mtimeIso: string;
}
/** projectFiles/removeFile 的返回。 */
export interface RemoveResult {
    /** 是否删除了已存在的文件。 */
    readonly removed: boolean;
}
