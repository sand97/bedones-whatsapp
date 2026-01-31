import * as fs from 'fs';
import * as path from 'path';

export const CONNECTOR_URL =
  process.env.CONNECTOR_URL || 'http://localhost:3001';
export const SESSION =
  process.env.WHATSAPP_SESSION_NAME || 'whatsapp-agent-session';
export const CHAT_ID = process.env.E2E_CHAT_ID || '64845667926032@lid';
export const MESSAGE_ID = process.env.E2E_MESSAGE_ID || '';
export const MESSAGE_ID_EDIT = process.env.E2E_MESSAGE_ID_EDIT || '';
export const GROUP_ID = process.env.E2E_GROUP_ID || '';
export const PRODUCT_ID = process.env.E2E_PRODUCT_ID || '';
export const PRODUCT_IDS =
  process.env.E2E_PRODUCT_IDS || (PRODUCT_ID ? PRODUCT_ID : '');

export function loadScript(
  relPath: string,
  replacements: Record<string, string> = {},
) {
  const full = path.join(
    __dirname,
    '..',
    'src',
    'page-scripts',
    'scripts',
    relPath,
  );
  const source = fs.readFileSync(full, 'utf8');
  return Object.entries(replacements).reduce((acc, [k, v]) => {
    const placeholder = new RegExp(`{{${k}}}`, 'g');
    return acc.replace(placeholder, v);
  }, source);
}

/**
 * Utility to skip tests when required env vars are missing
 */
export function requireEnv(value: string, name: string) {
  if (!value) {
    // eslint-disable-next-line jest/no-focused-tests
    return it.skip(`${name} not provided – skipping`);
  }
  return null;
}
