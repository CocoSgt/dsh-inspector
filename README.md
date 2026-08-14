# dsh-project-files(插件三·项目文件管理器)

DeepSeek Harness(dsh)的第三方插件:在 Web 界面右侧打开一个「项目文件」面板,
查看与编辑当前会话工作区里的**项目作用域指引文件**(CLAUDE.md、AGENTS.md 等),
并直观显示每个文件**最近一次写入时间**和**用途**。

打开位于某个项目目录中的会话后,点会话头部的「📄 项目文件」按钮即可开关面板;
面板自动跟随当前会话的工作区目录。每个文件支持查看、编辑、保存、新建、删除。

## 功能

- **右侧浮动面板**:注册在 `shell.overlay`(additive 列表槽),不占用、不替换
  dsh 自带的 Details 面板;与其它插件可独立加载,也可合并加载。
- **会话头部开关**:注册在 `conversation.session.header.utilities`,一键开关。
- **跟随工作区**:面板显示当前会话的 cwd;切换会话自动切换到新工作区。
- **清单视图**:列出全部候选文件,显示用途、最近修改时间、字节大小;未创建的
  文件显示「未创建」并可一键新建。
- **编辑视图**:读取全文到文本框,支持保存(新建或覆盖)与两步确认删除;
  保存后显示新的写入时间与大小。
- **路径安全**:宿主端只接受「工作区根目录 + 白名单文件名」二元组;文件名
  必须命中白名单(白名单内文件名均不含路径分隔符,天然杜绝目录穿越),根目录
  必须是已存在的绝对路径目录,最终路径再做一次 resolve 前缀校验。

## 支持的作用域文件

| 文件名 | 用途 |
| --- | --- |
| `AGENTS.md` | 代理工具通用项目指引(dsh 等会读取) |
| `CLAUDE.md` | Claude Code 项目指引 |
| `GEMINI.md` | Gemini CLI 项目指引 |
| `COPILOT-INSTRUCTIONS.md` | GitHub Copilot 指引 |
| `.cursorrules` | Cursor 编辑器规则文件 |

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

- 白名单固定为 5 个指引文件名(AGENTS.md、CLAUDE.md、GEMINI.md、
  COPILOT-INSTRUCTIONS.md、.cursorrules),暂不可配置。
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
- 不支持子目录里的作用域文件(如 `.claude/CLAUDE.md`);白名单只含根目录
  平铺文件。
- 编辑器是纯文本框,无 Markdown 预览/语法高亮。
- 面板不监听文件系统变化;切回清单视图会重新拉取,编辑期间外部改动不会
  自动同步。

## 许可

MIT
