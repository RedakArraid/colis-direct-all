import express from 'express';

const router = express.Router();

const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Colis Direct API',
    version: '1.0.0',
    description:
      'API partenaire pour intégrer les services Colis Direct dans vos applications.\n\n' +
      '**Paiements** : création d’envois avec `paystack`, `cinetpay` ou `relay_cash` ; `mobile_money` / `card` peuvent figurer sur des enregistrements historiques. ' +
      'Paiement en ligne : `POST .../payments/paystack/init`, webhook brut `.../paystack/webhook` ; CinetPay : `.../cinetpay/init` et `.../cinetpay/notify`. ' +
      'Espèces au relais : `.../payments/relay-cash/*`. Les anciennes routes « mobile-money » déclaration/validation support ne sont plus exposées.',
    contact: {
      name: 'Support Colis Direct',
      email: 'support@colisdirect.com',
    },
  },
  servers: [
    { url: 'https://api.colisdirect.com/api/v1', description: 'Production' },
    { url: 'http://localhost:3001/api/v1', description: 'Local' },
  ],
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'API Key',
        description: 'Clé API au format `cd_live_<48 hex chars>`. Obtenez votre clé depuis le dashboard admin.',
      },
    },
    schemas: {
      PaymentMethod: {
        type: 'string',
        enum: ['mobile_money', 'relay_cash', 'paystack', 'cinetpay', 'card'],
        description:
          'Méthode d’enregistrement sur l’envoi. Valeurs usuelles à la création : `paystack`, `cinetpay`, `relay_cash`. ' +
          '`mobile_money` et `card` peuvent apparaître sur des données existantes (rétrocompatibilité / agrégats).',
      },
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string', description: 'Message d\'erreur' },
        },
      },
      TrackingEvent: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          notes: { type: 'string', nullable: true },
          occurred_at: { type: 'string', format: 'date-time' },
        },
      },
      RelayPoint: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          address: { type: 'string' },
          commune: { type: 'string' },
          quartier: { type: 'string', nullable: true },
          phone: { type: 'string', nullable: true },
          latitude: { type: 'number', nullable: true },
          longitude: { type: 'number', nullable: true },
          has_printer: { type: 'boolean', nullable: true },
        },
      },
      Shipment: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          tracking_number: { type: 'string' },
          current_status: { type: 'string' },
          payment_status: { type: 'string' },
          payment_method: { $ref: '#/components/schemas/PaymentMethod' },
          package_type: { type: 'string', enum: ['colis', 'courrier'] },
          weight_kg: { type: 'number' },
          delivery_mode: { type: 'string', enum: ['relay', 'home'] },
          total_price: { type: 'number' },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
        },
      },
      Webhook: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          url: { type: 'string', format: 'uri' },
          events: { type: 'array', items: { type: 'string' } },
          is_active: { type: 'boolean' },
          failure_count: { type: 'integer' },
          last_triggered_at: { type: 'string', format: 'date-time', nullable: true },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
  security: [{ ApiKeyAuth: [] }],
  paths: {
    '/': {
      get: {
        summary: 'Statut de l\'API',
        description: 'Retourne le statut de l\'API et le lien vers la documentation. Ne nécessite pas d\'authentification.',
        security: [],
        tags: ['General'],
        responses: {
          '200': {
            description: 'Statut OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    version: { type: 'string', example: '1.0' },
                    status: { type: 'string', example: 'ok' },
                    docs: { type: 'string', example: 'https://api.colisdirect.com/docs' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/tracking/{number}': {
      get: {
        summary: 'Suivre un envoi',
        description:
          'Retourne les informations de suivi. Le paramètre `number` peut être le **numéro de tracking**, le **shipment_code** (4 chiffres + 2 lettres) ou le **pickup_code** (6 chiffres), comme sur le portail public. La réponse inclut `effective_status` (état affiché incluant le paiement) et `pickup_code` seulement si la recherche a été faite via ce code.',
        tags: ['Tracking'],
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          {
            name: 'number',
            in: 'path',
            required: true,
            description: 'Tracking, shipment_code (ex: 1234AB) ou pickup_code (6 chiffres)',
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Informations de suivi',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    tracking_number: { type: 'string' },
                    shipment_code: { type: 'string', nullable: true },
                    pickup_code: { type: 'string', nullable: true },
                    current_status: { type: 'string' },
                    effective_status: {
                      type: 'string',
                      description:
                        'Statut affiché (logistique + paiement), ex. PAYMENT_AWAITING_VALIDATION si paiement en ligne encore « pending », PAYMENT_CONFIRMED_AWAITING_DROP si payé et en attente de dépôt.',
                    },
                    payment_status: { type: 'string' },
                    sender: { type: 'object' },
                    recipient: { type: 'object' },
                    package: { type: 'object' },
                    delivery: { type: 'object' },
                    pricing: { type: 'object' },
                    events: { type: 'array', items: { $ref: '#/components/schemas/TrackingEvent' } },
                    created_at: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          '401': { description: 'Clé API invalide', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '403': { description: 'Scope insuffisant (requis : tracking:read)', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'Envoi introuvable', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/shipments/{id}': {
      get: {
        summary: 'Détail d\'un envoi',
        description: 'Retourne les informations détaillées d\'un envoi par son ID UUID.',
        tags: ['Envois'],
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'UUID de l\'envoi',
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '200': { description: 'Détail de l\'envoi', content: { 'application/json': { schema: { $ref: '#/components/schemas/Shipment' } } } },
          '401': { description: 'Clé API invalide', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '403': { description: 'Scope insuffisant (requis : shipments:read)', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'Envoi introuvable', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/shipments': {
      post: {
        summary: 'Créer un envoi',
        description:
          'Crée un nouvel envoi. Scope requis : shipments:create. Préférer `payment_method`: `paystack`, `cinetpay` ou `relay_cash` pour les nouveaux flux.',
        tags: ['Envois'],
        security: [{ ApiKeyAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['sender', 'recipient', 'package', 'delivery', 'payment_method'],
                properties: {
                  sender: {
                    type: 'object',
                    required: ['first_name', 'last_name', 'phone'],
                    properties: {
                      first_name: { type: 'string' },
                      last_name: { type: 'string' },
                      email: { type: 'string', format: 'email' },
                      phone: { type: 'string' },
                      address: { type: 'string' },
                      commune: { type: 'string' },
                      quartier: { type: 'string' },
                    },
                  },
                  recipient: {
                    type: 'object',
                    required: ['first_name', 'last_name', 'phone'],
                    properties: {
                      first_name: { type: 'string' },
                      last_name: { type: 'string' },
                      email: { type: 'string', format: 'email' },
                      phone: { type: 'string' },
                      address: { type: 'string' },
                      commune: { type: 'string' },
                      quartier: { type: 'string' },
                    },
                  },
                  package: {
                    type: 'object',
                    required: ['type', 'weight_kg'],
                    properties: {
                      type: { type: 'string', enum: ['colis', 'courrier'] },
                      weight_kg: { type: 'number', minimum: 0 },
                    },
                  },
                  delivery: {
                    type: 'object',
                    required: ['mode'],
                    properties: {
                      mode: { type: 'string', enum: ['relay', 'home'] },
                      origin_relay_id: { type: 'string', format: 'uuid' },
                      destination_relay_id: { type: 'string', format: 'uuid' },
                    },
                  },
                  payment_method: { $ref: '#/components/schemas/PaymentMethod' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Envoi créé',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', format: 'uuid' },
                    tracking_number: { type: 'string' },
                    status: { type: 'string' },
                    created_at: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          '400': { description: 'Corps de requête invalide', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '401': { description: 'Clé API invalide', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '403': { description: 'Scope insuffisant (requis : shipments:create)', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/pricing': {
      get: {
        summary: 'Tarification',
        description: 'Retourne le tarif de base pour une expédition selon les critères fournis.',
        tags: ['Tarifs'],
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          { name: 'type', in: 'query', required: true, schema: { type: 'string', enum: ['colis', 'courrier'] }, description: 'Type de colis' },
          { name: 'weight_kg', in: 'query', required: true, schema: { type: 'number' }, description: 'Poids en kg' },
          { name: 'delivery_mode', in: 'query', required: true, schema: { type: 'string', enum: ['relay', 'home'] }, description: 'Mode de livraison' },
          { name: 'package_size', in: 'query', required: false, schema: { type: 'string', enum: ['petit', 'moyen', 'grand'] }, description: 'Taille du colis (optionnel)' },
        ],
        responses: {
          '200': {
            description: 'Tarif trouvé',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    base_price: { type: 'number', example: 1500 },
                    currency: { type: 'string', example: 'FCFA' },
                  },
                },
              },
            },
          },
          '400': { description: 'Paramètres manquants', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '401': { description: 'Clé API invalide', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '403': { description: 'Scope insuffisant (requis : pricing:read)', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'Aucun tarif trouvé', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/relay-points': {
      get: {
        summary: 'Liste des points relais',
        description: 'Retourne la liste de tous les points relais actifs.',
        tags: ['Points Relais'],
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          { name: 'commune', in: 'query', required: false, schema: { type: 'string' }, description: 'Filtrer par commune' },
          { name: 'search', in: 'query', required: false, schema: { type: 'string' }, description: 'Recherche par nom, adresse ou quartier' },
        ],
        responses: {
          '200': {
            description: 'Liste des points relais',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/RelayPoint' } },
              },
            },
          },
          '401': { description: 'Clé API invalide', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '403': { description: 'Scope insuffisant (requis : relay_points:read)', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/relay-points/{id}': {
      get: {
        summary: 'Détail d\'un point relais',
        description: 'Retourne les informations détaillées d\'un point relais actif.',
        tags: ['Points Relais'],
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'UUID du point relais',
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '200': { description: 'Détail du point relais', content: { 'application/json': { schema: { $ref: '#/components/schemas/RelayPoint' } } } },
          '401': { description: 'Clé API invalide', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '403': { description: 'Scope insuffisant (requis : relay_points:read)', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'Point relais introuvable', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/webhooks': {
      get: {
        summary: 'Lister les webhooks',
        description: 'Retourne la liste des webhooks enregistrés pour la clé API courante.',
        tags: ['Webhooks'],
        security: [{ ApiKeyAuth: [] }],
        responses: {
          '200': {
            description: 'Liste des webhooks',
            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Webhook' } } } },
          },
          '401': { description: 'Clé API invalide', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '403': { description: 'Scope insuffisant (requis : webhooks:manage)', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
      post: {
        summary: 'Enregistrer un webhook',
        description: 'Crée un nouveau webhook. Le `signing_secret` est retourné une seule fois.',
        tags: ['Webhooks'],
        security: [{ ApiKeyAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['url', 'events'],
                properties: {
                  url: { type: 'string', format: 'uri', description: 'URL de destination (HTTPS recommandé)' },
                  events: {
                    type: 'array',
                    items: { type: 'string' },
                    example: ['shipment.created', 'shipment.delivered'],
                    description: 'Liste des événements à écouter',
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Webhook créé',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/Webhook' },
                    {
                      type: 'object',
                      properties: {
                        signing_secret: {
                          type: 'string',
                          description: 'Secret HMAC-SHA256 (affiché une seule fois)',
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          '400': { description: 'Paramètres invalides', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '401': { description: 'Clé API invalide', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '403': { description: 'Scope insuffisant (requis : webhooks:manage)', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/webhooks/{id}': {
      delete: {
        summary: 'Supprimer un webhook',
        description: 'Supprime un webhook appartenant à la clé API courante.',
        tags: ['Webhooks'],
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'UUID du webhook',
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '200': { description: 'Webhook supprimé', content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string' } } } } } },
          '401': { description: 'Clé API invalide', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '403': { description: 'Scope insuffisant (requis : webhooks:manage)', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'Webhook introuvable', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
  },
  tags: [
    { name: 'General', description: 'Endpoints généraux' },
    { name: 'Tracking', description: 'Suivi des envois en temps réel' },
    { name: 'Envois', description: 'Gestion des envois (lecture et création)' },
    { name: 'Tarifs', description: 'Grilles tarifaires' },
    { name: 'Points Relais', description: 'Annuaire des points relais' },
    { name: 'Webhooks', description: 'Notifications d\'événements en temps réel' },
  ],
};

// GET /docs — serve Swagger UI via CDN
router.get('/docs', (_req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Colis Direct API — Documentation</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
  <style>
    body { margin: 0; padding: 0; }
    .topbar { background-color: #1a56db !important; }
    .topbar-wrapper a { visibility: hidden; }
    .topbar-wrapper::before {
      content: 'Colis Direct API';
      visibility: visible;
      color: white;
      font-size: 1.4rem;
      font-weight: 700;
      letter-spacing: 0.05em;
    }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function () {
      SwaggerUIBundle({
        url: '/docs/openapi.json',
        dom_id: '#swagger-ui',
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
        layout: 'StandaloneLayout',
        deepLinking: true,
        persistAuthorization: true,
      });
    };
  </script>
</body>
</html>`);
});

// GET /docs/openapi.json — serve OpenAPI spec
router.get('/docs/openapi.json', (_req, res) => {
  res.json(openApiSpec);
});

export default router;
