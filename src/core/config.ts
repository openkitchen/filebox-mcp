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
    
    // 检查是否已经有agent注册了这个目录
    const existingAgent = Object.entries(this.config!.agents).find(([_, agentPath]) => {
      try {
        const resolvedAgentPath = path.resolve(agentPath);
        return resolvedAgentPath === absolutePath;
      } catch (error) {
        return false;
      }
    });
    
    if (existingAgent && existingAgent[0] !== agentName) {
      throw new Error(
        `Directory '${absolutePath}' is already registered as agent '${existingAgent[0]}'. ` +
        `Please use a different agent name or unregister the existing agent first.`
      );
    }
    
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
    
    // 查找与当前工作目录匹配的agent，优先精确匹配
    let exactMatches: string[] = [];
    let parentMatches: string[] = [];
    
    for (const [agentId, agentPath] of Object.entries(this.config!.agents)) {
      // 获取agent路径的真实路径（解析符号链接）
      let resolvedAgentPath: string;
      try {
        resolvedAgentPath = await fs.realpath(agentPath);
      } catch (error) {
        // 如果路径不存在，使用原始路径
        resolvedAgentPath = path.resolve(agentPath);
      }
      
      // 检查匹配类型
      if (currentDir === resolvedAgentPath) {
        exactMatches.push(agentId);
      } else if (currentDir.startsWith(resolvedAgentPath + path.sep)) {
        parentMatches.push(agentId);
      }
    }
    
    // 优先返回精确匹配
    if (exactMatches.length > 0) {
      if (exactMatches.length > 1) {
        // 如果有多个精确匹配，发出警告但返回第一个
        console.warn(`Warning: Multiple agents registered for directory '${currentDir}': ${exactMatches.join(', ')}. Using '${exactMatches[0]}'.`);
      }
      return exactMatches[0];
    }
    
    // 如果没有精确匹配，返回父目录匹配
    if (parentMatches.length > 0) {
      return parentMatches[0];
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

  public async unregisterAgent(agentName: string): Promise<void> {
    await this.loadConfig();
    
    if (!this.config!.agents[agentName]) {
      throw new Error(`Agent '${agentName}' not found in configuration.`);
    }
    
    delete this.config!.agents[agentName];
    
    // 保存配置到文件
    await fs.writeFile(this.globalConfigPath, JSON.stringify(this.config, null, 2));
  }

  public async cleanupDuplicateAgents(): Promise<{ removed: string[], kept: string[] }> {
    await this.loadConfig();
    
    const pathToAgents: { [path: string]: string[] } = {};
    const removed: string[] = [];
    const kept: string[] = [];
    
    // 按路径分组agent
    for (const [agentId, agentPath] of Object.entries(this.config!.agents)) {
      const resolvedPath = path.resolve(agentPath);
      if (!pathToAgents[resolvedPath]) {
        pathToAgents[resolvedPath] = [];
      }
      pathToAgents[resolvedPath].push(agentId);
    }
    
    // 对于每个路径，只保留第一个agent
    for (const [resolvedPath, agentIds] of Object.entries(pathToAgents)) {
      if (agentIds.length > 1) {
        kept.push(agentIds[0]);
        for (let i = 1; i < agentIds.length; i++) {
          removed.push(agentIds[i]);
          delete this.config!.agents[agentIds[i]];
        }
      } else {
        kept.push(agentIds[0]);
      }
    }
    
    if (removed.length > 0) {
      // 保存配置到文件
      await fs.writeFile(this.globalConfigPath, JSON.stringify(this.config, null, 2));
    }
    
    return { removed, kept };
  }
}
