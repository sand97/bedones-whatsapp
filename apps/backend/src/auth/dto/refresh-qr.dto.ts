import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshQrDto {
  @ApiProperty({
    description: 'Pairing token associated with the QR session',
    example: 'token123',
  })
  @IsString()
  @IsNotEmpty()
  pairingToken: string;

  @ApiProperty({
    description:
      'JWT de session QR signé côté backend, contient le numéro et le pairing token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  @IsNotEmpty()
  qrSessionToken: string;
}
