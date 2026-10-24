import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { Db } from '../../db/client.js';
import { profileDtoSchema, toProfileDto } from '../profiles/profile.dto.js';
import { updateProfile } from '../profiles/profiles.repo.js';

const nameMessage = 'Full name must be 2–80 characters';

// Unknown keys (role, status, ...) are stripped, so a student cannot promote themselves.
const updateMeBody = z.object({
  fullName: z.string().trim().min(2, nameMessage).max(80, nameMessage).optional(),
  email: z.string().trim().pipe(z.email('Enter a valid email')).nullable().optional(),
});

export const meRoutes: FastifyPluginAsyncZod<{ db: Db }> = async (app, { db }) => {
  app.get(
    '/v1/me',
    {
      onRequest: app.authenticate,
      config: { allowBlocked: true },
      schema: { response: { 200: profileDtoSchema } },
    },
    async (request) => toProfileDto(request.profile),
  );

  app.patch(
    '/v1/me',
    {
      onRequest: app.authenticate,
      schema: { body: updateMeBody, response: { 200: profileDtoSchema } },
    },
    async (request) => toProfileDto(await updateProfile(db, request.profile.id, request.body)),
  );
};
