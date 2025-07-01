import { FastMCP } from "fastmcp";
import { z } from "zod";
import { FileBoxService } from "./filebox.js";

/**
 * Register all tools with the MCP server
 * 
 * @param server The FastMCP server instance
 * @param fileboxService The FileBoxService instance
 */
export function registerTools(server: FastMCP, fileboxService: FileBoxService) {
  // Send message tool
  server.addTool({
    name: "filebox_send_message",
    description: "Send a message from one agent to another",
    parameters: z.object({
      receiver_id: z.string().describe("ID of the receiving agent"),
      msg_type: z.string().describe("Type of the message (e.g., BR, ER)"),
      title: z.string().describe("Title of the message"),
      content: z.string().describe("Content of the message"),
      original_message_id: z.string().optional().describe("Original message ID if this is a reply"),
      runAs: z.string().optional().describe("Agent ID to run as (overrides default current agent)")
    }),
    execute: async (params) => {
      return await fileboxService.sendMessage(
        params.receiver_id, 
        params.msg_type, 
        params.title, 
        params.content,
        params.original_message_id,
        params.runAs
      );
    }
  });

  // List messages tool
  server.addTool({
    name: "filebox_list_messages",
    description: "List messages in the specified agent's mailbox",
    parameters: z.object({
      box_type: z.enum(["inbox", "outbox", "done", "cancel"]).describe("Type of the mailbox to list"),
      runAs: z.string().optional().describe("Agent ID to run as (overrides default current agent)")
    }),
    execute: async (params) => {
      const messages = await fileboxService.listMessages(params.box_type, params.runAs);
      return JSON.stringify(messages);
    }
  });

  // Read message tool
  server.addTool({
    name: "filebox_read_message",
    description: "Read a message from the specified agent's mailbox",
    parameters: z.object({
      box_type: z.enum(["inbox", "outbox", "done", "cancel"]).describe("Type of the mailbox"),
      filename: z.string().describe("Filename of the message to read"),
      runAs: z.string().optional().describe("Agent ID to run as (overrides default current agent)")
    }),
    execute: async (params) => {
      return await fileboxService.readMessage(params.box_type, params.filename, params.runAs);
    }
  });

  // Resolve message tool
  server.addTool({
    name: "filebox_resolve_message",
    description: "Resolve a message in the specified agent's inbox",
    parameters: z.object({
      filename: z.string().describe("Filename of the message to resolve"),
      runAs: z.string().optional().describe("Agent ID to run as (overrides default current agent)")
    }),
    execute: async (params) => {
      return await fileboxService.resolveMessage(params.filename, params.runAs);
    }
  });

  // Reject message tool
  server.addTool({
    name: "filebox_reject_message",
    description: "Reject a message in the specified agent's inbox",
    parameters: z.object({
      filename: z.string().describe("Filename of the message to reject"),
      runAs: z.string().optional().describe("Agent ID to run as (overrides default current agent)")
    }),
    execute: async (params) => {
      return await fileboxService.rejectMessage(params.filename, params.runAs);
    }
  });
}
