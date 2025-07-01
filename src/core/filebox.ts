import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

import { ConfigService } from './config.js';
import { AgentService } from './agent.js';

export class FileBoxService {
    private configService: ConfigService;
    private agentService: AgentService;

    constructor(configService: ConfigService, agentService: AgentService) {
        this.configService = configService;
        this.agentService = agentService;
    }

    private async getEffectiveAgentId(runAs?: string): Promise<string> {
        if (runAs) {
            // Validate that the runAs agent exists in configuration
            const allAgents = this.configService.getAllAgentIds();
            if (!allAgents.includes(runAs)) {
                throw new Error(`Invalid runAs agent '${runAs}'. Available agents: ${allAgents.join(', ')}`);
            }
            return runAs;
        }
        return await this.agentService.getCurrentAgentId();
    }

    private async getMailboxPath(agentId: string): Promise<string> {
        const repoRootPath = this.configService.getAgentRootPath(agentId);
        
        // Check if multiple agents share the same repo root path
        const allAgents = this.configService.getAllAgentIds();
        const agentsInSameRepo = allAgents.filter(id => 
            this.configService.getAgentRootPath(id) === repoRootPath
        );
        
        if (agentsInSameRepo.length > 1) {
            // Multiple agents in same repo, create agent-specific mailbox
            return path.join(repoRootPath, 'docs', 'mailbox', agentId);
        } else {
            // Single agent in repo, use standard mailbox path
            return path.join(repoRootPath, 'docs', 'mailbox');
        }
    }

