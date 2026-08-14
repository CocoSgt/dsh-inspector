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
export const BASE_CANDIDATES = ['AGENTS.md', 'CLAUDE.md'];
/** 每一级目录探测的本地覆盖层候选(基础候选之后载入,惯例不入库)。 */
export const LOCAL_CANDIDATES = ['AGENTS.local.md', 'CLAUDE.local.md'];
/** 全部指引候选文件名(写入白名单)。 */
export const ALL_CANDIDATES = [...BASE_CANDIDATES, ...LOCAL_CANDIDATES];
/** harness 单文件源大小上限(dsh-agent-instructions 默认 maxSourceBytes);超过即被忽略。 */
export const MAX_SOURCE_BYTES = 1_048_576;
