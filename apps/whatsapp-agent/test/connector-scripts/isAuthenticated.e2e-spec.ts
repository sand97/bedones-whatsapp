import request from 'supertest';

import { CONNECTOR_URL, SESSION, loadScript } from './helpers';

describe('page-script: isAuthenticated', () => {
  const timeoutMs = 15000;

  it(
    'should return status',
    async () => {
      const script = loadScript('isAuthenticated.ts');

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
