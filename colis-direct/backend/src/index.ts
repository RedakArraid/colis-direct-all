import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import rateLimit from 'express-rate-limit';
import { pool } from './db/connection';
import { migrate } from './db/migrate';
import authRoutes from './routes/auth';
import shipmentsRoutes from './routes/shipments';
import relayPointsRoutes from './routes/relayPoints';
import trackingRoutes from './routes/tracking';
import usersRoutes from './routes/users';
import transportersRoutes from './routes/transporters';
import statsRoutes from './routes/stats';
import notificationsRoutes from './routes/notifications';
import analyticsRoutes from './routes/analytics';
import activityLogsRoutes from './routes/activityLogs';
import addressBookRoutes from './routes/addressBook';
import handoffsRoutes from './routes/handoffs';
import supportRoutes from './routes/support';
import paymentsRoutes, { paymentsWebhookRouter } from './routes/payments';
import chatbotRoutes from './routes/chatbot';
import senderAddressesRoutes from './routes/senderAddresses';
import recipientAddressesRoutes from './routes/recipientAddresses';
import qrCodesRoutes from './routes/qrCodes';
import pricingRoutes from './routes/pricing';
import pricingGridsRoutes from './routes/pricingGrids';
import additionalOptionsRoutes from './routes/additionalOptions';
import scanRoutes, { scanExtrasRouter } from './routes/scan';
import shippingAddressesRoutes from './routes/shippingAddresses';
import customerMessagesRoutes from './routes/customerMessages';
import relayApplicationsRoutes from './routes/relayApplications';
import deliveryZonesRoutes from './routes/deliveryZones';
import jobPostingsRoutes from './routes/jobPostings';
import jobApplicationsRoutes from './routes/jobApplications';
import adminSettingsRoutes from './routes/adminSettings';
import promoCodesRoutes from './routes/promoCodes';
import cartRoutes from './routes/cart';
import uploadsRoutes from './routes/uploads';
import apiV1Routes from './routes/apiV1';
import apiKeysRoutes from './routes/apiKeys';
import apiDocsRoutes from './routes/apiDocs';
// Marketplace
import transporterApplicationsRoutes from './routes/transporterApplications';
import deliveryOffersRoutes from './routes/deliveryOffers';
import transporterWalletRoutes from './routes/transporterWallet';
import deliveryPriceTiersRoutes from './routes/deliveryPriceTiers';
import dispatchService from './services/dispatchService';
import deliveryBatchesRoutes from './routes/deliveryBatches';
import batchDispatchService from './services/batchDispatchService';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration
const allowedOrigins = [
  'https://colisdirect.com',
  'https://www.colisdirect.com',
  'https://staging.colisdirect.com',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
];

// ─── CORS ─────────────────────────────────────────────────────────────────
// L'auth est 100% JWT Bearer (header Authorization), AUCUN cookie → credentials
// CORS inutile et désactivé (ce qui ferme tout risque d'origine reflétée + credentials).
// On autorise : origines web de confiance (allowedOrigins) + clients mobiles WebView
// (Origin 'null' pour file://, localhost, capacitor://, ionic://). En non-prod
// uniquement : localhost:<port> arbitraire pour le dev.
// IMPORTANT (CLAUDE.md) : jamais de match de sous-chaîne laxiste sur le domaine
// (injection de sous-domaine) — comparaison exacte contre allowedOrigins uniquement.
const isMobileWebViewOrigin = (origin?: string | null): boolean =>
  !origin ||
  origin === 'null' ||
  origin === 'http://localhost' ||
  origin === 'https://localhost' ||
  origin === 'capacitor://localhost' ||
  origin === 'ionic://localhost';

const isDevLocalhostOrigin = (origin?: string | null): boolean =>
  process.env.NODE_ENV !== 'production' &&
  !!origin &&
  /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

const isOriginAllowed = (origin?: string | null): boolean =>
  isMobileWebViewOrigin(origin) ||
  (!!origin && allowedOrigins.includes(origin)) ||
  isDevLocalhostOrigin(origin);

app.use(cors((req, callback) => {
  const origin = req.header('Origin');
  callback(null, {
    origin: isOriginAllowed(origin) ? (origin || true) : false,
    credentials: false, // tout est Bearer token → aucun cookie à transmettre
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 200,
  });
}));

// Trust first proxy (Traefik) so express-rate-limit can read X-Forwarded-For correctly
app.set('trust proxy', 1);

// Les requêtes preflight OPTIONS sont gérées par le middleware cors() ci-dessus
// (optionsSuccessStatus: 200). Pas de handler manuel — une seule source de vérité.

// Mount Paystack webhook RAW body BEFORE JSON parser (needs raw body for HMAC signature verification)
app.use('/api/payments/paystack/webhook', paymentsWebhookRouter);

// JSON parser for all other routes
app.use(express.json());

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check
app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'error', database: 'disconnected' });
  }
});

// ─── Rate Limiters ────────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de tentatives. Réessayez dans 15 minutes.' },
});

const createLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de requêtes. Réessayez dans quelques minutes.' },
});

const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de requêtes de paiement. Réessayez dans quelques minutes.' },
});

// Apply rate limiters to sensitive public routes
app.use('/api/auth/signin', authLimiter);
app.use('/api/auth/signup', authLimiter);
app.use('/api/payments/mobile-money/init', paymentLimiter);
app.use('/api/payments/mobile-money/init-batch', paymentLimiter);
app.use('/api/payments/paystack/init', paymentLimiter);
app.use('/api/payments/cinetpay/init', paymentLimiter);
app.use('/api/chatbot/message', createLimiter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/shipments', shipmentsRoutes);
app.use('/api/relay-points', relayPointsRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/transporters', transportersRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/activity-logs', activityLogsRoutes);
app.use('/api/address-book', addressBookRoutes);
app.use('/api/handoffs', handoffsRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/sender-addresses', senderAddressesRoutes);
app.use('/api/recipient-addresses', recipientAddressesRoutes);
app.use('/api/qr-codes', qrCodesRoutes);
app.use('/api/pricing', pricingRoutes);
app.use('/api/pricing-grids', pricingGridsRoutes);
app.use('/api/additional-options', additionalOptionsRoutes);
app.use('/api/scan', scanRoutes);
app.use('/api/scan/extras', scanExtrasRouter);
app.use('/api/shipping-addresses', shippingAddressesRoutes);
app.use('/api/customer-messages', customerMessagesRoutes);
app.use('/api/relay-applications', relayApplicationsRoutes);
app.use('/api/delivery-zones', deliveryZonesRoutes);
app.use('/api/job-postings', jobPostingsRoutes);
app.use('/api/job-applications', jobApplicationsRoutes);
app.use('/api/admin/settings', adminSettingsRoutes);
app.use('/api/promo-codes', promoCodesRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/uploads', uploadsRoutes);
app.use('/api/v1', apiV1Routes);
app.use('/api/api-keys', apiKeysRoutes);
// Marketplace routes
app.use('/api/transporter-applications', transporterApplicationsRoutes);
app.use('/api/delivery-offers', deliveryOffersRoutes);
app.use('/api/transporter/wallet', transporterWalletRoutes);
app.use('/api/admin/wallets', transporterWalletRoutes);
app.use('/api/delivery-price-tiers', deliveryPriceTiersRoutes);
app.use('/api/delivery-batches', deliveryBatchesRoutes);
app.use('/', apiDocsRoutes);

// Error handling middleware
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

// Create generate_pickup_code function if it doesn't exist
async function ensurePickupCodeFunction() {
  try {
    console.log('🔍 Checking for generate_pickup_code() function...');
    
    // Always try to create/replace the function
    console.log('📝 Creating/updating generate_pickup_code() function...');
    await pool.query(`
      CREATE OR REPLACE FUNCTION generate_pickup_code()
      RETURNS text AS $$
      DECLARE
        code text;
        exists_check boolean;
      BEGIN
        LOOP
          code := LPAD(FLOOR(RANDOM() * 1000000)::text, 6, '0');
          SELECT EXISTS(SELECT 1 FROM shipments WHERE pickup_code = code) INTO exists_check;
          EXIT WHEN NOT exists_check;
        END LOOP;
        RETURN code;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    // Verify it was created
    const verifyResult = await pool.query(
      "SELECT proname FROM pg_proc WHERE proname = 'generate_pickup_code'"
    );
    
    if (verifyResult.rows.length > 0) {
      console.log('✅ Function generate_pickup_code() created/verified successfully');
    } else {
      console.warn('⚠️  Function generate_pickup_code() may not have been created');
    }
  } catch (error: any) {
    console.error('❌ Error creating generate_pickup_code() function:', error.message);
    console.error('Full error:', error);
    // Don't exit, try to continue anyway
  }
}

// Ensure transporter_assignments table exists
async function ensureTransporterAssignmentsTable() {
  try {
    console.log('🔍 Checking transporter_assignments table...');
    
    // Check if table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'transporter_assignments'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('📝 Creating transporter_assignments table...');
      await pool.query(`
        CREATE TABLE transporter_assignments (
          id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
          transporter_id uuid REFERENCES transporters(id) ON DELETE CASCADE NOT NULL,
          shipment_id uuid REFERENCES shipments(id) ON DELETE CASCADE NOT NULL,
          relay_point_id uuid REFERENCES relay_points(id) ON DELETE SET NULL,
          assignment_status text NOT NULL DEFAULT 'pending' CHECK (assignment_status IN ('pending', 'picked_up', 'in_transit', 'delivered')),
          expected_pickup_at timestamptz,
          picked_up_at timestamptz,
          notes text,
          created_at timestamptz DEFAULT now(),
          updated_at timestamptz DEFAULT now(),
          UNIQUE(transporter_id, shipment_id)
        );
      `);
      
      // Create indexes
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_transporter_assignments_transporter ON transporter_assignments(transporter_id);
        CREATE INDEX IF NOT EXISTS idx_transporter_assignments_shipment ON transporter_assignments(shipment_id);
        CREATE INDEX IF NOT EXISTS idx_transporter_assignments_status ON transporter_assignments(assignment_status);
      `);
      
      // Create trigger for updated_at (only if function exists)
      try {
        await pool.query(`
          DROP TRIGGER IF EXISTS update_transporter_assignments_updated_at ON transporter_assignments;
          CREATE TRIGGER update_transporter_assignments_updated_at
          BEFORE UPDATE ON transporter_assignments
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
        `);
      } catch (triggerError: any) {
        console.warn('⚠️  Could not create trigger (function may not exist yet):', triggerError.message);
      }
      
      console.log('✅ transporter_assignments table created successfully');
    } else {
      console.log('✅ transporter_assignments table already exists');
    }
  } catch (error: any) {
    console.error('❌ Error ensuring transporter_assignments table:', error.message);
    console.error('Full error:', error);
  }
}

// Ensure all required columns exist in shipments table
async function ensureShipmentsColumns() {
  try {
    console.log('🔍 Checking shipments table columns...');
    
    const columnsToCheck = [
      { name: 'home_delivery', type: 'boolean', default: 'false' },
      { name: 'printing_fee', type: 'numeric', default: '0' },
      { name: 'assistance_fee', type: 'numeric', default: '0' },
      { name: 'box_price', type: 'numeric', default: '0' },
      { name: 'pickup_code', type: 'text', default: null },
      { name: 'relay_assisted', type: 'boolean', default: 'false' },
      { name: 'transporter_id', type: 'uuid', default: null },
      { name: 'created_by', type: 'uuid', default: null },
      { name: 'updated_by', type: 'uuid', default: null },
    ];

    for (const column of columnsToCheck) {
      const checkResult = await pool.query(
        `SELECT 1 FROM information_schema.columns 
         WHERE table_name = 'shipments' AND column_name = $1`,
        [column.name]
      );

      if (checkResult.rows.length === 0) {
        console.log(`📝 Adding column ${column.name} to shipments table...`);
        
        let alterQuery = `ALTER TABLE shipments ADD COLUMN ${column.name} ${column.type}`;
        
        if (column.default !== null) {
          alterQuery += ` DEFAULT ${column.default}`;
        }
        
        if (column.name === 'transporter_id') {
          alterQuery += ' REFERENCES transporters(id) ON DELETE SET NULL';
        } else if (column.name === 'created_by' || column.name === 'updated_by') {
          alterQuery += ' REFERENCES users(id) ON DELETE SET NULL';
        }
        
        await pool.query(alterQuery);
        console.log(`✅ Column ${column.name} added successfully`);
      }
    }
    
    console.log('✅ All shipments columns verified');
  } catch (error: any) {
    console.error('❌ Error ensuring shipments columns:', error.message);
    // Don't exit, try to continue anyway
  }
}

// Start server with migrations
async function startServer() {
  try {
    // Wait for PostgreSQL to be ready (useful in Docker Compose)
    const { waitForPostgres } = await import('./db/wait-for-postgres');
    await waitForPostgres();
    
    // Run migrations first (only in production or when RUN_MIGRATIONS=true)
    if (process.env.NODE_ENV === 'production' || process.env.RUN_MIGRATIONS === 'true') {
      console.log('🔄 Running database migrations...');
      await migrate();
    }
    
    // Ensure pickup code function exists
    await ensurePickupCodeFunction();
    
    // Ensure all required columns exist
    await ensureShipmentsColumns();
    
    // Ensure transporter_assignments table exists
    await ensureTransporterAssignmentsTable();
    
    // Start the server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);

      // ─── Cron job: traitement des offres de course expirées ───────────────
      // Toutes les 60 secondes : cascade vers le livreur suivant si l'offre a expiré
      setInterval(() => {
        dispatchService.processExpiredOffers().catch((err) => {
          console.error('Dispatch cron error:', err);
        });
      }, 60 * 1000);

      console.log('⏱  Dispatch cron démarré (interval: 60s)');

      // ─── Cron job: dispatch par lots (batch) ─────────────────────────────
      // Tick toutes les 60s, mais respecte cronIntervalMinutes de la config
      let lastBatchRun = 0;
      setInterval(async () => {
        try {
          const cfg = await pool.query("SELECT value FROM admin_settings WHERE key='batchDispatch'");
          const config = cfg.rows[0]?.value || {};
          if (!config.enabled) return;
          const intervalMs = (config.cronIntervalMinutes || 30) * 60 * 1000;
          if (Date.now() - lastBatchRun < intervalMs) return;
          lastBatchRun = Date.now();
          await batchDispatchService.processAllRelays();
          await batchDispatchService.processExpiredBatchOffers();
        } catch (err: any) {
          console.error('Batch dispatch cron error:', err.message);
        }
      }, 60 * 1000);

      console.log('⏱  Batch dispatch cron démarré (tick: 60s, intervalle configurable)');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

