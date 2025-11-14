import { Body, Controller, Post, Logger, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { LangChainAgentService } from '../langchain/langchain-agent.service';

@ApiTags('Webhook')
@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly agentService: LangChainAgentService) {}

  @Post('message')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Receive WhatsApp events from connector',
    description:
      'This endpoint receives all WhatsApp events from the connector service',
  })
  @ApiResponse({
    status: 200,
    description: 'Event received successfully',
  })
  async handleEvent(@Body() payload: any) {
    const { event, timestamp, data } = payload;

    this.logger.debug(`Received event: ${event}`, { timestamp });

    try {
      // Traiter uniquement les messages entrants
      if (event === 'message') {
        await this.agentService.processIncomingMessage(data);
      }

      // Pour les autres événements, on log simplement
      else {
        this.logger.log(`Event received: ${event}`, {
          event,
          timestamp,
          dataLength: data?.length || 0,
        });
      }

      return {
        success: true,
        event,
        processed: event === 'message',
      };
    } catch (error: any) {
      this.logger.error(`Error handling event ${event}:`, error.message);
      return {
        success: false,
        event,
        error: error.message,
      };
    }
  }
}
