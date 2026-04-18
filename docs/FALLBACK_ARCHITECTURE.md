# MCP Feedback Collector — 四级兜底架构

> 为何需要：Cursor stdio transport 有 idle-kill 老毛病；外部 HTTP 服务有崩溃风险；单一链路不可靠 → 必须多层冗余。

## 架构总览

```
AI Turn 结束前必须走的其中一条：

L1 primary  HTTP :5050   (nssm 服务 / Linux systemd)      ─┐
                                                          │ 3次失败
L2 backup   HTTP :5051   (nssm 服务 / Linux systemd)      ─┤
                                                          │ 3次失败
L3 stdio    (Cursor 自 spawn，不依赖外部进程)              ─┤
                                                          │ 3次失败
L4 AskQuestion  (Cursor 内置兜底)                          ─┘
                                                          │ 崩溃
L5 落盘待办文件  (.tmp_feedback_pending.txt)
```

## 各层职责与优势

| 层级 | 名称 | 类型 | 依赖 | 优势 | 劣势 |
|---|---|---|---|---|---|
| L1 | primary HTTP | Streamable HTTP | 外部 node 进程 (nssm 服务) | 稳定、不怕 Cursor 重启、无 idle-kill | 依赖进程存活 |
| L2 | backup HTTP | Streamable HTTP | 外部 node 进程 (nssm 服务) | 与 L1 双活互备 | 同上 |
| L3 | stdio | stdio JSON-RPC | Cursor 自 spawn 子进程 | **不依赖任何外部后台进程**，只要 Cursor 活着就一定在 | 有 V2 FSM idle-kill 潜在问题，适合短调用 |
| L4 | AskQuestion | Cursor 内置 | 无 | 永远可用（除非 Cursor 崩） | AI 需预置选项，交互有限 |
| L5 | 落盘 | 文件系统 | 文件写权限 | 极端兜底，丢不了信息 | 非实时 |

## MCP 注册（`~/.cursor/mcp.json`）

```jsonc
{
  "mcpServers": {
    "mcp-feedback-collector":         { "url": "http://127.0.0.1:5050/mcp" },
    "mcp-feedback-collector-backup":  { "url": "http://127.0.0.1:5051/mcp" },
    "mcp-feedback-collector-stdio": {
      "command": "node",
      "args":    ["F:\\Project\\mcp-feedback-collector-web\\dist\\cli.js"],
      "env": {
        "MCP_TRANSPORT_MODE":        "stdio",
        "MCP_WEB_PORT":              "5052",
        "MCP_DIALOG_TIMEOUT":        "300",
        "MCP_KILL_PORT_PROCESS":     "true",
        "MCP_CLEANUP_PORT_ON_START": "true",
        "MCP_ENABLE_CHAT":           "false",
        "MCP_ENABLE_IMAGE_TO_TEXT":  "false",
        "MCP_USE_FIXED_URL":         "true",
        "MCP_FORCE_PORT":            "true"
      }
    }
  }
}
```

## 调用规则（由 Cursor 全局 rule 强制）

规则文件：`~/.cursor/rules/mcp-feedback-params.mdc`（`alwaysApply: true`）

### 🔴 铁律

每个 AI turn 的**最后一个动作**必须是以下 4 个工具之一：
1. `CallMcpTool` → `mcp-feedback-collector` / `collect_feedback`
2. `CallMcpTool` → `mcp-feedback-collector-backup` / `collect_feedback`
3. `CallMcpTool` → `mcp-feedback-collector-stdio` / `collect_feedback`
4. `AskQuestion`

❌ 禁止纯文本结尾。

### 失败处理流程

```
primary retry × 3  ─失败→  backup retry × 3  ─失败→  stdio retry × 3
     │                        │                         │
     ↓ 任一成功                ↓ 任一成功                ↓ 任一成功
   继续                       继续                      继续
                                                         │
                                                         ↓ 3次都失败
                                                  AskQuestion 循环兜底
                                                         │
                                                         ↓ 崩溃
                                                  落盘 .tmp_feedback_pending.txt
```

### 结束条件

只有用户明确说"停止 / 结束 / 不用了 / 够了 / done / stop / bye"才能终止循环。反馈为空、超时等非明确结束信号，都视为继续。

## 服务端关键修复

### stdio 模式 stdout 污染保护

`src/utils/stdio-bootstrap.ts` 作为**第一个 import**加载：

