/**
 * dsh-project-files 宿主端:projectFiles 网关服务。
 *
 * 继承 TypertRemoteService 后,Typert Gateway 以 SRC 模式自动发现本服务:
 * 不需要生成式 TYPERT 清单,方法上的 @Remote() 装饰器与构造时绑定的
 * 服务键 'projectFiles' 即构成 wire 端点 projectFiles/<method>。
 *
 * 路径安全:所有方法只接受「工作区根目录 + 白名单文件名」二元组。
 * 文件名必须命中 SCOPED_FILE_NAMES(白名单内文件名均不含路径分隔符,
 * 天然杜绝目录穿越);根目录必须是已存在的绝对路径目录,最终路径还会
 * 再做一次 resolve 后的前缀校验。
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
import { statSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { isAbsolute, resolve, sep } from 'node:path';
import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import { SCOPED_FILE_NAMES, SCOPED_FILE_SPECS, } from './scoped-files.js';
export { SCOPED_FILE_NAMES, SCOPED_FILE_SPECS } from './scoped-files.js';
/** 校验并解析根目录:必须是存在的绝对路径目录。 */
function checkRoot(root) {
    if (typeof root !== 'string' || root.length === 0 || root.includes('\0')) {
        throw new Error('projectFiles: root 必须是非空字符串');
    }
    if (!isAbsolute(root)) {
        throw new Error(`projectFiles: root 必须是绝对路径,收到 ${JSON.stringify(root)}`);
    }
    let stats;
    try {
        stats = statSync(root);
    }
    catch {
        throw new Error(`projectFiles: 工作区目录不可访问: ${root}`);
    }
    if (!stats.isDirectory())
        throw new Error(`projectFiles: root 不是目录: ${root}`);
    return resolve(root);
}
/** 校验文件名在白名单内,并返回根目录下的完整路径。 */
function checkTarget(root, name) {
    if (typeof name !== 'string' || !SCOPED_FILE_NAMES.has(name)) {
        throw new Error(`projectFiles: 不支持的作用域文件名: ${JSON.stringify(name)}`);
    }
    const target = resolve(root, name);
    // 白名单文件名不含分隔符,这里的前缀校验是纵深防御。
    if (target !== root + sep + name) {
        throw new Error('projectFiles: 解析后的路径越出了工作区根目录');
    }
    return target;
}
/** 读取文件统计,不存在返回 undefined。 */
function statOf(target) {
    try {
        const stats = statSync(target);
        return { size: stats.size, mtimeIso: stats.mtime.toISOString() };
    }
    catch {
        return undefined;
    }
}
/**
 * projectFiles 网关服务:作用域指引文件的列出/读取/写入/删除。
 * @param ctx - 宿主 Cordis 上下文。
 */
let ProjectFilesGateway = (() => {
    let _classSuper = TypertRemoteService;
    let _instanceExtraInitializers = [];
    let _list_decorators;
    let _read_decorators;
    let _write_decorators;
    let _remove_decorators;
    return class ProjectFilesGateway extends _classSuper {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            _list_decorators = [Remote];
            _read_decorators = [Remote];
            _write_decorators = [Remote];
            _remove_decorators = [Remote];
            __esDecorate(this, null, _list_decorators, { kind: "method", name: "list", static: false, private: false, access: { has: obj => "list" in obj, get: obj => obj.list }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _read_decorators, { kind: "method", name: "read", static: false, private: false, access: { has: obj => "read" in obj, get: obj => obj.read }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _write_decorators, { kind: "method", name: "write", static: false, private: false, access: { has: obj => "write" in obj, get: obj => obj.write }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _remove_decorators, { kind: "method", name: "remove", static: false, private: false, access: { has: obj => "remove" in obj, get: obj => obj.remove }, metadata: _metadata }, null, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        /** 无额外服务依赖;父类构造完成 'projectFiles' 键注册与 Gateway 绑定。 */
        constructor(ctx) {
            super(ctx, 'projectFiles');
            __runInitializers(this, _instanceExtraInitializers);
        }
        /** 列出当前工作区全部候选作用域文件的状态。 */
        list(root) {
            const resolvedRoot = checkRoot(root);
            const files = SCOPED_FILE_SPECS.map(spec => {
                const stats = statOf(checkTarget(resolvedRoot, spec.name));
                return {
                    name: spec.name,
                    purpose: spec.purpose,
                    exists: stats !== undefined,
                    size: stats?.size ?? 0,
                    mtimeIso: stats?.mtimeIso ?? '',
                };
            });
            return { root: resolvedRoot, files };
        }
        /** 读取一个作用域文件的全文与元信息。 */
        read(root, name) {
            const resolvedRoot = checkRoot(root);
            const target = checkTarget(resolvedRoot, name);
            const stats = statOf(target);
            if (stats === undefined)
                throw new Error(`projectFiles: 文件不存在: ${name}`);
            return {
                content: readFileSync(target, 'utf8'),
                size: stats.size,
                mtimeIso: stats.mtimeIso,
            };
        }
        /** 写入(新建或覆盖)一个作用域文件,返回写入后的元信息。 */
        write(root, name, content) {
            const resolvedRoot = checkRoot(root);
            const target = checkTarget(resolvedRoot, name);
            if (typeof content !== 'string')
                throw new Error('projectFiles: content 必须是字符串');
            writeFileSync(target, content, 'utf8');
            const stats = statOf(target);
            if (stats === undefined)
                throw new Error(`projectFiles: 写入后无法读取状态: ${name}`);
            return { size: stats.size, mtimeIso: stats.mtimeIso };
        }
        /** 删除一个作用域文件;文件本就不存在时 removed 为 false。 */
        remove(root, name) {
            const resolvedRoot = checkRoot(root);
            const target = checkTarget(resolvedRoot, name);
            if (statOf(target) === undefined)
                return { removed: false };
            unlinkSync(target);
            return { removed: true };
        }
    };
})();
export { ProjectFilesGateway };
export default ProjectFilesGateway;
