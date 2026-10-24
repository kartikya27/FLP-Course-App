import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

export const adminRoutes: FastifyPluginAsyncZod = async (app) => {
  // Used by the admin panel to confirm the caller is an admin.
  app.get(
    '/v1/admin/ping',
    {
      onRequest: [app.authenticate, app.requireAdmin],
      schema: { response: { 200: z.object({ ok: z.literal(true) }) } },
    },
    async () => ({ ok: true as const }),
  );
};
