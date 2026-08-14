# dsh-project-files(插件三·项目文件管理器)

DeepSeek Harness(dsh)的第三方插件:在 Web 界面右侧打开一个「项目文件」面板,
查看与编辑当前会话工作区里 **dsh 自身会读写的项目文件**(项目指引、Hook 配置、
`.env` 等),并直观显示每个条目**最近一次修改时间**、**用途**与**分组**。

打开位于某个项目目录中的会话后,点会话头部的「📄 项目文件」按钮即可开关面板;
面板自动跟随当前会话的工作区目录。文件条目支持查看、编辑、保存、新建、删除;
目录条目只展示存在性与条目数。

## 功能

- **右侧浮动面板**:注册在 `shell.overlay`(additive 列表槽),不占用、不替换
  dsh 自带的 Details 面板;与其它插件可独立加载,也可合并加载。
- **会话头部开关**:注册在 `conversation.session.header.utilities`,一键开关。
- **跟随工作区**:面板显示当前会话的 cwd;切换会话自动切换到新工作区。
- **分组清单视图**:按「项目指引 / Hooks / 项目技能目录 / 环境变量 / 会话记录」
  分组列出全部候选条目,显示用途、最近修改时间、字节(文件)或条目数(目录);
  未创建的文件显示「未创建」并可一键新建。
- **编辑视图**:读取全文到文本框,支持保存(新建或覆盖)与两步确认删除;
  保存后显示新的写入时间与大小。目录条目不进入编辑视图。
- **路径安全**:宿主端只接受「工作区根目录 + 白名单相对路径」二元组;相对路径
  必须命中白名单(白名单内均为固定字面量,不含 `..` 与绝对路径,天然杜绝目录
  穿越),根目录必须是已存在的绝对路径目录,最终路径再做一次 resolve 前缀校验。

## 白名单:dsh 原生项目文件

清单里只有 DeepSeek Harness 自己会在项目目录里读写的文件(来源为 harness
官方包实测行为)。dsh **没有**独立的「规则/规范」文件机制——规则类内容承载在
指引文件里,不单列。GEMINI.md、COPILOT-INSTRUCTIONS.md、.cursorrules 等
其它代理工具的文件 dsh 并不读取,因此不在清单中。

| 分组 | 路径 | 形态 | 用途 |
| --- | --- | --- | --- |
| 项目指引 | `AGENTS.md` | 文件 | dsh 首选项目指引(dsh-agent-instructions,自项目根逐级合并到 cwd) |
| 项目指引 | `CLAUDE.md` | 文件 | dsh 一等候选指引(与 AGENTS.md 内容去重后合并) |
| 项目指引 | `AGENTS.local.md` | 文件 | AGENTS.md 的本地覆盖层(通常不入库) |
| 项目指引 | `CLAUDE.local.md` | 文件 | CLAUDE.md 的本地覆盖层(通常不入库) |
| Hooks | `hooks.json` | 文件 | Claude Code 方言 Hook 配置(dsh-hooks-claude-code,相对启动 cwd、进程启动时读一次) |
| Hooks | `codex-hooks.json` | 文件 | Codex 方言 Hook 配置(dsh-hooks-codex,同上) |
| 项目技能目录 | `.dsh/skills` | 目录 | dsh 项目技能根(dsh-skill-filesystem,整棵技能树) |
| 项目技能目录 | `.agents/skills` | 目录 | 跨代理共享的项目技能根(整棵技能树) |
| 环境变量 | `.env` | 文件 | dsh 启动时加载的环境变量文件(process.loadEnvFile,可能含 API 密钥,谨慎编辑) |
| 会话记录 | `.sessions` | 目录 | dsh 会话 JSONL 持久化目录(ACP 组合默认) |

目录条目(`kind: 'dir'`)只在 list 里展示存在性与顶层条目数,read/write/
removeFile 会被宿主端拒绝——技能树与会话日志不由本面板管理。

## 架构

一个 npm 包,两个面:

