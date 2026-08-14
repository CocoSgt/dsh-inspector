/**
 * dsh-project-files 宿主端:projectFiles 网关服务。
 *
 * 继承 TypertRemoteService 后,Typert Gateway 以 SRC 模式自动发现本服务:
 * 不需要生成式 TYPERT 清单,方法上的 @Remote() 装饰器与构造时绑定的
 * 服务键 'projectFiles' 即构成 wire 端点 projectFiles/<method>。
 *
 * 路径安全:所有方法只接受「工作区根目录 + 白名单相对路径」二元组。
 * 相对路径必须命中 SCOPED_FILE_PATHS(白名单内均为固定字面量,不含 `..`
 * 与绝对路径,天然杜绝目录穿越);根目录必须是已存在的绝对路径目录,
 * 最终路径还会再做一次 resolve 后的前缀校验。白名单条目分 file/dir 两种
 * 形态:文件可读/写/删,目录(.dsh/skills、.agents/skills、.sessions)只在
 * list 里展示存在性与条目数,不接受内容读写。
 *
 * 重要:Gateway 通过 Function.prototype.toString 读取方法参数名作为
 * wire 字段名,因此本文件的公开方法必须保持「简单标识符参数」形态
 * (不解构、无默认值、无剩余参数),且构建产物不得压缩改写参数名。
 */
import type { Context } from '@deepseek-ai/cordis';
import { TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import { type ListResult, type ReadResult, type RemoveResult, type WriteResult } from './scoped-files.js';
export type { ListResult, ReadResult, RemoveResult, ScopedFileMeta, ScopedFileSpec, WriteResult, } from './scoped-files.js';
export { SCOPED_FILE_PATHS, SCOPED_FILE_SPECS } from './scoped-files.js';
/**
 * projectFiles 网关服务:dsh 原生项目文件(指引/Hooks/技能目录/.env/.sessions)
 * 的列出/读取/写入/删除。
 * @param ctx - 宿主 Cordis 上下文。
 */
export declare class ProjectFilesGateway extends TypertRemoteService {
    /** 注册 'projectFiles' 服务键;typert registry 就绪后补登记弱清单。 */
    constructor(ctx: Context);
    /** 列出当前工作区全部 dsh 原生项目文件的状态(文件到字节/时间,目录到条目数)。 */
    list(root: string): ListResult;
    /** 读取一个白名单文件的全文与元信息。 */
    read(root: string, name: string): ReadResult;
    /** 写入(新建或覆盖)一个白名单文件,返回写入后的元信息。 */
    write(root: string, name: string, content: string): WriteResult;
    /** 删除一个白名单文件;文件本就不存在时 removed 为 false。命名为 removeFile:客户端命名空间服务的原型上已占用 remove。 */
    removeFile(root: string, name: string): RemoveResult;
}
export default ProjectFilesGateway;
