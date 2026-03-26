import {
  BillingProvider,
} from '@app/generated/client';
import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Query,
  Req,
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
import type { Request as ExpressRequest, Response } from 'express';

import { JwtAuthGuard } from '../guards/jwt-auth.guard';

import { BillingService } from './billing.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';

@ApiTags('billing')
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initialize a payment checkout session' })
  @ApiResponse({ status: 201, description: 'Checkout initialized successfully' })
  async createCheckout(@Request() req: any, @Body() dto: CreateCheckoutDto) {
    return this.billingService.createCheckout(req.user.id, dto);
  }

  @Get('stripe/return')
  @ApiOperation({ summary: 'Handle Stripe browser return after checkout' })
  async handleStripeReturn(
    @Query() query: Record<string, string | string[] | undefined>,
    @Res() res: Response,
  ) {
    const getQueryValue = (value?: string | string[]) =>
      Array.isArray(value) ? value[0] || '' : value || '';

    let redirectUrl: string;

    try {
      redirectUrl = await this.billingService.handleStripeReturn(query);
    } catch {
      redirectUrl = this.billingService.buildFrontendRedirectUrl(
        'failed',
        BillingProvider.STRIPE,
        getQueryValue(query.reference) || 'unknown',
        'server_error',
      );
    }

    return res.redirect(302, redirectUrl);
  }

  @Get('notchpay/return')
  @ApiOperation({ summary: 'Handle Notch Pay browser return after checkout' })
  async handleNotchReturn(
    @Query() query: Record<string, string | string[] | undefined>,
    @Res() res: Response,
  ) {
    const getQueryValue = (value?: string | string[]) =>
      Array.isArray(value) ? value[0] || '' : value || '';

    let redirectUrl: string;

    try {
      redirectUrl = await this.billingService.handleNotchReturn(query);
    } catch {
      redirectUrl = this.billingService.buildFrontendRedirectUrl(
        'failed',
        BillingProvider.NOTCH_PAY,
        getQueryValue(query.reference) || getQueryValue(query.trxref) || 'unknown',
        'server_error',
      );
    }

    return res.redirect(302, redirectUrl);
  }

  @Post('webhooks/stripe')
  @ApiOperation({ summary: 'Handle Stripe webhooks' })
  async handleStripeWebhook(
    @Req() req: ExpressRequest & { body: Buffer },
    @Headers('stripe-signature') signature: string | undefined,
  ) {
    return this.billingService.handleStripeWebhook(req.body, signature);
  }

  @Post('webhooks/notchpay')
  @ApiOperation({ summary: 'Handle Notch Pay webhooks' })
  async handleNotchWebhook(
    @Req() req: ExpressRequest & { body: Buffer },
    @Headers('x-notch-signature') signature: string | undefined,
  ) {
    return this.billingService.handleNotchWebhook(req.body, signature);
  }
}
