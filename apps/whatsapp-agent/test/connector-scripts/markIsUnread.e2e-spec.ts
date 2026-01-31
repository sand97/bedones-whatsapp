import request from 'supertest';

import { CONNECTOR_URL, SESSION, CHAT_ID, loadScript } from './helpers';

describe('page-script: chat/markIsUnread', () => {
  const timeoutMs = 15000;

  it(
    'should mark chat as unread',
    async () => {
      const script = loadScript('chat/markIsUnread.ts', {
        CHAT_ID,
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
