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
import type { Context } from '@deepseek-ai/cordis';
import { TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import { type ListResult, type ReadResult, type RemoveResult, type WriteResult } from './scoped-files.js';
export type { ListResult, ReadResult, RemoveResult, ScopedFileMeta, ScopedFileSpec, WriteResult, } from './scoped-files.js';
export { SCOPED_FILE_NAMES, SCOPED_FILE_SPECS } from './scoped-files.js';
/**
 * projectFiles 网关服务:作用域指引文件的列出/读取/写入/删除。
 * @param ctx - 宿主 Cordis 上下文。
 */
export declare class ProjectFilesGateway extends TypertRemoteService {
    /** 无额外服务依赖;父类构造完成 'projectFiles' 键注册与 Gateway 绑定。 */
    constructor(ctx: Context);
    /** 列出当前工作区全部候选作用域文件的状态。 */
    list(root: string): ListResult;
    /** 读取一个作用域文件的全文与元信息。 */
    read(root: string, name: string): ReadResult;
    /** 写入(新建或覆盖)一个作用域文件,返回写入后的元信息。 */
    write(root: string, name: string, content: string): WriteResult;
    /** 删除一个作用域文件;文件本就不存在时 removed 为 false。 */
    remove(root: string, name: string): RemoveResult;
}
export default ProjectFilesGateway;
