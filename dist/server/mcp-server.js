/**
 * MCP Feedback Collector - MCP服务器实现
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { SetLevelRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { MCPError } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { WebServer } from './web-server.js';
// 心跳间隔（毫秒）。用 ping 请求（双向）替代 log notification，Cursor V2 FSM 只认 client/server 双向流量
const HEARTBEAT_INTERVAL_MS = 20000;
// 心跳连续失败多少次后标记连接异常
const HEARTBEAT_MAX_FAILURES = 3;
/**
 * MCP服务器类
 */
export class MCPServer {
    mcpServer;
    webServer;
    config;
    isRunning = false;
    heartbeatTimer = null;
    heartbeatFailures = 0;
    httpTransport = null;
    transportMode = 'stdio';
    constructor(config) {
        this.config = config;
        // 创建MCP服务器实例
        this.mcpServer = new McpServer({
            name: 'mcp-feedback-collector',
            version: '2.1.3'
        }, {
            capabilities: {
                tools: {},
                logging: {} // 添加日志功能支持
            }
        });
        // 设置初始化完成回调
        this.mcpServer.server.oninitialized = () => {
            logger.info('MCP初始化完成');
        };
        // 创建Web服务器实例
        this.webServer = new WebServer(config);
        // 注册MCP工具函数和日志处理
        this.registerTools();
        this.setupLogging();
    }
    /**
     * 从各种可能的参数名中提取 work_summary 内容
     * AI 模型经常用错参数名，这里做兼容处理
     */
    extractWorkSummary(args) {
        const aliasKeys = [
            'work_summary',
            'workSummary',
            'work-summary',
            'summary',
            'message',
            'content',
            'text',
            'feedback',
            'description',
            'report',
            'work_report',
            'workReport',
            'result',
            'output',
            'detail',
            'details',
            'body',
            'info',
            'note',
            'notes',
            'comment',
            'task_summary',
            'taskSummary',
        ];
        for (const key of aliasKeys) {
            if (args[key] !== undefined && args[key] !== null) {
                const val = args[key];
                if (typeof val === 'string' && val.trim().length > 0) {
                    if (key !== 'work_summary') {
                        logger.info(`参数兼容: 将 "${key}" 映射为 "work_summary"`);
                    }
                    return val;
                }
            }
        }
        for (const [key, val] of Object.entries(args)) {
            if (typeof val === 'string' && val.trim().length > 0) {
                logger.info(`参数兜底: 将未知参数 "${key}" 作为 work_summary 使用`);
                return val;
            }
        }
        return '(AI未提供工作汇报内容)';
    }
    /**
     * 注册MCP工具函数
     */
    registerTools() {
        this.mcpServer.registerTool('collect_feedback', {
            description: 'Collect feedback from users about AI work summary. Call this tool with parameter "work_summary" (string). Also accepts: summary, message, content, text, description, report, feedback, etc.',
            inputSchema: {
                work_summary: z.string().optional().describe('AI工作汇报内容，描述AI完成的工作和结果'),
                summary: z.string().optional().describe('Alias for work_summary'),
                message: z.string().optional().describe('Alias for work_summary'),
                content: z.string().optional().describe('Alias for work_summary'),
                text: z.string().optional().describe('Alias for work_summary'),
                feedback: z.string().optional().describe('Alias for work_summary'),
                description: z.string().optional().describe('Alias for work_summary'),
                report: z.string().optional().describe('Alias for work_summary'),
            }
        }, async (args) => {
            const resolvedSummary = this.extractWorkSummary(args);
            const params = {
                work_summary: resolvedSummary
            };
            logger.mcp('collect_feedback', params);
            try {
                const result = await this.collectFeedback(params);
                logger.mcp('collect_feedback', params, result);
                return result;
            }
            catch (error) {
                logger.error('collect_feedback工具调用失败:', error);
                if (error instanceof MCPError) {
                    throw error;
                }
                throw new MCPError('Failed to collect feedback', 'COLLECT_FEEDBACK_ERROR', error);
            }
        });
        if (logger.getLevel() !== 'silent') {
            logger.info('MCP工具函数注册完成');
        }
    }
    /**
     * 设置MCP日志功能
     */
    setupLogging() {
        // 设置MCP日志回调
        logger.setMCPLogCallback((message) => {
            this.sendLogNotification(message).catch(() => {
                // 静默处理错误，避免未处理的Promise拒绝
            });
        });
        // 处理日志级别设置请求
        this.mcpServer.server.setRequestHandler(SetLevelRequestSchema, async (request) => {
            const level = request.params.level;
            logger.setMCPLogLevel(level);
            logger.info(`MCP日志级别已设置为: ${level}`);
            return {}; // 返回空结果表示成功
        });
        logger.info('MCP日志功能已设置');
    }
    /**
     * 发送MCP日志通知
     */
    async sendLogNotification(message) {
        try {
            await this.mcpServer.server.notification({
                method: 'notifications/message',
                params: {
                    level: message.level,
                    logger: message.logger,
                    data: message.data
                }
            });
        }
        catch (error) {
            // 避免日志通知错误导致程序崩溃，但不要输出到控制台避免污染MCP输出
            // console.error('发送MCP日志通知失败:', error);
        }
    }
    /**
     * 实现collect_feedback功能
     */
    async collectFeedback(params) {
        const { work_summary } = params;
        const timeout_seconds = this.config.dialogTimeout;
        logger.info(`开始收集反馈，工作汇报长度: ${work_summary.length}字符，超时: ${timeout_seconds}秒`);
        // 发送MCP工具调用开始通知
        logger.mcpToolCallStarted('collect_feedback', {
            work_summary_length: work_summary.length,
            timeout_seconds: timeout_seconds
        });
        try {
            // 启动Web服务器（如果未运行）
            if (!this.webServer.isRunning()) {
                await this.webServer.start();
            }
            // 收集用户反馈
            const feedback = await this.webServer.collectFeedback(work_summary, timeout_seconds);
            logger.info(`反馈收集完成，收到 ${feedback.length} 条反馈`);
            // 格式化反馈数据为MCP内容（支持图片）
            const content = this.formatFeedbackForMCP(feedback);
            return {
                content,
                isError: false
            };
        }
        catch (error) {
            logger.error('反馈收集失败:', error);
            const errorMessage = error instanceof MCPError ? error.message : 'Failed to collect user feedback';
            return {
                content: [{
                        type: 'text',
                        text: `错误: ${errorMessage}`
                    }],
                isError: true
            };
        }
    }
    /**
     * 将反馈数据格式化为MCP内容（支持图片显示）
     */
    formatFeedbackForMCP(feedback) {
        if (feedback.length === 0) {
            return [{
                    type: 'text',
                    text: '未收到用户反馈'
                }];
        }
        const content = [];
        // 添加总结文本
        content.push({
            type: 'text',
            text: `收到 ${feedback.length} 条用户反馈：\n`
        });
        feedback.forEach((item, index) => {
            // 添加反馈标题
            content.push({
                type: 'text',
                text: `\n--- 反馈 ${index + 1} ---`
            });
            // 添加文字反馈
            if (item.text) {
                content.push({
                    type: 'text',
                    text: `文字反馈: ${item.text}`
                });
            }
            // 添加图片（转换为base64格式）
            if (item.images && item.images.length > 0) {
                content.push({
                    type: 'text',
                    text: `图片数量: ${item.images.length}`
                });
                item.images.forEach((img, imgIndex) => {
                    // 添加图片信息
                    content.push({
                        type: 'text',
                        text: `图片 ${imgIndex + 1}: ${img.name} (${img.type}, ${(img.size / 1024).toFixed(1)}KB)`
                    });
                    // 添加图片描述（如果有）
                    if (item.imageDescriptions && item.imageDescriptions[imgIndex]) {
                        content.push({
                            type: 'text',
                            text: `图片描述: ${item.imageDescriptions[imgIndex]}`
                        });
                    }
                    // 添加图片内容（Cursor格式）
                    if (img.data) {
                        // 确保是纯净的base64数据（移除data:image/...;base64,前缀）
                        const base64Data = img.data.replace(/^data:image\/[^;]+;base64,/, '');
                        content.push({
                            type: 'image',
                            data: base64Data, // 纯净的base64字符串
                            mimeType: img.type
                        });
                    }
                });
            }
            // 添加时间戳
            content.push({
                type: 'text',
                text: `提交时间: ${new Date(item.timestamp).toLocaleString()}\n`
            });
        });
        return content;
    }
    /**
     * 将反馈数据格式化为文本（保留用于其他用途）
     */
    formatFeedbackAsText(feedback) {
        if (feedback.length === 0) {
            return '未收到用户反馈';
        }
        const parts = [];
        parts.push(`收到 ${feedback.length} 条用户反馈：\n`);
        feedback.forEach((item, index) => {
            parts.push(`--- 反馈 ${index + 1} ---`);
            if (item.text) {
                parts.push(`文字反馈: ${item.text}`);
            }
            if (item.images && item.images.length > 0) {
                parts.push(`图片数量: ${item.images.length}`);
                item.images.forEach((img, imgIndex) => {
                    parts.push(`  图片 ${imgIndex + 1}: ${img.name} (${img.type}, ${(img.size / 1024).toFixed(1)}KB)`);
                });
            }
            parts.push(`提交时间: ${new Date(item.timestamp).toLocaleString()}`);
            parts.push('');
        });
        return parts.join('\n');
    }
    /**
     * 启动MCP服务器
     * 根据环境变量 MCP_TRANSPORT_MODE 选择传输：
     *   - stdio（默认）：作为 Cursor 的 stdio 子进程
     *   - http：作为独立进程，暴露 Streamable HTTP 端点 /mcp 在 webServer 上
     */
    async start() {
        if (this.isRunning) {
            logger.warn('MCP服务器已在运行中');
            return;
        }
        const envMode = (process.env['MCP_TRANSPORT_MODE'] || 'stdio').toLowerCase();
        this.transportMode = envMode === 'http' ? 'http' : 'stdio';
        try {
            logger.info(`正在启动MCP服务器 (transport=${this.transportMode})...`);
            if (this.transportMode === 'http') {
                await this.startHttpMode();
            }
            else {
                await this.startStdioMode();
            }
            this.isRunning = true;
            logger.info('MCP服务器启动成功');
            // 启动心跳保活（stdio 和 http 都需要）
            this.startHeartbeat();
        }
        catch (error) {
            logger.error('MCP服务器启动失败:', error);
            throw new MCPError('Failed to start MCP server', 'SERVER_START_ERROR', error);
        }
    }
    /**
     * 启动 stdio 模式（作为 Cursor 子进程）
     */
    async startStdioMode() {
        const transport = new StdioServerTransport();
        transport.onerror = (error) => {
            logger.error('MCP传输错误:', error);
        };
        transport.onclose = () => {
            logger.info('MCP stdio 传输连接已关闭');
            this.isRunning = false;
            this.stopHeartbeat();
        };
        // 添加消息调试
        const originalOnMessage = transport.onmessage;
        transport.onmessage = (message) => {
            logger.debug('📥 收到MCP消息:', JSON.stringify(message, null, 2));
            if (originalOnMessage) {
                originalOnMessage(message);
            }
        };
        const originalSend = transport.send.bind(transport);
        transport.send = (message) => {
            logger.debug('📤 发送MCP消息:', JSON.stringify(message, null, 2));
            return originalSend(message);
        };
        await this.mcpServer.connect(transport);
        // 启动Web服务器（在MCP连接建立后）
        await this.webServer.start();
    }
    /**
     * 启动 HTTP/SSE 模式（独立进程，Cursor 通过 url 连接）
     * 使用 Streamable HTTP transport，支持 SSE 流式推送
     *
     * 关键设计：
     * - 单 Cursor 客户端场景，同一时刻只保留一条 transport
     * - Cursor 重启会发新 `initialize` 但不带旧 session id，必须主动重建 transport
     * - 否则旧 transport 会以 "Server already initialized" 拒绝新客户端
     */
    async startHttpMode() {
        // 先启动 webServer，因为 /mcp 路由要挂在它上面
        await this.webServer.start();
        await this.buildHttpTransport();
        // 把 /mcp 路由挂到 webServer 上
        this.webServer.attachMcpTransport(async (req, res, parsedBody) => {
            // 判断是否是「新客户端的 initialize」：method=initialize 且请求头无 mcp-session-id
            // —— 这种情况下必须抛弃旧 transport 重建，否则 SDK 会返回 "Server already initialized"
            const body = parsedBody;
            const method = body?.method;
            const hasSessionHeader = !!req.headers['mcp-session-id'];
            const currentSessionId = this.httpTransport?.sessionId;
            if (method === 'initialize' && !hasSessionHeader && currentSessionId) {
                logger.info(`检测到新客户端 initialize（旧 session=${currentSessionId}），重建 HTTP transport`);
                try {
                    await this.buildHttpTransport();
                }
                catch (e) {
                    logger.error('重建 HTTP transport 失败:', e);
                }
            }
            if (!this.httpTransport) {
                try {
                    await this.buildHttpTransport();
                }
                catch (e) {
                    logger.error('懒加载 HTTP transport 失败:', e);
                    res.statusCode = 503;
                    res.end('MCP transport not initialized');
                    return;
                }
            }
            await this.httpTransport.handleRequest(req, res, parsedBody);
        });
    }
    /**
     * 建立或重建 HTTP transport
     *
     * 安全拆除旧 transport + 关闭旧 server 绑定 → 新建 transport → 重新 connect
     * 工具处理器注册在 McpServer 层，Server.close() 只清 _transport 不清 handlers，重连后继续可用
     */
    async buildHttpTransport() {
        // 1) 拆旧 transport
        if (this.httpTransport) {
            try {
                await this.httpTransport.close();
            }
            catch (e) {
                logger.warn('关闭旧 httpTransport 出错:', e);
            }
            this.httpTransport = null;
        }
        // 2) 拆旧 mcpServer-transport 绑定（使 connect 可再次调用）
        try {
            await this.mcpServer.server.close();
        }
        catch (e) {
            logger.warn('关闭旧 server 绑定出错:', e);
        }
        // 3) 停心跳
        this.stopHeartbeat();
        // 4) 建新
        this.httpTransport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(),
        });
        this.httpTransport.onerror = (error) => {
            logger.error('MCP HTTP 传输错误:', error);
        };
        this.httpTransport.onclose = () => {
            logger.info('MCP HTTP 传输连接已关闭');
            // HTTP 模式下不立即停止服务，保持常驻等 Cursor 重连
            this.stopHeartbeat();
        };
        // SDK 的 StreamableHTTPServerTransport 和 Transport 接口在 exactOptionalPropertyTypes 下有 onclose 可选性不一致
        await this.mcpServer.connect(this.httpTransport);
        this.heartbeatFailures = 0;
        this.startHeartbeat();
        logger.info('HTTP transport 已建立（等待客户端 initialize）');
    }
    /**
     * 获取当前传输模式
     */
    getTransportMode() {
        return this.transportMode;
    }
    /**
     * 仅启动Web模式
     */
    async startWebOnly() {
        try {
            logger.info('正在启动Web模式...');
            // 仅启动Web服务器
            await this.webServer.start();
            this.isRunning = true;
            logger.info('Web服务器启动成功');
            // 保持进程运行
            process.stdin.resume();
        }
        catch (error) {
            logger.error('Web服务器启动失败:', error);
            throw new MCPError('Failed to start web server', 'WEB_SERVER_START_ERROR', error);
        }
    }
    /**
     * 启动心跳保活
     *
     * 设计要点：
     * 1. 用 ping() 请求（server→client→server 双向 JSON-RPC）代替单向 notification
     *    —— Cursor 2026 V2 FSM 只把双向流量算作活跃信号，单向 log 不重置 idle timer
     * 2. 不 .unref() —— 保持 event loop 活跃，防止 Node 进程在无活跃句柄时退出
     * 3. 连续失败 HEARTBEAT_MAX_FAILURES 次则标记 transport 异常
     */
    startHeartbeat() {
        this.stopHeartbeat();
        this.heartbeatFailures = 0;
        this.heartbeatTimer = setInterval(async () => {
            if (!this.isRunning) {
                this.stopHeartbeat();
                return;
            }
            try {
                await this.mcpServer.server.ping();
                if (this.heartbeatFailures > 0) {
                    logger.info(`心跳恢复（之前失败 ${this.heartbeatFailures} 次）`);
                }
                this.heartbeatFailures = 0;
            }
            catch (error) {
                this.heartbeatFailures++;
                logger.warn(`心跳失败 ${this.heartbeatFailures}/${HEARTBEAT_MAX_FAILURES}: ${error instanceof Error ? error.message : String(error)}`);
                if (this.heartbeatFailures >= HEARTBEAT_MAX_FAILURES) {
                    logger.error(`连续 ${HEARTBEAT_MAX_FAILURES} 次心跳失败，transport 可能已断开`);
                    this.stopHeartbeat();
                    // HTTP 模式：主动重建 transport，让下个客户端的 initialize 能成功
                    if (this.transportMode === 'http') {
                        logger.info('HTTP 模式：主动重建 transport 以便接受新客户端');
                        this.buildHttpTransport().catch(e => logger.error('心跳触发的 transport 重建失败:', e));
                    }
                }
            }
        }, HEARTBEAT_INTERVAL_MS);
        // 注意：故意不调用 unref()，保持进程 event loop 活跃
    }
    /**
     * 停止心跳
     */
    stopHeartbeat() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }
    /**
     * 停止服务器
     */
    async stop() {
        if (!this.isRunning) {
            return;
        }
        try {
            logger.info('正在停止服务器...');
            this.stopHeartbeat();
            // 关闭 HTTP transport（如果存在）
            if (this.httpTransport) {
                try {
                    await this.httpTransport.close();
                }
                catch (e) {
                    logger.warn('关闭 HTTP transport 出错:', e);
                }
                this.httpTransport = null;
            }
            // 停止Web服务器
            await this.webServer.stop();
            // 关闭MCP服务器
            if (this.mcpServer) {
                await this.mcpServer.close();
            }
            this.isRunning = false;
            logger.info('服务器已停止');
        }
        catch (error) {
            logger.error('停止服务器时出错:', error);
            throw new MCPError('Failed to stop server', 'SERVER_STOP_ERROR', error);
        }
    }
    /**
     * 获取服务器状态
     */
    getStatus() {
        return {
            running: this.isRunning,
            webPort: this.webServer.isRunning() ? this.webServer.getPort() : undefined
        };
    }
}
//# sourceMappingURL=mcp-server.js.map