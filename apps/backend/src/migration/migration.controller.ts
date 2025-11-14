import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { MigrationService } from '@app/migration/migration.service';
import { ApiTags } from '@nestjs/swagger';
import PasswordGuard from '@app/guards/password.guard';
import { MigrateDto } from '@app/migration/migration.dto';

@ApiTags('migration')
@Controller('migration')
export class MigrationController {
  constructor(private readonly migrationService: MigrationService) {}
  @UseInterceptors(ClassSerializerInterceptor)
  @UseGuards(PasswordGuard())
  @Post('deploy')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async migrate(@Body() _: MigrateDto): Promise<any> {
    const result = await this.migrationService.deployPrismaMigration();

    return {
      result,
    };
  }
}
