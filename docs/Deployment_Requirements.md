# FileBox MCP 部署需求文档

## 项目概述

FileBox MCP 是一个基于文件系统的 AI 代理消息传递服务器，支持 Model Context Protocol (MCP)。项目通过 npm 包管理器发布，包名为 `@openkitchen/filebox-mcp`。

## 部署目标

### 核心需求
1. **零安装体验**：用户通过 `npx` 直接运行，无需手动安装
2. **即用性**：通过 npm 生态系统分发
3. **版本管理**：支持语义化版本控制和自动更新
4. **单一配置文件**：使用 `.filebox` JSON 配置文件统一管理所有配置

### 技术要求

#### 运行时环境
- **Node.js**: 必须安装 Node.js 18.0.0 或更高版本
- **npm/npx**: 用于包管理和执行
- **MCP 兼容的 AI 工具**: Cursor、Claude Desktop、Windsurf 等

#### 项目结构要求
```json
{
  "name": "@openkitchen/filebox-mcp",
  "main": "build/index.js",
  "type": "module",
  "bin": {
    "filebox-mcp": "build/index.js"
  },
  "exports": {
    ".": {
      "import": "./build/index.js",
      "require": "./build/index.js"
    }
  },
  "scripts": {
    "prepare": "npm run build",
    "build": "bun build src/index.ts --outdir build --target node",
    "prepublishOnly": "npm run build"
  }
}
```

## 部署配置

### MCP 服务器配置

用户在其 MCP 配置文件中的标准配置：

```json
{
  "mcpServers": {
    "FileBox-Server": {
      "command": "npx",
      "args": [
        "@openkitchen/filebox-mcp"
      ],
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

### 工作流程

1. **用户配置 MCP 服务器**：将上述配置添加到 MCP 配置文件
2. **自动下载和运行**：`npx` 自动下载最新版本的 npm 包并运行
3. **运行 MCP 服务器**：执行构建后的 `build/index.js` 文件
4. **读取项目配置**：从用户项目根目录读取 `.filebox` 配置文件

## 配置文件格式

### .filebox 配置文件

位置：用户项目根目录
格式：JSON

```json
{
  "current_agent": "qa_agent",
  "agents": {
    "qa_agent": "/absolute/path/to/qa/project",
    "dev_agent": "/absolute/path/to/dev/project", 
    "frontend_agent": "/absolute/path/to/frontend/project"
  }
}
```

**字段说明**：
- `current_agent`: 当前项目的代理标识符
- `agents`: 所有参与通信的代理及其项目根目录路径的映射
- 所有路径必须是绝对路径

## 多代理支持

### 单代理单仓库模式
每个代理有独立的项目目录和配置：

```
/path/to/qa_project/
├── .filebox (current_agent: "qa_agent")
├── docs/mailbox/
│   ├── inbox/
│   ├── outbox/
│   ├── done/
│   └── cancel/
└── ...

/path/to/dev_project/
├── .filebox (current_agent: "dev_agent")
├── docs/mailbox/
│   ├── inbox/
│   └── ...
└── ...
```

### 多代理单仓库模式
多个代理共享同一个项目：

```
/path/to/shared_project/
├── .filebox (包含所有代理配置)
├── docs/mailbox/
│   ├── qa_agent/
│   │   ├── inbox/
│   │   ├── outbox/
│   │   ├── done/
│   │   └── cancel/
│   ├── dev_agent/
│   │   ├── inbox/
│   │   └── ...
│   └── frontend_agent/
│       ├── inbox/
│       └── ...
└── ...
```

## runAs 功能

### 设计目的
允许 AI 在单个会话中动态切换代理身份，适用于：
1. 多团队协作的单一项目
2. 需要模拟不同角色的测试场景
3. 跨代理的消息处理和管理

### 实现方式
所有 MCP 工具函数都支持可选的 `runAs` 参数：

```typescript
interface ToolParams {
  // ... 其他参数
  runAs?: string; // 可选：指定运行时的代理身份
}
```

### 使用示例

```javascript
// 以 qa_agent 身份发送消息
filebox_send_message({
  receiver_id: "dev_agent",
  msg_type: "BR",
  title: "Bug 报告",
  content: "发现一个问题...",
  runAs: "qa_agent"
})

// 查看 dev_agent 的收件箱
filebox_list_messages({
  box_type: "inbox", 
  runAs: "dev_agent"
})
```

## 安全和权限

### npm 访问
- 包发布在 npm 官方仓库，无需特殊权限
- 支持公开访问和下载
- `npx` 会自动处理包的下载和缓存

### 文件系统权限
- 需要对配置文件中指定的项目目录有读写权限
- 自动创建邮箱目录结构：`docs/mailbox/{inbox,outbox,done,cancel}`
- 多代理模式下自动创建代理专用目录

## 错误处理

### 常见错误场景
1. **npm 下载失败**：提示检查网络连接和 npm 配置
2. **配置文件错误**：JSON 格式验证和字段检查
3. **路径不存在**：验证代理路径的有效性
4. **权限不足**：检查文件系统读写权限

### 错误信息
提供清晰的中文错误信息，包含解决建议。

## 性能考虑

### 构建优化
- 使用 Bun 构建以获得最佳性能
- 只包含必要的依赖和文件
- 支持增量构建和缓存

### 运行时优化
- 延迟加载配置文件
- 缓存代理路径解析结果
- 最小化文件系统操作

## 版本管理

### 版本策略
- 使用语义化版本控制 (semver)
- npm publish 发布新版本
- `npx` 默认使用最新版本，支持指定版本

### 兼容性
- 向后兼容现有的 `.filebox` 配置文件
- 保持 MCP 工具接口稳定
- 支持渐进式功能升级

## 监控和日志

### 日志输出
- 错误信息输出到 stderr
- 调试信息可选输出
- 支持不同日志级别

### 性能监控
- 记录工具调用频率和响应时间
- 监控文件系统操作性能
- 提供健康检查接口

## 文档要求

### 用户文档
- ✅ 安装配置指南 (`docs/Installation_Guide.md`)
- ✅ 部署需求文档 (`docs/Deployment_Requirements.md`)
- ✅ 更新 README.md 中的安装说明

### 开发文档
- ✅ MCP 服务器设计文档 (`docs/MCP_Server_Design.md`)
- ✅ 使用示例 (`docs/FileBox_MCP_Example.md`)
- 保持文档与代码同步

## 发布清单

### 发布前检查
- [ ] 构建脚本正常工作
- [ ] npm 包可以正常运行
- [ ] 所有测试通过
- [ ] 文档更新完整
- [ ] 示例配置文件正确
- [ ] package.json 配置正确

### 发布步骤
1. 更新版本号 (`npm version [patch|minor|major]`)
2. 运行完整测试套件
3. 构建和验证 (`npm run build`)
4. 推送到 GitHub (`git push && git push --tags`)
5. 发布到 npm (`npm publish`)
6. 更新文档链接

### npm 发布配置

发布到 npm 需要以下配置：

```json
{
  "name": "@openkitchen/filebox-mcp",
  "publishConfig": {
    "access": "public"
  },
  "files": [
    "build/",
    "README.md",
    "LICENSE",
    ".filebox.example"
  ]
}
```

这个部署需求文档定义了项目的技术要求、配置方式、多代理支持、安全考虑和发布流程，确保 FileBox MCP 能够通过 npm 方式顺利部署和使用。 