import request from 'supertest';

import {
  CONNECTOR_URL,
  SESSION,
  MESSAGE_ID_EDIT,
  loadScript,
  requireEnv,
} from './helpers';

describe('page-script: chat/editMessage', () => {
  const timeoutMs = 15000;

  const skip = requireEnv(MESSAGE_ID_EDIT, 'E2E_MESSAGE_ID_EDIT');
  if (skip) return;

  it(
    'should edit a message',
    async () => {
      const script = loadScript('chat/editMessage.ts', {
        MESSAGE_ID: MESSAGE_ID_EDIT,
        NEW_TEXT: 'Message édité (test e2e)',
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
