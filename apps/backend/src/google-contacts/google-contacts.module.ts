import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { CommonModule } from '../common/common.module';
import { PrismaModule } from '../prisma/prisma.module';

import {
  GoogleContactsController,
  GoogleContactsInternalController,
  GoogleOAuthController,
} from './google-contacts.controller';
import { GoogleContactsService } from './google-contacts.service';

@Module({
  imports: [HttpModule, PrismaModule, CommonModule],
  controllers: [
    GoogleContactsController,
    GoogleOAuthController,
    GoogleContactsInternalController,
  ],
  providers: [GoogleContactsService],
  exports: [GoogleContactsService],
})
export class GoogleContactsModule {}
