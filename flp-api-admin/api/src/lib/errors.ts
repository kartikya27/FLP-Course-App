import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod';

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

function send(reply: FastifyReply, statusCode: number, code: string, message: string) {
  return reply.status(statusCode).send({ error: { code, message } });
}

export function errorHandler(error: FastifyError, request: FastifyRequest, reply: FastifyReply) {
  if (error instanceof AppError) {
    return send(reply, error.statusCode, error.code, error.message);
  }
  if (hasZodFastifySchemaValidationErrors(error)) {
    const first = error.validation[0];
    return send(reply, 400, 'VALIDATION_ERROR', first?.message ?? 'Invalid request');
  }
  const statusCode = error.statusCode ?? 500;
  if (statusCode < 500) {
    // Fastify's own client errors: malformed JSON, payload too large, unsupported media type.
    return send(reply, statusCode, error.code ?? 'BAD_REQUEST', error.message);
  }
  request.log.error({ err: error }, 'Unhandled error');
  return send(reply, 500, 'INTERNAL_ERROR', 'Something went wrong. Please try again.');
}

export function notFoundHandler(_request: FastifyRequest, reply: FastifyReply) {
  return send(reply, 404, 'NOT_FOUND', 'Route not found');
}
