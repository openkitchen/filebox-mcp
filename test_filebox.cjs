#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

// Mock test environment
const testDir = '/tmp/filebox_test';

// Create test environment
async function setupTestEnvironment() {
    // Create test directories
    await fs.mkdir(testDir, { recursive: true });
    await fs.mkdir(path.join(testDir, 'qa_repo'), { recursive: true });
    await fs.mkdir(path.join(testDir, 'dev_repo'), { recursive: true });

    // Create mailbox directories for both agents
    for (const agent of ['qa_repo', 'dev_repo']) {
        for (const box of ['inbox', 'outbox', 'done', 'cancel']) {
            await fs.mkdir(path.join(testDir, agent, 'docs', 'mailbox', box), { recursive: true });
        }
    }

    // Create .filebox config files for both agents
    const qaConfig = {
        current_agent: "qa_agent",
        agents: {
            qa_agent: path.join(testDir, 'qa_repo'),
            dev_agent: path.join(testDir, 'dev_repo')
        }
    };

    const devConfig = {
        current_agent: "dev_agent", 
        agents: {
            qa_agent: path.join(testDir, 'qa_repo'),
            dev_agent: path.join(testDir, 'dev_repo')
        }
    };

    await fs.writeFile(
        path.join(testDir, 'qa_repo', '.filebox'),
        JSON.stringify(qaConfig, null, 2)
    );

    await fs.writeFile(
        path.join(testDir, 'dev_repo', '.filebox'),
        JSON.stringify(devConfig, null, 2)
    );
}

async function cleanupTestEnvironment() {
    try {
        // Remove test directories
        await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
        console.error("Cleanup error (non-fatal):", error);
    }
}

async function testMessageThread() {
    console.log("🧪 测试 FileBox 消息历史功能（新配置格式）...\n");
    
    try {
        // Setup test environment
        await setupTestEnvironment();
        
        // Dynamic import ES modules
        const { ConfigService, AgentService, FileBoxService } = await import('./build/test-exports.js');
        
        // Test QA Agent side
        console.log("1️⃣ QA Agent 发送初始 Bug Report");
        
        // Change to QA agent directory
        const originalCwd = process.cwd();
        process.chdir(path.join(testDir, 'qa_repo'));
        
        // Create QA services
        const qaConfigService = new ConfigService();
        await qaConfigService.loadConfig();
        const qaAgentService = new AgentService(qaConfigService);
        const qaFileBox = new FileBoxService(qaConfigService, qaAgentService);
        
        const result1 = await qaFileBox.sendMessage(
            "dev_agent",
            "BR",
            "批量导入用户时页面卡死",
            `在用户管理页面使用批量导入功能时，如果上传的Excel文件包含超过500条数据，页面会完全卡死，需要刷新才能恢复。

复现步骤：
1. 准备一个包含520条用户数据的Excel文件
2. 打开用户管理页面
3. 点击"批量导入"按钮
4. 选择文件并开始导入
5. 观察现象：进度条停在98%，页面无响应`
        );
        console.log("✅", result1);
        
        // Switch to Dev Agent side
        console.log("\n2️⃣ Dev Agent 查看收件箱");
        process.chdir(path.join(testDir, 'dev_repo'));
        
        // Create Dev services
        const devConfigService = new ConfigService();
        await devConfigService.loadConfig();
        const devAgentService = new AgentService(devConfigService);
        const devFileBox = new FileBoxService(devConfigService, devAgentService);
        
        const devInboxFiles = await devFileBox.listMessages("inbox");
        console.log("📥 Dev Agent inbox files:", devInboxFiles);
        
        if (devInboxFiles.length > 0) {
            const messageContent = await devFileBox.readMessage("inbox", devInboxFiles[0]);
            console.log("📄 Initial message content:\n", messageContent);
            console.log("\n" + "=".repeat(50) + "\n");
            
            // 3. Dev Agent 回复确认
            console.log("3️⃣ Dev Agent 回复确认");
            
            // Extract message ID from content
            const messageIdMatch = messageContent.match(/\*\*Message ID:\*\* (.+)/);
            const originalMessageId = messageIdMatch ? messageIdMatch[1] : null;
            
            if (originalMessageId) {
                const result2 = await devFileBox.sendMessage(
                    "qa_agent",
                    "ACK", 
                    "已收到Bug报告",
                    `已收到Bug报告，确认问题的严重性。我们将立即着手调查和修复。

一个快速的问题：在上传过程中，是否观察到网络请求的状态？具体是在98%时卡住，还是到100%后页面无响应？`,
                    originalMessageId
                );
                console.log("✅", result2);
                
                // Switch back to QA Agent to check reply
                console.log("\n4️⃣ QA Agent 查看回复");
                process.chdir(path.join(testDir, 'qa_repo'));
                
                const qaInboxFiles = await qaFileBox.listMessages("inbox");
                console.log("📥 QA Agent inbox files:", qaInboxFiles);
                
                if (qaInboxFiles.length > 0) {
                    const replyContent = await qaFileBox.readMessage("inbox", qaInboxFiles[0]);
                    console.log("📄 Reply message content:\n", replyContent);
                    console.log("\n" + "=".repeat(50) + "\n");
                    
                    // 5. QA Agent 再次回复补充信息
                    console.log("5️⃣ QA Agent 再次回复补充信息");
                    const result3 = await qaFileBox.sendMessage(
                        "dev_agent",
                        "INFO",
                        "补充网络请求状态信息", 
                        `经过进一步测试，补充网络请求状态信息：

1. 上传Excel文件的请求正常完成（POST /api/users/import/upload）
2. 解析数据的请求成功（POST /api/users/import/parse）
3. 批量创建用户的请求（POST /api/users/import/process）：
   - 请求持续了约45秒
   - 最终收到了来自服务器的响应（状态码200）
   - 响应数据显示全部520条记录处理完成
   - 但页面仍然卡住，没有更新UI

补充观察：Chrome任务管理器显示该标签页的内存使用从正常的约200MB暴涨至1.2GB`,
                        originalMessageId
                    );
                    console.log("✅", result3);
                    
                    // Switch back to Dev Agent to check final message thread
                    console.log("\n6️⃣ Dev Agent 查看最终消息线程");
                    process.chdir(path.join(testDir, 'dev_repo'));
                    
                    const finalDevInboxFiles = await devFileBox.listMessages("inbox");
                    console.log("📥 Final Dev Agent inbox files:", finalDevInboxFiles);
                    
                    if (finalDevInboxFiles.length > 0) {
                        const finalContent = await devFileBox.readMessage("inbox", finalDevInboxFiles[0]);
                        console.log("📄 Final message thread:\n", finalContent);
                    }
                }
            }
        }
        
        // Restore original directory
        process.chdir(originalCwd);
        
        console.log("\n✅ 测试完成！新的统一配置格式工作正常。");
        
    } catch (error) {
        console.error("❌ 测试失败:", error);
    } finally {
        // Cleanup test environment
        await cleanupTestEnvironment();
    }
}

testMessageThread();
