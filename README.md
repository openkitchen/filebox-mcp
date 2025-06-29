# FileBox MCP Server

This project is a standard MCP server that provides tools for a lightweight, file-system-based message passing system for AI agents.

## Installation

```bash
npm install
```

## Usage

### Configuration

This server is configured via the `FILEBOX_CONFIG` environment variable. The value should be a JSON string that includes the `current_agent_id` and a list of all agents.

**Example:**
```bash
export FILEBOX_CONFIG='{"current_agent_id":"qa_agent","agents":{"qa_agent":{"mailbox_path":"/tmp/qa_agent_mailbox"},"dev_agent":{"mailbox_path":"/tmp/dev_agent_mailbox"}}}'
```

### Running the Server

**stdio:**
```bash
npm start
```

**http:**
```bash
npm run start:http
```

### Available Tools

- **`filebox_send_message`**: Send a message from one agent to another.
- **`filebox_list_messages`**: List messages in an agent's mailbox.
- **`filebox_read_message`**: Read a message from an agent's mailbox.
- **`filebox_resolve_message`**: Resolve a message in an agent's inbox.
- **`filebox_reject_message`**: Reject a message in an agent's inbox.

### For Cursor

To use this MCP server with Cursor, configure your `.cursor/mcp.json` file. You will need to create a separate configuration for each agent you want to run.

**For qa_agent:**
```json
{
  "mcpServers": {
    "FileBox-QA-Agent": {
      "command": "npm",
      "args": ["start"],
      "env": {
        "FILEBOX_CONFIG": "{\"current_agent_id\":\"qa_agent\",\"agents\":{\"qa_agent\":{\"mailbox_path\":\"/tmp/qa_agent_mailbox\"},\"dev_agent\":{\"mailbox_path\":\"/tmp/dev_agent_mailbox\"}}}"
      }
    }
  }
}
```

**For dev_agent:**
```json
{
  "mcpServers": {
    "FileBox-Dev-Agent": {
      "command": "npm",
      "args": ["start"],
      "env": {
        "FILEBOX_CONFIG": "{\"current_agent_id\":\"dev_agent\",\"agents\":{\"qa_agent\":{\"mailbox_path\":\"/tmp/qa_agent_mailbox\"},\"dev_agent\":{\"mailbox_path\":\"/tmp/dev_agent_mailbox\"}}}"
      }
    }
  }
}
```

**Note:** You will need to adjust the `mailbox_path` values to match your local setup.
