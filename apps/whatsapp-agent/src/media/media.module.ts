import { Module } from '@nestjs/common';

import { BackendClientModule } from '../backend-client/backend-client.module';
import { AudioTranscriptionService } from './audio-transcription.service';

@Module({
  imports: [BackendClientModule],
  providers: [AudioTranscriptionService],
  exports: [AudioTranscriptionService],
})
export class MediaModule {}
