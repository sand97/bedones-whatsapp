import request from 'supertest';

import { CONNECTOR_URL, SESSION, loadScript } from './helpers';

describe('page-script: catalog/getCollections', () => {
  const timeoutMs = 20000;

  it(
    'should return successfully (even if empty)',
    async () => {
      const script = loadScript('catalog/getCollections.ts');

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
