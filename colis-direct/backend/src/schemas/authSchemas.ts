import { z } from 'zod';

export const signupSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(6).max(128),
  first_name: z.string().max(100).optional(),
  last_name: z.string().max(100).optional(),
  phone: z.string().max(20).optional(),
});

export const signinSchema = z.object({
  email: z.string().email().max(255).optional(),
  phone: z.string().min(8).max(20).optional(),
  password: z.string().min(1).max(128),
}).refine((d) => d.email || d.phone, { message: 'Email ou téléphone requis' });

export const refreshTokenSchema = z.object({
  refresh_token: z.string().min(20).max(512),
});
