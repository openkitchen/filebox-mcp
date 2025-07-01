import * as fs from 'fs/promises';
import * as path from 'path';

export interface AgentConfig {
  [agentId: string]: string; // agentId -> repo_root_path
}

export interface FileBoxConfig {
  current_agent: string;
  agents: AgentConfig;
}

export class ConfigService {
  private config: FileBoxConfig | null = null;
  private configPath: string;

  constructor(configFileName: string = '.filebox') {
    // The .filebox file should be in the current working directory
    this.configPath = path.join(process.cwd(), configFileName);
  }

  public async loadConfig(): Promise<FileBoxConfig> {
    if (this.config) {
      return this.config;
    }
    try {
      const content = await fs.readFile(this.configPath, 'utf-8');
      this.config = JSON.parse(content) as FileBoxConfig;
      
      // Validate required fields
      if (!this.config.current_agent) {
        throw new Error('Missing required field: current_agent');
      }
      if (!this.config.agents || typeof this.config.agents !== 'object') {
        throw new Error('Missing or invalid field: agents');
      }
      if (!this.config.agents[this.config.current_agent]) {
        throw new Error(`Current agent '${this.config.current_agent}' not found in agents configuration`);
      }
      
      console.log(`[ConfigService] Loaded config from: ${this.configPath}`);
      console.log(`[ConfigService] Current agent: ${this.config.current_agent}`);
      return this.config;
    } catch (error) {
      console.error(`[ConfigService] Failed to load config from ${this.configPath}:`, error);
      throw new Error(`Failed to load FileBox configuration. Ensure '${this.configPath}' exists and is valid JSON with required fields: current_agent, agents.`);
    }
  }

  public getCurrentAgentId(): string {
    if (!this.config) {
      throw new Error('Config not loaded. Call loadConfig() first.');
    }
    return this.config.current_agent;
  }

  public getAgentRootPath(agentId: string): string {
    if (!this.config) {
      throw new Error('Config not loaded. Call loadConfig() first.');
    }
    const rootPath = this.config.agents[agentId];
    if (!rootPath) {
      throw new Error(`Agent '${agentId}' not found in configuration.`);
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