```ts
if (process.env.MCP_TRANSPORT_MODE === 'stdio') {
  // 1. 重绑 console.log/info/debug → stderr
  // 2. 劫持 process.stdout.write：只允许 JSON-RPC（{...} 或 [...]）通过
  // 3. 挂 process.on('exit' / 'uncaughtException' / ...) 诊断探针，写 TEMP/mcp-stdio-diag-<pid>.log
}
```

### 默认 MCP 日志级别

`src/utils/logger.ts`：

```ts
private mcpLogLevel: MCPLogLevel = 'emergency';
```

防止启动期 `notifications/message` 在客户端发 `notifications/initialized` 之前到达，被 strict client（Cursor）判定为协议违规而关闭 transport。

### 心跳

`src/server/mcp-server.ts` — 20 秒间隔的双向 `ping()` 请求（不是单向 notification）。连续 3 次失败停止心跳，交给 transport.onclose 处理。

### 端口冲突

`MCP_KILL_PORT_PROCESS=true` + `MCP_CLEANUP_PORT_ON_START=true` — stdio 启动时如 5052 被僵尸老实例占用则强制接管。

## Windows 部署（nssm 服务）

### 一次性安装（管理员 PowerShell）

前置：`C:\tools\nssm\nssm.exe` 已就位；`F:\Project\mcp-feedback-collector-web\dist\cli.js` 已 build。

```powershell
$NSSM='C:\tools\nssm\nssm.exe'
$NODE='C:\Program Files\nodejs\node.exe'
$APP_DIR='F:\Project\mcp-feedback-collector-web'
$APP_ENTRY="$APP_DIR\dist\cli.js"
$LOG_DIR="$APP_DIR\logs"
New-Item -ItemType Directory -Force -Path $LOG_DIR | Out-Null

function Install-Mcp($name, $port, $display) {
    & $NSSM stop   $name confirm 2>$null
    & $NSSM remove $name confirm 2>$null
    & $NSSM install $name $NODE $APP_ENTRY
    & $NSSM set $name AppDirectory $APP_DIR
    & $NSSM set $name DisplayName  $display
    & $NSSM set $name Start SERVICE_AUTO_START
    $env = "MCP_TRANSPORT_MODE=http`nMCP_WEB_PORT=$port`nMCP_DIALOG_TIMEOUT=300`nMCP_ENABLE_CHAT=false`nMCP_ENABLE_IMAGE_TO_TEXT=false`nMCP_USE_FIXED_URL=true`nMCP_FORCE_PORT=true`nMCP_KILL_PORT_PROCESS=false`nMCP_CLEANUP_PORT_ON_START=true`nMCP_CORS_ORIGIN=*`nNODE_ENV=production`nLOG_LEVEL=info"
    & $NSSM set $name AppEnvironmentExtra $env
    & $NSSM set $name AppStdout "$LOG_DIR\$name.out.log"
    & $NSSM set $name AppStderr "$LOG_DIR\$name.err.log"
    & $NSSM set $name AppRotateFiles 1; & $NSSM set $name AppRotateOnline 1; & $NSSM set $name AppRotateBytes 10485760
    & $NSSM set $name AppExit Default Restart
    & $NSSM set $name AppRestartDelay 3000
    & $NSSM start $name
}