- **宿主端**(`lib/index.js`,本包主入口):`ProjectFilesGateway` 继承
  `TypertRemoteService`(来自 `@deepseek-ai/dsh-typert-protocol`),以 SRC 模式
  自动被 Typert Gateway 发现,暴露 `projectFiles/list|read|write|removeFile` 四个
  RPC 端点,直接用 `node:fs` 读写白名单文件。
- **浏览器端**(`lib/client.js`,`exports["./client"]`):闭包工厂 bundle
  (`window.__ModuleLoader__.load` 形态)。启动时把手写的 strict zod 调用描述符
  `$mount` 到 `ctx.remote`,再向两个槽注册 React UI;面板通过 `ctx.sessions`
  的列表快照读取当前会话的 `cwd`。

安装产物 `lib/` 已预构建并随仓库提交,git 安装无需跑构建脚本。

## 安装

```sh
# 本地路径
dsh plugin --profile web add /path/to/dsh-project-files
# 或 GitHub(私有仓库需先 gh auth login)
dsh plugin --profile web add github:CocoSgt/dsh-project-files
```

> 注意:自建 profile 的 `~/.dsh/profiles/<name>/package.json` 里
> `dsh.profile.bundles` 必须包含 `@deepseek-ai/dsh-base` 与
> `@deepseek-ai/dsh-web-app`,否则启动会静默挂起。

## 已知限制

- 白名单固定为上表的 10 个 dsh 原生条目,暂不可配置;不包含其它代理工具
  (Gemini/Copilot/Cursor 等)的文件——dsh 不读取它们。
- 目录条目只读状态,不支持在面板里浏览/管理技能树或会话日志。
- 面板读取的目录是「当前会话的 cwd」;若会话尚未打开任何目录,面板会提示
  无 cwd,不提供手选目录。
- 删除走两步确认,但没有撤销;文件删了就是删了。
- RPC 方法名是 `removeFile` 而非 `remove`:客户端命名空间服务的原型上已占用
  `remove`,重名会在挂载时被网关拒绝。


安装后重启 `dsh web`(或对应的 web 启动命令)即可。

卸载:

```sh
dsh plugin --profile web remove dsh-project-files
```

## 使用

1. 打开一个工作区在项目目录中的会话(新建会话时选择该目录,或恢复旧会话)。
2. 点击会话头部的「📄 项目文件」按钮,右侧弹出面板,顶部显示工作区路径。
3. 点击某个文件进入编辑;改完点「保存」;「删除」需要二次确认。
4. 未创建的文件点「新建」直接进入编辑,保存即创建。

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
  index.ts         宿主端网关服务(@Remote 方法 = RPC 端点)
  scoped-files.ts  白名单与共享类型
  client/
    index.ts       浏览器插件主体($mount + slot 注册)
    descriptors.ts 手写 strict 调用描述符(zod)
    panel.tsx      右侧面板与头部开关组件
    store.ts       面板开/关状态
    styles.ts      注入式 CSS(dpf- 前缀)
    types.ts       客户端最小服务类型面
```

注意:宿主端方法的**参数名就是 RPC wire 字段名**(Gateway SRC 模式靠
`Function.prototype.toString` 读取),因此公开方法保持「简单标识符参数」形态,
构建不得压缩改写参数名(本仓库构建未开压缩)。

## 已知限制

- 面板位置是 shell.overlay 里的固定右侧浮动栏,不是可拖拽的原生分栏;
  宽度固定 `min(430px, 92vw)`。
- 宿主端信任浏览器传来的工作区根目录(本地面板自用场景);根目录必须是
  已存在的绝对路径目录,但不校验它是否出现在 dsh 的 workspace 列表里。
- 白名单相对路径最多到一层子目录(`.dsh/skills` 等);dsh 指引链里更深层
  目录的 AGENTS.md/CLAUDE.md(逐目录合并)不在面板覆盖范围内,面板只管理
  项目根目录下的条目。
- 编辑器是纯文本框,无 Markdown 预览/语法高亮。
- 面板不监听文件系统变化;切回清单视图会重新拉取,编辑期间外部改动不会
  自动同步。

## 许可

MIT
