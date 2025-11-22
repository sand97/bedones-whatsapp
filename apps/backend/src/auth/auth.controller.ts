import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../guards/jwt-auth.guard';

import { AuthService } from './auth.service';
import { ConfirmPairingDto } from './dto/confirm-pairing.dto';
import { LoginDto } from './dto/login.dto';
import { RequestPairingDto } from './dto/request-pairing.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { VerifyPairingDto } from './dto/verify-pairing.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('request-pairing')
  @ApiOperation({
    summary: 'Request pairing code',
    description:
      'Request a pairing code to link WhatsApp account with the application',
  })
  @ApiResponse({
    status: 201,
    description: 'Pairing code sent successfully',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: '12345678' },
        message: { type: 'string', example: 'Pairing code sent successfully' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - User is already paired',
  })
  async requestPairingCode(@Body() dto: RequestPairingDto) {
    return this.authService.requestPairingCode(dto.phoneNumber);
  }

  @Post('verify-pairing')
  @ApiOperation({
    summary: 'Verify pairing success',
    description:
      'Verify that WhatsApp pairing was successful (called by webhook from connector)',
  })
  @ApiResponse({
    status: 201,
    description: 'Pairing verified successfully',
    schema: {
      type: 'object',
      properties: {
        accessToken: { type: 'string' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            phoneNumber: { type: 'string' },
            status: { type: 'string' },
            whatsappProfile: { type: 'object' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async verifyPairing(@Body() dto: VerifyPairingDto) {
    return this.authService.verifyPairingSuccess(
      dto.phoneNumber,
      dto.whatsappProfile,
    );
  }

  @Post('confirm-pairing')
  @ApiOperation({
    summary: 'Confirm pairing completion or verify OTP',
    description:
      'Called by frontend to confirm pairing (new device) or verify OTP code (existing connection). The endpoint automatically detects which scenario to handle based on the presence of an OTP in cache.',
  })
  @ApiResponse({
    status: 201,
    description: 'Pairing/OTP confirmed successfully',
    schema: {
      type: 'object',
      properties: {
        accessToken: { type: 'string' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            phoneNumber: { type: 'string' },
            status: { type: 'string' },
            whatsappProfile: { type: 'object' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired pairing token / Invalid OTP code',
  })
  @ApiResponse({
    status: 400,
    description:
      'WhatsApp connection not yet confirmed / OTP code required but not provided',
  })
  async confirmPairing(@Body() dto: ConfirmPairingDto) {
    return this.authService.confirmPairing(dto.pairingToken, dto.otpCode);
  }

  @Post('verify-otp')
  @ApiOperation({
    summary: 'Verify OTP code',
    description: 'Verify OTP code and complete login',
  })
  @ApiResponse({
    status: 201,
    description: 'OTP verified successfully',
    schema: {
      type: 'object',
      properties: {
        accessToken: { type: 'string' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            phoneNumber: { type: 'string' },
            status: { type: 'string' },
            whatsappProfile: { type: 'object' },
            lastLoginAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired OTP',
  })
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOTP(dto.phoneNumber, dto.code);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current user',
    description: 'Get the currently authenticated user information',
  })
  @ApiResponse({
    status: 200,
    description: 'Current user information',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        phoneNumber: { type: 'string' },
        status: { type: 'string' },
        whatsappProfile: { type: 'object' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async getMe(@Request() req) {
    return req.user;
  }
}