    private createSlug(text: string): string {
        return text.toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/[\s-]+/g, '-')
            .trim();
    }

    private formatTimestamp(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}_${hours}${minutes}`;
    }

    private generateFilename(timestamp: string, msgType: string, title: string, msgId: string): string {
        const date = new Date(timestamp);
        const ts_formatted = this.formatTimestamp(date);
        const title_slug = this.createSlug(title);
        const msg_id_short = msgId.split('-')[0];
        return `${ts_formatted}-${msgType}-${title_slug}-${msg_id_short}.md`;
    }

    private async findMessage(mailboxPath: string, messageId: string): Promise<{content: string, boxType: string, filename: string} | null> {
        const boxes = ['inbox', 'outbox', 'done', 'cancel'];
        for (const boxType of boxes) {
            const boxPath = path.join(mailboxPath, boxType);
            try {
                const files = await fs.readdir(boxPath);
                for (const file of files) {
                    const content = await fs.readFile(path.join(boxPath, file), 'utf-8');
                    if (content.includes(`**Original Message ID:** ${messageId}`) || content.includes(`**Message ID:** ${messageId}`)) {
                        return { content, boxType, filename: file };
                    }
                }
            } catch (error) {
                continue;
            }
        }
        return null;
    }

    private extractMetadataAndContent(markdownContent: string): { metadata: string, threadContent: string } {
        const lines = markdownContent.split('\n');
        let metadataEndIndex = -1;
        
        // Find the first "===== MESSAGE THREAD =====" which marks the end of metadata
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].trim() === '===== MESSAGE THREAD =====') {
                metadataEndIndex = i;
                break;
            }
        }
        
        if (metadataEndIndex === -1) {
            // No separator found, treat everything as metadata
            return { metadata: markdownContent, threadContent: '' };
        }
        
        const metadata = lines.slice(0, metadataEndIndex + 1).join('\n');
        const threadContent = lines.slice(metadataEndIndex + 1).join('\n');
        
        return { metadata, threadContent };
    }

    async sendMessage(receiverId: string, msgType: string, title: string, content: string, originalMessageId?: string, runAs?: string): Promise<string> {
        const senderId = await this.getEffectiveAgentId(runAs);
        const timestamp = new Date().toISOString();
        const msgId = uuidv4();
        let filename: string;
        let markdownContent: string;
        
        // 调试信息
        console.error(`[DEBUG] FileBox sendMessage - senderId: ${senderId}, receiverId: ${receiverId}`);

        if (originalMessageId) {
            // This is a reply to an existing message
            const receiverMailboxPath = await this.getMailboxPath(receiverId);
            const senderMailboxPath = await this.getMailboxPath(senderId);

            // First try to find the message in receiver's boxes
            let originalMessage = await this.findMessage(receiverMailboxPath, originalMessageId);
            if (!originalMessage) {
                // If not found in receiver's boxes, try sender's boxes
                originalMessage = await this.findMessage(senderMailboxPath, originalMessageId);
            }
            
            if (!originalMessage) {
                throw new Error(`Original message ${originalMessageId} not found`);
            }

            // Extract metadata and existing thread content
            const { metadata, threadContent } = this.extractMetadataAndContent(originalMessage.content);
            
            // Update metadata for the reply (keep original message type and ID)
            const metadataLines = metadata.split('\n');
            const updatedMetadata = metadataLines.map(line => {
                if (line.startsWith('**Sender:**')) {
                    return `**Sender:** ${senderId}`;
                } else if (line.startsWith('**Receiver:**')) {
                    return `**Receiver:** ${receiverId}`;
                } else if (line.startsWith('**Timestamp:**')) {
                    return `**Timestamp:** ${timestamp}`;
                } else if (line.startsWith('**Current Owner:**')) {
                    return `**Current Owner:** ${receiverId}`;
                }
                return line;
            }).join('\n');

            // Create new thread entry with strong separator (newest first format)
            const newThreadEntry = `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n## ${timestamp} - ${senderId} to ${receiverId} (${msgType})\n\n${content.trim()}\n`;
            
            // Combine: metadata + new entry + existing thread content
            markdownContent = updatedMetadata + newThreadEntry + threadContent;
            
            // Use original message's filename (overwrite)
            filename = originalMessage.filename;

            // Try to remove the original message from both mailboxes
            try {
                await fs.unlink(path.join(receiverMailboxPath, originalMessage.boxType, originalMessage.filename));
            } catch (error) {
                // Ignore if file doesn't exist
            }
            try {
                await fs.unlink(path.join(senderMailboxPath, originalMessage.boxType, originalMessage.filename));
            } catch (error) {
                // Ignore if file doesn't exist
            }
        } else {
            // This is a new message
            markdownContent = `# ${msgType}: ${title}\n\n`;
            markdownContent += `**Format Version:** 1.0\n`;
            markdownContent += `**Message ID:** ${msgId}\n`;
            markdownContent += `**Sender:** ${senderId}\n`;
            markdownContent += `**Receiver:** ${receiverId}\n`;
            markdownContent += `**Timestamp:** ${timestamp}\n`;
            markdownContent += `**Original Sender:** ${senderId}\n`;
            markdownContent += `**Current Owner:** ${receiverId}\n\n`;
            markdownContent += `===== MESSAGE THREAD =====\n\n`;
            markdownContent += `## ${timestamp} - ${senderId} to ${receiverId} (${msgType})\n\n`;
            markdownContent += content.trim();
            
            filename = this.generateFilename(timestamp, msgType, title, msgId);
        }

        const senderMailboxPath = await this.getMailboxPath(senderId);
        const receiverMailboxPath = await this.getMailboxPath(receiverId);

        // Always keep a copy in sender's outbox
        await fs.mkdir(path.join(senderMailboxPath, 'outbox'), { recursive: true });
        await fs.writeFile(path.join(senderMailboxPath, 'outbox', filename), markdownContent);

        // Move to receiver's inbox
        await fs.mkdir(path.join(receiverMailboxPath, 'inbox'), { recursive: true });
        await fs.writeFile(path.join(receiverMailboxPath, 'inbox', filename), markdownContent);

        return "Message sent successfully";
    }

    async listMessages(boxType: 'inbox' | 'outbox' | 'done' | 'cancel', runAs?: string): Promise<string[]> {
        const agentId = await this.getEffectiveAgentId(runAs);
        const mailboxPath = await this.getMailboxPath(agentId);
        const boxPath = path.join(mailboxPath, boxType);
        try {
            return await fs.readdir(boxPath);
        } catch (error) {
            return [];
        }
    }

    async readMessage(boxType: 'inbox' | 'outbox' | 'done' | 'cancel', filename: string, runAs?: string): Promise<string> {
        const agentId = await this.getEffectiveAgentId(runAs);
        const mailboxPath = await this.getMailboxPath(agentId);
        const filePath = path.join(mailboxPath, boxType, filename);
        try {
            return await fs.readFile(filePath, 'utf-8');
        } catch (error) {
            return "Message not found";
        }
    }

    async resolveMessage(filename: string, runAs?: string): Promise<string> {
        const agentId = await this.getEffectiveAgentId(runAs);
        const mailboxPath = await this.getMailboxPath(agentId);
        const src = path.join(mailboxPath, 'inbox', filename);
        const dest = path.join(mailboxPath, 'done', filename);
        await fs.mkdir(path.dirname(dest), { recursive: true });
        await fs.rename(src, dest);
        return "Message resolved";
    }

    async rejectMessage(filename: string, runAs?: string): Promise<string> {
        const agentId = await this.getEffectiveAgentId(runAs);
        const mailboxPath = await this.getMailboxPath(agentId);
        const src = path.join(mailboxPath, 'inbox', filename);
        const dest = path.join(mailboxPath, 'cancel', filename);
        await fs.mkdir(path.dirname(dest), { recursive: true });
        await fs.rename(src, dest);
        return "Message rejected";
    }
}
