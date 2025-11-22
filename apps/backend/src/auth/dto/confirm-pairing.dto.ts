import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ConfirmPairingDto {
  @ApiProperty({
    description: 'The pairing token received when requesting the pairing code',
    example: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2',
  })
  @IsString()
  @IsNotEmpty()
  pairingToken: string;

  @ApiPropertyOptional({
    description:
      'OTP code if this is an OTP login scenario (required when scenario is "otp")',
    example: '123456',
  })
  @IsString()
  @IsOptional()
  otpCode?: string;
}
