import { z } from 'zod';
import { sanitizeOptionalEmail } from '../utils/paymentEmail';

const phoneSchema = z.string().min(8).max(20).regex(/^\+?[0-9][0-9\s\-().]{7,18}$/, 'Numéro de téléphone invalide');

const optionalEmailSchema = z.preprocess(
  (val) => sanitizeOptionalEmail(val),
  z.string().email().max(255).nullable().optional(),
);

export const createShipmentSchema = z.object({
  tracking_number: z.string().max(32).optional(),
  sender_first_name: z.string().min(1).max(100),
  sender_last_name: z.string().min(1).max(100),
  sender_email: optionalEmailSchema,
  sender_phone: phoneSchema,
  sender_commune: z.string().min(1).max(100),
  sender_quartier: z.string().max(100).optional().default(''),
  sender_address: z.string().min(1).max(500),
  sender_repere: z.string().max(300).nullable().optional(),
  recipient_first_name: z.string().min(1).max(100),
  recipient_last_name: z.string().min(1).max(100),
  recipient_email: optionalEmailSchema,
  recipient_phone: phoneSchema,
  recipient_commune: z.string().min(1).max(100),
  recipient_quartier: z.string().max(100).optional().default(''),
  recipient_address: z.string().min(1).max(500),
  recipient_repere: z.string().max(300).nullable().optional(),
  package_type: z.enum(['petit', 'moyen', 'grand']),
  grid_type: z.enum(['courier', 'colis']).optional(),
  weight: z.coerce.number().positive().max(100),
  price: z.coerce.number().nonnegative().optional(),
  payment_status: z.enum(['pending', 'paid', 'failed', 'refunded']).optional(),
  print_at_relay: z.boolean().optional(),
  relay_assisted: z.boolean().optional(),
  home_delivery: z.boolean().optional(),
  pickup_method: z.enum(['relay_deposit', 'home_pickup']).optional().default('relay_deposit'),
  printing_fee: z.coerce.number().nonnegative().optional(),
  assistance_fee: z.coerce.number().nonnegative().optional(),
  box_price: z.coerce.number().nonnegative().optional(),
  payment_method: z.string().max(50).nullable().optional(),
  origin_relay_id: z.string().uuid().nullable().optional(),
  destination_relay_id: z.string().uuid().nullable().optional(),
  promo_code: z.string().max(50).nullable().optional(),
  sender_latitude: z.coerce.number().min(-90).max(90).nullable().optional(),
  sender_longitude: z.coerce.number().min(-180).max(180).nullable().optional(),
});
