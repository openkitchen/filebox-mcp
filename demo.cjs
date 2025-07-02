#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const os = require('os');

async function demo() {
    console.log("🚀 FileBox MCP 集中化配置演示\n");

    try {
        // Dynamic import ES modules
        const { ConfigService } = await import('./build/test-exports.js');
        
        const configService = new ConfigService();
        
        // 1. 展示注册agent
        console.log("1️⃣ 注册当前目录为agent");
        await configService.registerAgent("demo_agent", ".");
        console.log("✅ 成功注册 demo_agent");
        
        // 2. 列出所有agents
        console.log("\n2️⃣ 列出所有已注册的agents");
        const agents = configService.getAllAgentIds();
        console.log("📋 已注册的agents:", agents);
        
        // 3. 显示配置文件内容
        console.log("\n3️⃣ 查看配置文件内容");
        const configPath = path.join(os.homedir(), '.filebox');
        try {
            const content = await fs.readFile(configPath, 'utf-8');
            console.log("📄 ~/.filebox 内容:");
            console.log(content);
        } catch (error) {
            console.log("❌ 无法读取配置文件:", error.message);
        }
        
        // 4. 获取当前agent
        console.log("\n4️⃣ 获取当前agent身份");
        try {
            const currentAgent = await configService.getCurrentAgentId();
            console.log("👤 当前agent:", currentAgent);
        } catch (error) {
            console.log("❌ 无法确定当前agent:", error.message);
        }
        
        console.log("\n✅ 演示完成！");
        console.log("\n📖 使用说明:");
        console.log("- 使用 filebox_register_agent 注册新的agent");
        console.log("- 使用 filebox_list_agents 查看所有agents");
        console.log("- 系统会根据当前工作目录自动确定agent身份");
        console.log("- 所有配置统一存储在 ~/.filebox 文件中");
        
    } catch (error) {
        console.error("❌ 演示失败:", error.message);
    }
}

demo(); 