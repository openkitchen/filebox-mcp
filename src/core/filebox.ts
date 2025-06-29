import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

interface MailboxConfig {
    current_agent_id: string;
    agents: {
        [agentId: string]: {
            mailbox_path: string;
        };
    };
}

export class FileBoxService {
    private static config: MailboxConfig;

    static setConfig(config: MailboxConfig): void {
        this.config = config;
    }

    private static async getMailboxPath(agentId: string): Promise<string> {
        if (!this.config) {
            throw new Error("Config not loaded");
        }
        return this.config.agents[agentId].mailbox_path;
    }

    private static createSlug(text: string): string {
        return text.toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/[\s-]+/g, '-')
            .trim();
    }

    private static generateFilename(timestamp: string, msgType: string, title: string, msgId: string): string {
        const ts_short = timestamp.replace(/[-:.]/g, '').substring(0, 15);
        const title_slug = this.createSlug(title);
        const msg_id_short = msgId.split('-')[0];
        return `${ts_short}-${msgType}-${title_slug}-${msg_id_short}.md`;
    }

    private static async findMessage(mailboxPath: string, messageId: string): Promise<{content: string, boxType: string, filename: string} | null> {
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

    private static extractMetadataAndContent(markdownContent: string): { metadata: string, threadContent: string } {
        const lines = markdownContent.split('\n');
        let metadataEndIndex = -1;
        
        // Find the first "---" which marks the end of metadata
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].trim() === '---') {
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

    static async sendMessage(receiverId: string, msgType: string, title: string, content: string, originalMessageId?: string): Promise<string> {
        const senderId = this.config.current_agent_id;
        const timestamp = new Date().toISOString();
        const msgId = uuidv4();
        let filename: string;
        let markdownContent: string;

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
            
            // Update metadata for the reply
            const metadataLines = metadata.split('\n');
            const updatedMetadata = metadataLines.map(line => {
                if (line.startsWith('**Sender:**')) {
                    return `**Sender:** ${senderId}`;
                } else if (line.startsWith('**Receiver:**')) {
                    return `**Receiver:** ${receiverId}`;
                } else if (line.startsWith('**Timestamp:**')) {
                    return `**Timestamp:** ${timestamp}`;
                }
                return line;
            }).join('\n');

            // Create new thread entry (newest first format)
            const newThreadEntry = `\n## ${timestamp} - ${senderId} to ${receiverId} (${msgType})\n\n${content.trim()}\n`;
            
            // Combine: metadata + new entry + existing thread content
            markdownContent = updatedMetadata + newThreadEntry + threadContent;
            
            filename = this.generateFilename(timestamp, msgType, title, originalMessageId);

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
            markdownContent += `---\n\n`;
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

    static async listMessages(boxType: 'inbox' | 'outbox' | 'done' | 'cancel'): Promise<string[]> {
        const agentId = this.config.current_agent_id;
        const mailboxPath = await this.getMailboxPath(agentId);
        const boxPath = path.join(mailboxPath, boxType);
        try {
            return await fs.readdir(boxPath);
        } catch (error) {
            return [];
        }
    }

    static async readMessage(boxType: 'inbox' | 'outbox' | 'done' | 'cancel', filename: string): Promise<string> {
        const agentId = this.config.current_agent_id;
        const mailboxPath = await this.getMailboxPath(agentId);
        const filePath = path.join(mailboxPath, boxType, filename);
        try {
            return await fs.readFile(filePath, 'utf-8');
        } catch (error) {
            return "Message not found";
        }
    }

    static async resolveMessage(filename: string): Promise<string> {
        const agentId = this.config.current_agent_id;
        const mailboxPath = await this.getMailboxPath(agentId);
        const src = path.join(mailboxPath, 'inbox', filename);
        const dest = path.join(mailboxPath, 'done', filename);
        await fs.mkdir(path.dirname(dest), { recursive: true });
        await fs.rename(src, dest);
        return "Message resolved";
    }

    static async rejectMessage(filename: string): Promise<string> {
        const agentId = this.config.current_agent_id;
        const mailboxPath = await this.getMailboxPath(agentId);
        const src = path.join(mailboxPath, 'inbox', filename);
        const dest = path.join(mailboxPath, 'cancel', filename);
        await fs.mkdir(path.dirname(dest), { recursive: true });
        await fs.rename(src, dest);
        return "Message rejected";
    }
}
