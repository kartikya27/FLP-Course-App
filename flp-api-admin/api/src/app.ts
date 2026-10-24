import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import Fastify, { type FastifyServerOptions } from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import type { Db } from './db/client.js';
import { errorHandler, notFoundHandler } from './lib/errors.js';
import type { TokenVerifier } from './lib/token-verifier.js';
import { adminRoutes } from './modules/admin/admin.routes.js';
import { meRoutes } from './modules/me/me.routes.js';
import { authPlugin } from './plugins/auth.js';
import { healthRoutes } from './routes/health.js';

export interface BuildAppOptions {
  db: Db;
  verifyToken: TokenVerifier;
  logger?: FastifyServerOptions['logger'];
  corsOrigins?: string[];
}

export async function buildApp(opts: BuildAppOptions) {
  const app = Fastify({ logger: opts.logger ?? false }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.setErrorHandler(errorHandler);
  app.setNotFoundHandler(notFoundHandler);

  await app.register(helmet);
  await app.register(cors, { origin: opts.corsOrigins ?? false });
  await app.register(authPlugin, { db: opts.db, verifyToken: opts.verifyToken });

  await app.register(healthRoutes);
  await app.register(meRoutes, { db: opts.db });
  await app.register(adminRoutes);

  return app;
}

export type App = Awaited<ReturnType<typeof buildApp>>;
