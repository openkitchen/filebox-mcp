import { FastMCP } from "fastmcp";
import { registerResources } from "../core/resources.js";
import { registerTools } from "../core/tools.js";
import { registerPrompts } from "../core/prompts.js";
import { FileBoxService } from "../core/filebox.js";
import { ConfigService } from "../core/config.js";
import { AgentService } from "../core/agent.js";

// Create and start the MCP server
async function startServer(configService: ConfigService, agentService: AgentService) {
  try {
    const fileboxService = new FileBoxService(configService, agentService);

    // Create a new FastMCP server instance
    const server = new FastMCP({
      name: "FileBox MCP Server",
      version: "1.0.0"
    });

    // Register all resources, tools, and prompts
    registerResources(server);
    registerTools(server, fileboxService, configService);
    registerPrompts(server);
    
    // Log server information
    console.error(`FileBox MCP Server initialized`);
    console.error("Server is ready to handle requests");
    
    return server;
  } catch (error) {
    console.error("Failed to initialize server:", error);
    process.exit(1);
  }
}

// Export the server creation function
export default startServer;
