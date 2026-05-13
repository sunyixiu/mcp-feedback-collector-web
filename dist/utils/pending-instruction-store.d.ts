/**
 * 用户临时指令存储（FIFO）
 *
 * 设计：
 *   - 使用 JSON 文件，跨进程共享（多个 Cursor 窗口 / NSSM 服务都能看到同一份）
 *   - check 时立即从 pending 队列中取出（避免 agent 看到旧任务以为还要做）
 *   - 取出后归档到 history 文件，保留 24h，方便用户回查
 *   - 文件读写带简易锁防并发损坏
 */
export interface PendingInstruction {
    id: string;
    content: string;
    createdAt: number;
}
export interface ConsumedInstruction extends PendingInstruction {
    consumedAt: number;
}
export declare const PendingInstructionStore: {
    /**
     * 添加一条临时指令到队列尾部
     */
    add(content: string): PendingInstruction;
    /**
     * 列出当前 pending 队列（不消费、用于 web UI 显示）
     */
    list(): PendingInstruction[];
    /**
     * 列出 history（已被 agent 拿走的，最近 24h）
     */
    history(): ConsumedInstruction[];
    /**
     * agent 调用：原子地拿走全部 pending 指令，
     * 标记到 history，之后从 pending 中清空
     */
    consumeAll(): PendingInstruction[];
    /**
     * 用户在 UI 上手动取消一条 pending（比如插错了）
     */
    cancel(id: string): boolean;
    /**
     * 清空 pending 队列（不动 history）
     */
    clearPending(): number;
};
//# sourceMappingURL=pending-instruction-store.d.ts.map