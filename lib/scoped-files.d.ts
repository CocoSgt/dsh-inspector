/**
 * dsh 指引文件层级模型与共享类型。
 *
 * 模型完全对齐 harness 官方 dsh-agent-instructions 插件的真实加载逻辑
 * (packages/context/agent-instructions):
 *
 * 1. 全局层:`$DSH_HOME/AGENTS.md`(默认 ~/.dsh/AGENTS.md)。只认 AGENTS.md,
 *    对所有会话生效,永远最先载入。
 * 2. 项目链:从会话 cwd 向上找最近含 `.git` 的目录作为项目根(找不到则
 *    cwd 即根),然后**项目根 → cwd 的每一级目录**都探测 4 个候选文件:
 *    AGENTS.md、CLAUDE.md(基础),AGENTS.local.md、CLAUDE.local.md(本地
 *    覆盖层,惯例不入库)。存在的全部载入;同目录内去掉首尾空白后内容相同
 *    的只保留最先的候选(CLAUDE.md 内容与 AGENTS.md 相同时折叠为一份)。
 * 3. 顺序即优先级:从全局到 cwd 由宽到专,模型被告知「更具体的指引优先」。
 *    字节预算(默认 64KB)超限时先整体省略最宽的,最专的最后才截断;单文件
 *    超过 1MB 直接被 harness 忽略。
 * 4. cwd 之下的子目录指引**不预载**:模型读写该子目录中的文件时才作为
 *    「附加指引」按需注入,内容变化/删除也会在会话中期动态对账。
 *
 * hooks.json / codex-hooks.json(桥默认不挂载、配置路径必填无默认文件名)、
 * .env(启动目录进程级读一次)、.sessions(ACP 内部持久化)都不是「项目级、
 * 会话可见」的文件,不在本面板管理范围内。
 *
 * 技能目录是另一类默认生效的项目级扩展:项目根 `.dsh/skills`、
 * `.agents/skills` 与用户级 `~/.dsh/skills`、`~/.agents/skills`
 * (dsh-skill-filesystem 扫描并实时监听),面板只展示状态不做内容编辑。
 */
/** 每一级目录探测的基础指引候选(顺序即 harness 的候选优先序)。 */
export declare const BASE_CANDIDATES: readonly ["AGENTS.md", "CLAUDE.md"];
/** 每一级目录探测的本地覆盖层候选(基础候选之后载入,惯例不入库)。 */
export declare const LOCAL_CANDIDATES: readonly ["AGENTS.local.md", "CLAUDE.local.md"];
/** 全部指引候选文件名(写入白名单)。 */
export declare const ALL_CANDIDATES: readonly string[];
/** harness 单文件源大小上限(dsh-agent-instructions 默认 maxSourceBytes);超过即被忽略。 */
export declare const MAX_SOURCE_BYTES = 1048576;
/** 指引文件的归属层。 */
export type InstructionScope = 'global' | 'project';
/**
 * 用户可见失败的业务状态:宿主端不以抛错表达这类失败(抛错在 RPC 封套侧
 * 会塌缩成 internal + 裸中文 message),而是把稳定点分 code、中文兜底文案
 * 与可选插值参数作为数据随结果返回,经 src-json wire 过网。可选字段只在
 * 实际存在时展开(条件展开;src-json codec 拒绝 undefined)。客户端按 code
 * 查词典本地化,词典缺键时显示 text 兜底。
 */
export interface FailureStatus {
    /** 判别标记:恒为 false。 */
    readonly ok: false;
    /** 稳定点分 code(客户端词典键,如 'read.err.missing')。 */
    readonly code: string;
    /** 中文兜底文案(客户端词典缺该 code 时显示)。 */
    readonly text: string;
    /** code 文案的插值参数(仅存在时出现)。 */
    readonly params?: Readonly<Record<string, string>>;
    /** 展示级别;错误路径恒为 'error'。 */
    readonly level: 'error';
}
/** 任一 RPC 方法的返回:成功数据或失败状态。 */
export type RpcOutcome<T> = T | FailureStatus;
/** 一个指引文件的地址:层 + 项目根相对目录('' 为根;global 层恒 '')+ 文件名。 */
export interface FileAddress {
    readonly scope: InstructionScope;
    readonly dir: string;
    readonly name: string;
}
/** 一个指引候选文件的当前状态。 */
export interface InstructionFileMeta {
    /** 候选文件名(ALL_CANDIDATES 之一)。 */
    readonly name: string;
    /** 是否存在。 */
    readonly exists: boolean;
    /** 字节数(不存在为 0)。 */
    readonly size: number;
    /** 最近修改时间(ISO 8601,不存在为空字符串)。 */
    readonly mtimeIso: string;
    /** 本地覆盖层(*.local.md,惯例不入库)。 */
    readonly local: boolean;
    /** 同目录内容与更早候选相同,被 harness 折叠;值为被保留的那个文件名。 */
    readonly duplicateOf?: string;
    /** 超过 harness 单文件上限(MAX_SOURCE_BYTES),会被忽略。 */
    readonly oversized?: boolean;
}
/** 指引链上的一层(一个目录)。 */
export interface InstructionLayer {
    /** 归属层。 */
    readonly scope: InstructionScope;
    /** 项目根相对目录('' 为项目根;global 层恒 '')。 */
    readonly dir: string;
    /** 展示用目录路径(global 为 ~/.dsh 形式,project 为根相对路径或根目录名)。 */
    readonly displayDir: string;
    /** 此层是否即会话当前工作目录。 */
    readonly isCwd: boolean;
    /** 全部候选文件状态(存在与否都在,顺序即候选优先序)。 */
    readonly files: readonly InstructionFileMeta[];
}
/** 一个技能根目录的状态。 */
export interface SkillRootMeta {
    /** 展示路径(项目内为根相对路径,用户级为 ~ 形式)。 */
    readonly displayPath: string;
    /** 项目级或用户级。 */
    readonly level: 'project' | 'user';
    /** 是否存在。 */
    readonly exists: boolean;
    /** 目录树内 SKILL.md 的数量(存在时给出)。 */
    readonly skillCount?: number;
    /** 技能清单(存在时给出;frontmatter name + 根相对 SKILL.md 路径,限量)。 */
    readonly skills?: readonly SkillEntry[];
}
/** 技能根目录里的一个技能(可预览/编辑的最小地址)。 */
export interface SkillEntry {
    /** 技能名(frontmatter name,回退目录/文件名)。 */
    readonly name: string;
    /** SKILL.md(或平铺 .md)相对该技能根的路径。 */
    readonly path: string;
}
/** projectFiles/overview 的返回:当前会话的完整指引链与技能根状态。 */
export interface OverviewResult {
    /** 会话工作区目录(解析后的绝对路径)。 */
    readonly cwd: string;
    /** 项目根(最近含 .git 的祖先,或 cwd 本身)。 */
    readonly projectRoot: string;
    /** cwd 相对项目根的路径('' 表示两者相同)。 */
    readonly cwdRel: string;
    /** 指引链,按 harness 真实载入顺序:全局 → 项目根 → … → cwd。 */
    readonly layers: readonly InstructionLayer[];
    /** 技能根目录状态(项目级两个 + 用户级两个)。 */
    readonly skills: readonly SkillRootMeta[];
}
/** projectFiles/readFile 的返回。 */
export interface ReadResult {
    /** 文件全文。 */
    readonly content: string;
    /** 文件字节数。 */
    readonly size: number;
    /** 最近修改时间(ISO 8601)。 */
    readonly mtimeIso: string;
}
/** projectFiles/writeFile 的返回。 */
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
