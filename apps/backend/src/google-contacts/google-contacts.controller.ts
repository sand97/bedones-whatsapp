import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';

import { AgentContext } from '../common/decorators/agent-context.decorator';
import { AgentInternalGuard } from '../common/guards/agent-internal.guard';
import type { AgentRequestContext } from '../common/guards/agent-internal.guard';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

import { SyncGoogleContactDto } from './dto/sync-google-contact.dto';
import { GoogleContactsService } from './google-contacts.service';

@ApiTags('google-contacts')
@Controller('google-contacts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GoogleContactsController {
  constructor(private readonly googleContactsService: GoogleContactsService) {}

  @Post('oauth/authorize-url')
  @ApiOperation({
    summary: 'Create the Google OAuth authorization URL',
  })
  @ApiResponse({
    status: 201,
    description: 'Authorization URL generated successfully',
    schema: {
      type: 'object',
      properties: {
        authorizeUrl: { type: 'string' },
      },
    },
  })
  async createAuthorizeUrl(@Request() req: any) {
    return this.googleContactsService.createAuthorizeUrl(req.user.id);
  }
}

@ApiTags('google-contacts')
@Controller('google')
export class GoogleOAuthController {
  constructor(private readonly googleContactsService: GoogleContactsService) {}

  @Get('callback')
  @ApiOperation({
    summary: 'Handle the Google OAuth callback',
  })
  @ApiResponse({
    status: 302,
    description: 'Redirects the user back to the frontend dashboard',
  })
  async handleCallback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Res() res: Response,
  ) {
    try {
      if (error) {
        return res.redirect(
          this.googleContactsService.buildFrontendRedirect('error', error),
        );
      }

      const redirectUrl = await this.googleContactsService.handleOAuthCallback(
        code || '',
        state || '',
      );

      return res.redirect(redirectUrl);
    } catch (callbackError: any) {
      return res.redirect(
        this.googleContactsService.buildFrontendRedirect(
          'error',
          callbackError?.message || 'Google OAuth callback failed',
        ),
      );
    }
  }
}

@ApiTags('google-contacts')
@Controller('agent-internal/google-contacts')
@UseGuards(AgentInternalGuard)
@ApiBearerAuth()
export class GoogleContactsInternalController {
  constructor(private readonly googleContactsService: GoogleContactsService) {}

  @Post('sync-contact')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Sync a WhatsApp contact to Google Contacts',
  })
  @ApiResponse({
    status: 200,
    description: 'Contact sync result',
  })
  async syncContact(
    @AgentContext() context: AgentRequestContext,
    @Body() dto: SyncGoogleContactDto,
  ) {
    return this.googleContactsService.syncContactForAgent(
      context.agentId,
      context.userId,
      dto,
    );
  }
}
