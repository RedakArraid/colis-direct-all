import express from 'express';
import { pool } from '../db/connection';
import { computePricing, resolvePackageSize } from '../services/pricingService';

const router = express.Router();

// Get active pricing grids (public)
router.get('/active', async (_req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM pricing_grids WHERE is_active = true ORDER BY grid_type, COALESCE(package_size, \'\'), delivery_mode, display_order, weight_min ASC'
    );
    res.json({ data: result.rows });
  } catch (error: any) {
    console.error('Get active pricing grids error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── Marketplace : calcul du prix (distance × taille + poids) ─────────────────
// GET /api/pricing-grids/calculate?sender_commune=Cocody&recipient_commune=Bouaké&package_size=petit&weight=8
// La logique vit dans pricingService.computePricing (partagée avec POST /shipments).
router.get('/calculate', async (req, res) => {
  try {
    const { sender_commune, recipient_commune, package_size, grid_type, weight } = req.query;

    if (!sender_commune || !recipient_commune) {
      return res.status(400).json({ error: 'Paramètres requis : sender_commune, recipient_commune' });
    }

    const senderName = (sender_commune as string).trim();
    const recipientName = (recipient_commune as string).trim();
    const pkgSize = resolvePackageSize(package_size as string, grid_type as string);
    const weightKg = Math.max(0, parseFloat((weight as string) || '0') || 0);

    const result = await computePricing(senderName, recipientName, pkgSize, weightKg);

    res.json({
      sender_commune,
      recipient_commune,
      ...result,
      // distance masquée si la zone n'a pas pu être résolue (évite d'exposer MAX_SAFE_INTEGER)
      distance_km: result.zone_resolved ? Math.round(result.distance_km) : (result.is_same_zone ? 0 : null),
    });
  } catch (error: any) {
    console.error('Calculate pricing error:', error);
    res.status(error.message?.includes('tranche tarifaire') ? 404 : 500).json({ error: error.message });
  }
});

export default router;
