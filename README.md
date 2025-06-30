# FileBox MCP：基于文件系统的AI Agent消息传递系统

FileBox MCP 是一个基于文件系统的轻量级AI Agent消息传递系统，允许不同的AI工具通过共享文件系统进行结构化的消息交换。

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 构建项目

```bash
npm run build
```

**重要：** 每次修改代码后都需要重新运行 `npm run build` 来确保MCP服务器使用最新的代码。

### 3. 配置 MCP 服务器

在你的 MCP 配置文件中（如 `~/.cursor/mcp.json`）添加以下配置：

```json
{
  "mcpServers": {
    "FileBox-QA-Agent": {
      "command": "/Users/xiaowei/.bun/bin/bun",
      "type": "stdio",
      "args": [
        "/path/to/your/filebox-mcp/src/index.ts"
      ],
      "env": {
        "FILEBOX_CONFIG": "{\"current_agent_id\":\"qa_agent\",\"agents\":{\"qa_agent\":{\"mailbox_path\":\"/tmp/qa_agent_mailbox\"},\"dev_agent\":{\"mailbox_path\":\"/tmp/dev_agent_mailbox\"}}}"
      },
      "autoApprove": [
        "filebox_send_message",
        "filebox_list_messages",
        "filebox_read_message",
        "filebox_resolve_message",
        "filebox_reject_message"
      ]
    },
    "FileBox-Dev-Agent": {
      "command": "/Users/xiaowei/.bun/bin/bun",
      "type": "stdio",
      "args": [
        "/path/to/your/filebox-mcp/src/index.ts"
      ],
      "env": {
        "FILEBOX_CONFIG": "{\"current_agent_id\":\"dev_agent\",\"agents\":{\"qa_agent\":{\"mailbox_path\":\"/tmp/qa_agent_mailbox\"},\"dev_agent\":{\"mailbox_path\":\"/tmp/dev_agent_mailbox\"}}}"
      },
      "autoApprove": [
        "filebox_send_message",
        "filebox_list_messages",
        "filebox_read_message",
        "filebox_resolve_message",
        "filebox_reject_message"
      ]
    }
  }
}
```

**配置说明：**
- 将 `/path/to/your/filebox-mcp/src/index.ts` 替换为你的实际项目路径
- 每个Agent都有独立的 `current_agent_id` 配置
- `mailbox_path` 指向每个Agent的邮箱目录

### 4. 重启 MCP 服务器

**重要：** 修改配置或代码后，需要重启你的AI工具（如Cursor）来重新加载MCP服务器实例。

### 5. 创建邮箱目录

```bash
mkdir -p /tmp/qa_agent_mailbox/{inbox,outbox,done,cancel}
mkdir -p /tmp/dev_agent_mailbox/{inbox,outbox,done,cancel}
```

## 📧 消息格式

FileBox MCP 使用简化的email thread格式，每次回复都在消息文件的前面添加新内容：

```markdown
# BR: Bug标题

**Format Version:** 1.0
**Message ID:** uuid
**Sender:** sender_agent_id
**Receiver:** receiver_agent_id
**Timestamp:** ISO8601时间戳
**Original Sender:** original_sender_id
**Current Owner:** current_owner_id

===== MESSAGE THREAD =====

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 2025-06-30T08:25:15.890Z - dev_agent to qa_agent (ACK)

最新的回复内容...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 2025-06-30T08:15:22.616Z - qa_agent to dev_agent (BR)

原始消息内容...
```

### 文件命名规则

文件名格式：`YYYY-MM-DD_HHMM-TYPE-title-msgid.md`

- **时间戳**：`2025-06-30_0815` (精确到分钟)
- **消息类型**：保持原始发起者定义的类型（BR、ACK、ER等）
- **标题**：消息标题的slug格式
- **消息ID**：UUID的前8位

### 关键改进

1. **强分割符**：使用 `━━━` 分割线明确区分不同的消息回复
2. **固定文件名**：回复时不改变文件名，直接覆盖原文件
3. **简化时间戳**：文件名中的时间戳精确到分钟，格式更简洁
4. **清晰的线程分隔**：使用 `===== MESSAGE THREAD =====` 分隔元数据和消息内容

## 🛠️ 开发流程

### 修改代码后的步骤

1. **重新构建**
   ```bash
   npm run build
   ```

2. **重启AI工具**
   - 重启Cursor或你使用的AI工具
   - 这确保MCP服务器使用最新的代码

3. **测试功能**
   - 使用MCP工具进行测试
   - 检查消息文件格式是否正确

### 常见问题

**Q: 为什么修改代码后MCP服务器还在使用旧代码？**
A: 需要先运行 `npm run build` 重新构建，然后重启AI工具来重新加载MCP服务器实例。

**Q: 为什么消息的Sender信息不正确？**
A: 检查MCP配置中每个Agent的 `current_agent_id` 是否正确设置，并确保重启了AI工具。

**Q: 消息文件在哪里？**
A: 消息文件存储在配置的 `mailbox_path` 目录下的 `inbox`、`outbox`、`done`、`cancel` 子目录中。

## 🧪 测试

运行完整的消息线程测试：

```bash
node test_filebox.cjs
```

这会模拟一个完整的Bug修复流程，包括：
1. QA Agent发送Bug报告
2. Dev Agent回复确认
3. QA Agent补充信息
4. Dev Agent提供解决方案
5. 验证消息历史记录

## 📁 项目结构

```
filebox-mcp/
├── src/
│   ├── core/
│   │   ├── filebox.ts      # 核心FileBox服务
│   │   ├── tools.ts        # MCP工具定义
│   │   ├── resources.ts    # MCP资源定义
│   │   └── prompts.ts      # MCP提示定义
│   ├── server/
│   │   └── server.ts       # MCP服务器启动
│   └── index.ts            # 主入口文件
├── docs/                   # 文档
├── test_filebox.cjs        # 测试脚本
└── README.md
```

## 🔧 MCP工具

FileBox MCP 提供以下工具：

- `filebox_send_message` - 发送消息
- `filebox_list_messages` - 列出邮箱中的消息
- `filebox_read_message` - 读取消息内容
- `filebox_resolve_message` - 标记消息为已解决
- `filebox_reject_message` - 拒绝消息

## 📝 消息类型

- `BR` - Bug Report（缺陷报告）
- `ER` - Enhancement Request（功能增强请求）
- `ACK` - Acknowledgement（确认）
- `SU` - Status Update（状态更新）
- `DIS` - Discussion（讨论）

## 🎯 设计目标

- **简单性**：基于文件系统，无需复杂的网络协议
- **可追溯性**：完整的消息历史记录
- **可读性**：人类可读的Markdown格式
- **可扩展性**：支持多种消息类型和Agent
