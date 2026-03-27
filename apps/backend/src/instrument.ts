// Import with `const Sentry = require("@sentry/nestjs");` if you are using CJS
import * as Sentry from '@sentry/nestjs';

Sentry.init({
  enabled: process.env.MODE === 'PROD',
  dsn: 'https://0a642b2ac36777b4d23e17aa1f163751@o1063428.ingest.us.sentry.io/4511115816337408',
  // Tracing
  tracesSampleRate: 1.0, //  Capture 100% of the transactions
  enableLogs: true,
  // Setting this option to true will send default PII data to Sentry.
  // For example, automatic IP address collection on events
  sendDefaultPii: true,
});
