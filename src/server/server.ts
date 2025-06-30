import { FastMCP } from "fastmcp";
import { registerResources } from "../core/resources.js";
import { registerTools } from "../core/tools.js";
import { registerPrompts } from "../core/prompts.js";
import { FileBoxService } from "../core/filebox.js";

// Create and start the MCP server
async function startServer() {
  try {
    // Load config from environment variable
    const fileboxConfig = process.env.FILEBOX_CONFIG;
    if (!fileboxConfig) {
      throw new Error("FILEBOX_CONFIG environment variable not set");
    }
    const config = JSON.parse(fileboxConfig);
    console.error(`[DEBUG] Server startup - current_agent_id: ${config.current_agent_id}`);
    console.error(`[DEBUG] Server startup - config:`, JSON.stringify(config, null, 2));
    const fileboxService = new FileBoxService(config);

    // Create a new FastMCP server instance
    const server = new FastMCP({
      name: "FileBox MCP Server",
      version: "1.0.0"
    });

    // Register all resources, tools, and prompts
    registerResources(server);
    registerTools(server, fileboxService);
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
