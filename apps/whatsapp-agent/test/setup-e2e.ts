import * as fs from 'fs';
import * as path from 'path';

import * as dotenv from 'dotenv';

// Load .env.e2e if present (apps/whatsapp-agent/.env.e2e)
const envPath = path.join(__dirname, '..', '.env.e2e');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

// Provide sane defaults for tests
process.env.CONNECTOR_URL =
  process.env.CONNECTOR_URL || 'http://localhost:3001';
process.env.WHATSAPP_SESSION_NAME =
  process.env.WHATSAPP_SESSION_NAME || 'whatsapp-agent-session';
process.env.E2E_CHAT_ID = process.env.E2E_CHAT_ID || '64845667926032@lid';
