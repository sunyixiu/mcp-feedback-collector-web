declare function _hashSummary(s: any): string;
declare function _maybeRing(sessionId: any, summary: any): void;
declare function startBackgroundRingLoop(summary: any): void;
declare function stopBackgroundRingLoop(): void;
declare function isNotifySoundEnabled(): boolean;
declare function setNotifySoundEnabled(enabled: any): void;
declare function _playBeep(freq: any, duration: any, delay: any): void;
declare function flashTitle(altTitle: any): void;
declare function requestNotificationPermissionOnce(): void;
declare function showSystemNotification(title: any, body: any): void;
declare function notifyNewFeedback(summary: any): void;
declare function loadChatConfig(): Promise<boolean>;
declare function bindFeedbackTextareaEnhancements(): void;
declare function initializeSocket(): void;
declare function updateConnectionStatus(status: any, text: any): void;
declare function showStatusMessage(type: any, message: any, autoRemove?: boolean): HTMLDivElement;
declare function clearAllStatusMessages(): void;
declare function showTab(tabName: any): void;
declare function switchTab(tabName: any): void;
declare function selectImages(): void;
declare function pasteImages(): void;
declare function addImage(file: any): void;
declare function updateImagePreviews(): void;
declare function removeImage(index: any): void;
declare function convertImagesToText(): Promise<void>;
declare function clearFeedbackForm(): void;
declare function showSubmitConfirmDialog(feedbackText: any): void;
declare function hideSubmitConfirmDialog(): void;
declare function submitFeedback(feedbackText: any, shouldCloseAfterSubmit: any): void;
declare function displayWorkSummary(workSummary: any): void;
/**
 * 显示刷新状态
 */
declare function showRefreshStatus(type: any, message: any): void;
/**
 * 隐藏刷新状态
 */
declare function hideRefreshStatus(): void;
/**
 * 手动刷新工作汇报
 */
declare function refreshWorkSummary(): void;
/**
 * 开始自动刷新
 */
declare function startAutoRefresh(): void;
/**
 * 停止自动刷新
 */
declare function stopAutoRefresh(): void;
/**
 * 更新自动刷新倒计时显示
 */
declare function updateAutoRefreshCountdown(): void;
declare function selectChatImage(): void;
declare function pasteChatImage(): void;
declare function addChatImage(file: any): void;
declare function updateChatImagePreviews(): void;
declare function removeChatImage(index: any): void;
declare function handleChatKeydown(event: any): void;
declare function sendChatMessage(): Promise<void>;
declare function callChatAPI(messageText: any, images: any): Promise<void>;
declare function buildAPIMessage(messageText: any, images: any): {
    role: string;
    content: any;
};
declare function handleStreamResponse(response: any): Promise<void>;
declare function addMessageToChat(sender: any, text: any, images: any): HTMLDivElement | null;
declare function clearChat(): void;
declare function clearChatMessages(): void;
declare function fetchVersionInfo(): Promise<void>;
declare function updateVersionDisplay(version: any): void;
/**
 * 启动会话超时计时器
 * @param {number} timeoutMs 超时时间（毫秒）
 */
declare function startSessionTimeout(timeoutMs: number): void;
/**
 * 清除会话超时计时器
 */
declare function clearSessionTimeout(): void;
/**
 * 显示超时警告
 */
declare function showTimeoutWarning(): void;
/**
 * 前端会话超时处理 - 自动提交"等待用户"消息，保持通话不中断
 * 熔断机制：连续超时达到 MAX_CONSECUTIVE_TIMEOUTS 次后，发送终止信号
 */
declare function handleFrontendTimeout(): void;
/**
 * 获取剩余时间（秒）
 */
declare function getRemainingTime(): number;
/**
 * 启动倒计时显示
 */
declare function startCountdownDisplay(): void;
/**
 * 更新倒计时显示
 */
declare function updateCountdownDisplay(): void;
/**
 * 隐藏倒计时显示
 */
