import request from 'supertest';

import { CONNECTOR_URL, SESSION, CHAT_ID, loadScript } from './helpers';

describe('page-script: chat/setNotes', () => {
  const timeoutMs = 15000;

  it(
    'should set a note on the chat',
    async () => {
      const script = loadScript('chat/setNotes.ts', {
        CHAT_ID,
        NOTES: 'Note test e2e',
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
