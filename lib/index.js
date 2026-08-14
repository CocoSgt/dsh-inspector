/**
 * dsh-context-inspector 宿主端:projectFiles 网关服务。
 *
 * 继承 TypertRemoteService 后,Typert Gateway 以 SRC 模式自动发现本服务;
 * 第三方双副本场景下 SRC 发现失明,因此同时把弱(src-json)清单注册进宿主
 * typert registry(见 TYPERT_MANIFEST 注释)。
 *
 * 语义:面板不再是「工作区根下白名单文件」的平铺列表,而是复刻 harness
 * dsh-agent-instructions 的真实指引链——全局 $DSH_HOME/AGENTS.md、项目根
 * (最近含 .git 的祖先)到会话 cwd 的每一级目录、每级 4 个候选文件——
 * 外加 dsh-skill-filesystem 的四个技能根目录状态。层级发现算法与 harness
 * 保持一字不差:.git 标记上溯、候选顺序、同目录 trimmed 内容去重、
 * 1MB 单文件上限。
 *
 * 路径安全:读写地址是「cwd + scope + dir + name」四元组。name 必须命中
 * 候选白名单;dir 必须命中按 cwd 现算出的项目链目录集合(global 层恒 '');
 * 最终路径 resolve 后再做前缀校验。目录(技能根)只在 overview 里展示状态,
 * 不接受内容读写。
 *
 * 重要:Gateway 通过 Function.prototype.toString 读取方法参数名作为
 * wire 字段名,因此本文件的公开方法必须保持「简单标识符参数」形态
 * (不解构、无默认值、无剩余参数),且构建产物不得压缩改写参数名。
 */
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
import { readFileSync, readdirSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import { ALL_CANDIDATES, LOCAL_CANDIDATES, MAX_SOURCE_BYTES, } from './scoped-files.js';
export { ALL_CANDIDATES, BASE_CANDIDATES, LOCAL_CANDIDATES, MAX_SOURCE_BYTES } from './scoped-files.js';
/** 项目根标记(与 harness dsh-agent-instructions 默认 projectRootMarkers 一致)。 */
const PROJECT_ROOT_MARKERS = ['.git'];
/** 技能根目录数扫描的树深度与访问条目上限(防大目录拖慢 overview)。 */
const SKILL_SCAN_MAX_DEPTH = 4;
const SKILL_SCAN_MAX_ENTRIES = 2000;
/** 解析 dsh home($DSH_HOME 或 ~/.dsh,与 harness dsh-home-paths 一致)。 */
function dshHome() {
    const fromEnv = process.env.DSH_HOME;
    if (fromEnv !== undefined && fromEnv.length > 0)
        return resolve(fromEnv);
    return join(homedir(), '.dsh');
}
/** 把绝对路径的 home 前缀替换为 ~(仅展示用)。 */
function tildeDisplay(path) {
    const home = homedir();
    if (path === home)
        return '~';
    if (path.startsWith(home + sep))
        return `~${path.slice(home.length)}`;
    return path;
}
/** 校验并解析工作区目录:必须是存在的绝对路径目录。 */
function checkCwd(cwd) {
    if (typeof cwd !== 'string' || cwd.length === 0 || cwd.includes('\0')) {
        throw new Error('projectFiles: cwd 必须是非空字符串');
    }
    if (!isAbsolute(cwd)) {
        throw new Error(`projectFiles: cwd 必须是绝对路径,收到 ${JSON.stringify(cwd)}`);
    }
    let stats;
    try {
        stats = statSync(cwd);
    }
    catch {
        throw new Error(`projectFiles: 工作区目录不可访问: ${cwd}`);
    }
    if (!stats.isDirectory())
        throw new Error(`projectFiles: cwd 不是目录: ${cwd}`);
    return resolve(cwd);
}
/** 目录里是否存在项目根标记(文件或目录都算,与 harness existsAsMarker 一致)。 */
function hasMarker(dir) {
    for (const marker of PROJECT_ROOT_MARKERS) {
        try {
            statSync(join(dir, marker));
            return true;
        }
        catch { /* 标记缺失或不可读:视为不存在,继续上溯。 */ }
    }
    return false;
}
/** 自 cwd 向上找最近含标记的目录;到文件系统根仍没有则返回 cwd 本身。 */
function findProjectRoot(cwd) {
    let current = cwd;
    for (;;) {
        if (hasMarker(current))
            return current;
        const parent = dirname(current);
        if (parent === current)
            return cwd;
        current = parent;
    }
}
/** 项目根 → cwd 的目录链(根相对路径,'' 为根;由宽到专)。 */
function chainDirs(projectRoot, cwd) {
    const dirs = [];
    let current = cwd;
    while (current !== projectRoot) {
        dirs.push(relative(projectRoot, current));
        const parent = dirname(current);
        if (parent === current)
            break;
        current = parent;
    }
    dirs.push('');
    return dirs.reverse();
}
/** 文件统计,不存在返回 undefined。 */
function statOf(target) {
    try {
        const stats = statSync(target);
        if (!stats.isFile())
            return undefined;
        return { size: stats.size, mtimeIso: stats.mtime.toISOString() };
    }
    catch {
        return undefined;
    }
}
/**
 * 探测一个目录的全部指引候选,并按 harness 的规则标注去重与超限。
 * @param dir - 探测的绝对目录。
 * @returns 4 个候选的状态(候选顺序)。
 */
function probeLayerFiles(dir) {
    const metas = [];
    // harness 的同目录去重键:去掉首尾空白后的全文;最先的候选保留。
    const keptDigests = new Map();
    for (const name of ALL_CANDIDATES) {
        const target = join(dir, name);
        const stats = statOf(target);
        const local = LOCAL_CANDIDATES.includes(name);
        if (stats === undefined) {
            metas.push({ name, exists: false, size: 0, mtimeIso: '', local });
            continue;
        }
        const oversized = stats.size > MAX_SOURCE_BYTES;
        let duplicateOf;
        if (!oversized) {
            try {
                const digest = readFileSync(target, 'utf8').trim();
                const kept = keptDigests.get(digest);
                if (kept === undefined)
                    keptDigests.set(digest, name);
                else
                    duplicateOf = kept;
            }
            catch { /* 读取瞬时失败:跳过去重标注,存在性照常展示。 */ }
        }
        metas.push({
            name,
            exists: true,
            size: stats.size,
            mtimeIso: stats.mtimeIso,
            local,
            ...duplicateOf !== undefined ? { duplicateOf } : {},
            ...oversized ? { oversized: true } : {},
        });
    }
    return metas;
}
/** 读一个 SKILL.md 的 frontmatter name(限量读取;失败回退目录名)。 */
function skillNameOf(skillMd, fallback) {
    try {
        const head = readFileSync(skillMd, 'utf8').slice(0, 2048);
        const match = /^name:\s*(.+)$/m.exec(head);
        if (match !== null) {
            const value = match[1].trim().replace(/^["']|["']$/g, '');
            if (value !== '')
                return value;
        }
    }
    catch { /* 读不到就用目录名 */ }
    return fallback;
}
/** 收集一个技能根目录树内的技能(SKILL.md 目录 + 根层平铺 .md;限深限量)。 */
function collectSkills(root) {
    const out = [];
    let visited = 0;
    const walk = (dir, rel, depth) => {
        if (depth > SKILL_SCAN_MAX_DEPTH || visited > SKILL_SCAN_MAX_ENTRIES || out.length >= 100)
            return;
        let entries;
        try {
            entries = readdirSync(dir, { withFileTypes: true });
        }
        catch {
            return;
        }
        for (const entry of entries) {
            visited += 1;
            if (visited > SKILL_SCAN_MAX_ENTRIES || out.length >= 100)
                return;
            const relPath = rel === '' ? entry.name : `${rel}/${entry.name}`;
            if (entry.isFile() && entry.name === 'SKILL.md') {
                out.push({ name: skillNameOf(join(dir, entry.name), dir.split('/').pop() ?? 'skill'), path: relPath });
            }
            else if (depth === 0 && entry.isFile() && entry.name.endsWith('.md')) {
                out.push({ name: entry.name.slice(0, -3), path: relPath });
            }
            else if (entry.isDirectory()) {
                walk(join(dir, entry.name), relPath, depth + 1);
            }
        }
    };
    walk(root, '', 0);
    return out.sort((a, b) => a.name.localeCompare(b.name));
}
/** 一个技能根的状态行。 */
function skillRootMeta(path, displayPath, level) {
    let exists = false;
    try {
        exists = statSync(path).isDirectory();
    }
    catch { /* 不存在或不可读:按不存在展示。 */ }
    if (!exists)
        return { displayPath, level, exists };
    const skills = collectSkills(path);
    return { displayPath, level, exists, skillCount: skills.length, skills };
}
function jsonParameter(name) {
    return { name, wire: name, source: 'json', codec: { mode: 'src-json' } };
}
function invocation(method, parameters) {
    return {
        id: `dsh-context-inspector#projectFiles/${method}`,
        service: 'projectFiles',
        namespace: 'projectFiles',
        method,
        invocation: { kind: 'direct' },
        parameters: parameters.map(jsonParameter),
        result: { mode: 'src-json' },
    };
}
/**
 * 宿主端弱类型 TYPERT 清单:把 projectFiles/* 端点作为 strict 定义注册进
 * 宿主的 typert registry。
 *
 * 为什么必须走注册而不能只靠 @Remote/SRC 发现:第三方插件解析到自己
 * node_modules 里的 @deepseek-ai/dsh-typert-protocol 副本,装饰器标记写进
 * 那份副本的模块私有 WeakMap;宿主 Gateway 用的是宿主侧另一份副本,
 * remoteMethods 读不到任何标记,SRC 发现会得到 0 个端点(浏览器里
 * projectFiles/* 全部 404)。清单是纯数据,跨副本可见,Gateway 的
 * strict 定义路径直接命中。官方 registry 明确保留手动
 * ctx.typert.register() 给无 ./typert 构件的贡献。
 */
const TYPERT_MANIFEST = {
    package: 'dsh-context-inspector',
    face: 'host',
    schemas: [],
    model: { services: [], events: [], objects: [] },
    invocations: [
        invocation('overview', ['cwd']),
        invocation('readFile', ['cwd', 'scope', 'dir', 'name']),
        invocation('readSkillFile', ['cwd', 'root', 'skillPath']),
        invocation('writeSkillFile', ['cwd', 'root', 'skillPath', 'content']),
        invocation('writeFile', ['cwd', 'scope', 'dir', 'name', 'content']),
        invocation('removeFile', ['cwd', 'scope', 'dir', 'name']),
    ],
};
/**
 * projectFiles 网关服务:当前会话指引链(全局 + 项目链)的概览/读取/写入/删除,
 * 以及技能根目录状态。
 * @param ctx - 宿主 Cordis 上下文。
 */
let ProjectFilesGateway = (() => {
    let _classSuper = TypertRemoteService;
    let _instanceExtraInitializers = [];
    let _overview_decorators;
    let _readFile_decorators;
    let _writeFile_decorators;
    let _removeFile_decorators;
    return class ProjectFilesGateway extends _classSuper {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            _overview_decorators = [Remote];
            _readFile_decorators = [Remote];
            _writeFile_decorators = [Remote];
            _removeFile_decorators = [Remote];
            __esDecorate(this, null, _overview_decorators, { kind: "method", name: "overview", static: false, private: false, access: { has: obj => "overview" in obj, get: obj => obj.overview }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _readFile_decorators, { kind: "method", name: "readFile", static: false, private: false, access: { has: obj => "readFile" in obj, get: obj => obj.readFile }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _writeFile_decorators, { kind: "method", name: "writeFile", static: false, private: false, access: { has: obj => "writeFile" in obj, get: obj => obj.writeFile }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _removeFile_decorators, { kind: "method", name: "removeFile", static: false, private: false, access: { has: obj => "removeFile" in obj, get: obj => obj.removeFile }, metadata: _metadata }, null, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        /** 注册 'projectFiles' 服务键;typert registry 就绪后补登记弱清单。 */
        constructor(ctx) {
            super(ctx, 'projectFiles');
            __runInitializers(this, _instanceExtraInitializers);
            // 动态 inject:typert 不在场的组合(如 ACP 示例配置)里静默跳过,
            // 不阻塞 boot;register 返回的 disposer 作为回调返回值参与卸载。
            ctx.inject(['typert'], (typertCtx) => typertCtx.typert.register(TYPERT_MANIFEST));
        }
        /** 解析一个读写地址为绝对路径(校验 scope/dir/name 全部命中白名单)。 */
        resolveAddress(cwd, scope, dir, name) {
            const resolvedCwd = checkCwd(cwd);
            if (typeof name !== 'string' || !ALL_CANDIDATES.includes(name)) {
                throw new Error(`projectFiles: 不支持的指引文件名: ${JSON.stringify(name)}`);
            }
            if (scope === 'global') {
                if (name !== 'AGENTS.md') {
                    throw new Error('projectFiles: 全局层只有 AGENTS.md');
                }
                return join(dshHome(), 'AGENTS.md');
            }
            if (scope !== 'project') {
                throw new Error(`projectFiles: 不支持的层: ${JSON.stringify(scope)}`);
            }
            if (typeof dir !== 'string' || dir.includes('\0')) {
                throw new Error('projectFiles: dir 必须是字符串');
            }
            const projectRoot = findProjectRoot(resolvedCwd);
            if (!chainDirs(projectRoot, resolvedCwd).includes(dir)) {
                throw new Error(`projectFiles: 目录不在当前会话的指引链上: ${JSON.stringify(dir)}`);
            }
            const target = resolve(projectRoot, dir, name);
            // dir 来自现算的链、name 来自固定字面量白名单;前缀校验是纵深防御。
            if (!target.startsWith(projectRoot + sep)) {
                throw new Error('projectFiles: 解析后的路径越出了项目根');
            }
            return target;
        }
        /** 当前会话的完整指引链概览:全局层、项目链每级候选状态、技能根状态。 */
        overview(cwd) {
            const resolvedCwd = checkCwd(cwd);
            const projectRoot = findProjectRoot(resolvedCwd);
            const home = dshHome();
            const layers = [{
                    scope: 'global',
                    dir: '',
                    displayDir: tildeDisplay(home),
                    isCwd: false,
                    // 全局层只认 AGENTS.md(harness USER_GLOBAL_FILE),不探测其余候选。
                    files: probeLayerFiles(home).filter(meta => meta.name === 'AGENTS.md'),
                }];
            for (const dir of chainDirs(projectRoot, resolvedCwd)) {
                const absolute = resolve(projectRoot, dir);
                layers.push({
                    scope: 'project',
                    dir,
                    displayDir: dir === '' ? tildeDisplay(projectRoot) : dir,
                    isCwd: absolute === resolvedCwd,
                    files: probeLayerFiles(absolute),
                });
            }
            const agentsHome = join(homedir(), '.agents');
            const skills = [
                skillRootMeta(join(projectRoot, '.dsh/skills'), '.dsh/skills', 'project'),
                skillRootMeta(join(projectRoot, '.agents/skills'), '.agents/skills', 'project'),
                skillRootMeta(join(home, 'skills'), `${tildeDisplay(home)}/skills`, 'user'),
                skillRootMeta(join(agentsHome, 'skills'), `${tildeDisplay(agentsHome)}/skills`, 'user'),
            ];
            return {
                cwd: resolvedCwd,
                projectRoot,
                cwdRel: relative(projectRoot, resolvedCwd),
                layers,
                skills,
            };
        }
        /** 按 overview 的 displayPath 解析技能根的绝对路径(限四个已知根)。 */
        resolveSkillRoot(cwd, root) {
            const resolvedCwd = checkCwd(cwd);
            const projectRoot = findProjectRoot(resolvedCwd);
            const home = dshHome();
            const agentsHome = join(homedir(), '.agents');
            const roots = new Map([
                ['.dsh/skills', join(projectRoot, '.dsh/skills')],
                ['.agents/skills', join(projectRoot, '.agents/skills')],
                [`${tildeDisplay(home)}/skills`, join(home, 'skills')],
                [`${tildeDisplay(agentsHome)}/skills`, join(agentsHome, 'skills')],
            ]);
            const absolute = roots.get(root);
            if (absolute === undefined)
                throw new Error(`projectFiles: 不支持的技能根: ${JSON.stringify(root)}`);
            return absolute;
        }
        /** 解析技能文件地址(root 相对路径,必须命中 .md 且不越根)。 */
        resolveSkillFile(cwd, root, skillPath) {
            if (typeof skillPath !== 'string' || skillPath.includes('\0') || skillPath.includes('..') || isAbsolute(skillPath) || !skillPath.endsWith('.md')) {
                throw new Error(`projectFiles: 不支持的技能文件路径: ${JSON.stringify(skillPath)}`);
            }
            const rootAbs = this.resolveSkillRoot(cwd, root);
            const target = resolve(rootAbs, skillPath);
            if (!target.startsWith(rootAbs + sep)) {
                throw new Error('projectFiles: 解析后的路径越出了技能根');
            }
            return target;
        }
        /** 读取一个技能文件(SKILL.md/平铺 .md)的全文与元信息。 */
        readSkillFile(cwd, root, skillPath) {
            const target = this.resolveSkillFile(cwd, root, skillPath);
            const stats = statOf(target);
            if (stats === undefined)
                throw new Error(`projectFiles: 技能文件不存在: ${skillPath}`);
            return { content: readFileSync(target, 'utf8'), size: stats.size, mtimeIso: stats.mtimeIso };
        }
        /** 写入一个技能文件(字节原样;经符号链接写穿到来源)。 */
        writeSkillFile(cwd, root, skillPath, content) {
            const target = this.resolveSkillFile(cwd, root, skillPath);
            if (typeof content !== 'string')
                throw new Error('projectFiles: content 必须是字符串');
            writeFileSync(target, content, 'utf8');
            const stats = statOf(target);
            if (stats === undefined)
                throw new Error(`projectFiles: 写入后无法读取状态: ${skillPath}`);
            return { size: stats.size, mtimeIso: stats.mtimeIso };
        }
        /** 读取指引链上一个文件的全文与元信息。 */
        readFile(cwd, scope, dir, name) {
            const target = this.resolveAddress(cwd, scope, dir, name);
            const stats = statOf(target);
            if (stats === undefined)
                throw new Error(`projectFiles: 文件不存在: ${name}`);
            return { content: readFileSync(target, 'utf8'), size: stats.size, mtimeIso: stats.mtimeIso };
        }
        /** 写入(新建或覆盖)指引链上一个文件,返回写入后的元信息。 */
        writeFile(cwd, scope, dir, name, content) {
            const target = this.resolveAddress(cwd, scope, dir, name);
            if (typeof content !== 'string')
                throw new Error('projectFiles: content 必须是字符串');
            writeFileSync(target, content, 'utf8');
            const stats = statOf(target);
            if (stats === undefined)
                throw new Error(`projectFiles: 写入后无法读取状态: ${name}`);
            return { size: stats.size, mtimeIso: stats.mtimeIso };
        }
        /** 删除指引链上一个文件;文件本就不存在时 removed 为 false。命名为 removeFile:客户端命名空间服务的原型上已占用 remove。 */
        removeFile(cwd, scope, dir, name) {
            const target = this.resolveAddress(cwd, scope, dir, name);
            if (statOf(target) === undefined)
                return { removed: false };
            unlinkSync(target);
            return { removed: true };
        }
    };
})();
export { ProjectFilesGateway };
export default ProjectFilesGateway;
