# FileBox MCP: File-based AI Agent Messaging System

FileBox MCP is a lightweight, file-system-based AI agent messaging system that enables structured message exchange between different AI tools through a shared file system.

## 🚀 Quick Start

### 1. Installation and Configuration

#### 1.1 System Requirements

- **Node.js**: Requires Node.js 18.0.0 or higher
- **MCP-compatible AI tools**: Such as Cursor, Claude Desktop, Windsurf, etc.

#### 1.2 MCP Server Configuration

Add the FileBox MCP server to your MCP configuration file:

**Cursor Users**:
Edit the `~/.cursor/mcp.json` file:

```json
{
  "mcpServers": {
    "FileBox": {
      "command": "npx",
      "args": [
        "@openkitchen/filebox-mcp"
      ],
      "autoApprove": [
        "filebox_register_agent",
        "filebox_list_agents",
        "filebox_send_message",
        "filebox_list_messages", 
        "filebox_read_message",
        "filebox_resolve_message",
        "filebox_reject_message"
      ]
    }
  }
}
```

**Claude Desktop Users**:
Edit the `~/.config/claude/mcp.json` file (macOS/Linux) or `%APPDATA%\Claude\mcp.json` (Windows):

```json
{
  "mcpServers": {
    "FileBox": {
      "command": "npx",
      "args": [
        "@openkitchen/filebox-mcp"
      ]
    }
  }
}
```

#### 1.3 Agent Registration

FileBox MCP uses a centralized configuration approach. All agent definitions are stored in a single `~/.filebox` file in your home directory.

**Register agents using the MCP tool**:
After configuring the MCP server, you can register agents directly through the AI tool:

```javascript
// Register current directory as an agent
filebox_register_agent({
  agent_name: "qa_agent",
  directory: "."  // or any absolute/relative path
})

// Register other project directories
filebox_register_agent({
  agent_name: "dev_agent", 
  directory: "/path/to/dev_project"
})
```

**Manual configuration** (alternative):
Create `~/.filebox` file in your home directory:

```json
{
  "agents": {
    "qa_agent": "/path/to/qa_project",
    "dev_agent": "/path/to/dev_project",
    "frontend_agent": "/path/to/frontend_project",
    "backend_agent": "/path/to/backend_project"
  }
}
```

**Configuration Notes:**
- `agents`: Mapping of all participating agents and their project root directory paths
- All paths must be absolute paths pointing to each agent project's root directory
- The system automatically determines the current agent based on the current working directory
- If the current directory is not registered, you'll need to use `filebox_register_agent` first

#### 1.4 Restart AI Tools

Restart Cursor or other AI tools to load the MCP server configuration.

### 2. Usage Guide

#### 2.1 Basic Usage

After installation and configuration, you can directly use FileBox MCP features in AI tools:

- **Register agents**: Use the `filebox_register_agent` tool
- **List agents**: Use the `filebox_list_agents` tool
- **Send messages**: Use the `filebox_send_message` tool
- **View inbox**: Use the `filebox_list_messages` tool
- **Read messages**: Use the `filebox_read_message` tool
- **Process messages**: Use the `filebox_resolve_message` or `filebox_reject_message` tools

#### 2.2 Common Issues

**Q: Why doesn't the configuration take effect after modification?**
A: You need to restart the AI tool to reload the MCP server instance.

**Q: Where are the message files?**
A: Message files are stored in the `docs/mailbox/` directory under the configured project root directory.

**Q: What message types are supported?**
A: Supports BR (Bug Report), ACK (Acknowledgment), ER (Enhancement Request), INFO (Information), etc.

**Q: How do I know which agents are registered?**
A: Use the `filebox_list_agents` tool to see all registered agents.

## 📧 Message Format

FileBox MCP uses a simplified email thread format, with each reply added to the front of the message file:

```markdown
# BR: Bug Title

**Format Version:** 1.0
**Message ID:** uuid
**Sender:** sender_agent_id
**Receiver:** receiver_agent_id
**Timestamp:** ISO8601timestamp
**Original Sender:** original_sender_id
**Current Owner:** current_owner_id

===== MESSAGE THREAD =====

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 2025-06-30T08:25:15.890Z - dev_agent to qa_agent (ACK)

Latest reply content...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 2025-06-30T08:15:22.616Z - qa_agent to dev_agent (BR)

Original message content...
```

