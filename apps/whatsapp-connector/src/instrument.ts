// Import with `const Sentry = require("@sentry/nestjs");` if you are using CJS
import * as Sentry from '@sentry/nestjs';

Sentry.init({
  // enabled:
  //   process.env.MODE === 'PROD' || process.env.NODE_ENV === 'production',
  dsn: 'https://97c7edd625f0fe98cade929c3b45be4d@o1063428.ingest.us.sentry.io/4511115864899584',
  // Tracing
  tracesSampleRate: 1.0, //  Capture 100% of the transactions
  enableLogs: true,
  // Setting this option to true will send default PII data to Sentry.
  // For example, automatic IP address collection on events
  sendDefaultPii: true,
});
