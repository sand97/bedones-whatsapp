import { registerAs } from '@nestjs/config';

export interface AIConfig {
  xai: {
    apiKey: string;
    model: string;
  };
  gemini: {
    apiKey: string;
    model: string;
  };
}

export default registerAs(
  'ai',
  (): AIConfig => ({
    xai: {
      apiKey: process.env.XAI_API_KEY || '',
      model: process.env.XAI_MODEL || 'grok-4-fast-reasoning-latest',
    },
    gemini: {
      apiKey: process.env.GEMINI_API_KEY || '',
      model: process.env.GEMINI_MODEL || 'gemini-2.5-pro',
    },
  }),
);
