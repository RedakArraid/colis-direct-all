import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { toast } from 'react-toastify';
import {
  Building,
  Bell,
  ShieldCheck,
  Lock,
  Cpu,
  Database,
  Users,
  Save,
  Truck,
  Loader2,
  CreditCard,
} from 'lucide-react';
import PhoneInput from '../../components/PhoneInput';

interface GeneralSettings {
  companyName: string;
  supportEmail: string;
  supportPhone: string;
  timezone: string;
  currency: string;
  language: string;
}

interface NotificationSettings {
  channels: {
    email: boolean;
    chatbot: boolean;
    push: boolean;
  };
  events: {
    delivered: boolean;
    incident: boolean;
    ticketOpened: boolean;
    ticketEscalated: boolean;
    transporterDelayed: boolean;
  };
}

interface SecuritySettings {
  passwordPolicy: 'medium' | 'strong';
  sessionTimeoutMinutes: number;
  twoFactorAuth: boolean;
  notifyNewLogin: boolean;
}

interface RolePermissions {
  admin: {
    manageSettings: boolean;
    manageUsers: boolean;
    manageBilling: boolean;
  };
  support: {
    manageTickets: boolean;
    viewReports: boolean;
    escalateTickets: boolean;
  };
  transporter: {
    viewAssignments: boolean;
    reportIncidents: boolean;
  };
}

interface AutomationSettings {
  ticketRoutingRules: boolean;
  autoStatusUpdates: boolean;
  autoAssignTransporters: boolean;
  autoCloseDeliveredTickets: boolean;
}

interface DataManagementSettings {
  nightlyBackup: boolean;
  exportFormat: 'csv' | 'xlsx' | 'pdf';
  retentionMonths: number;
  allowManualBackup: boolean;
}

interface PaymentSettings {
  activeProvider: 'paystack' | 'cinetpay';
}

