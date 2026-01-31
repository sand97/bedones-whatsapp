import request from 'supertest';

import {
  CONNECTOR_URL,
  SESSION,
  CHAT_ID,
  PRODUCT_IDS,
  loadScript,
  requireEnv,
} from './helpers';

describe('page-script: chat/sendProductsMessage', () => {
  const timeoutMs = 20000;

  const skip = requireEnv(PRODUCT_IDS, 'E2E_PRODUCT_IDS');
  if (skip) return;

  it(
    'should send catalog products to chat',
    async () => {
      const script = loadScript('chat/sendProductsMessage.ts', {
        TO: CHAT_ID,
        PRODUCT_IDS: PRODUCT_IDS,
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
