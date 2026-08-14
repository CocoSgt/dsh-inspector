/**
 * dsh-context-inspector 客户端词典(zh 为键集真源,en 与之对齐)。
 *
 * 键域覆盖三块:
 * 1. 面板/开关/编辑器的 UI 文案(slot 注册声明 locale: NS,组件从 t 标准位读取);
 * 2. 新建文件的种子模板(template.*):模板是落盘到工作区的文件内容,跟随
 *    UI 语言 —— 仅在新建(文件尚不存在)时经 t 读取当前语言,已存在文件的
 *    编辑不会被重新模板化;
 * 3. 宿主端(src/index.ts)失败状态的稳定点分 code:失败以数据过 wire
 *    (FailureStatus),客户端按 code 查本词典;缺键时退回宿主的中文兜底。
 */

/** 词典命名空间(注册进宿主 locale 服务的键)。 */
export const NS = 'dsh-context-inspector'

/** 简体中文词典(键集真源)。 */
export const zh = {
  // 面板外壳
  'panel.title': '约束文件',
  'panel.close': '关闭约束文件面板',
  'panel.loading': '加载中…',
  'panel.err.load': '加载失败',
  'panel.noSession.title': '当前没有打开的会话工作区。',
  'panel.noSession.body': '打开一个位于项目目录中的会话后,这里会显示该会话实际生效的指引链与技能。',
  'panel.caption': '按载入顺序排列;越靠下越具体,对模型的优先级越高。',
  'panel.footnote.root': '子目录里的指引文件不会预载:模型读写某个子目录中的文件时,该目录的指引才会按需注入。',
  'panel.footnote.cwd': '当前工作目录之下的子目录指引不会预载:模型读写该子目录中的文件时才会按需注入。',
  'panel.skills.title': '技能目录',
  'panel.skills.caption': '技能由 dsh 自动扫描并实时监听,放进目录即生效;此处只展示状态。',

  // 会话头部开关
  'toggle.label': '约束文件',
  'toggle.title': '查看/编辑当前会话实际载入的指引链({names} 及本地覆盖层)与技能目录状态',

  // 指引链层级
  'layer.global': '全局 · 所有会话',
  'layer.projectRoot': '项目根',
  'layer.cwd': '当前工作目录',
  'layer.new': '＋ 新建',
  'layer.collapse': '收起',
  'layer.empty': '此层暂无指引文件',

  // 文件行徽标
  'chip.local': '本地 · 不入库',
  'chip.duplicate': '与 {name} 相同 · 折叠为一份',
  'chip.oversized': '超 1MB · 不会载入',

  // 新建候选的一句话说明
  'candidate.AGENTS.md': '推荐 · dsh 首选指引',
  'candidate.CLAUDE.md': '兼容 Claude Code 项目',
  'candidate.local': '本地覆盖 · 建议 gitignore',

  // 新建文件的种子模板(落盘内容,跟随 UI 语言;仅新建时读取)
  'template.AGENTS.md': '# 项目指引\n\n## 约定\n\n- \n',
  'template.CLAUDE.md': '# 项目指引\n\n## 约定\n\n- \n',
  'template.AGENTS.local.md': '<!-- 本地覆盖层:只对这台机器生效,建议加入 .gitignore -->\n\n- \n',
  'template.CLAUDE.local.md': '<!-- 本地覆盖层:只对这台机器生效,建议加入 .gitignore -->\n\n- \n',

  // 编辑器
  'editor.back': '← 返回',
  'editor.dirty': '有未保存的修改',
  'editor.loading': '读取中…',
  'editor.creating': '新建:保存后才会创建这个文件',
  'editor.lastWrite': '最近写入:{time} · {size}',
  'editor.save': '保存',
  'editor.saveNew': '保存并创建',
  'editor.delete': '删除',
  'editor.confirmDelete': '确认删除',
  'editor.cancel': '取消',

  // 脏态守卫
  'guard.unsaved': '有未保存的修改。',
  'guard.saveBack': '保存并返回',
  'guard.discard': '放弃修改',
  'guard.keepEditing': '继续编辑',

  // 保存后的状态提示
  'status.saved': '已保存 · 更新会在会话的下一步注入',
  'status.savedSkill': '已保存(经引用链接写入的会直达来源文件)',

  // 错误前缀
  'err.read': '读取失败',
  'err.write': '保存失败',
  'err.delete': '删除失败',

  // 技能根目录行
  'skill.level.project': '项目级',
  'skill.level.user': '用户级 · 所有项目',
  'skill.count': '{count} 个技能',
  'skill.notCreated': '未创建',
  'skill.open': '查看/编辑 {path}',

  // 宿主端失败状态 code(src/index.ts 的用户可见失败,中文兜底文案在宿主)
  'cwd.err.type': 'cwd 必须是非空字符串',
  'cwd.err.relative': 'cwd 必须是绝对路径,收到 {received}',
  'cwd.err.inaccessible': '工作区目录不可访问: {cwd}',
  'cwd.err.notDir': 'cwd 不是目录: {cwd}',
  'address.err.name': '不支持的指引文件名: {name}',
  'address.err.globalName': '全局层只有 AGENTS.md',
  'address.err.scope': '不支持的层: {scope}',
  'address.err.dir': 'dir 必须是字符串',
  'address.err.offChain': '目录不在当前会话的指引链上: {dir}',
  'address.err.escape': '解析后的路径越出了项目根',
  'skillRoot.err.unsupported': '不支持的技能根: {root}',
  'skillFile.err.path': '不支持的技能文件路径: {path}',
  'skillFile.err.escape': '解析后的路径越出了技能根',
  'read.err.missing': '文件不存在: {name}',
  'write.err.content': 'content 必须是字符串',
  'write.err.stat': '写入后无法读取状态: {name}',
  'readSkill.err.missing': '技能文件不存在: {path}',
  'writeSkill.err.stat': '写入后无法读取状态: {path}',
} satisfies Record<string, string>

