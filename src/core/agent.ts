import { ConfigService } from './config.js';

export class AgentService {
  private configService: ConfigService;

  constructor(configService: ConfigService) {
    this.configService = configService;
  }

  public async getCurrentAgentId(): Promise<string> {
    // Ensure config is loaded first
    await this.configService.loadConfig();
    return this.configService.getCurrentAgentId();
  }
}
