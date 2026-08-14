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
/** 分组展示顺序。 */
export const GROUP_ORDER = ['instructions', 'hooks', 'skills', 'env', 'sessions'];
/** 分组的中文标题。 */
export const GROUP_LABELS = {
    instructions: '项目指引',
    hooks: 'Hooks',
    skills: '项目技能目录',
    env: '环境变量',
    sessions: '会话记录',
};
/**
 * 受支持的 dsh 原生项目文件清单(展示顺序即清单顺序)。
 *
 * 指引:dsh-agent-instructions 自项目根(最近的 .git 祖先)逐级向 cwd 合并,
 * AGENTS.md 为首选、CLAUDE.md 为一等候选,两者内容去重;*.local.md 为
 * 不入库的本地覆盖层。Hooks:两种方言均相对启动 cwd 读取、进程级只读一次。
 */
export const SCOPED_FILE_SPECS = [
    { path: 'AGENTS.md', group: 'instructions', kind: 'file', purpose: 'dsh 首选项目指引(自项目根逐级合并到 cwd)' },
    { path: 'CLAUDE.md', group: 'instructions', kind: 'file', purpose: 'dsh 一等候选指引(与 AGENTS.md 内容去重后合并)' },
    { path: 'AGENTS.local.md', group: 'instructions', kind: 'file', purpose: 'AGENTS.md 的本地覆盖层(通常不入库)' },
    { path: 'CLAUDE.local.md', group: 'instructions', kind: 'file', purpose: 'CLAUDE.md 的本地覆盖层(通常不入库)' },
    { path: 'hooks.json', group: 'hooks', kind: 'file', purpose: 'Claude Code 方言 Hook 配置(dsh-hooks-claude-code,启动时读一次)' },
    { path: 'codex-hooks.json', group: 'hooks', kind: 'file', purpose: 'Codex 方言 Hook 配置(dsh-hooks-codex,启动时读一次)' },
    { path: '.dsh/skills', group: 'skills', kind: 'dir', purpose: 'dsh 项目技能根(整棵技能树,由技能系统扫描)' },
    { path: '.agents/skills', group: 'skills', kind: 'dir', purpose: '跨代理共享的项目技能根(整棵技能树)' },
    { path: '.env', group: 'env', kind: 'file', purpose: 'dsh 启动时加载的环境变量文件(可能含 API 密钥,谨慎编辑)' },
    { path: '.sessions', group: 'sessions', kind: 'dir', purpose: 'dsh 会话 JSONL 持久化目录' },
];
/** 按相对路径建索引的白名单集合。 */
export const SCOPED_FILE_PATHS = new Set(SCOPED_FILE_SPECS.map(spec => spec.path));
/** 按相对路径取条目描述的映射。 */
export const SCOPED_FILE_BY_PATH = new Map(SCOPED_FILE_SPECS.map(spec => [spec.path, spec]));
