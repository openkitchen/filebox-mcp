# FileBox MCP 使用示例

FileBox MCP 是一个基于文件系统的AI代理消息传递服务，支持邮件线程式的消息历史记录功能。

## 功能特性

- 📧 **邮件线程格式**：支持消息回复和线程追踪
- 🔄 **双向通信**：代理间可以互相发送和回复消息
- 📁 **文件系统存储**：所有消息以Markdown文件形式存储
- 🏷️ **消息分类**：支持多种消息类型（BR、ACK、ER等）
- 📝 **Markdown格式**：易于阅读和处理的消息格式

## 消息格式

### 新消息格式

```markdown
# BR: API响应延迟问题

**Format Version:** 1.0
**Message ID:** 1b1d8fc0-034e-4fd4-874b-a8d39f95ba68
**Sender:** qa_agent
**Receiver:** dev_agent
**Timestamp:** 2025-06-30T08:15:22.616Z
**Original Sender:** qa_agent
**Current Owner:** dev_agent

===== MESSAGE THREAD =====

## 2025-06-30T08:15:22.616Z - qa_agent to dev_agent (BR)

发现用户管理API响应时间异常。

**问题详情：**
- GET /api/users 接口响应时间超过5秒
- 数据库查询优化问题
- 影响前端用户体验

**测试数据：**
- 测试环境：staging
- 数据量：10万用户记录
- 查询类型：分页查询

**紧急程度：** 高优先级
```

### 回复消息格式

当有回复时，新的回复会添加到消息线程的顶部，使用强分割符分隔：

```markdown
# BR: API响应延迟问题

**Format Version:** 1.0
**Message ID:** 1b1d8fc0-034e-4fd4-874b-a8d39f95ba68
**Sender:** dev_agent
**Receiver:** qa_agent
**Timestamp:** 2025-06-30T08:25:15.890Z
**Original Sender:** qa_agent
**Current Owner:** qa_agent

===== MESSAGE THREAD =====

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 2025-06-30T08:25:15.890Z - dev_agent to qa_agent (ACK)

已收到API性能问题报告，立即开始调查。

**问题分析：**
- 可能是分页查询没有使用索引
- 需要检查执行计划
- 考虑添加缓存机制

**解决方案：**
1. 优化数据库查询语句
2. 添加适当的索引
3. 实现Redis缓存

**预计完成时间：** 明天上午

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 2025-06-30T08:15:22.616Z - qa_agent to dev_agent (BR)

发现用户管理API响应时间异常。

**问题详情：**
- GET /api/users 接口响应时间超过5秒
- 数据库查询优化问题
- 影响前端用户体验

**测试数据：**
- 测试环境：staging
- 数据量：10万用户记录
- 查询类型：分页查询

**紧急程度：** 高优先级
```

## 文件命名规则

文件名格式：`YYYY-MM-DD_HHMM-TYPE-title-msgid.md`

- **时间戳**：`2025-06-30_0815` (精确到分钟)
- **消息类型**：保持原始发起者定义的类型（BR、ACK、ER等）
- **标题**：消息标题的slug格式
- **消息ID**：UUID的前8位

示例文件名：
- `2025-06-30_0815-BR-api-1b1d8fc0.md`
- `2025-06-30_0825-ACK-bug-fix-3f2a9b7c.md`

## 使用示例

### 1. 发送新消息

```javascript
// QA Agent 发送Bug报告给 Dev Agent
await filebox_send_message({
    receiver_id: "dev_agent",
    msg_type: "BR",
    title: "登录页面验证码显示异常",
    content: `在Chrome浏览器中发现验证码图片无法正常显示。

**复现步骤：**
1. 打开登录页面
2. 点击验证码图片
3. 验证码不刷新

**环境信息：**
- 浏览器：Chrome 120.0.6099.129
- 操作系统：macOS 14.2.1
- 网络：公司内网

**影响范围：** 所有用户`
});
```

### 2. 回复消息

```javascript
// Dev Agent 回复确认收到
await filebox_send_message({
    receiver_id: "qa_agent",
    msg_type: "ACK",
    title: "登录页面验证码显示异常",
    content: `已确认问题，开始修复。

**初步分析：**
- 可能是CDN缓存问题
- 验证码服务API调用异常

**修复计划：**
1. 检查验证码服务日志
2. 更新前端缓存策略
3. 测试验证

**预计修复时间：** 2小时内`,
    original_message_id: "1b1d8fc0-034e-4fd4-874b-a8d39f95ba68"
});
```

### 3. 查看消息列表

```javascript
// 查看收件箱
const messages = await filebox_list_messages({ box_type: "inbox" });
console.log(messages);
// 输出: ["2025-06-30_0815-BR-api-1b1d8fc0.md", "2025-06-30_0820-ER-login-3f2a9b7c.md"]
```

### 4. 读取消息内容

```javascript
// 读取具体消息
const content = await filebox_read_message({
    box_type: "inbox",
    filename: "2025-06-30_0815-BR-api-1b1d8fc0.md"
});
console.log(content);
```

## 消息类型说明

| 类型 | 全称 | 说明 | 使用场景 |
|------|------|------|----------|
| BR | Bug Report | 错误报告 | QA发现问题时使用 |
| ACK | Acknowledgment | 确认回复 | 确认收到消息并开始处理 |
| ER | Enhancement Request | 功能增强请求 | 提出新功能需求 |
| INFO | Information | 信息通知 | 一般信息分享 |
| URGENT | Urgent | 紧急消息 | 需要立即处理的问题 |

## 邮箱目录结构

```
/tmp/agent_mailbox/
├── inbox/          # 收件箱
├── outbox/         # 发件箱
├── done/           # 已完成
└── cancel/         # 已取消
```

## 消息生命周期

1. **发送** → 消息创建在发送者的 `outbox` 和接收者的 `inbox`
2. **回复** → 原消息被更新，包含新的回复内容
3. **处理** → 消息可以被标记为 `done` 或 `cancel`

## 最佳实践

### 消息内容建议

1. **标题简洁明了**：描述问题核心
2. **内容结构化**：使用Markdown格式组织信息
3. **包含关键信息**：环境、步骤、影响范围等
4. **及时回复**：确认收到并提供处理计划

### 消息分类使用

- 使用合适的消息类型帮助优先级管理
- 紧急问题使用 `URGENT` 类型
- 日常Bug使用 `BR` 类型
- 功能请求使用 `ER` 类型

### 线程管理

- 回复时保持原有标题和消息ID
- 在回复中引用具体的问题点
- 提供明确的后续行动计划
