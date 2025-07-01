#!/usr/bin/env node
import { FastMCP } from "fastmcp";
import startServer from "./server/server.js";
import { ConfigService } from "./core/config.js";
import { AgentService } from "./core/agent.js";

// Start the server
async function main() {
  try {
    const configService = new ConfigService();
    await configService.loadConfig();

    const agentService = new AgentService(configService);
    // The current agent ID will be determined when needed by FileBoxService

    const server = await startServer(configService, agentService);
    
    server.start({
      transportType: "stdio",
    });
    
    console.error("FileBox MCP Server running on stdio");
  } catch (error) {
    console.error("Error starting FileBox MCP server:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
