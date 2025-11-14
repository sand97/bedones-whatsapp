import { Module } from '@nestjs/common';
import { MigrationService } from '@app/migration/migration.service';
import { MigrationController } from '@app/migration/migration.controller';

@Module({
  providers: [MigrationService],
  controllers: [MigrationController],
})
export class MigrationModule {}
