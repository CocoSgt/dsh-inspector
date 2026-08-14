# dsh-context-inspector(约束文件面板)

简体中文 | [English](README.md)

DeepSeek Harness(dsh)的第三方插件:在 Web 界面右侧打开一个「约束文件」面板,
按 harness **真实的载入顺序**展示并管理当前会话的指引链——全局
`$DSH_HOME/AGENTS.md` → 项目根 → … → 会话 cwd 的每一级目录——外加四个技能根
目录的状态。面板的信息架构完全复刻官方 `dsh-agent-instructions` 的发现算法,
所见即模型所得。

打开位于某个项目目录中的会话后,点会话头部的「约束文件」按钮即可开关面板;
面板自动跟随当前会话的工作区目录。界面提供中英双词典,跟随宿主语言设置。

## 指引链模型(与 harness 一字不差)

面板展示的层级、去重与状态标注都对齐 `packages/context/agent-instructions`
的真实行为:

1. **全局层**:`$DSH_HOME/AGENTS.md`(默认 `~/.dsh/AGENTS.md`)。只认
   AGENTS.md,对所有会话生效,永远最先载入。
2. **项目链**:从会话 cwd 向上找最近含 `.git` 的目录作为项目根(找不到则
   cwd 即根);**项目根 → cwd 的每一级目录**都探测 4 个候选:`AGENTS.md`、
   `CLAUDE.md`(基础)与 `AGENTS.local.md`、`CLAUDE.local.md`(本地覆盖层,
   惯例不入库)。存在的全部载入;同目录内去掉首尾空白后内容相同的只保留最
   先的候选(面板标注「与 X 相同 · 折叠为一份」)。
3. **顺序即优先级**:从全局到 cwd 由宽到专,模型被告知「更具体的指引优先」;
   面板按此顺序排列并注明。字节预算超限时 harness 先省略最宽的;单文件超过
   1MB 直接被忽略(面板标注「超 1MB · 不会载入」)。
4. **子目录按需注入**:cwd 之下的子目录指引不预载,模型读写该子目录中的文件
   时才作为「附加指引」注入——面板脚注对此有说明,不把不预载的文件混进链里。

**为什么没有 hooks.json / .env / .sessions 了**:hooks 桥默认不挂载且
`configPath` 必填无默认文件名(它是部署配置,不是项目文件);`.env` 与
`.sessions` 相对 **dsh 启动目录**、进程级生效,与会话工作区无关。把它们摆在
「项目文件」清单里会诱导用户创建根本不会被读取的文件,因此从面板中移除。
GEMINI.md、.cursorrules 等其它代理工具的文件 dsh 不读取,同样不在面板中。

## 功能

- **指引链视图**:每层一张卡片,标注层级身份(全局·所有会话 / 项目根 /
  当前工作目录),列出已存在的候选文件与状态徽标(本地不入库 / 重复折叠 /
  超限忽略),显示最近写入时间与大小。
- **就地新建**:每层卡片右上「＋ 新建」展开缺失候选(AGENTS.md 标注推荐,
  local 候选标注建议 gitignore),按当前界面语言预填模板,保存才落盘。模板
  只预填尚不存在的文件;已存在文件的编辑不会被重新模板化。
- **编辑器脏态守卫**:未保存返回时弹出「保存并返回 / 放弃修改 / 继续编辑」,
  不静默丢弃;标题栏显示未保存圆点;支持 Cmd/Ctrl+S 保存;保存后提示
  「更新会在会话的下一步注入」(harness 会在下一步对账并注入变更)。
- **技能目录状态**:项目根 `.dsh/skills`、`.agents/skills` 与用户级
  `~/.dsh/skills`、`~/.agents/skills` 四个技能根,展示存在性与技能数
  (SKILL.md 计数,限深限量扫描);技能的 SKILL.md / 平铺 .md 可就地查看与
  编辑,经符号链接写入的会写穿到来源文件(设计如此)。
- **右侧浮动面板**:注册在 `shell.overlay`(additive 列表槽);会话头部开关
  注册在 `conversation.session.header.utilities`;切换会话自动跟随新工作区。
- **路径安全**:读写地址是「cwd + scope + dir + name」四元组。`name` 必须命中
  4 个候选文件名;`dir` 必须命中按 cwd **现算**出的项目链目录集合(global 层
  只接受 AGENTS.md);技能文件访问限定在两个项目技能根与两个用户技能根内的
  `.md`;最终路径 resolve 后再做前缀校验。
- **中英双语(zh/en)**:词典注册进宿主 locale 服务,面板与开关读取标准响应式
  `t` 座位,语言切换即重渲染。宿主端用户可见失败以稳定点分 code
  (`read.err.missing`、`address.err.offChain` 等)+ 中文兜底文案过 wire,
  客户端按 code 本地化。

