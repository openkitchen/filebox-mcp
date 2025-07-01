# FileBox MCP：基于文件系统的AI Agent消息传递系统

FileBox MCP 是一个基于文件系统的轻量级AI Agent消息传递系统，允许不同的AI工具通过共享文件系统进行结构化的消息交换。

## 🚀 快速开始

### 1. 安装依赖

```bash
bun install
```

### 2. 构建项目

```bash
bun run build
```

**重要：** 每次修改代码后都需要重新运行 `bun run build` 来确保MCP服务器使用最新的代码。

### 3. 项目配置

在每个参与通信的项目根目录下创建 `.filebox` 配置文件，定义当前项目的代理身份和所有代理的项目根路径：

```json
{
  "current_agent": "qa_agent",
  "agents": {
    "qa_agent": "/path/to/qa_repo_root",
    "dev_agent": "/path/to/dev_repo_root",
    "frontend_agent": "/path/to/frontend_repo_root",
    "backend_agent": "/path/to/backend_repo_root"
  }
}
```

你可以参考项目中的 `.filebox.example` 文件。

**配置说明：**
- `current_agent`: 当前项目的代理标识符
- `agents`: 所有参与通信的代理及其项目根目录路径的映射

**注意事项：**
- `.filebox` 文件必须放在项目根目录下
- `current_agent` 必须存在于 `agents` 配置中
- 路径必须是绝对路径，指向各个代理项目的根目录

#### 3.3 MCP服务器配置

在你的 MCP 配置文件中（如 `~/.cursor/mcp.json`）添加以下配置：

```json
{
  "mcpServers": {
    "FileBox-Server": {
      "command": "/path/to/bun",
      "type": "stdio",
      "args": ["/path/to/filebox-mcp/src/index.ts"],
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
- 将 `/path/to/bun` 替换为你的 `bun` 可执行文件路径
- 将 `/path/to/filebox-mcp/src/index.ts` 替换为项目中 `src/index.ts` 的实际路径
- FileBox MCP 现在会自动从 `.filebox` 配置文件中读取所有配置信息，不再需要通过环境变量传递配置

### 4. 创建邮箱目录

为每个Agent项目创建标准的邮箱目录结构：

```bash
# 为每个项目创建邮箱目录
mkdir -p /path/to/qa_repo/docs/mailbox/{inbox,outbox,done,cancel}
mkdir -p /path/to/frontend_repo/docs/mailbox/{inbox,outbox,done,cancel}
mkdir -p /path/to/backend_repo/docs/mailbox/{inbox,outbox,done,cancel}
```

### 5. 重启 MCP 服务器

**重要：** 修改配置或代码后，需要重启你的AI工具（如Cursor）来重新加载MCP服务器实例。

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
   bun run build
   ```

2. **重启AI工具**
   - 重启Cursor或你使用的AI工具
   - 这确保MCP服务器使用最新的代码

3. **测试功能**
   - 使用MCP工具进行测试
   - 检查消息文件格式是否正确

### 常见问题

**Q: 为什么修改代码后MCP服务器还在使用旧代码？**
A: 需要先运行 `bun run build` 重新构建，然后重启AI工具来重新加载MCP服务器实例。

**Q: 为什么消息的Sender信息不正确？**
A: 检查MCP配置中每个Agent的 `current_agent_id` 是否正确设置，并确保重启了AI工具。

**Q: 消息文件在哪里？**
A: 消息文件存储在配置的 `mailbox_path` 目录下的 `inbox`、`outbox`、`done`、`cancel` 子目录中。

## 🧪 测试

运行完整的消息线程测试：

```bash
bun test_filebox.cjs
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
- `filebox_list_messages` - 列出指定代理的邮箱消息
- `filebox_read_message` - 读取消息内容
- `filebox_resolve_message` - 标记消息为已解决
- `filebox_reject_message` - 拒绝消息

### runAs 参数支持

所有工具都支持可选的 `runAs` 参数，允许AI在同一项目中以不同代理身份执行操作：

```javascript
// 以默认代理身份（配置中的 current_agent）发送消息
filebox_send_message({
  receiver_id: "frontend_agent",
  msg_type: "BR", 
  title: "Bug报告",
  content: "发现一个问题..."
})

// 明确指定以 qa_agent 身份发送消息
filebox_send_message({
  receiver_id: "frontend_agent",
  msg_type: "BR",
  title: "Bug报告", 
  content: "发现一个问题...",
  runAs: "qa_agent"
})

// 查看 frontend_agent 的收件箱
filebox_list_messages({
  box_type: "inbox",
  runAs: "frontend_agent"
})
```

**runAs 功能特别适用于：**
- 同一个仓库中包含多个团队的代码（如QA + Frontend + Backend）
- AI需要在不同角色间切换来处理跨团队协作
- 测试多代理交互场景

**多代理单仓库支持：**
当多个代理共享同一个项目根路径时，系统会自动为每个代理创建独立的邮箱目录：
```
docs/mailbox/
├── qa_agent/
│   ├── inbox/
│   ├── outbox/
│   ├── done/
│   └── cancel/
├── frontend_agent/
│   ├── inbox/
│   └── ...
└── backend_agent/
    ├── inbox/
    └── ...
```

## 📝 消息类型

- `BR` - Bug Report（缺陷报告）
- `ER` - Enhancement Request（功能增强请求）
- `ACK` - Acknowledgement（确认）
- `DIS` - Discussion（讨论）

## 🎯 设计目标

- **简单性**：基于文件系统，无需复杂的网络协议
- **可追溯性**：完整的消息历史记录
- **可读性**：人类可读的Markdown格式
- **可扩展性**：支持多种消息类型和Agent
