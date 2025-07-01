# FileBox MCP 多Agent配置重构任务计划

1.  **[ ] 设计文档更新 (`docs/MCP_Server_Design.md`)**
    *   [ ] 更新 `2.3 配置系统`：替换为新的`.filebox`和中心化配置方案。
    *   [ ] 更新 `3.1 目录结构`：将邮箱路径标准化为`<repo_root>/docs/mailbox/`。
    *   [ ] 更新 `7.1 MCP配置`：提供新的`mcp.json`示例，移除复杂的`FILEBOX_CONFIG`。
    *   [ ] 更新 `8.3 关键特性`和`11.1 当前限制`，移除“每个代理一个实例”和“配置复杂”的描述。
2.  **[ ] 代码重构 (`src/`)**
    *   [ ] **配置模块**:
        *   [ ] 创建新的`ConfigService`，负责加载中心化配置文件。
        *   [ ] 实现`AgentService`，负责通过`.filebox`文件识别当前`agent`。
    *   [ ] **核心服务 (`core/filebox.ts`)**:
        *   [ ] 修改`getMailboxPath`等函数，使其基于`agent`的项目根目录动态生成路径。
    *   [ ] **MCP工具 (`core/tools.ts`)**:
        *   [ ] 重构`filebox_send_message`，使其能根据`receiver_id`从中心化配置中找到对方项目的路径，并将消息写入正确的`inbox`。
        *   [ ] 检查并更新其他所有工具以适应新架构。
3.  **[ ] 文档更新 (`README.md`)**
    *   [ ] 详细说明新的安装和配置步骤。
    *   [ ] 解释如何设置中心化配置文件。
    *   [ ] 解释如何在每个项目中创建和使用`.filebox`文件。
4.  **[ ] 测试**
    *   [ ] 编写一个测试脚本，模拟两个`agent`（例如`qa`和`frontend`）之间的完整通信流程。
5.  **[ ] 最终确认**
    *   [ ] 与您确认所有修改都符合预期。