/** 本命名空间的键联合。 */
export type Key = keyof typeof zh

/** 英文词典,键集与 zh 对齐(双语平衡由类型保证)。 */
export const en = {
  // Panel shell
  'panel.title': 'Instruction Files',
  'panel.close': 'Close the instruction-files panel',
  'panel.loading': 'Loading…',
  'panel.err.load': 'Load failed',
  'panel.noSession.title': 'No session workspace is open.',
  'panel.noSession.body': 'Open a session whose workspace is a project directory, and the instruction chain and skills actually in effect for it will appear here.',
  'panel.caption': 'Ordered by load sequence; lower entries are more specific and take priority with the model.',
  'panel.footnote.root': 'Instruction files in subdirectories are not preloaded: a subdirectory\'s instructions are injected on demand, when the model reads or writes a file inside it.',
  'panel.footnote.cwd': 'Instruction files in subdirectories below the current working directory are not preloaded: they are injected on demand, when the model reads or writes a file there.',
  'panel.skills.title': 'Skill directories',
  'panel.skills.caption': 'Skills are scanned and watched live by dsh; dropping them into the directory takes effect immediately. Only status is shown here.',

  // Session-header toggle
  'toggle.label': 'Instruction Files',
  'toggle.title': 'View/edit the instruction chain actually loaded for this session ({names} and local overlays) and skill directory status',

  // Instruction chain layers
  'layer.global': 'Global · all sessions',
  'layer.projectRoot': 'Project root',
  'layer.cwd': 'Current working directory',
  'layer.new': '+ New',
  'layer.collapse': 'Collapse',
  'layer.empty': 'No instruction files in this layer',

  // File row chips
  'chip.local': 'Local · not committed',
  'chip.duplicate': 'Same as {name} · collapsed to one',
  'chip.oversized': 'Over 1 MB · not loaded',

  // New-file candidate notes
  'candidate.AGENTS.md': 'Recommended · dsh\'s first-choice instructions',
  'candidate.CLAUDE.md': 'Claude Code compatible projects',
  'candidate.local': 'Local overlay · gitignore recommended',

  // New-file seed templates (file content on disk, follows UI language; read at creation time only)
  'template.AGENTS.md': '# Project Instructions\n\n## Conventions\n\n- \n',
  'template.CLAUDE.md': '# Project Instructions\n\n## Conventions\n\n- \n',
  'template.AGENTS.local.md': '<!-- Local overlay: effective on this machine only; consider adding it to .gitignore -->\n\n- \n',
  'template.CLAUDE.local.md': '<!-- Local overlay: effective on this machine only; consider adding it to .gitignore -->\n\n- \n',

  // Editor
  'editor.back': '← Back',
  'editor.dirty': 'Unsaved changes',
  'editor.loading': 'Loading…',
  'editor.creating': 'New file: it is created only when you save',
  'editor.lastWrite': 'Last write: {time} · {size}',
  'editor.save': 'Save',
  'editor.saveNew': 'Save & create',
  'editor.delete': 'Delete',
  'editor.confirmDelete': 'Confirm delete',
  'editor.cancel': 'Cancel',

  // Dirty guard
  'guard.unsaved': 'There are unsaved changes.',
  'guard.saveBack': 'Save and go back',
  'guard.discard': 'Discard changes',
  'guard.keepEditing': 'Keep editing',

  // Post-save status
  'status.saved': 'Saved · updates are injected at the session\'s next step',
  'status.savedSkill': 'Saved (writes through referenced links reach the source file)',

  // Error prefixes
  'err.read': 'Read failed',
  'err.write': 'Save failed',
  'err.delete': 'Delete failed',

  // Skill root rows
  'skill.level.project': 'Project-level',
  'skill.level.user': 'User-level · all projects',
  'skill.count': '{count} skills',
  'skill.notCreated': 'Not created',
  'skill.open': 'View/edit {path}',

  // Host-side failure codes (src/index.ts; Chinese fallback text lives on the host)
  'cwd.err.type': 'cwd must be a non-empty string',
  'cwd.err.relative': 'cwd must be an absolute path, received {received}',
  'cwd.err.inaccessible': 'Workspace directory is not accessible: {cwd}',
  'cwd.err.notDir': 'cwd is not a directory: {cwd}',
  'address.err.name': 'Unsupported instruction file name: {name}',
  'address.err.globalName': 'The global layer only has AGENTS.md',
  'address.err.scope': 'Unsupported scope: {scope}',
  'address.err.dir': 'dir must be a string',
  'address.err.offChain': 'Directory is not on the current session\'s instruction chain: {dir}',
  'address.err.escape': 'Resolved path escapes the project root',
  'skillRoot.err.unsupported': 'Unsupported skill root: {root}',
  'skillFile.err.path': 'Unsupported skill file path: {path}',
  'skillFile.err.escape': 'Resolved path escapes the skill root',
  'read.err.missing': 'File does not exist: {name}',
  'write.err.content': 'content must be a string',
  'write.err.stat': 'Cannot read status after writing: {name}',
  'readSkill.err.missing': 'Skill file does not exist: {path}',
  'writeSkill.err.stat': 'Cannot read status after writing: {path}',
} satisfies Record<Key, string>
