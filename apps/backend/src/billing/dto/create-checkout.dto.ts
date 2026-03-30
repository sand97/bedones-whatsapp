import { BillingPaymentMethod } from '@app/generated/client';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsIn, IsOptional, IsString, Matches } from 'class-validator';

export class CreateCheckoutDto {
  @ApiProperty({ enum: ['pro', 'business'] })
  @IsString()
  @IsIn(['pro', 'business'])
  planKey: string;

  @ApiProperty({ enum: [1, 6, 12] })
  @IsIn([1, 6, 12])
  durationMonths: number;

  @ApiProperty({ enum: BillingPaymentMethod })
  @IsEnum(BillingPaymentMethod)
  paymentMethod: BillingPaymentMethod;

  @ApiProperty({
    required: false,
    example: '+237690000000',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\+\d{8,15}$/, {
    message:
      'phoneNumber must use international format, for example +237690000000',
  })
  phoneNumber?: string;
}
