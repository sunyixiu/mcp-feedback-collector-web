/**
 * MCP Feedback Collector - Web服务器实现
 */
import { IncomingMessage, ServerResponse } from 'http';
import { Config, FeedbackData } from '../types/index.js';
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
     * 收集用户反馈
     */
    collectFeedback(workSummary: string, timeoutSeconds: number): Promise<FeedbackData[]>;
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