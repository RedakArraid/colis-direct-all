import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const msg = formatZodError(result.error);
      return res.status(400).json({ error: msg });
    }
    req.body = result.data;
    next();
  };
}

function formatZodError(err: ZodError): string {
  const first = err.issues[0];
  if (!first) return 'Données invalides';
  const path = first.path.length ? `${first.path.join('.')} : ` : '';
  return `${path}${first.message}`;
}
