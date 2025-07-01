#!/usr/bin/env node

// 测试从根目录运行 MCP 服务器
async function testFromRootDir() {
  console.log("Testing MCP server from root directory...");
  
  // 模拟 MCP 初始化请求
  const initRequest = {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: {
        name: "test-client",
        version: "1.0.0"
      }
    }
  };

  // 启动子进程，从根目录运行
  const { spawn } = await import('child_process');
  const child = spawn('node', ['/Users/xiaowei/Workspace/lead-123/filebox-mcp/build/index.js'], {
    stdio: ['pipe', 'pipe', 'inherit'],
    cwd: '/' // 从根目录运行
  });

  let response = '';
  let hasError = false;
  
  child.stdout.on('data', (data) => {
    response += data.toString();
    console.log('Received data:', data.toString());
    
    // 如果收到响应，解析并检查
    try {
      const lines = response.split('\n').filter(line => line.trim());
      for (const line of lines) {
        if (line.trim()) {
          const parsed = JSON.parse(line);
          console.log('Parsed response:', JSON.stringify(parsed, null, 2));
          
          if (parsed.id === 1) {
            console.log('✅ Initialization successful from root directory!');
            child.kill();
            process.exit(0);
          }
        }
      }
    } catch (e) {
      // 可能是不完整的 JSON，继续等待
    }
  });

  child.on('error', (error) => {
    console.error('❌ Process error:', error);
    hasError = true;
    process.exit(1);
  });

  child.on('exit', (code) => {
    if (code !== 0 && !hasError) {
      console.error(`❌ Process exited with code ${code}`);
      process.exit(1);
    }
  });

  // 等待一秒后发送初始化请求
  setTimeout(() => {
    console.log('Sending initialization request...');
    child.stdin.write(JSON.stringify(initRequest) + '\n');
  }, 2000);

  // 10秒超时
  setTimeout(() => {
    console.error('❌ Test timeout');
    child.kill();
    process.exit(1);
  }, 10000);
}

testFromRootDir().catch(console.error); 