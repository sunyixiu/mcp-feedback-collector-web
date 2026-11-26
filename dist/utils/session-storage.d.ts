/**
 * 会话存储管理器
 * 提供内存存储和可选的持久化存储
 */
import { FeedbackSessionStatus, FeedbackData } from '../types/index.js';
export interface SessionData {
    workSummary: string;
    feedback: FeedbackData[];
    startTime: number;
    timeout: number;
    status?: FeedbackSessionStatus;
    completedAt?: number;
    resultExpiresAt?: number;
    error?: string;
    waiters?: Array<() => void>;
    resolve?: (feedback: FeedbackData[]) => void;
    reject?: (error: Error) => void;
}
export declare class SessionStorage {
    private cleanupIntervalMs;
    private sessions;
    private cleanupInterval;
    constructor(cleanupIntervalMs?: number);
    /**
     * 创建会话
     */
    createSession(sessionId: string, data: SessionData): void;
    /**
     * 获取会话
     *
     * 异步反馈模式下，完成/超时结果需要保留一段时间供 poll 查询，
     * 因此这里不再因为 deadline 到达就立即删除会话。
     */
    getSession(sessionId: string): SessionData | undefined;
    /**
     * 唤醒等待该会话状态变化的短等待调用
     */
    notifyWaiters(sessionId: string): void;
    /**
     * 更新会话
     */
    updateSession(sessionId: string, updates: Partial<SessionData>): boolean;
    /**
     * 删除会话
     */
    deleteSession(sessionId: string): boolean;
    /**
     * 获取所有活跃会话
     */
    getAllSessions(): Map<string, SessionData>;
    /**
     * 获取活跃会话数量
     */
    getSessionCount(): number;
    /**
     * 清理已经完成的结果，以及旧版没有 status 字段的遗留会话
     */
    cleanupExpiredSessions(): number;
    /**
     * 启动清理定时器
     */
    private startCleanupTimer;
    /**
     * 停止清理定时器
     */
    stopCleanupTimer(): void;
    /**
     * 清理所有会话
     */
    clear(): void;
    /**
     * 获取会话统计信息
     */
    getStats(): {
        totalSessions: number;
        activeSessions: number;
        expiredSessions: number;
    };
}
//# sourceMappingURL=session-storage.d.ts.map