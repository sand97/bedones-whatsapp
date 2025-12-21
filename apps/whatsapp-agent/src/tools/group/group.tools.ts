import { ConnectorClientService } from '@app/connector/connector-client.service';
import { PageScriptService } from '@app/page-scripts/page-script.service';
import { tool } from '@langchain/core/tools';
import { Injectable } from '@nestjs/common';
import { z } from 'zod';

/**
 * Group tools for the WhatsApp agent
 * Provides group management and invitation capabilities
 */
@Injectable()
export class GroupTools {
  constructor(
    private readonly connectorClient: ConnectorClientService,
    private readonly scriptService: PageScriptService,
  ) {}

  /**
   * Create all group tools
   */
  createTools() {
    return [this.createSendGroupInviteTool()];
  }

  /**
   * Send group invite message
   */
  private createSendGroupInviteTool() {
    return tool(
      async ({ to, inviteCode, groupId, expiration }, config?: any) => {
        try {
          const script = this.scriptService.getScript('group/sendGroupInvite', {
            TO: to,
            INVITE_CODE: inviteCode,
            GROUP_ID: groupId,
            EXPIRATION: expiration ? String(expiration) : '',
          });

          const result = await this.connectorClient.executeScript(script);

          return JSON.stringify(result);
        } catch (error: any) {
          return JSON.stringify({
            success: false,
            error: error.message,
          });
        }
      },
      {
        name: 'send_group_invite',
        description:
          'Envoyer une invitation à rejoindre un groupe WhatsApp. Parfait pour inviter des clients dans des groupes de support, communautés, groupes VIP, etc.',
        schema: z.object({
          to: z.string().describe('ID du destinataire (numéro ou avec @c.us)'),
          inviteCode: z
            .string()
            .describe("Code d'invitation du groupe (obtenu via WhatsApp)"),
          groupId: z.string().describe('ID du groupe (format: xxxxx@g.us)'),
          expiration: z
            .number()
            .optional()
            .describe(
              "Timestamp d'expiration de l'invitation (en millisecondes)",
            ),
        }),
      },
    );
  }
}
