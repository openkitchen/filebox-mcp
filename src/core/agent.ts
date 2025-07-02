import { ConfigService } from './config.js';

export class AgentService {
  private configService: ConfigService;

  constructor(configService: ConfigService) {
    this.configService = configService;
  }

  public async getCurrentAgentId(): Promise<string> {
    // 直接委托给ConfigService
    return await this.configService.getCurrentAgentId();
  }
}
