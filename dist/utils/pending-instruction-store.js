/**
 * 用户临时指令存储（FIFO）
 *
 * 设计：
 *   - 使用 JSON 文件，跨进程共享（多个 Cursor 窗口 / NSSM 服务都能看到同一份）
 *   - check 时立即从 pending 队列中取出（避免 agent 看到旧任务以为还要做）
 *   - 取出后归档到 history 文件，保留 24h，方便用户回查
 *   - 文件读写带简易锁防并发损坏
 */
import fs from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import { logger } from './logger.js';
const HISTORY_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_CONTENT_LEN = 4000;
function getDataDir() {
    const fromEnv = process.env['MCP_FEEDBACK_DATA_DIR'];
    if (fromEnv)
        return fromEnv;
    return path.join(os.homedir(), '.mcp-feedback-collector');
}
function getFilePath() {
    return path.join(getDataDir(), 'pending-instructions.json');
}
function ensureDir() {
    const dir = getDataDir();
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}
function readStore() {
    try {
        ensureDir();
        const fp = getFilePath();
        if (!fs.existsSync(fp))
            return { pending: [], history: [] };
        const raw = fs.readFileSync(fp, 'utf8');
        if (!raw.trim())
            return { pending: [], history: [] };
        const parsed = JSON.parse(raw);
        return {
            pending: Array.isArray(parsed.pending) ? parsed.pending : [],
            history: Array.isArray(parsed.history) ? parsed.history : [],
        };
    }
    catch (e) {
        logger.warn(`PendingInstructionStore.readStore failed: ${e.message}`);
        return { pending: [], history: [] };
    }
}
function writeStore(store) {
    ensureDir();
    const fp = getFilePath();
    // 写到临时文件再 rename，降低写到一半被读的概率
    const tmp = `${fp}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(store, null, 2), 'utf8');
    fs.renameSync(tmp, fp);
}
function pruneHistory(store) {
    const cutoff = Date.now() - HISTORY_TTL_MS;
    store.history = store.history.filter((h) => h.consumedAt >= cutoff);
}
export const PendingInstructionStore = {
    /**
     * 添加一条临时指令到队列尾部
     */
    add(content) {
        const trimmed = (content || '').trim().slice(0, MAX_CONTENT_LEN);
        if (!trimmed) {
            throw new Error('Instruction content is empty');
        }
        const inst = {
            id: randomUUID(),
            content: trimmed,
            createdAt: Date.now(),
        };
        const store = readStore();
        store.pending.push(inst);
        pruneHistory(store);
        writeStore(store);
        return inst;
    },
    /**
     * 列出当前 pending 队列（不消费、用于 web UI 显示）
     */
    list() {
        return readStore().pending.slice();
    },
    /**
     * 列出 history（已被 agent 拿走的，最近 24h）
     */
    history() {
        return readStore().history.slice();
    },
    /**
     * agent 调用：原子地拿走全部 pending 指令，
     * 标记到 history，之后从 pending 中清空
     */
    consumeAll() {
        const store = readStore();
        if (!store.pending.length) {
            pruneHistory(store);
            writeStore(store);
            return [];
        }
        const taken = store.pending.slice();
        const now = Date.now();
        store.history = store.history.concat(taken.map((p) => ({ ...p, consumedAt: now })));
        store.pending = [];
        pruneHistory(store);
        writeStore(store);
        return taken;
    },
    /**
     * 用户在 UI 上手动取消一条 pending（比如插错了）
     */
    cancel(id) {
        const store = readStore();
        const before = store.pending.length;
        store.pending = store.pending.filter((p) => p.id !== id);
        if (store.pending.length === before)
            return false;
        pruneHistory(store);
        writeStore(store);
        return true;
    },
    /**
     * 清空 pending 队列（不动 history）
     */
    clearPending() {
        const store = readStore();
        const n = store.pending.length;
        store.pending = [];
        pruneHistory(store);
        writeStore(store);
        return n;
    },
};
//# sourceMappingURL=pending-instruction-store.js.map