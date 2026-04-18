/**
 * MCP Feedback Collector - MCP服务器实现
 */
import { Config } from '../types/index.js';
/**
 * MCP服务器类
 */
export declare class MCPServer {
    private mcpServer;
    private webServer;
    private config;
    private isRunning;
    private heartbeatTimer;
    private heartbeatFailures;
    private httpTransport;
    private transportMode;
    constructor(config: Config);
    /**
     * 从各种可能的参数名中提取 work_summary 内容
     * AI 模型经常用错参数名，这里做兼容处理
     */
    private extractWorkSummary;
    /**
     * 注册MCP工具函数
     */
    private registerTools;
    /**
     * 设置MCP日志功能
     */
    private setupLogging;
    /**
     * 发送MCP日志通知
     */
    private sendLogNotification;
    /**
     * 实现collect_feedback功能
     */
    private collectFeedback;
    /**
     * 将反馈数据格式化为MCP内容（支持图片显示）
     */
    private formatFeedbackForMCP;
    /**
     * 将反馈数据格式化为文本（保留用于其他用途）
     */
    private formatFeedbackAsText;
    /**
     * 启动MCP服务器
     * 根据环境变量 MCP_TRANSPORT_MODE 选择传输：
     *   - stdio（默认）：作为 Cursor 的 stdio 子进程
     *   - http：作为独立进程，暴露 Streamable HTTP 端点 /mcp 在 webServer 上
     */
    start(): Promise<void>;
    /**
     * 启动 stdio 模式（作为 Cursor 子进程）
     */
    private startStdioMode;
    /**
     * 启动 HTTP/SSE 模式（独立进程，Cursor 通过 url 连接）
     * 使用 Streamable HTTP transport，支持 SSE 流式推送
     *
     * 关键设计：
     * - 单 Cursor 客户端场景，同一时刻只保留一条 transport
     * - Cursor 重启会发新 `initialize` 但不带旧 session id，必须主动重建 transport
     * - 否则旧 transport 会以 "Server already initialized" 拒绝新客户端
     */
    private startHttpMode;
    /**
     * 建立或重建 HTTP transport
     *
     * 安全拆除旧 transport + 关闭旧 server 绑定 → 新建 transport → 重新 connect
     * 工具处理器注册在 McpServer 层，Server.close() 只清 _transport 不清 handlers，重连后继续可用
     */
    private buildHttpTransport;
    /**
     * 获取当前传输模式
     */
    getTransportMode(): 'stdio' | 'http';
    /**
     * 仅启动Web模式
     */
    startWebOnly(): Promise<void>;
    /**
     * 启动心跳保活
     *
     * 设计要点：
     * 1. 用 ping() 请求（server→client→server 双向 JSON-RPC）代替单向 notification
     *    —— Cursor 2026 V2 FSM 只把双向流量算作活跃信号，单向 log 不重置 idle timer
     * 2. 不 .unref() —— 保持 event loop 活跃，防止 Node 进程在无活跃句柄时退出
     * 3. 连续失败 HEARTBEAT_MAX_FAILURES 次则标记 transport 异常
     */
    private startHeartbeat;
    /**
     * 停止心跳
     */
    private stopHeartbeat;
    /**
     * 停止服务器
     */
    stop(): Promise<void>;
    /**
     * 获取服务器状态
     */
    getStatus(): {
        running: boolean;
        webPort?: number | undefined;
    };
}
//# sourceMappingURL=mcp-server.d.ts.map