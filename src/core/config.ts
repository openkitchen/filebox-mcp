import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

export interface AgentConfig {
  [agentId: string]: string; // agentId -> repo_root_path
}

export interface FileBoxConfig {
  current_agent?: string; // 在全局配置中可选
  agents: AgentConfig;
}

export class ConfigService {
  private config: FileBoxConfig | null = null;
  private globalConfigPath: string;
  private projectConfigPath: string;
  private currentAgent: string | null = null;

  constructor(configFileName: string = '.filebox') {
    // 全局配置路径
    this.globalConfigPath = path.join(os.homedir(), configFileName);
    // 项目配置路径
    this.projectConfigPath = path.join(process.cwd(), configFileName);
  }

  public async loadConfig(): Promise<FileBoxConfig> {
    if (this.config) {
      return this.config;
    }

    let globalConfig: FileBoxConfig | null = null;
    let projectConfig: FileBoxConfig | null = null;

    // 1. 尝试加载全局配置
    try {
      const globalContent = await fs.readFile(this.globalConfigPath, 'utf-8');
      globalConfig = JSON.parse(globalContent) as FileBoxConfig;
      console.error(`[ConfigService] Loaded global config from: ${this.globalConfigPath}`);
    } catch (error) {
      console.error(`[ConfigService] No global config found at: ${this.globalConfigPath}`);
    }

    // 2. 尝试加载项目配置
    try {
      const projectContent = await fs.readFile(this.projectConfigPath, 'utf-8');
      projectConfig = JSON.parse(projectContent) as FileBoxConfig;
      console.error(`[ConfigService] Loaded project config from: ${this.projectConfigPath}`);
    } catch (error) {
      console.error(`[ConfigService] No project config found at: ${this.projectConfigPath}`);
    }

    // 3. 合并配置
    if (projectConfig) {
      // 如果有项目配置，使用项目配置
      this.config = projectConfig;
      // 处理空字符串和 undefined
      const projectAgent = projectConfig.current_agent?.trim();
      this.currentAgent = projectAgent && projectAgent.length > 0 ? projectAgent : this.getProjectName();
    } else if (globalConfig) {
      // 如果只有全局配置，使用全局配置
      this.config = globalConfig;
      this.currentAgent = this.getProjectName(); // 使用项目名作为当前代理
    } else {
      // 没有任何配置文件
      throw new Error(`No FileBox configuration found. Please create either '${this.globalConfigPath}' or '${this.projectConfigPath}' with valid JSON configuration.`);
    }

    // 4. 验证配置
    if (!this.config.agents || typeof this.config.agents !== 'object') {
      throw new Error('Missing or invalid field: agents');
    }

    // 5. 确保当前代理在配置中存在
    if (!this.currentAgent || !this.config.agents[this.currentAgent]) {
      throw new Error(`Current agent '${this.currentAgent}' not found in agents configuration. Available agents: ${Object.keys(this.config.agents).join(', ')}`);
    }

    console.error(`[ConfigService] Current agent: ${this.currentAgent}`);
    console.error(`[ConfigService] Available agents: ${Object.keys(this.config.agents).join(', ')}`);
    
    return this.config;
  }

  private getProjectName(): string {
    // 使用当前目录名作为项目名/代理名
    const projectName = path.basename(process.cwd());
    console.error(`[ConfigService] Using project name as agent ID: ${projectName}`);
    return projectName;
  }

  public getCurrentAgentId(): string {
    if (!this.config || !this.currentAgent) {
      throw new Error('Config not loaded. Call loadConfig() first.');
    }
    return this.currentAgent;
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
