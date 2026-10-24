import { buildApp } from './app.js';
import { loadEnv } from './config/env.js';

const env = loadEnv();

const app = await buildApp({
  logger: env.NODE_ENV === 'development' ? { transport: { target: 'pino-pretty' } } : true,
  corsOrigins: env.CORS_ORIGINS.split(',').map((origin) => origin.trim()),
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    void app.close().then(() => process.exit(0));
  });
}

try {
  await app.listen({ host: env.HOST, port: env.PORT });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
