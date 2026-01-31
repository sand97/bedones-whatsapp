import request from 'supertest';

import { CONNECTOR_URL, SESSION, CHAT_ID, loadScript } from './helpers';

describe('page-script: chat/sendLocation', () => {
  const timeoutMs = 20000;

  it(
    'should send a location to chat',
    async () => {
      const script = loadScript('chat/sendLocation.ts', {
        TO: CHAT_ID,
        LAT: '48.8566',
        LNG: '2.3522',
        NAME: 'Test Location',
        ADDRESS: 'Paris',
        URL: 'https://maps.google.com',
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