export default function AdminSettings() {
  const [saving, setSaving] = useState(false);
  const [general, setGeneral] = useState<GeneralSettings>({
    companyName: 'COLISDIRECT',
    supportEmail: 'support@colisdirect.ci',
    supportPhone: '+2250700000000',
    timezone: 'Africa/Abidjan',
    currency: 'FCFA',
    language: 'fr',
  });

  const [notifications, setNotifications] = useState<NotificationSettings>({
    channels: {
      email: true,
      chatbot: true,
      push: false,
    },
    events: {
      delivered: true,
      incident: true,
      ticketOpened: true,
      ticketEscalated: true,
      transporterDelayed: false,
    },
  });

  const [security, setSecurity] = useState<SecuritySettings>({
    passwordPolicy: 'strong',
    sessionTimeoutMinutes: 30,
    twoFactorAuth: true,
    notifyNewLogin: true,
  });

  const [permissions, setPermissions] = useState<RolePermissions>({
    admin: {
      manageSettings: true,
      manageUsers: true,
      manageBilling: true,
    },
    support: {
      manageTickets: true,
      viewReports: true,
      escalateTickets: true,
    },
    transporter: {
      viewAssignments: true,
      reportIncidents: true,
    },
  });

  const [automation, setAutomation] = useState<AutomationSettings>({
    ticketRoutingRules: true,
    autoStatusUpdates: true,
    autoAssignTransporters: true,
    autoCloseDeliveredTickets: false,
  });

  const [dataManagement, setDataManagement] = useState<DataManagementSettings>({
    nightlyBackup: true,
    exportFormat: 'xlsx',
    retentionMonths: 12,
    allowManualBackup: true,
  });

  const [payment, setPayment] = useState<PaymentSettings>({
    activeProvider: 'paystack',
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const { data, error } = await api.getAdminSettings();
    if (error || !data) return;
    if (data.general) setGeneral(data.general as GeneralSettings);
    if (data.notifications) setNotifications(data.notifications as NotificationSettings);
    if (data.security) setSecurity(data.security as SecuritySettings);
    if (data.permissions) setPermissions(data.permissions as RolePermissions);
    if (data.automation) setAutomation(data.automation as AutomationSettings);
    if (data.dataManagement) setDataManagement(data.dataManagement as DataManagementSettings);
    if (data.payment) setPayment(data.payment as PaymentSettings);
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await api.saveAdminSettings({
      general,
      notifications,
      security,
      permissions,
      automation,
      dataManagement,
      payment,
    });
    setSaving(false);
    if (error) {
      toast.error(`Erreur lors de la sauvegarde : ${error}`);
    } else {
      toast.success('Paramètres sauvegardés.');
    }
  };

  const toggleNotificationChannel = (channel: keyof NotificationSettings['channels']) => {
    setNotifications(prev => ({
      ...prev,
      channels: {
        ...prev.channels,
        [channel]: !prev.channels[channel],
      },
    }));
  };

  const toggleNotificationEvent = (event: keyof NotificationSettings['events']) => {
    setNotifications(prev => ({
      ...prev,
      events: {
        ...prev.events,
        [event]: !prev.events[event],
      },
    }));
  };

  const togglePermission = <T extends keyof RolePermissions, K extends keyof RolePermissions[T]>(
    role: T,
    permissionKey: K
  ) => {
    setPermissions(prev => ({
      ...prev,
      [role]: {
        ...prev[role],
        [permissionKey]: !prev[role][permissionKey],
      },
    }));
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Paramètres</h1>
          <p className="text-sm text-gray-600">Configuration technique et fonctionnelle de la plateforme.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#FF6C00] text-white rounded-lg hover:bg-[#ff8534] transition-colors disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Sauvegarder
        </button>
      </div>

      {/* Section Informations générales */}
      <section className="bg-white border border-gray-200 rounded-xl shadow-sm">
        <header className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
          <div className="p-2 rounded-full bg-orange-50 text-[#FF6C00]">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Informations générales</h2>
            <p className="text-sm text-gray-500">Identité de la marque, coordonnées et localisation.</p>
          </div>
        </header>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex flex-col gap-2 text-sm">
            <span className="text-gray-600 font-medium">Nom de la société</span>
            <input
              value={general.companyName}
              onChange={(e) => setGeneral(prev => ({ ...prev, companyName: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm">
            <span className="text-gray-600 font-medium">Email support</span>
            <input
              type="email"
              value={general.supportEmail}
              onChange={(e) => setGeneral(prev => ({ ...prev, supportEmail: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm">
            <span className="text-gray-600 font-medium">Téléphone support</span>
            <PhoneInput
              value={general.supportPhone}
              onChange={(v) => setGeneral((prev) => ({ ...prev, supportPhone: v }))}
              label={null}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm">
            <span className="text-gray-600 font-medium">Fuseau horaire</span>
            <select
              value={general.timezone}
              onChange={(e) => setGeneral(prev => ({ ...prev, timezone: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
            >
              <option value="Africa/Abidjan">Africa/Abidjan (GMT+0)</option>
              <option value="Europe/Paris">Europe/Paris (GMT+1)</option>
              <option value="UTC">UTC</option>
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm">
            <span className="text-gray-600 font-medium">Devise</span>
            <select
              value={general.currency}
              onChange={(e) => setGeneral(prev => ({ ...prev, currency: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
            >
              <option value="FCFA">FCFA</option>
              <option value="EUR">Euro (€)</option>
              <option value="USD">Dollar ($)</option>
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm">
            <span className="text-gray-600 font-medium">Langue</span>
            <select
              value={general.language}
              onChange={(e) => setGeneral(prev => ({ ...prev, language: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
            >
              <option value="fr">Français</option>
              <option value="en">Anglais</option>
            </select>
          </label>
        </div>
      </section>

      {/* Section Notifications */}
      <section className="bg-white border border-gray-200 rounded-xl shadow-sm">
        <header className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
          <div className="p-2 rounded-full bg-orange-50 text-[#FF6C00]">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
            <p className="text-sm text-gray-500">Canaux et événements à notifier.</p>
          </div>
        </header>
        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Canaux actifs</h3>
            <div className="space-y-2">
              {(['email', 'chatbot', 'push'] as Array<keyof NotificationSettings['channels']>).map((channel) => (
                <label key={channel} className="flex items-center justify-between gap-3 text-sm border border-gray-100 rounded-lg px-4 py-3">
                  <span className="text-gray-700 capitalize">
                    {channel === 'push' ? 'Notifications push' : `Alertes ${channel}`}
                  </span>
                  <input
                    type="checkbox"
                    checked={notifications.channels[channel]}
                    onChange={() => toggleNotificationChannel(channel)}
                    className="w-4 h-4 text-[#FF6C00] rounded focus:ring-[#FF6C00]"
                  />
                </label>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Événements suivis</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(
                Object.keys(notifications.events) as Array<keyof NotificationSettings['events']>
              ).map((eventKey) => (
                <label key={eventKey} className="flex items-center justify-between gap-3 text-sm border border-gray-100 rounded-lg px-4 py-3">
                  <span className="text-gray-700">
                    {{
                      delivered: 'Colis livré',
                      incident: 'Incident signalé',
                      ticketOpened: 'Ticket créé',
                      ticketEscalated: 'Ticket escaladé',
                      transporterDelayed: 'Retard transporteur',
                    }[eventKey] || eventKey}
                  </span>
                  <input
                    type="checkbox"
                    checked={notifications.events[eventKey]}
                    onChange={() => toggleNotificationEvent(eventKey)}
                    className="w-4 h-4 text-[#FF6C00] rounded focus:ring-[#FF6C00]"
                  />
                </label>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Section Sécurité & accès */}
      <section className="bg-white border border-gray-200 rounded-xl shadow-sm">
        <header className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
          <div className="p-2 rounded-full bg-orange-50 text-[#FF6C00]">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Gestion des accès & sécurité</h2>
            <p className="text-sm text-gray-500">Politiques de mot de passe, 2FA et permissions par rôle.</p>
          </div>
        </header>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <label className="flex flex-col gap-2 text-sm">
              <span className="text-gray-600 font-medium">Politique mot de passe</span>
              <select
                value={security.passwordPolicy}
                onChange={(e) => setSecurity(prev => ({ ...prev, passwordPolicy: e.target.value as SecuritySettings['passwordPolicy'] }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
              >
                <option value="medium">Medium (8 caractères)</option>
                <option value="strong">Strong (12 caractères + complexité)</option>
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm">
              <span className="text-gray-600 font-medium">Timeout de session (minutes)</span>
              <input
                type="number"
                min={5}
                value={security.sessionTimeoutMinutes}
                onChange={(e) => setSecurity(prev => ({ ...prev, sessionTimeoutMinutes: Number(e.target.value) }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
              />
            </label>
            <label className="flex items-center justify-between gap-3 text-sm border border-gray-100 rounded-lg px-4 py-3">
              <span className="text-gray-700">Double authentification (2FA)</span>
              <input
                type="checkbox"
                checked={security.twoFactorAuth}
                onChange={() => setSecurity(prev => ({ ...prev, twoFactorAuth: !prev.twoFactorAuth }))}
                className="w-4 h-4 text-[#FF6C00] rounded focus:ring-[#FF6C00]"
              />
            </label>
            <label className="flex items-center justify-between gap-3 text-sm border border-gray-100 rounded-lg px-4 py-3">
              <span className="text-gray-700">Notifier les nouvelles connexions</span>
              <input
                type="checkbox"
                checked={security.notifyNewLogin}
                onChange={() => setSecurity(prev => ({ ...prev, notifyNewLogin: !prev.notifyNewLogin }))}
                className="w-4 h-4 text-[#FF6C00] rounded focus:ring-[#FF6C00]"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="border border-gray-100 rounded-lg p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-3">
                <Lock className="w-4 h-4 text-[#FF6C00]" /> Rôle Administrateur
              </div>
              <div className="space-y-2 text-sm text-gray-700">
                {Object.entries(permissions.admin).map(([key, value]) => (
                  <label key={key} className="flex items-center justify-between gap-3 border border-gray-100 rounded-lg px-3 py-2">
                    <span>
                      {{
                        manageSettings: 'Gestion des paramètres',
                        manageUsers: 'Gestion des utilisateurs',
                        manageBilling: 'Gestion facturation',
                      }[key as keyof RolePermissions['admin']] || key}
                    </span>
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={() => togglePermission('admin', key as keyof RolePermissions['admin'])}
                      className="w-4 h-4 text-[#FF6C00] rounded focus:ring-[#FF6C00]"
                    />
                  </label>
                ))}
              </div>
            </div>
            <div className="border border-gray-100 rounded-lg p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-3">
                <Users className="w-4 h-4 text-[#FF6C00]" /> Rôle Support
              </div>
              <div className="space-y-2 text-sm text-gray-700">
                {Object.entries(permissions.support).map(([key, value]) => {
                  const labelMap: Record<keyof RolePermissions['support'], string> = {
                    manageTickets: 'Gestion des tickets',
                    viewReports: 'Accès aux rapports',
                    escalateTickets: 'Escalader vers admin',
                  };
                  return (
                    <label key={key} className="flex items-center justify-between gap-3 border border-gray-100 rounded-lg px-3 py-2">
                      <span>{labelMap[key as keyof RolePermissions['support']] || key}</span>
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={() => togglePermission('support', key as keyof RolePermissions['support'])}
                        className="w-4 h-4 text-[#FF6C00] rounded focus:ring-[#FF6C00]"
                      />
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="border border-gray-100 rounded-lg p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-3">
                <Truck className="w-4 h-4 text-[#FF6C00]" /> Rôle Transporteur
              </div>
              <div className="space-y-2 text-sm text-gray-700">
                {Object.entries(permissions.transporter).map(([key, value]) => {
                  const labelMap: Record<keyof RolePermissions['transporter'], string> = {
                    viewAssignments: 'Voir les tournées',
                    reportIncidents: 'Signaler un incident',
                  };
                  return (
                    <label key={key} className="flex items-center justify-between gap-3 border border-gray-100 rounded-lg px-3 py-2">
                      <span>{labelMap[key as keyof RolePermissions['transporter']] || key}</span>
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={() => togglePermission('transporter', key as keyof RolePermissions['transporter'])}
                        className="w-4 h-4 text-[#FF6C00] rounded focus:ring-[#FF6C00]"
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section Automatisations */}
      <section className="bg-white border border-gray-200 rounded-xl shadow-sm">
        <header className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
          <div className="p-2 rounded-full bg-orange-50 text-[#FF6C00]">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Automatisations</h2>
            <p className="text-sm text-gray-500">Optimiser le routage des tickets et la logistique.</p>
          </div>
        </header>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex items-center justify-between gap-3 text-sm border border-gray-100 rounded-lg px-4 py-3">
            <span>Routage automatique des tickets (zone, priorité, SLA)</span>
            <input
              type="checkbox"
              checked={automation.ticketRoutingRules}
              onChange={() => setAutomation(prev => ({ ...prev, ticketRoutingRules: !prev.ticketRoutingRules }))}
              className="w-4 h-4 text-[#FF6C00] rounded focus:ring-[#FF6C00]"
            />
          </label>
          <label className="flex items-center justify-between gap-3 text-sm border border-gray-100 rounded-lg px-4 py-3">
            <span>Mise à jour automatique du statut colis</span>
            <input
              type="checkbox"
              checked={automation.autoStatusUpdates}
              onChange={() => setAutomation(prev => ({ ...prev, autoStatusUpdates: !prev.autoStatusUpdates }))}
              className="w-4 h-4 text-[#FF6C00] rounded focus:ring-[#FF6C00]"
            />
          </label>
          <label className="flex items-center justify-between gap-3 text-sm border border-gray-100 rounded-lg px-4 py-3">
            <span>Attribution automatique des transporteurs par zone</span>
            <input
              type="checkbox"
              checked={automation.autoAssignTransporters}
              onChange={() => setAutomation(prev => ({ ...prev, autoAssignTransporters: !prev.autoAssignTransporters }))}
              className="w-4 h-4 text-[#FF6C00] rounded focus:ring-[#FF6C00]"
            />
          </label>
          <label className="flex items-center justify-between gap-3 text-sm border border-gray-100 rounded-lg px-4 py-3">
            <span>Clôture automatique des tickets livrés</span>
            <input
              type="checkbox"
              checked={automation.autoCloseDeliveredTickets}
              onChange={() => setAutomation(prev => ({ ...prev, autoCloseDeliveredTickets: !prev.autoCloseDeliveredTickets }))}
              className="w-4 h-4 text-[#FF6C00] rounded focus:ring-[#FF6C00]"
            />
          </label>
        </div>
      </section>

      {/* Section Paiement */}
      <section className="bg-white border border-gray-200 rounded-xl shadow-sm">
        <header className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
          <div className="p-2 rounded-full bg-orange-50 text-[#FF6C00]">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Paiement Mobile Money</h2>
            <p className="text-xs text-gray-500">Provider de paiement en ligne utilisé par les clients.</p>
          </div>
        </header>
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600">
            Choisissez le prestataire de paiement actif. Les clés API correspondantes doivent être configurées dans les variables d'environnement du serveur.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {([
              { value: 'paystack', label: 'Paystack', desc: 'MTN, Orange, Wave, Moov, cartes Visa/Mastercard', recommended: true },
              { value: 'cinetpay', label: 'CinetPay', desc: 'Orange Money, Wave, MTN, Moov, carte bancaire', recommended: false },
            ] as const).map((p) => (
              <label
                key={p.value}
                className={`flex items-start gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                  payment.activeProvider === p.value
                    ? 'border-[#FF6C00] bg-orange-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="activeProvider"
                  value={p.value}
                  checked={payment.activeProvider === p.value}
                  onChange={() => setPayment({ activeProvider: p.value })}
                  className="mt-1 w-4 h-4 text-[#FF6C00] focus:ring-[#FF6C00]"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 text-sm">{p.label}</span>
                    {p.recommended && (
                      <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full">Recommandé</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{p.desc}</p>
                </div>
              </label>
            ))}
          </div>
          {payment.activeProvider === 'paystack' && (
            <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
              Variables requises : <code className="font-mono">PAYSTACK_SECRET_KEY</code>, <code className="font-mono">PAYSTACK_WEBHOOK_SECRET</code>
            </p>
          )}
          {payment.activeProvider === 'cinetpay' && (
            <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
              Variables requises : <code className="font-mono">CINETPAY_API_KEY</code>, <code className="font-mono">CINETPAY_SITE_ID</code>
            </p>
          )}
        </div>
      </section>

      {/* Section Sauvegarde & export */}
      <section className="bg-white border border-gray-200 rounded-xl shadow-sm">
        <header className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
          <div className="p-2 rounded-full bg-orange-50 text-[#FF6C00]">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Sauvegarde & export</h2>
            <p className="text-sm text-gray-500">Politique de rétention et formats disponibles.</p>
          </div>
        </header>
        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <label className="flex items-center justify-between gap-3 text-sm border border-gray-100 rounded-lg px-4 py-3">
            <span>Sauvegarde nocturne automatique</span>
            <input
              type="checkbox"
              checked={dataManagement.nightlyBackup}
              onChange={() => setDataManagement(prev => ({ ...prev, nightlyBackup: !prev.nightlyBackup }))}
              className="w-4 h-4 text-[#FF6C00] rounded focus:ring-[#FF6C00]"
            />
          </label>
          <label className="flex items-center justify-between gap-3 text-sm border border-gray-100 rounded-lg px-4 py-3">
            <span>Autoriser la sauvegarde manuelle</span>
            <input
              type="checkbox"
              checked={dataManagement.allowManualBackup}
              onChange={() => setDataManagement(prev => ({ ...prev, allowManualBackup: !prev.allowManualBackup }))}
              className="w-4 h-4 text-[#FF6C00] rounded focus:ring-[#FF6C00]"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm">
            <span className="text-gray-600 font-medium">Format d’export par défaut</span>
            <select
              value={dataManagement.exportFormat}
              onChange={(e) =>
                setDataManagement(prev => ({
                  ...prev,
                  exportFormat: e.target.value as DataManagementSettings['exportFormat'],
                }))
              }
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
            >
              <option value="csv">CSV</option>
              <option value="xlsx">Excel (.xlsx)</option>
              <option value="pdf">PDF</option>
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm">
            <span className="text-gray-600 font-medium">Durée de rétention (mois)</span>
            <input
              type="number"
              min={1}
              max={36}
              value={dataManagement.retentionMonths}
              onChange={(e) => setDataManagement(prev => ({ ...prev, retentionMonths: Number(e.target.value) }))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF6C00] focus:border-transparent"
            />
          </label>
        </div>
      </section>

      <div className="border border-orange-200 bg-orange-50 text-sm text-orange-700 rounded-xl px-4 py-3">
        <p className="font-semibold">Accès restreint</p>
        <p>
          Cette section est réservée aux administrateurs habilités. Chaque modification est journalisée
          et peut nécessiter une double validation. Pensez à sauvegarder avant de quitter.
        </p>
      </div>
    </div>
  );
}