declare function hideCountdownDisplay(): void;
/**
 * 记录用户活动（输入、点击、鼠标移动等）
 */
declare function recordUserActivity(): void;
/**
 * 启动空闲保活监控
 */
declare function startKeepAliveMonitor(): void;
/**
 * 停止空闲保活监控
 */
declare function stopKeepAliveMonitor(): void;
declare function initPendingInstructionsUI(): void;
declare function injectPendingStyles(): void;
declare function injectPendingDom(): void;
declare function bindPendingHandlers(): void;
declare function submitPending(): Promise<void>;
declare function refreshPendingList(): Promise<void>;
declare function renderPendingBadge(count: any): void;
declare function renderPendingList(list: any): void;
declare function cancelPending(id: any): Promise<void>;
declare function clearPending(): Promise<void>;
declare function setPendingError(msg: any): void;
declare function escapeHtml(s: any): string;
/**
 * MCP Feedback Collector - 前端应用脚本
 */
declare let socket: null;
declare let currentTab: string;
declare let selectedImages: any[];
declare let chatImages: any[];
declare let isConnected: boolean;
declare let currentFeedbackSession: null;
declare let chatConfig: null;
declare let chatHistory: any[];
declare let currentAIMessage: null;
declare let currentAIContent: string;
declare let isApiCalling: boolean;
declare let autoRefreshInterval: null;
declare let autoRefreshCountdown: number;
declare let autoRefreshTimer: null;
declare let lastWorkSummary: null;
declare let sessionTimeoutId: null;
declare let sessionStartTime: null;
declare let sessionTimeoutDuration: number;
declare let autoSubmitWarningShown: boolean;
declare let timeoutWarningId: null;
declare let countdownIntervalId: null;
declare let consecutiveTimeoutCount: number;
declare const MAX_CONSECUTIVE_TIMEOUTS: 5;
declare let lastActivityTime: number;
declare let keepAliveCheckInterval: null;
declare const KEEP_ALIVE_IDLE_MS: 180000;
declare const KEEP_ALIVE_CHECK_MS: 30000;
declare let _audioCtx: null;
declare let _titleFlashInterval: null;
declare let _originalTitle: null;
declare let _lastRingSessionId: null;
declare let _lastRingSummaryHash: null;
declare let _backgroundRingInterval: null;
declare const NOTIFY_SOUND_KEY: "mcp_notify_sound_enabled";
declare const BACKGROUND_RING_INTERVAL_MS: 25000;
declare const QUICK_PHRASE: "\n\n---\n\nWhenever you want to ask a question, always call the MCP .\n\nWhenever you are about to complete a user request, call the MCP instead of simply ending the process. Keep calling MCP until the users feedback is empty, then end the request. mcp-feedback-collector.collect_feedback\n\n**Workflow before ending each turn:**\n1. Call `check_pending_instructions` first \u2014 if instructions exist, process them in FIFO order before collecting feedback.\n2. Only call `collect_feedback` when `check_pending_instructions` returns an empty list.\n3. Keep calling `collect_feedback` until the user feedback is empty, then end the request.\n\n**How to call (MCP tool):**\n- Server priority (try in order): `project-0-booking-theoryabc-mcp-feedback-collector` \u2192 `user-mcp-feedback-collector-stdio` \u2192 `user-mcp-feedback-collector-backup`\n- Tool: `collect_feedback` with argument `{ \"work_summary\": \"<your summary>\" }`\n- Tool: `check_pending_instructions` with no arguments\n- If a server returns \"Not connected\" or \"tool not found\", try the next server.\n\n**Inserting temporary instructions:**\n- Users can insert out-of-band instructions at any time via the feedback web UI.\n- The agent MUST call `check_pending_instructions` before `collect_feedback` to pick these up.\n- This saves communication time by allowing async task injection.";
declare const PENDING_API: "/api/pending-instructions";
declare let pendingPollTimer: null;
//# sourceMappingURL=app.d.ts.map