### File Naming Convention

File name format: `YYYY-MM-DD_HHMM-TYPE-title-msgid.md`

- **Timestamp**: `2025-06-30_0815` (accurate to the minute)
- **Message Type**: Maintains the original initiator's defined type (BR, ACK, ER, etc.)
- **Title**: Message title in slug format
- **Message ID**: First 8 characters of UUID

### Key Improvements

1. **Strong separators**: Use `━━━` divider lines to clearly distinguish different message replies
2. **Fixed filename**: When replying, don't change the filename, directly overwrite the original file
3. **Simplified timestamp**: Timestamp in filename is accurate to the minute, more concise format
4. **Clear thread separation**: Use `===== MESSAGE THREAD =====` to separate metadata and message content

## 🧪 Development and Testing

If you need to develop or modify FileBox MCP:

```bash
# Clone repository
git clone https://github.com/openkitchen/filebox-mcp.git
cd filebox-mcp

# Install dependencies
npm install

# Build project
npm run build

# Run tests
npm run test:config
```

## 📁 Project Structure

```
filebox-mcp/
├── src/
│   ├── core/
│   │   ├── filebox.ts      # Core FileBox service
│   │   ├── tools.ts        # MCP tool definitions
│   │   ├── resources.ts    # MCP resource definitions
│   │   └── prompts.ts      # MCP prompt definitions
│   ├── server/
│   │   └── server.ts       # MCP server startup
│   └── index.ts            # Main entry file
├── docs/                   # Documentation
├── test_filebox.cjs        # Test script
└── README.md
```

## 🔧 MCP Tools

FileBox MCP provides the following tools:

- `filebox_register_agent` - Register a directory as an agent
- `filebox_list_agents` - List all registered agents
- `filebox_send_message` - Send messages
- `filebox_list_messages` - List messages in specified agent's mailbox
- `filebox_read_message` - Read message content
- `filebox_resolve_message` - Mark message as resolved
- `filebox_reject_message` - Reject message

### Agent Registration

The `filebox_register_agent` tool allows you to register directories as agents:

```javascript
// Register current directory
filebox_register_agent({
  agent_name: "my_agent",
  directory: "."
})

// Register absolute path
filebox_register_agent({
  agent_name: "qa_agent", 
  directory: "/path/to/qa_project"
})

// Register relative path
filebox_register_agent({
  agent_name: "frontend_agent",
  directory: "../frontend_project"
})
```

### runAs Parameter Support

All messaging tools support an optional `runAs` parameter, allowing AI to execute operations with different agent identities:

```javascript
// Send message with default agent identity (determined by current directory)
filebox_send_message({
  receiver_id: "frontend_agent",
  msg_type: "BR", 
  title: "Bug Report",
  content: "Found an issue..."
})

// Explicitly specify sending message as qa_agent
filebox_send_message({
  receiver_id: "frontend_agent",
  msg_type: "BR",
  title: "Bug Report", 
  content: "Found an issue...",
  runAs: "qa_agent"
})

// View frontend_agent's inbox
filebox_list_messages({
  box_type: "inbox",
  runAs: "frontend_agent"
})
```

**runAs functionality is particularly suitable for:**
- Multi-team projects where one person manages multiple agent roles
- AI needing to switch between different roles to handle cross-team collaboration
- Testing multi-agent interaction scenarios

**Multi-agent single repository support:**
When multiple agents share the same project root path, the system automatically creates independent mailbox directories for each agent:
```
docs/mailbox/
├── qa_agent/
│   ├── inbox/
│   ├── outbox/
│   ├── done/
│   └── cancel/
├── frontend_agent/
│   ├── inbox/
│   └── ...
└── backend_agent/
    ├── inbox/
    └── ...
```

## 📝 Message Types

- `BR` - Bug Report
- `ER` - Enhancement Request
- `ACK` - Acknowledgement
- `DIS` - Discussion

## 🎯 Design Goals

- **Simplicity**: Based on file system, no complex network protocols needed
- **Traceability**: Complete message history records
- **Readability**: Human-readable Markdown format
- **Extensibility**: Support for various message types and agents
- **Centralized Configuration**: Single source of truth for all agent definitions
