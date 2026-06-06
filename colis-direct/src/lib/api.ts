export const API_URL = import.meta.env.VITE_API_URL || '/api';

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;
  private refreshToken: string | null = null;
  private refreshInFlight: Promise<boolean> | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
      this.refreshToken = localStorage.getItem('refresh_token');
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (token && typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    } else if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  setRefreshToken(token: string | null) {
    this.refreshToken = token;
    if (token && typeof window !== 'undefined') {
      localStorage.setItem('refresh_token', token);
    } else if (typeof window !== 'undefined') {
      localStorage.removeItem('refresh_token');
    }
  }

  private async tryRefreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) return false;
    if (this.refreshInFlight) return this.refreshInFlight;

    this.refreshInFlight = (async () => {
      try {
        const res = await fetch(`${this.baseUrl}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: this.refreshToken }),
        });
        if (!res.ok) return false;
        const json = await res.json();
        if (json.token) {
          this.setToken(json.token);
          if (json.refresh_token) this.setRefreshToken(json.refresh_token);
          return true;
        }
        return false;
      } catch {
        return false;
      } finally {
        this.refreshInFlight = null;
      }
    })();

    return this.refreshInFlight;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retried = false
  ): Promise<{ data: T | null; error: string | null }> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      const isJson = contentType && contentType.includes('application/json');

      // Handle non-JSON responses (like HTML error pages)
      if (!isJson) {
        const text = await response.text();
        
        if (response.status === 401 && !retried && endpoint !== '/auth/refresh') {
          const refreshed = await this.tryRefreshAccessToken();
          if (refreshed) return this.request<T>(endpoint, options, true);
        }
        if (response.status === 401) {
          if (this.token) {
            this.setToken(null);
            this.setRefreshToken(null);
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('auth:token-invalid'));
            }
          }
          return { data: null, error: 'Token invalide ou expiré. Veuillez vous reconnecter.' };
        }
        
        // If it's an HTML response (error page), extract meaningful error
        if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
          if (response.status === 404) {
            return { data: null, error: 'Endpoint non trouvé (404)' };
          }
          if (response.status === 403) {
            return { data: null, error: 'Accès interdit (403)' };
          }
          return { data: null, error: `Erreur serveur: ${response.status} ${response.statusText}` };
        }
        
        // If it's plain text, use it as error message
        if (!response.ok) {
          return { data: null, error: text || `Erreur: ${response.status} ${response.statusText}` };
        }
        
        // Try to parse as JSON anyway (might be text/json)
        try {
          const json = JSON.parse(text);
          return { data: json as T, error: null };
        } catch {
          return { data: text as T, error: null };
        }
      }

      // Parse JSON response
      const json = await response.json();

      if (!response.ok) {
        if (response.status === 401 && !retried && endpoint !== '/auth/refresh') {
          const refreshed = await this.tryRefreshAccessToken();
          if (refreshed) return this.request<T>(endpoint, options, true);
        }
        if (response.status === 401) {
          if (this.token) {
            this.setToken(null);
            this.setRefreshToken(null);
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('auth:token-invalid'));
            }
          }
          return {
            data: null,
            error: json.error || json.message || 'Token invalide ou expiré. Veuillez vous reconnecter.'
          };
        }

        // Handle 429 rate limit — encode retryAfterSec for the caller
        if (response.status === 429) {
          const retryAfterSec = json.retryAfterSec
            || parseInt(response.headers.get('Retry-After') || '300', 10);
          return { data: null, error: `RATE_LIMIT:${retryAfterSec}` };
        }

        return {
          data: null,
          error: json.error || json.message || `Request failed: ${response.statusText}`
        };
      }

      // Handle different response structures
      // API returns { user, token } directly, not wrapped in { data: ... }
      if (json.user && json.token) {
        return { data: json as T, error: null };
      }
      
      return { data: (json.data || json) as T, error: null };
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      // Handle abort (timeout)
      if (error.name === 'AbortError') {
        return { data: null, error: 'La requête a pris trop de temps. Veuillez réessayer.' };
      }
      
      // Handle network errors and parsing errors
      if (error.message && error.message.includes('Unexpected token')) {
        return { data: null, error: 'Réponse serveur invalide (format non-JSON)' };
      }
      
      // Handle fetch errors (network issues, CORS, etc.)
      if (error.message && (error.message.includes('Failed to fetch') || error.message.includes('NetworkError'))) {
        return { data: null, error: 'Impossible de se connecter au serveur. Vérifiez votre connexion.' };
      }
      
      return { data: null, error: error.message || 'Erreur réseau' };
    }
  }

  private async requestFormData<T>(
    endpoint: string,
    formData: FormData,
    method: string = 'POST'
  ): Promise<{ data: T | null; error: string | null }> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: HeadersInit = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: formData,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 401) {
          if (this.token) {
            this.setToken(null);
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('auth:token-invalid'));
            }
          }
          return { data: null, error: 'Token invalide ou expiré. Veuillez vous reconnecter.' };
        }
        const errorData = await response.json().catch(() => ({ error: `Erreur: ${response.status}` }));
        return { data: null, error: errorData.error || `Erreur: ${response.status}` };
      }

      const data = await response.json();
      return { data, error: null };
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        return { data: null, error: "L'upload a pris trop de temps. Veuillez réessayer." };
      }
      return { data: null, error: error.message || 'Erreur réseau' };
    }
  }

  // Auth methods
  async signIn(emailOrPhone: string, password: string, usePhone: boolean = false) {
    const body = usePhone 
      ? { phone: emailOrPhone, password }
      : { email: emailOrPhone, password };
    const { data, error } = await this.request<{ user: any; token: string }>('/auth/signin', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    if (data && (data as any).token) {
      this.setToken((data as any).token);
      if ((data as any).refresh_token) this.setRefreshToken((data as any).refresh_token);
      return { data: (data as any).user, error: null };
    }

    return { data: null, error };
  }

  async signUp(email: string, password: string, userData: any) {
    const { data, error } = await this.request<{ user: any; token: string; refresh_token?: string }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, ...userData }),
    });

    if (data && (data as any).token) {
      this.setToken((data as any).token);
      if ((data as any).refresh_token) this.setRefreshToken((data as any).refresh_token);
      return { data: (data as any).user, error: null };
    }

    return { data: null, error };
  }

  async signOut() {
    await this.request('/auth/signout', { method: 'POST' });
    this.setToken(null);
    this.setRefreshToken(null);
  }

  async getCurrentUser() {
    // Si pas de token, retourner directement sans faire d'appel API
    if (!this.token) {
      return { data: null, error: null };
    }
    
    const { data, error } = await this.request<{ user: any }>('/auth/me');
    // API returns { user: {...} }, extract user
    if (data && (data as any).user) {
      return { data: (data as any).user, error: null };
    }
    return { data: data || null, error };
  }

  // Shipments
  async getShipments(filters?: { status?: string; current_status?: string; payment_status?: string; relay_id?: string }) {
    const queryParams = new URLSearchParams();
    if (filters?.status) queryParams.append('status', filters.status);
    if (filters?.current_status) queryParams.append('current_status', filters.current_status);
    if (filters?.payment_status) queryParams.append('payment_status', filters.payment_status);
    if (filters?.relay_id) queryParams.append('relay_id', filters.relay_id);
    
    const query = queryParams.toString();
    const endpoint = `/shipments${query ? `?${query}` : ''}`;
    
    return this.request<any[]>(endpoint);
  }

  async searchShipmentsByPhone(phone: string) {
    return this.request<any[]>(`/shipments/search/phone/${encodeURIComponent(phone)}`);
  }

  async getShipment(id: string) {
    return this.request<any>(`/shipments/${id}`);
  }

  async createShipment(shipmentData: any) {
    return this.request<any>('/shipments', {
      method: 'POST',
      body: JSON.stringify(shipmentData),
    });
  }

  async updateShipmentStatus(id: string, status: string, location?: string, notes?: string) {
    return this.request<any>(`/shipments/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, location, notes }),
    });
  }

  // Relay Points
  async getRelayPoints(filters?: { commune?: string; is_active?: boolean; zone_id?: string }) {
    const queryParams = new URLSearchParams();
    if (filters?.commune) queryParams.append('commune', filters.commune);
    if (filters?.is_active !== undefined) queryParams.append('is_active', String(filters.is_active));
    if (filters?.zone_id) queryParams.append('zone_id', filters.zone_id);
    
    const query = queryParams.toString();
    const endpoint = `/relay-points${query ? `?${query}` : ''}`;
    
    return this.request<any[]>(endpoint);
  }

  async getRelayPoint(id: string) {
    return this.request<any>(`/relay-points/${id}`);
  }

  async getMyRelayPoint() {
    return this.request<any>('/relay-points/me');
  }

  async getTransporterProfile() {
    return this.request<any>('/handoffs/transporter/profile');
  }

  async getRelayPointStats(id: string) {
    return this.request<any>(`/relay-points/${id}/stats`);
  }

  async getRelayActiveShipments(id: string) {
    return this.request<any[]>(`/relay-points/${id}/active-shipments`);
  }

  // Tracking
  async getTracking(trackingNumber: string) {
    return this.request<any>(`/tracking/${trackingNumber}`);
  }

  // Scans (relay operations)
  async scanRelayIntake(trackingNumber: string) {
    return this.request<any>(`/scan/extras/relay-intake`, {
      method: 'POST',
      body: JSON.stringify({ tracking_number: trackingNumber }),
    });
  }

  async scanRelayFinalIntake(trackingNumber: string) {
    return this.request<any>(`/scan/extras/relay-final-intake`, {
      method: 'POST',
      body: JSON.stringify({ tracking_number: trackingNumber }),
    });
  }

  async opsMakeAvailable(trackingNumber: string) {
    return this.request<any>(`/scan/extras/ops/make-available`, {
      method: 'POST',
      body: JSON.stringify({ tracking_number: trackingNumber }),
    });
  }

  async relayCompleteDelivery(trackingNumber: string, pickupCode: string, recipientIdentifier?: string) {
    return this.request<any>(`/scan/extras/relay/complete-delivery`, {
      method: 'POST',
      body: JSON.stringify({
        tracking_number: trackingNumber,
        pickup_code: pickupCode,
        recipient_identifier: recipientIdentifier || undefined,
      }),
    });
  }

  // Users
  async getUserByEmail(email: string) {
    return this.request<any>(`/users/by-email/${encodeURIComponent(email)}`);
  }

  async getUsers(filters?: { role?: string; search?: string }) {
    const queryParams = new URLSearchParams();
    if (filters?.role) queryParams.append('role', filters.role);
    if (filters?.search) queryParams.append('search', filters.search);
    
    const query = queryParams.toString();
    const endpoint = `/users${query ? `?${query}` : ''}`;
    
    return this.request<any[]>(endpoint);
  }

  async createUser(userData: any) {
    return this.request<any>('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async updateUser(id: string, userData: any) {
    return this.request<any>(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(userData),
    });
  }

  async changePassword(id: string, currentPassword: string, newPassword: string) {
    return this.request<any>(`/users/${id}/change-password`, {
      method: 'POST',
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
      }),
    });
  }

  async deleteUser(id: string) {
    return this.request(`/users/${id}`, { method: 'DELETE' });
  }

  async resetUserPassword(id: string, password: string) {
    return this.request<any>(`/users/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
  }

  // Relay Points Management
  async createRelayPoint(relayData: any) {
    return this.request<any>('/relay-points', {
      method: 'POST',
      body: JSON.stringify(relayData),
    });
  }

  async updateRelayPoint(id: string, relayData: any) {
    return this.request<any>(`/relay-points/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(relayData),
    });
  }

  async deleteRelayPoint(id: string) {
    return this.request(`/relay-points/${id}`, { method: 'DELETE' });
  }

  // Relay Applications
  async submitRelayApplication(applicationData: any) {
    return this.request<any>('/relay-applications', {
      method: 'POST',
      body: JSON.stringify(applicationData),
    });
  }

  async getRelayApplications(filters?: { status?: string }) {
    const query = filters?.status ? `?status=${filters.status}` : '';
    return this.request<any[]>(`/relay-applications${query}`);
  }

  async getRelayApplication(id: string, email?: string, phone?: string) {
    const query = email || phone ? `?email=${email || ''}&phone=${phone || ''}` : '';
    return this.request<any>(`/relay-applications/${id}${query}`);
  }

  async updateRelayApplicationStatus(id: string, status: string, rejectionReason?: string, notes?: string) {
    return this.request<any>(`/relay-applications/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, rejection_reason: rejectionReason, notes }),
    });
  }

  // Transporters
  async getTransporters() {
    return this.request<any[]>('/transporters');
  }

  async getTransporter(id: string) {
    return this.request<any>(`/transporters/${id}`);
  }

  async createTransporter(transporterData: any) {
    return this.request<any>('/transporters', {
      method: 'POST',
      body: JSON.stringify(transporterData),
    });
  }

  async updateTransporter(id: string, transporterData: any) {
    return this.request<any>(`/transporters/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(transporterData),
    });
  }

  async deleteTransporter(id: string) {
    return this.request(`/transporters/${id}`, { method: 'DELETE' });
  }

  // Delivery Zones Management (admin only)
  async getDeliveryZones() {
    return this.request<any[]>('/delivery-zones');
  }

  async getDeliveryZone(id: string) {
    return this.request<any>(`/delivery-zones/${id}`);
  }

  async createDeliveryZone(zoneData: any) {
    return this.request<any>('/delivery-zones', {
      method: 'POST',
      body: JSON.stringify(zoneData),
    });
  }

  async updateDeliveryZone(id: string, zoneData: any) {
    return this.request<any>(`/delivery-zones/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(zoneData),
    });
  }

  async deleteDeliveryZone(id: string) {
    return this.request(`/delivery-zones/${id}`, { method: 'DELETE' });
  }

  async assignZoneToTransporter(zoneId: string, transporterId: string, priority?: number) {
    return this.request<any>(`/delivery-zones/${zoneId}/transporters/${transporterId}`, {
      method: 'POST',
      body: JSON.stringify({ priority: priority || 0 }),
    });
  }

  async removeZoneFromTransporter(zoneId: string, transporterId: string) {
    return this.request(`/delivery-zones/${zoneId}/transporters/${transporterId}`, {
      method: 'DELETE',
    });
  }

  async getTransporterZones(transporterId: string) {
    return this.request<any[]>(`/delivery-zones/transporters/${transporterId}`);
  }

  async getMyZones() {
    return this.request<any[]>('/delivery-zones/transporters/me/zones');
  }

  async getZoneTransporters(zoneId: string) {
    return this.request<any[]>(`/delivery-zones/${zoneId}/transporters`);
  }

  // Stats
  async getStats() {
    return this.request<any>('/stats');
  }

  // Notifications
  async getNotifications(unreadOnly?: boolean) {
    const queryParams = new URLSearchParams();
    if (unreadOnly) queryParams.append('unread_only', 'true');
    const query = queryParams.toString();
    const endpoint = `/notifications${query ? `?${query}` : ''}`;
    return this.request<any[]>(endpoint);
  }

  async markNotificationRead(id: string) {
    return this.request<any>(`/notifications/${id}/read`, { method: 'PATCH' });
  }

  async markAllNotificationsRead() {
    return this.request('/notifications/mark-all-read', { method: 'POST' });
  }

  // Analytics
  async getDailyStatistics(days: number = 30) {
    return this.request<any[]>(`/analytics/daily?days=${days}`);
  }

  async getMonthlyReports(months: number = 12) {
    return this.request<any[]>(`/analytics/monthly?months=${months}`);
  }

  async getRelayPerformance() {
    return this.request<any[]>('/analytics/relay-performance');
  }

  // Activity Logs
  async getActivityLogs(filters?: { admin_id?: string; entity_type?: string; limit?: number; offset?: number }) {
    const queryParams = new URLSearchParams();
    if (filters?.admin_id) queryParams.append('admin_id', filters.admin_id);
    if (filters?.entity_type) queryParams.append('entity_type', filters.entity_type);
    if (filters?.limit) queryParams.append('limit', filters.limit.toString());
    if (filters?.offset) queryParams.append('offset', filters.offset.toString());
    const query = queryParams.toString();
    const endpoint = `/activity-logs${query ? `?${query}` : ''}`;
    return this.request<any[]>(endpoint);
  }

  // Sender Addresses (user's own addresses for shipping)
  async getSenderAddresses() {
    return this.request<any[]>('/sender-addresses');
  }

  async getDefaultSenderAddress() {
    return this.request<any>('/sender-addresses/default');
  }

  async createSenderAddress(addressData: any) {
    return this.request<any>('/sender-addresses', {
      method: 'POST',
      body: JSON.stringify(addressData),
    });
  }

  async updateSenderAddress(id: string, addressData: any) {
    return this.request<any>(`/sender-addresses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(addressData),
    });
  }

  async deleteSenderAddress(id: string) {
    return this.request(`/sender-addresses/${id}`, { method: 'DELETE' });
  }

  // Recipient Addresses (addresses of people user sends to)
  async getRecipientAddresses() {
    return this.request<any[]>('/recipient-addresses');
  }

  async getDefaultRecipientAddress() {
    return this.request<any>('/recipient-addresses/default');
  }

  async createRecipientAddress(addressData: any) {
    return this.request<any>('/recipient-addresses', {
      method: 'POST',
      body: JSON.stringify(addressData),
    });
  }

  async updateRecipientAddress(id: string, addressData: any) {
    return this.request<any>(`/recipient-addresses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(addressData),
    });
  }

  async deleteRecipientAddress(id: string) {
    return this.request(`/recipient-addresses/${id}`, { method: 'DELETE' });
  }

  // Address Book for Pro users
  async getAddressBook() {
    return this.request<any[]>('/address-book');
  }

  async getAddressBookEntry(id: string) {
    return this.request<any>(`/address-book/${id}`);
  }

  async createAddressBookEntry(entryData: any) {
    return this.request<any>('/address-book', {
      method: 'POST',
      body: JSON.stringify(entryData),
    });
  }

  async updateAddressBookEntry(id: string, entryData: any) {
    return this.request<any>(`/address-book/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(entryData),
    });
  }

  async deleteAddressBookEntry(id: string) {
    return this.request(`/address-book/${id}`, { method: 'DELETE' });
  }

  async listIncidents(resolved?: boolean) {
    const qs = resolved !== undefined ? `?resolved=${resolved}` : '';
    return this.request<any[]>(`/handoffs/incidents${qs}`);
  }

  async resolveIncident(id: string) {
    return this.request<{ success: boolean }>(`/handoffs/incidents/${id}/resolve`, { method: 'PATCH' });
  }

  async reportTransporterIncident(
    trackingNumber: string,
    incidentType: string,
    description: string,
    coords?: { latitude: number; longitude: number }
  ) {
    return this.request<{ success: boolean; message: string }>('/handoffs/transporter/incident', {
      method: 'POST',
      body: JSON.stringify({
        tracking_number: trackingNumber,
        incident_type: incidentType,
        description,
        latitude: coords?.latitude,
        longitude: coords?.longitude,
      }),
    });
  }

  // Handoffs (relay-transporter transfers)
  async scanHandoff(trackingNumber: string, targetRelayId?: string, targetTransporterId?: string) {
    return this.request<any>('/handoffs/scan', {
      method: 'POST',
      body: JSON.stringify({ tracking_number: trackingNumber, target_relay_id: targetRelayId, target_transporter_id: targetTransporterId }),
    });
  }

  async getTransporterAssignments(transporterId?: string) {
    const endpoint = transporterId 
      ? `/handoffs/admin/transporter/${transporterId}/assignments`
      : '/handoffs/transporter/assignments';
    const result = await this.request<any[]>(endpoint);
    return result;
  }

  async getDeliveredShipmentsForTransporter() {
    return this.request<any[]>('/handoffs/transporter/delivered-shipments');
  }

  // ── Espace livreur : offres de course + portefeuille ──
  async getMyOffers() {
    return this.request<any[]>('/delivery-offers/my-offers');
  }

  async acceptOffer(offerId: string) {
    return this.request<any>(`/delivery-offers/${offerId}/accept`, { method: 'POST' });
  }

  async declineOffer(offerId: string) {
    return this.request<any>(`/delivery-offers/${offerId}/decline`, { method: 'POST' });
  }

  // Suivi de la recherche de livreur (côté expéditeur, home_pickup)
  async getDispatchStatus(trackingNumber: string) {
    return this.request<{
      state: 'not_applicable' | 'searching' | 'assigned' | 'no_driver';
      pickup?: { latitude: number | null; longitude: number | null };
      offers_sent?: number;
      round?: number;
      driver?: {
        first_name: string;
        last_name: string;
        phone: string;
        vehicle_type: string;
        license_plate: string | null;
        transporter_code: string | null;
        latitude: number | null;
        longitude: number | null;
        location_updated_at: string | null;
      } | null;
    }>(`/tracking/${trackingNumber}/dispatch-status`);
  }

  // Le livreur pousse sa position GPS (suivi temps réel)
  async updateMyLocation(latitude: number, longitude: number) {
    return this.request<{ success: boolean }>('/transporters/me/location', {
      method: 'POST',
      body: JSON.stringify({ latitude, longitude }),
    });
  }

  async getTransporterWallet() {
    return this.request<{ wallet: any; stats: { today: number; week: number; month: number } }>('/transporter/wallet');
  }

  async getWalletTransactions(limit = 20, offset = 0) {
    return this.request<{ data: any[]; total: number }>(`/transporter/wallet/transactions?limit=${limit}&offset=${offset}`);
  }

  async requestWithdrawal(payload: { amount_fcfa: number; orange_money_number: string; notes?: string }) {
    return this.request<any>('/transporter/wallet/withdraw', { method: 'POST', body: JSON.stringify(payload) });
  }

  async findTransporterByIdentifier(identifier: string) {
    return this.request<{ transporter_id: string; user_id: string }>(`/handoffs/find-transporter/${identifier}`);
  }

  async findRelayByIdentifier(identifier: string) {
    return this.request<{ relay_id: string; relay_name: string } | { matches: any[]; message: string }>(`/handoffs/find-relay/${identifier}`);
  }

  async getTransporterShipmentsAtRelay(transporterId: string, relayId: string) {
    return this.request<any[]>(`/handoffs/transporter/${transporterId}/relay/${relayId}/shipments`);
  }

  async getShipmentTrackingEvents(shipmentId: string) {
    return this.request<any[]>(`/scan/events/${shipmentId}`);
  }

  async carrierPickup(trackingNumber: string, relayId?: string, timestamp?: string) {
    return this.request<any>('/scan/extras/carrier-pickup', {
      method: 'POST',
      body: JSON.stringify({ tracking_number: trackingNumber, relay_id: relayId, timestamp }),
    });
  }

  async confirmHomePickup(trackingNumber: string) {
    return this.request<any>('/scan/extras/confirm-home-pickup', {
      method: 'POST',
      body: JSON.stringify({ tracking_number: trackingNumber }),
    });
  }

  // Transporter pickup operations
  async getShipmentsForPickup(senderPhone: string) {
    return this.request<any[]>(`/shipments/pickup/sender-phone/${senderPhone}`);
  }

  async getShipmentForPickup(trackingNumber: string) {
    return this.request<any>(`/shipments/pickup/tracking/${trackingNumber}`);
  }

  async confirmShipmentPayment(trackingNumber: string) {
    return this.request<any>(`/shipments/${trackingNumber}/confirm-payment`, {
      method: 'POST',
    });
  }

  async rejectShipment(trackingNumber: string, reason?: string) {
    return this.request<any>(`/shipments/${trackingNumber}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async cancelShipment(trackingNumber: string) {
    return this.request<any>(`/shipments/${trackingNumber}/cancel`, {
      method: 'POST',
    });
  }

  async relayInitiateReturn(trackingNumber: string) {
    return this.request<any>(`/shipments/${trackingNumber}/relay-return`, { method: 'POST' });
  }

  async relayReportIncident(trackingNumber: string, incidentType: string, description: string) {
    return this.request<any>(`/shipments/${trackingNumber}/relay-incident`, {
      method: 'POST',
      body: JSON.stringify({ incident_type: incidentType, description }),
    });
  }
  async receiveShipmentForPickup(trackingNumber: string, relayId?: string, shipmentCode?: string) {
    return this.request<any>(`/shipments/${trackingNumber}/receive`, {
      method: 'POST',
      body: JSON.stringify({ relay_id: relayId, shipment_code: shipmentCode }),
    });
  }

  // Delivery operations
  async deliverShipment(trackingNumber: string, pickupCode: string, recipientIdentifier?: string, paymentCollected?: boolean, paymentMethod?: string, paymentAmount?: number, phoneNumber?: string) {
    return this.request<any>(`/shipments/${trackingNumber}/deliver`, {
      method: 'POST',
      body: JSON.stringify({
        pickup_code: pickupCode,
        recipient_identifier: recipientIdentifier,
        payment_collected: paymentCollected,
        payment_method: paymentMethod,
        payment_amount: paymentAmount,
        phone_number: phoneNumber,
      }),
    });
  }

  async collectPaymentOnDelivery(trackingNumber: string, paymentMethod: string, paymentAmount: number, phoneNumber?: string) {
    return this.request<any>(`/shipments/${trackingNumber}/collect-payment`, {
      method: 'POST',
      body: JSON.stringify({
        payment_method: paymentMethod,
        payment_amount: paymentAmount,
        phone_number: phoneNumber,
      }),
    });
  }

  async markDeparture(trackingNumber: string, timestamp?: string) {
    return this.request<any>('/scan/extras/ops/departure', {
      method: 'POST',
      body: JSON.stringify({ tracking_number: trackingNumber, timestamp }),
    });
  }

  async getRelayPickups() {
    return this.request<any[]>('/handoffs/relay/pickups');
  }

  async getRelayDeliveries() {
    return this.request<any[]>('/handoffs/relay/deliveries');
  }

  async verifyPickupCode(trackingNumber: string, pickupCode: string, recipientIdNumber: string) {
    return this.request<any>('/handoffs/verify-pickup', {
      method: 'POST',
      body: JSON.stringify({ tracking_number: trackingNumber, pickup_code: pickupCode, recipient_id_number: recipientIdNumber }),
    });
  }

  async markShipmentPickedUp(id: string, pickupCode: string, recipientVerified: boolean) {
    return this.request<any>(`/handoffs/${id}/pickup`, {
      method: 'POST',
      body: JSON.stringify({ pickup_code: pickupCode, recipient_verified: recipientVerified }),
    });
  }

  // Chatbot
  async submitChatbotMessage(messageData: { user_id?: string | null; user_email?: string | null; user_phone?: string | null; message: string }) {
    return this.request<any>('/chatbot/message', {
      method: 'POST',
      body: JSON.stringify(messageData),
    });
  }

  async getChatbotMessages(filters?: { status?: string; limit?: number; offset?: number }) {
    const queryParams = new URLSearchParams();
    if (filters?.status) queryParams.append('status', filters.status);
    if (filters?.limit) queryParams.append('limit', filters.limit.toString());
    if (filters?.offset) queryParams.append('offset', filters.offset.toString());
    const query = queryParams.toString();
    const endpoint = `/chatbot/messages${query ? `?${query}` : ''}`;
    return this.request<any[]>(endpoint);
  }

  async updateChatbotMessage(id: string, updates: { status?: string; response?: string; assigned_to?: string | null }) {
    return this.request<any>(`/chatbot/messages/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  // QR Codes
  async generateQRCode(shipmentId: string, stage: 'depot' | 'transit' | 'delivery') {
    return this.request<any>('/qr-codes/generate', {
      method: 'POST',
      body: JSON.stringify({ shipment_id: shipmentId, stage }),
    });
  }

  async scanQRCode(qrCodeHash: string, scannedLocation?: string) {
    return this.request<any>('/qr-codes/scan', {
      method: 'POST',
      body: JSON.stringify({ qr_code_hash: qrCodeHash, scanned_location: scannedLocation }),
    });
  }

  async getShipmentQRCodes(shipmentId: string) {
    return this.request<any[]>(`/qr-codes/shipment/${shipmentId}`);
  }

  // Manually assign shipment to transporter (admin only)
  async assignShipmentToTransporter(shipmentId: string) {
    return this.request<any>(`/shipments/${shipmentId}/assign`, {
      method: 'POST',
    });
  }

  // Pricing Management (admin only)
  async getPricingSettings() {
    return this.request<any[]>('/pricing');
  }

  async getActivePricingSettings() {
    return this.request<any[]>('/pricing/active');
  }

  async getPricingSetting(id: string) {
    return this.request<any>(`/pricing/${id}`);
  }

  async createPricingSetting(pricingData: any) {
    return this.request<any>('/pricing', {
      method: 'POST',
      body: JSON.stringify(pricingData),
    });
  }

  async updatePricingSetting(id: string, pricingData: any) {
    return this.request<any>(`/pricing/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(pricingData),
    });
  }

  async deletePricingSetting(id: string) {
    return this.request(`/pricing/${id}`, {
      method: 'DELETE',
    });
  }

  // Pricing Grids (lecture seule — la tarification active passe par delivery_price_tiers)
  async getActivePricingGrids() {
    return this.request<any[]>('/pricing-grids/active');
  }

  // Additional Options Management
  async getAdditionalOptions() {
    return this.request<any[]>('/additional-options');
  }

  async getActiveAdditionalOptions() {
    return this.request<any[]>('/additional-options/active');
  }

  async updateAdditionalOption(id: string, optionData: any) {
    return this.request<any>(`/additional-options/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(optionData),
    });
  }

  // Promo Codes
  async validatePromoCode(code: string) {
    return this.request<{ code: string; discount_type: 'free' | 'fixed' | 'percentage'; discount_value: number }>(
      '/promo-codes/validate',
      { method: 'POST', body: JSON.stringify({ code }) }
    );
  }

  async listPromoCodes() {
    return this.request<any[]>('/promo-codes');
  }

  async createPromoCode(data: { code: string; description?: string; discount_type: string; discount_value: number; max_uses?: number; expires_at?: string }) {
    return this.request<any>('/promo-codes', { method: 'POST', body: JSON.stringify(data) });
  }

  async togglePromoCode(id: string) {
    return this.request<any>(`/promo-codes/${id}/toggle`, { method: 'PATCH' });
  }

  async updatePromoCode(id: string, data: { code?: string; description?: string; discount_type?: string; discount_value?: number; max_uses?: number | null; expires_at?: string | null }) {
    return this.request<any>(`/promo-codes/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  }

  async deletePromoCode(id: string) {
    return this.request<{ success: boolean }>(`/promo-codes/${id}`, { method: 'DELETE' });
  }

  async getPublicSettings() {
    return this.request<{ promoCodeEnabled: boolean }>('/admin/settings/public');
  }

  async getCart() {
    return this.request<any[]>('/cart');
  }

  async saveCart(items: any[]) {
    return this.request<any[]>('/cart', { method: 'PUT', body: JSON.stringify({ items }) });
  }

  async relayConfirmCashPayment(payload: {
    tracking_number: string;
    amount?: number;
    notes?: string;
  }) {
    return this.request<any>('/payments/relay-cash/confirm', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getRelayCashDashboard() {
    return this.request<any>('/payments/relay-cash/dashboard');
  }

  async getRelayCashSummary() {
    return this.request<any>('/payments/relay-cash/summary');
  }

  // Scan & Tracking System
  async scanShipment(scanData: {
    tracking_number: string;
    status: string;
    location_id?: string;
    scanner_id?: string;
    timestamp?: string;
    notes?: string;
  }) {
    return this.request<any>('/scan', {
      method: 'POST',
      body: JSON.stringify(scanData),
    });
  }

  async getTrackingHistory(tracking_number: string) {
    return this.request<any>(`/scan/tracking/${tracking_number}`);
  }

  async getTrackingEvents(shipment_id: string) {
    return this.request<any[]>(`/scan/events/${shipment_id}`);
  }

  // Shipping Addresses Management
  async getShippingAddresses() {
    return this.request<any[]>('/shipping-addresses');
  }

  async getShippingAddress(id: string) {
    return this.request<any>(`/shipping-addresses/${id}`);
  }

  async createShippingAddress(addressData: any) {
    return this.request<any>('/shipping-addresses', {
      method: 'POST',
      body: JSON.stringify(addressData),
    });
  }

  async updateShippingAddress(id: string, addressData: any) {
    return this.request<any>(`/shipping-addresses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(addressData),
    });
  }

  async deleteShippingAddress(id: string) {
    return this.request(`/shipping-addresses/${id}`, {
      method: 'DELETE',
    });
  }

  // Customer Messages Management
  async getCustomerMessages() {
    return this.request<any[]>('/customer-messages');
  }

  async getCustomerMessage(id: string) {
    return this.request<any>(`/customer-messages/${id}`);
  }

  async createCustomerMessage(messageData: { subject: string; message: string }) {
    return this.request<any>('/customer-messages', {
      method: 'POST',
      body: JSON.stringify(messageData),
    });
  }

  async replyToCustomerMessage(id: string, payload: { message: string; attachments?: any[] }) {
    return this.request<any>(`/customer-messages/${id}/reply`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Job Postings
  async getJobPostings(filters?: { department?: string; employment_type?: string; featured_only?: boolean }) {
    const params = new URLSearchParams();
    if (filters?.department) params.append('department', filters.department);
    if (filters?.employment_type) params.append('employment_type', filters.employment_type);
    if (filters?.featured_only) params.append('featured_only', 'true');
    
    const query = params.toString();
    return this.request(`/job-postings${query ? `?${query}` : ''}`);
  }

  async getJobPosting(id: string) {
    return this.request(`/job-postings/${id}`);
  }

  // Admin job postings
  async getAllJobPostings() {
    return this.request('/job-postings/admin/all');
  }

  async createJobPosting(data: any) {
    return this.request('/job-postings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateJobPosting(id: string, data: any) {
    return this.request(`/job-postings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteJobPosting(id: string) {
    return this.request(`/job-postings/${id}`, {
      method: 'DELETE',
    });
  }

  // Admin Settings
  async getAdminSettings() {
    return this.request<Record<string, unknown>>('/admin/settings');
  }

  async saveAdminSettings(settings: Record<string, unknown>) {
    return this.request<{ success: boolean }>('/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  // Photo Upload
  async uploadPhotos(files: File[]): Promise<{ data: { urls: string[] } | null; error: string | null }> {
    const fd = new FormData();
    files.forEach(f => fd.append('photos', f));
    return this.requestFormData('/uploads/photos', fd);
  }

  // Job Applications
  async submitJobApplication(formData: FormData) {
    return this.requestFormData('/job-applications', formData);
  }

  async initMobileMoneyPayment(payload: {
    tracking_number: string;
    amount_fcfa: number;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
  }) {
    return this.request<{ payment_url: string; transaction_id: string }>(
      '/payments/mobile-money/init',
      { method: 'POST', body: JSON.stringify(payload) }
    );
  }

  async initBatchMobileMoneyPayment(payload: {
    tracking_numbers: string[];
    customer_name: string;
    customer_email: string;
    customer_phone: string;
  }) {
    return this.request<{ payment_url: string; transaction_id: string }>(
      '/payments/mobile-money/init-batch',
      { method: 'POST', body: JSON.stringify(payload) }
    );
  }

  async initPaystackPayment(payload: {
    tracking_number: string;
    amount_fcfa: number;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
  }) {
    return this.request<{ payment_url: string; reference: string }>(
      '/payments/paystack/init',
      { method: 'POST', body: JSON.stringify(payload) }
    );
  }

  async initCinetPayPayment(payload: {
    tracking_number: string;
    amount_fcfa: number;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
  }) {
    return this.request<{ payment_url: string; transaction_id: string }>(
      '/payments/cinetpay/init',
      { method: 'POST', body: JSON.stringify(payload) }
    );
  }

  async getTransporterApplications(status?: string) {
    const qs = status ? `?status=${status}` : '';
    return this.request<any[]>(`/transporter-applications${qs}`);
  }

  async updateTransporterApplicationStatus(id: string, status: string, rejectionReason?: string, notes?: string) {
    return this.request<any>(`/transporter-applications/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, rejection_reason: rejectionReason, notes }),
    });
  }

  async getAdminWallets() {
    return this.request<any[]>('/transporter/wallet/admin');
  }

  async getAdminWithdrawals() {
    return this.request<any[]>('/transporter/wallet/admin/withdrawals');
  }

  async approveWithdrawal(txId: string, orangeMoneyRef?: string) {
    return this.request<any>(`/transporter/wallet/admin/withdrawals/${txId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ orange_money_ref: orangeMoneyRef }),
    });
  }

  async rejectWithdrawal(txId: string, reason?: string) {
    return this.request<any>(`/transporter/wallet/admin/withdrawals/${txId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async getDeliveryPriceTiers() {
    return this.request<any[]>('/delivery-price-tiers/all');
  }

  async createDeliveryPriceTier(data: Record<string, any>) {
    return this.request<any>('/delivery-price-tiers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateDeliveryPriceTier(id: string, data: Record<string, any>) {
    return this.request<any>(`/delivery-price-tiers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteDeliveryPriceTier(id: string) {
    return this.request<any>(`/delivery-price-tiers/${id}`, { method: 'DELETE' });
  }

  async switchToRelayPayment(trackingNumber: string) {
    return this.request<{ success: boolean; message: string }>(
      `/shipments/${trackingNumber}/switch-to-relay-payment`,
      { method: 'POST' }
    );
  }

  async verifyPaystackPayment(reference: string, trackingNumber: string) {
    return this.request<{ paid: boolean; status: string; amount: number; reference: string }>(
      '/payments/paystack/verify',
      { method: 'POST', body: JSON.stringify({ reference, tracking_number: trackingNumber }) }
    );
  }

  async getAutomatedPaymentStatus(trackingNumber: string) {
    return this.request<{ status: string; provider: string; transaction_id: string }>(
      `/payments/automated/${trackingNumber}`
    );
  }

  // API Keys management
  async getApiKeys() {
    return this.request<any[]>('/api-keys');
  }

  async createApiKey(data: {
    partner_name: string;
    partner_email?: string;
    description?: string;
    scopes: string[];
    rate_limit_per_min: number;
  }) {
    return this.request<any>('/api-keys', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateApiKey(id: string, data: {
    scopes?: string[];
    rate_limit_per_min?: number;
    status?: 'active' | 'revoked';
  }) {
    return this.request<any>(`/api-keys/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteApiKey(id: string) {
    return this.request(`/api-keys/${id}`, { method: 'DELETE' });
  }

  async getApiKeyUsage(id: string) {
    return this.request<any[]>(`/api-keys/${id}/usage`);
  }

  async getApiKeysStats() {
    return this.request<any>('/api-keys/stats/overview');
  }

  // ─── Support ────────────────────────────────────────────────────────────────

  async getSupportDashboard() {
    return this.request<any>('/support/dashboard');
  }

  async getSupportTickets(params?: Record<string, any>) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, String(value));
        }
      });
    }
    const query = searchParams.toString();
    return this.request<any[]>(`/support/tickets${query ? `?${query}` : ''}`);
  }

  async getSupportTicket(id: string) {
    return this.request<any>(`/support/tickets/${id}`);
  }

  async replySupportTicket(id: string, body: { body: string; attachments?: any; status?: string }) {
    return this.request<any>(`/support/tickets/${id}/reply`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async updateSupportTicketStatus(id: string, status: string) {
    return this.request<any>(`/support/tickets/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async addSupportNote(id: string, content: string) {
    return this.request<any>(`/support/tickets/${id}/notes`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  async addSupportReminder(id: string, scheduled_for: string, notes?: string) {
    return this.request<any>(`/support/tickets/${id}/reminders`, {
      method: 'POST',
      body: JSON.stringify({ scheduled_for, notes }),
    });
  }

  async assignSupportTicket(id: string, payload: { target_type: string; target_id: string; note?: string }) {
    return this.request<any>(`/support/tickets/${id}/assign`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async markSupportPriority(id: string, urgent: boolean) {
    return this.request<any>(`/support/tickets/${id}/mark-priority`, {
      method: 'POST',
      body: JSON.stringify({ urgent }),
    });
  }

  async closeSupportTicket(id: string, resolution_note?: string) {
    return this.request<any>(`/support/tickets/${id}/close`, {
      method: 'POST',
      body: JSON.stringify({ resolution_note }),
    });
  }

  async getSupportTransferDirectory() {
    return this.request<any>('/support/directory/transfers');
  }

  async searchSupportShipment(tracking: string) {
    const params = new URLSearchParams({ tracking });
    return this.request<any>(`/support/shipments/search?${params.toString()}`);
  }

  // ─── Delivery Batches ────────────────────────────────────────────────────────
  async getMyBatches() {
    return this.request<any[]>('/delivery-batches/my-batches');
  }

  async acceptBatch(id: string) {
    return this.request<any>(`/delivery-batches/${id}/accept`, { method: 'POST' });
  }

  async declineBatch(id: string) {
    return this.request<any>(`/delivery-batches/${id}/decline`, { method: 'POST' });
  }

  async getAdminBatches(params?: { status?: string; limit?: number; offset?: number }) {
    const qs = params
      ? '?' + new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v != null)
            .map(([k, v]) => [k, String(v)])
        ).toString()
      : '';
    return this.request<any>(`/delivery-batches/admin${qs}`);
  }

  async getAdminBatchStats() {
    return this.request<any>('/delivery-batches/admin/stats');
  }

  async getRelayPendingBatches(relayId: string) {
    return this.request<any[]>(`/delivery-batches/relay/${relayId}/pending`);
  }
}

export const api = new ApiClient(API_URL);

// Types (keeping compatibility with existing code)
export type RelayPoint = {
  id: string;
  name: string;
  type: 'cybercafe' | 'imprimerie' | 'superette';
  commune: string;
  quartier: string;
  address: string;
  phone: string;
  whatsapp?: string;
  hours: string;
  latitude?: number;
  longitude?: number;
  is_active: boolean;
  created_at: string;
};

export type Shipment = {
  id: string;
  tracking_number: string;
  sender_first_name: string;
  sender_last_name: string;
  sender_email?: string;
  sender_phone: string;
  sender_commune: string;
  sender_quartier: string;
  sender_address: string;
  recipient_first_name: string;
  recipient_last_name: string;
  recipient_email?: string;
  recipient_phone: string;
  recipient_commune: string;
  recipient_quartier: string;
  recipient_address: string;
  package_type: 'petit' | 'moyen' | 'grand';
  weight: number;
  price: number;
  printing_fee?: number;
  assistance_fee?: number;
  box_price?: number;
  status: string;
  current_status?: string;
  print_at_relay: boolean;
  relay_assisted?: boolean;
  home_delivery?: boolean;
  pickup_code?: string;
  shipment_code?: string | null;
  transporter_id?: string;
  payment_status: string;
  payment_method?: string;
  origin_relay_id?: string;
  destination_relay_id?: string;
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
  origin_relay?: RelayPoint;
  destination_relay?: RelayPoint;
  tracking_history?: any[];
  effective_status?: string | null;
  mobile_money_payment?: Record<string, any> | null;
  relay_cash_payment?: {
    id?: string;
    status?: string;
    amount_expected?: number;
    amount_collected?: number | null;
    relay_point_id?: string | null;
    collected_by?: string | null;
    collected_at?: string | null;
  } | null;
  pickup_code_verified_at?: string | null;
  pickup_code_verified_by?: string | null;
};

