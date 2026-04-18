/**
 * stdio-bootstrap
 * ============================================================
 * 必须作为进程入口的【第一个 import】加载
 * ES module 下所有 import 的 top-level 代码都会在主文件代码之前执行，
 * 所以把 stdout 保护放进一个独立模块、让它变成第一个被 require 的依赖
 *
 * 作用：当 MCP_TRANSPORT_MODE=stdio 时，锁住 stdout
 *   - console.log / console.info / console.debug 都重绑到 stderr
 *   - 避免任何库启动期输出污染 MCP JSON-RPC 协议流
 *   - MCP stdio transport 独占 stdout，用来发 JSON-RPC 消息
 * ============================================================
 */
declare function diagLog(...args: unknown[]): void;
export declare const STDIO_BOOTSTRAP_ACTIVE: boolean;
export declare const STDIO_DIAG_LOG_PATH: string;
export { diagLog };
//# sourceMappingURL=stdio-bootstrap.d.ts.map