## 架构

一个 npm 包,两个面:

- **宿主端**(`lib/index.js`,本包主入口):`ProjectFilesGateway` 继承
  `TypertRemoteService`(来自 `@deepseek-ai/dsh-typert-protocol`),暴露
  `projectFiles/overview|readFile|readSkillFile|writeSkillFile|writeFile|removeFile`
  六个 RPC 端点,直接用 `node:fs` 探测/读写指引链。层级发现(`.git` 标记上溯、
  候选顺序、trimmed 内容去重、1MB 上限)与 harness 保持一致。第三方双副本场景
  下 SRC 发现失明,因此同时把弱(src-json)清单注册进宿主 typert registry。
  用户可见失败以数据返回(见上),不抛错。
- **浏览器端**(`lib/client.js`,`exports["./client"]`):闭包工厂 bundle。
  启动时把手写的 strict zod 调用描述符 `$mount` 到 `ctx.remote`,把 zh/en
  词典注册进 `ctx.locale`,再向两个槽注册 React UI(注册声明 `locale:`,
  组件由此获得 `t` 座位);面板通过 `ctx.sessions` 的列表快照读取当前会话的
  `cwd`。

安装产物 `lib/` 已预构建并随仓库提交,git 安装无需跑构建脚本。

## 安装

```sh
# 从 npm
dsh plugin --profile web add dsh-context-inspector
# 或 GitHub
dsh plugin --profile web add github:CocoSgt/dsh-context-inspector
```

> 注意:自建 profile 的 `~/.dsh/profiles/<name>/package.json` 里
> `dsh.profile.bundles` 必须包含 `@deepseek-ai/dsh-base` 与
> `@deepseek-ai/dsh-web-app`,否则启动会静默挂起。

安装后重启 `dsh web`(或对应的 web 启动命令)即可。

卸载:

```sh
dsh plugin --profile web remove dsh-context-inspector
```

## 使用

1. 打开一个工作区在项目目录中的会话(新建会话时选择该目录,或恢复旧会话)。
2. 点击会话头部的「约束文件」按钮,右侧弹出面板,顶部显示工作区路径。
3. 面板按载入顺序展示指引链;点某个文件进入编辑,「＋ 新建」就地创建缺失
   候选;删除需二次确认,未保存返回有脏态守卫。

没有当前会话(或会话没有工作区目录)时,面板会提示打开一个项目会话。

## 开发

```sh
pnpm install
pnpm run typecheck   # tsc --noEmit
pnpm run build       # tsc(宿主端,降级装饰器)+ tsdown(浏览器 bundle)
```

源码结构:

```
src/
  index.ts         宿主端网关服务(@Remote 方法 = RPC 端点 + 弱清单注册 +
                   失败 code 协议)
  scoped-files.ts  指引链模型与共享类型(候选清单/层级/概览结构/FailureStatus)
  client/
    index.ts       浏览器插件主体($mount + 词典注册 + slot 注册)
    locales.ts     zh/en 词典(zh 为键集真源;UI 文案、新建模板与宿主失败 code)
    descriptors.ts 手写 strict 调用描述符(zod)
    panel.tsx      指引链面板、编辑器与头部开关组件
    store.ts       面板开/关与编辑目标状态
    styles.ts      注入式 CSS(dpf- 前缀,--dsw-alias-* 设计令牌)
    types.ts       客户端最小服务类型面(含 locale)
```

注意:宿主端方法的**参数名就是 RPC wire 字段名**(Gateway SRC 模式靠
`Function.prototype.toString` 读取),因此公开方法保持「简单标识符参数」形态,
构建不得压缩改写参数名(本仓库构建未开压缩)。RPC 方法名是 `removeFile` 而非
`remove`:客户端命名空间服务的原型上已占用 `remove`,重名会在挂载时被网关拒绝。

## 已知限制

- 面板位置是 shell.overlay 里的固定右侧浮动栏,不是可拖拽的原生分栏;宽度
  固定 `min(440px, 92vw)`。
- 宿主端信任浏览器传来的会话 cwd(本地面板自用场景);cwd 必须是已存在的
  绝对路径目录,但不校验它是否出现在 dsh 的 workspace 列表里。
- 「生效中」以存在性 + harness 规则(去重/超限)推断,不读取会话事件流;
  会话实际的字节预算截断(64KB 基线预算)不在面板中反映。
- cwd 之下子目录的按需注入状态(哪些已被触碰注入)不展示,只有脚注说明。
- 编辑器是纯文本框,无 Markdown 预览/语法高亮。
- 面板不监听文件系统变化;从编辑视图返回会重新拉取,编辑期间外部改动不会
  自动同步。

## 许可

MIT
