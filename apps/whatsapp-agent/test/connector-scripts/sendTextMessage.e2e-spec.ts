import request from 'supertest';

import { CONNECTOR_URL, SESSION, CHAT_ID, loadScript } from './helpers';

describe('page-script: chat/sendTextMessage', () => {
  const timeoutMs = 20000;

  it(
    'should send a text message to configured chatId',
    async () => {
      const script = loadScript('chat/sendTextMessage.ts', {
        TO: CHAT_ID,
        MESSAGE: 'Ping test depuis e2e',
        USE_TYPING: 'false',
        QUOTED_MESSAGE_ID: '',
      });

      const res = await request(CONNECTOR_URL)
        .post('/whatsapp/execute-script')
        .send({ sessionName: SESSION, script })
        .expect(200);

      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('result');
    },
    timeoutMs,
  );
});
