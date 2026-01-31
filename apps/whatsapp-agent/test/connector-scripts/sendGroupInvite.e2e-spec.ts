import request from 'supertest';

import {
  CONNECTOR_URL,
  SESSION,
  GROUP_ID,
  loadScript,
  requireEnv,
} from './helpers';

describe('page-script: group/sendGroupInvite', () => {
  const timeoutMs = 15000;

  const skip = requireEnv(GROUP_ID, 'E2E_GROUP_ID');
  if (skip) return;

  it(
    'should send a group invite link',
    async () => {
      const script = loadScript('group/sendGroupInvite.ts', {
        GROUP_ID,
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
