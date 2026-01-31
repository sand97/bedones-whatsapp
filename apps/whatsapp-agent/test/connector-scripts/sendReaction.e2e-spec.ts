import request from 'supertest';

import {
  CONNECTOR_URL,
  SESSION,
  MESSAGE_ID,
  loadScript,
  requireEnv,
} from './helpers';

describe('page-script: chat/sendReaction', () => {
  const timeoutMs = 15000;

  const skip = requireEnv(MESSAGE_ID, 'E2E_MESSAGE_ID');
  if (skip) return;

  it(
    'should react to a message',
    async () => {
      const script = loadScript('chat/sendReaction.ts', {
        MESSAGE_ID,
        REACTION: '👍',
      });

      const res = await request(CONNECTOR_URL)
        .post('/whatsapp/execute-script')
        .send({ sessionName: SESSION, script })
        .expect(200);

      expect(res.body).toHaveProperty('success', true);
    },
    timeoutMs,
  );
});
