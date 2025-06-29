#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

// Mock config
const config = {
    current_agent_id: "qa_agent",
    agents: {
        qa_agent: {
            mailbox_path: "/tmp/qa_agent_mailbox"
        },
        dev_agent: {
            mailbox_path: "/tmp/dev_agent_mailbox"
        }
    }
};

async function testMessageThread() {
    console.log("🧪 测试 FileBox 消息历史功能...\n");
    
    // 动态导入 ES 模块
    const { FileBoxService } = await import('./build/test-exports.js');
    
    // 设置配置
    FileBoxService.setConfig(config);
    
    try {
        // 1. QA Agent 发送初始 Bug Report
        console.log("1️⃣ QA Agent 发送初始 Bug Report");
        const result1 = await FileBoxService.sendMessage(
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
        
        // 查看发送的消息 - 切换到dev_agent上下文
        FileBoxService.setConfig({...config, current_agent_id: "dev_agent"});
        const devInboxFiles = await FileBoxService.listMessages("inbox");
        console.log("📥 Dev Agent inbox files:", devInboxFiles);
        
        if (devInboxFiles.length > 0) {
            const messageContent = await fs.readFile(path.join("/tmp/dev_agent_mailbox/inbox", devInboxFiles[0]), 'utf-8');
            console.log("📄 Initial message content:\n", messageContent);
            console.log("\n" + "=".repeat(50) + "\n");
        }
        
        // 2. Dev Agent 回复确认
        console.log("2️⃣ Dev Agent 回复确认");
        
        // 首先切换到 dev_agent 的上下文
        FileBoxService.setConfig({...config, current_agent_id: "dev_agent"});
        
        // 获取消息ID (从文件内容中提取)
        if (devInboxFiles.length > 0) {
            const messageContent = await fs.readFile(path.join("/tmp/dev_agent_mailbox/inbox", devInboxFiles[0]), 'utf-8');
            const messageIdMatch = messageContent.match(/\*\*Message ID:\*\* (.+)/);
            const originalMessageId = messageIdMatch ? messageIdMatch[1] : null;
            
            if (originalMessageId) {
                const result2 = await FileBoxService.sendMessage(
                    "qa_agent",
                    "ACK", 
                    "已收到Bug报告",
                    `已收到Bug报告，确认问题的严重性。我们将立即着手调查和修复。

一个快速的问题：在上传过程中，是否观察到网络请求的状态？具体是在98%时卡住，还是到100%后页面无响应？`,
                    originalMessageId
                );
                console.log("✅", result2);
                
                // 查看回复后的消息 - 切换到qa_agent上下文
                FileBoxService.setConfig({...config, current_agent_id: "qa_agent"});
                const qaInboxFiles = await FileBoxService.listMessages("inbox");
                console.log("📥 QA Agent inbox files:", qaInboxFiles);
                
                if (qaInboxFiles.length > 0) {
                    const replyContent = await fs.readFile(path.join("/tmp/qa_agent_mailbox/inbox", qaInboxFiles[0]), 'utf-8');
                    console.log("📄 Reply message content:\n", replyContent);
                    console.log("\n" + "=".repeat(50) + "\n");
                }
                
                // 3. QA Agent 再次回复补充信息
                console.log("3️⃣ QA Agent 再次回复补充信息");
                
                // 切换到 qa_agent 的上下文
                FileBoxService.setConfig({...config, current_agent_id: "qa_agent"});
                
                const result3 = await FileBoxService.sendMessage(
                    "dev_agent",
                    "SU",
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
                
                // 查看最终的消息线程 - 切换到dev_agent上下文
                FileBoxService.setConfig({...config, current_agent_id: "dev_agent"});
                const finalDevInboxFiles = await FileBoxService.listMessages("inbox");
                console.log("📥 Final Dev Agent inbox files:", finalDevInboxFiles);
                
                if (finalDevInboxFiles.length > 0) {
                    const finalContent = await fs.readFile(path.join("/tmp/dev_agent_mailbox/inbox", finalDevInboxFiles[0]), 'utf-8');
                    console.log("📄 Final message thread:\n", finalContent);
                }
            }
        }
        
    } catch (error) {
        console.error("❌ 测试失败:", error);
    }
}

testMessageThread(); 