Install-Mcp 'McpFeedbackCollector'       5050 'MCP Feedback Collector (Primary :5050)'
Install-Mcp 'McpFeedbackCollectorBackup' 5051 'MCP Feedback Collector (Backup :5051)'
```

### 管理命令

```powershell
$NSSM='C:\tools\nssm\nssm.exe'
& $NSSM status McpFeedbackCollector
& $NSSM restart McpFeedbackCollector
& $NSSM stop   McpFeedbackCollector confirm
& $NSSM remove McpFeedbackCollector confirm
```

### 日志位置

- 服务 stdout：`F:\Project\mcp-feedback-collector-web\logs\McpFeedbackCollector.out.log`
- 服务 stderr：同目录 `.err.log`
- stdio 诊断：`%TEMP%\mcp-stdio-diag-<pid>.log`

## Linux 部署（systemd，适用于远程服务器）

### 前置

```bash
cd /opt
git clone <repo> mcp-feedback-collector-web
cd mcp-feedback-collector-web
npm ci
npm run build
```

### systemd unit（主实例 :5050）

`/etc/systemd/system/mcp-feedback-collector.service`：

```ini
[Unit]
Description=MCP Feedback Collector (Primary :5050)
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/mcp-feedback-collector-web
ExecStart=/usr/bin/node /opt/mcp-feedback-collector-web/dist/cli.js
Restart=always
RestartSec=3
Environment=MCP_TRANSPORT_MODE=http
Environment=MCP_WEB_PORT=5050
Environment=MCP_DIALOG_TIMEOUT=300
Environment=MCP_ENABLE_CHAT=false
Environment=MCP_ENABLE_IMAGE_TO_TEXT=false
Environment=MCP_USE_FIXED_URL=true
Environment=MCP_FORCE_PORT=true
Environment=MCP_KILL_PORT_PROCESS=false
Environment=MCP_CLEANUP_PORT_ON_START=true
Environment=MCP_CORS_ORIGIN=*
Environment=NODE_ENV=production
Environment=LOG_LEVEL=info
StandardOutput=append:/var/log/mcp-feedback-collector.out.log
StandardError=append:/var/log/mcp-feedback-collector.err.log

[Install]
WantedBy=multi-user.target
```

### systemd unit（备用 :5051）

复制上面的 unit 到 `mcp-feedback-collector-backup.service`，改 `Description` 和 `MCP_WEB_PORT=5051`，日志文件加 `-backup` 后缀。

### 启用 + 启动

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now mcp-feedback-collector.service
sudo systemctl enable --now mcp-feedback-collector-backup.service
sudo systemctl status mcp-feedback-collector
sudo ss -tnlp | grep -E ':(5050|5051)'
```

### 远程访问

如果 Cursor 通过跳板/VPN 连远端：

```json
"mcp-feedback-collector-jp": {
  "url": "http://<jp-host>:5050/mcp"
}
```

⚠️ **安全提示**：远端 MCP 暴露到公网前应限制来源 IP 或加反向代理鉴权，避免任意用户调 `collect_feedback` 弹页面。

## 排障手册

### 症状：Cursor UI 显示 "Error"

1. 看 Cursor → Output → MCP Logs
2. 如果是 `transport_closed` 紧跟 `connect_success`：多半是 stdio 启动后 stdout 被污染或协议违规
3. 查 `%TEMP%\mcp-stdio-diag-<pid>.log`：
   - `[stdout->]` 行能看到发到 stdout 的内容
   - `[REDIRECTED to stderr]` 说明 bootstrap 拦截住了污染
   - `[process.exit] code=N` 说明进程崩退，同一前后文找 `[uncaughtException]`
   - 没有 `[alive]` 说明进程在 setInterval 之前就退了

### 症状：`Server not initialized`

HTTP 实例 session 过期或进程重启但 Cursor 用的老 session ID。Cursor 会自动重试 initialize，通常下一次调用就恢复。

### 症状：`ECONNREFUSED` / `Not connected`

L1/L2 的 node 进程已死。按兜底链自动切 L3。修复方法：
- Windows: `nssm start` 或查日志
- Linux: `systemctl restart ...`

### 症状：nssm 服务卡在 `SERVICE_PAUSED`

服务安装时 binding 5050/5051 失败留下来的半启动状态。清理方法：

```powershell
# 管理员 PS
$NSSM='C:\tools\nssm\nssm.exe'
& $NSSM stop McpFeedbackCollector confirm
& $NSSM remove McpFeedbackCollector confirm
# 重新 install
```

## 历史与设计动机

- 2026-04 —— 最初单 stdio 模式，遭遇 Cursor V2 FSM 在连接 `idle` 20-90 秒后主动 close transport，导致 `collect_feedback` 调用挂起后永久失联
- 切 HTTP Streamable Transport 规避 idle-kill，但引入新问题：进程崩溃无兜底
- 加 backup HTTP 实例实现双活
- 用户洞察：HTTP 都依赖外部进程，还需一层不依赖外部的兜底 → 保留 stdio 作为 L3
- 发现 stdio 模式 `console.log` 污染 stdout 导致 transport_closed → 加 stdio-bootstrap 全局拦截
- 发现启动期 `notifications/message` 违反 MCP 协议时序 → 默认 logLevel 改 emergency
- 发现端口冲突导致新实例崩退 → 打开 `MCP_KILL_PORT_PROCESS=true`

最终形成四层可观测、可自愈的兜底架构。
