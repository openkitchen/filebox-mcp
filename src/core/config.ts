import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

export interface AgentConfig {
  [agentId: string]: string; // agentId -> repo_root_path
}

export interface FileBoxConfig {
  agents: AgentConfig;
}

export class ConfigService {
  private config: FileBoxConfig | null = null;
  private globalConfigPath: string;

  constructor(configFileName: string = '.filebox') {
    // 只使用全局配置路径
    this.globalConfigPath = path.join(os.homedir(), configFileName);
  }

  public async loadConfig(): Promise<FileBoxConfig> {
    if (this.config) {
      return this.config;
    }

    try {
      const globalContent = await fs.readFile(this.globalConfigPath, 'utf-8');
      this.config = JSON.parse(globalContent) as FileBoxConfig;
    } catch (error) {
      // 如果配置文件不存在，创建一个空的配置
      this.config = { agents: {} };
    }

    // 验证配置
    if (!this.config.agents || typeof this.config.agents !== 'object') {
      throw new Error('Missing or invalid field: agents');
    }

    return this.config;
  }

  public async registerAgent(agentName: string, directory: string): Promise<void> {
    await this.loadConfig();
    
    // 将目录路径解析为绝对路径
    const absolutePath = path.resolve(directory);
    
    // 更新配置
    this.config!.agents[agentName] = absolutePath;
    
    // 保存配置到文件
    await fs.writeFile(this.globalConfigPath, JSON.stringify(this.config, null, 2));
    
    // 确保邮箱目录存在
    await this.ensureMailboxDirectories(absolutePath);
  }

  private async ensureMailboxDirectories(agentPath: string): Promise<void> {
    const mailboxPath = path.join(agentPath, 'docs', 'mailbox');
    const subDirs = ['inbox', 'outbox', 'done', 'cancel'];
    
    for (const subDir of subDirs) {
      await fs.mkdir(path.join(mailboxPath, subDir), { recursive: true });
    }
  }

  public async getCurrentAgentId(): Promise<string> {
    await this.loadConfig();
    
    // 获取当前目录的真实路径（解析符号链接）
    const currentDir = await fs.realpath(process.cwd());
    
    // 查找与当前工作目录匹配的agent
    for (const [agentId, agentPath] of Object.entries(this.config!.agents)) {
      // 获取agent路径的真实路径（解析符号链接）
      let resolvedAgentPath: string;
      try {
        resolvedAgentPath = await fs.realpath(agentPath);
      } catch (error) {
        // 如果路径不存在，使用原始路径
        resolvedAgentPath = path.resolve(agentPath);
      }
      
      // 检查当前目录是否在agent路径下（包括完全匹配）
      if (currentDir === resolvedAgentPath || currentDir.startsWith(resolvedAgentPath + path.sep)) {
        return agentId;
      }
    }
    
    // 如果没有找到匹配的agent，抛出错误
    const availableAgents = Object.keys(this.config!.agents);
    
    throw new Error(
      `Current directory '${currentDir}' is not registered as an agent. ` +
      `Available agents: ${availableAgents.join(', ')}. ` +
      `Use filebox_register_agent to register this directory.`
    );
  }

  public getAgentRootPath(agentId: string): string {
    if (!this.config) {
      throw new Error('Config not loaded. Call loadConfig() first.');
    }
    const rootPath = this.config.agents[agentId];
    if (!rootPath) {
      throw new Error(`Agent '${agentId}' not found in configuration. Available agents: ${Object.keys(this.config.agents).join(', ')}`);
    }
    return rootPath;
  }

  public getAllAgentIds(): string[] {
    if (!this.config) {
      throw new Error('Config not loaded. Call loadConfig() first.');
    }
    return Object.keys(this.config.agents);
  }
}
