import request from 'supertest';

import {
  CONNECTOR_URL,
  SESSION,
  PRODUCT_ID,
  loadScript,
  requireEnv,
} from './helpers';

describe('page-script: catalog/getProductDetails', () => {
  const timeoutMs = 20000;

  const skip = requireEnv(PRODUCT_ID, 'E2E_PRODUCT_ID');
  if (skip) return;

  it(
    'should return product details',
    async () => {
      const script = loadScript('catalog/getProductDetails.ts', {
        PRODUCT_ID,
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
