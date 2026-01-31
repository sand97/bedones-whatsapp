import request from 'supertest';

import { CONNECTOR_URL, SESSION, loadScript } from './helpers';

describe('page-script: catalog/searchProducts', () => {
  const timeoutMs = 20000;

  it(
    'should return with query=studio, limit=5',
    async () => {
      const script = loadScript('catalog/searchProducts.ts', {
        QUERY: 'studio',
        LIMIT: '5',
      });

      const res = await request(CONNECTOR_URL)
        .post('/whatsapp/execute-script')
        .send({ sessionName: SESSION, script })
        .expect(200);

      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('result');
      expect(
        Array.isArray(res.body.result) || typeof res.body.result === 'object',
      ).toBe(true);
    },
    timeoutMs,
  );
});
