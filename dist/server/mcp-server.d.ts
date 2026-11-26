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
    private isMcpRunning;
    private heartbeatTimer;
    private heartbeatFailures;
    private httpSessions;
    private transportMode;
    constructor(config: Config);
    /**
     * 创建一个完整的 McpServer 实例（含工具注册和日志处理）
     * HTTP 多会话模式下每个客户端会话独享一个实例
     */
    private createServerInstance;
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
     * 设置MCP日志功能（全局回调，只设置一次）
     */
    private setupLogging;
    /**
     * 发送MCP日志通知
     * stdio 模式发给默认实例；HTTP 模式广播给所有活跃会话
     */
    private sendLogNotification;
    private ensureWebServer;
    private getFeedbackUrlFromSnapshot;
    private formatFeedbackSessionResult;
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
     * 多会话设计（v2.1.4）：
     * - 按 mcp-session-id 维护 transport map，每个 Cursor 窗口一个独立会话
     * - 新客户端 initialize 只新建自己的会话，不再拆掉别人的 transport
     *   （旧版单 transport 设计会导致：窗口 A 正挂着 collect_feedback 等用户反馈时，
     *    窗口 B 的 initialize 把通道拆了，A 的结果永远回不去）
     * - 每个会话独立心跳，连续失败则只销毁该会话
     */
    private startHttpMode;
    /**
     * 为一个新客户端建立独立会话（独享 McpServer 实例 + transport + 心跳）
     */
    private createHttpSession;
    /**
     * 销毁一个 HTTP 会话（停心跳、移出 map、关 transport）
     */
    private destroyHttpSession;
    /**
     * 每个会话独立心跳，连续失败只销毁自己，不影响其他会话
     */
    private startSessionHeartbeat;
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
        webRunning: boolean;
        webPort?: number | undefined;
        mcpRunning: boolean;
    };
}
//# sourceMappingURL=mcp-server.d.ts.map