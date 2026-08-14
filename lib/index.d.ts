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
import type { Context } from '@deepseek-ai/cordis';
import { TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import { type OverviewResult, type ReadResult, type RemoveResult, type WriteResult } from './scoped-files.js';
export type { FileAddress, InstructionFileMeta, InstructionLayer, InstructionScope, OverviewResult, ReadResult, RemoveResult, SkillRootMeta, WriteResult, } from './scoped-files.js';
export { ALL_CANDIDATES, BASE_CANDIDATES, LOCAL_CANDIDATES, MAX_SOURCE_BYTES } from './scoped-files.js';
/**
 * projectFiles 网关服务:当前会话指引链(全局 + 项目链)的概览/读取/写入/删除,
 * 以及技能根目录状态。
 * @param ctx - 宿主 Cordis 上下文。
 */
export declare class ProjectFilesGateway extends TypertRemoteService {
    /** 注册 'projectFiles' 服务键;typert registry 就绪后补登记弱清单。 */
    constructor(ctx: Context);
    /** 解析一个读写地址为绝对路径(校验 scope/dir/name 全部命中白名单)。 */
    private resolveAddress;
    /** 当前会话的完整指引链概览:全局层、项目链每级候选状态、技能根状态。 */
    overview(cwd: string): OverviewResult;
    /** 按 overview 的 displayPath 解析技能根的绝对路径(限四个已知根)。 */
    private resolveSkillRoot;
    /** 解析技能文件地址(root 相对路径,必须命中 .md 且不越根)。 */
    private resolveSkillFile;
    /** 读取一个技能文件(SKILL.md/平铺 .md)的全文与元信息。 */
    readSkillFile(cwd: string, root: string, skillPath: string): ReadResult;
    /** 写入一个技能文件(字节原样;经符号链接写穿到来源)。 */
    writeSkillFile(cwd: string, root: string, skillPath: string, content: string): WriteResult;
    /** 读取指引链上一个文件的全文与元信息。 */
    readFile(cwd: string, scope: string, dir: string, name: string): ReadResult;
    /** 写入(新建或覆盖)指引链上一个文件,返回写入后的元信息。 */
    writeFile(cwd: string, scope: string, dir: string, name: string, content: string): WriteResult;
    /** 删除指引链上一个文件;文件本就不存在时 removed 为 false。命名为 removeFile:客户端命名空间服务的原型上已占用 remove。 */
    removeFile(cwd: string, scope: string, dir: string, name: string): RemoveResult;
}
export default ProjectFilesGateway;
