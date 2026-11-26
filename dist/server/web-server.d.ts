/**
 * MCP Feedback Collector - Web服务器实现
 */
import { IncomingMessage, ServerResponse } from 'http';
import { Config, FeedbackData, FeedbackSessionSnapshot } from '../types/index.js';
/** MCP Streamable HTTP transport 处理函数类型（被 mcp-server.ts 注入） */
export type McpHttpHandler = (req: IncomingMessage, res: ServerResponse, parsedBody?: unknown) => Promise<void>;
/**
 * Web服务器类
 */
export declare class WebServer {
    private app;
    private server;
    private io;
    private config;
    private port;
    private isServerRunning;
    private portManager;
    private imageProcessor;
    private imageToTextService;
    private sessionStorage;
    private mcpHttpHandler;
    private sessionTimers;
    private consecutiveTimeouts;
    private static readonly MAX_CONSECUTIVE_TIMEOUTS;
    private static readonly RESULT_RETENTION_MS;
    static readonly MAX_WAIT_SECONDS: number;
    constructor(config: Config);
    /**
     * 设置优雅退出处理
     */
    private setupGracefulShutdown;
    /**
     * 设置中间件
     */
    private setupMiddleware;
    /**
     * 设置路由
     */
    private setupRoutes;
    /**
     * 注入 MCP HTTP transport handler（由 mcp-server.ts 在启动 HTTP 模式时调用）
     */
    attachMcpTransport(handler: McpHttpHandler): void;
    /**
     * 解绑 MCP HTTP transport
     */
    detachMcpTransport(): void;
    /**
     * 设置Socket.IO事件处理
     */
    private setupSocketHandlers;
    /**
     * 处理反馈提交
     */
    private handleFeedbackSubmission;
    /**
     * 装载/重置某会话的服务端权威超时定时器
     */
    private armSessionTimer;
    private clearSessionTimer;
    /**
     * 服务端超时处理：把等待中的会话转换为可轮询的 timed_out 状态。
     */
    private handleSessionTimeout;
    /**
     * 创建反馈会话，立即返回句柄，不在 MCP 请求中等待浏览器回复。
     */
    createFeedbackSession(workSummary: string, timeoutSeconds: number): Promise<FeedbackSessionSnapshot>;
    /**
     * 最多等待一小段时间，避免触发 Cursor 的长 MCP 请求超时。
     */
    waitForFeedback(sessionId: string, waitSeconds?: number): Promise<FeedbackSessionSnapshot>;
    /**
     * 立即读取会话状态；若刚好越过 deadline，则主动执行一次超时收口。
     */
    pollFeedback(sessionId: string): FeedbackSessionSnapshot;
    /**
     * 旧版 API 兼容：保留直接等待的内部方法，新的 MCP 工具不调用它。
     */
    collectFeedback(workSummary: string, timeoutSeconds: number): Promise<FeedbackData[]>;
    private buildFeedbackSnapshot;
    /**
     * 生成反馈页面URL
     */
    private generateFeedbackUrl;
    /**
     * 打开反馈页面
     */
    private openFeedbackPage;
    /**
     * 生成会话ID
     */
    private generateSessionId;
    /**
     * 启动Web服务器
     */
    start(): Promise<void>;
    /**
     * 优雅停止Web服务器
     */
    gracefulStop(): Promise<void>;
    /**
     * 停止Web服务器
     */
    stop(): Promise<void>;
    /**
     * 检查服务器是否运行
     */
    isRunning(): boolean;
    /**
     * 获取服务器端口
     */
    getPort(): number;
}
//# sourceMappingURL=web-server.d.ts.map