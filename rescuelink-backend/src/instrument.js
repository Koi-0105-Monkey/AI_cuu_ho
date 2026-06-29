const Sentry = require("@sentry/node");

Sentry.init({
  dsn: process.env.SENTRY_DSN || "https://598ffe7ce061b378b06b07bec3685737@o4510417905123328.ingest.us.sentry.io/4511646560157696",
  environment: process.env.NODE_ENV || "development",
  tracesSampleRate: 1.0,
});
