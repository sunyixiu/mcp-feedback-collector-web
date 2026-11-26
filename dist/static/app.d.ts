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
declare function compressImageFile(file: any, maxDim?: number, quality?: number): Promise<any>;
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
 * 启动会话倒计时显示
 * @param {number} deadline 服务端下发的绝对截止时间戳（毫秒）
 */
declare function startSessionCountdown(deadline: number): void;
/**
 * 清除会话倒计时显示
 */
declare function clearSessionTimeout(): void;
/**
 * 获取剩余时间（秒），基于服务端截止时间戳
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
declare function _draftsLoad(): any[];
declare function _draftsSave(arr: any): void;
declare function _draftsGenId(): string;
/**
 * 实时保存当前草稿（debounce）
 * - 文本为空 + 草稿状态为 editing → 删除该草稿（避免空记录）
 * - 文本非空 → 更新或插入
 */
declare function saveCurrentDraft(text: any): void;
/**
 * 标记当前正在编辑的草稿为某种状态
 * 提交开始时不立即标记；提交成功才标 sent；提交失败/超时标 failed。
 */
declare function markCurrentDraft(status: any): void;
declare function deleteDraft(id: any): void;
declare function clearAllDrafts(): void;
declare function restoreDraft(id: any): void;
declare function renderDraftsList(): void;
declare function initDraftsUI(): void;
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
declare let sessionDeadline: null;
declare let sessionTimeoutDuration: number;
declare let countdownIntervalId: null;
declare let lastActivityTime: number;
declare let keepAliveCheckInterval: null;
declare const KEEP_ALIVE_IDLE_MS: 180000;
declare const KEEP_ALIVE_CHECK_MS: 30000;
declare const DRAFTS_KEY: "mcp_feedback_drafts_v1";
declare const DRAFTS_MAX: 10;
declare const DRAFT_DEBOUNCE_MS: 300;
declare let _currentDraftId: null;
declare let _draftSaveTimer: null;
declare let _audioCtx: null;
declare let _titleFlashInterval: null;
declare let _originalTitle: null;
declare let _lastRingSessionId: null;
declare let _lastRingSummaryHash: null;
declare let _backgroundRingInterval: null;
declare const NOTIFY_SOUND_KEY: "mcp_notify_sound_enabled";
declare const BACKGROUND_RING_INTERVAL_MS: 25000;
declare const QUICK_PHRASE: "\n\n---\n\nWhenever you want to ask a question, use the MCP feedback tools.\n\nBefore completing a user request:\n1. Call check_pending_instructions first and process every returned instruction in FIFO order.\n2. Call collect_feedback once with work_summary. It returns a session_id immediately.\n3. Call wait_feedback with that session_id for at most 45 seconds per call.\n4. If the status is still waiting, call wait_feedback again later or use poll_feedback for an immediate check.\n5. Stop only when the feedback session returns completed, timed_out, cancelled, or an unrecoverable error.\n\nDo not call collect_feedback repeatedly for the same work summary while the previous session is still waiting.";
declare const PENDING_API: "/api/pending-instructions";
declare let pendingPollTimer: null;
//# sourceMappingURL=app.d.ts.map