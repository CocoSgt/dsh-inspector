/**
 * 作用域指引文件白名单与共享类型。
 * 每个条目固定一个文件名与中文用途说明;宿主端与客户端共用这份清单,
 * 白名单同时就是路径安全边界(名单内文件名不含路径分隔符,无法穿越)。
 */
/** 受支持的作用域指引文件清单(展示顺序即清单顺序)。 */
export const SCOPED_FILE_SPECS = [
    { name: 'AGENTS.md', purpose: '代理工具通用项目指引(dsh 等会读取)' },
    { name: 'CLAUDE.md', purpose: 'Claude Code 项目指引' },
    { name: 'GEMINI.md', purpose: 'Gemini CLI 项目指引' },
    { name: 'COPILOT-INSTRUCTIONS.md', purpose: 'GitHub Copilot 指引' },
    { name: '.cursorrules', purpose: 'Cursor 编辑器规则文件' },
];
/** 按文件名建索引的白名单集合。 */
export const SCOPED_FILE_NAMES = new Set(SCOPED_FILE_SPECS.map(spec => spec.name));
