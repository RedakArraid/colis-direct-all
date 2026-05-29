import { api } from './api';

// ─── Adapter ─────────────────────────────────────────────────────────────────
// Converts ApiClient's {data, error} pattern to throw/return pattern
// for backward compatibility with existing components (CustomerSupportDashboard).
// All calls now go through the unified ApiClient and benefit from:
// - 10s timeout (AbortController)
// - 401 auto-logout (auth:token-invalid event)
// - Consistent error messages in French
// ─────────────────────────────────────────────────────────────────────────────

async function unwrap<T>(promise: Promise<{ data: T | null; error: string | null }>): Promise<T> {
  const { data, error } = await promise;
  if (error) throw new Error(error);
  return data as T;
}

export const supportApi = {
  async getDashboard() {
    return unwrap(api.getSupportDashboard());
  },

  async getTickets(params: Record<string, any> = {}) {
    return unwrap(api.getSupportTickets(params));
  },

  async getTicket(id: string) {
    return unwrap(api.getSupportTicket(id));
  },

  async reply(ticketId: string, body: { body: string; attachments?: any; status?: string }) {
    return unwrap(api.replySupportTicket(ticketId, body));
  },

  async updateStatus(ticketId: string, status: string) {
    return unwrap(api.updateSupportTicketStatus(ticketId, status));
  },

  async addNote(ticketId: string, content: string) {
    return unwrap(api.addSupportNote(ticketId, content));
  },

  async addReminder(ticketId: string, scheduled_for: string, notes?: string) {
    return unwrap(api.addSupportReminder(ticketId, scheduled_for, notes));
  },

  async assign(ticketId: string, payload: { target_type: string; target_id: string; note?: string }) {
    return unwrap(api.assignSupportTicket(ticketId, payload));
  },

  async markPriority(ticketId: string, urgent: boolean) {
    return unwrap(api.markSupportPriority(ticketId, urgent));
  },

  async close(ticketId: string, resolution_note?: string) {
    return unwrap(api.closeSupportTicket(ticketId, resolution_note));
  },

  async getTransferDirectory() {
    return unwrap(api.getSupportTransferDirectory());
  },

  async searchShipment(tracking: string) {
    const { data, error } = await api.searchSupportShipment(tracking);
    // Return null on 404 (shipment not found) — matches original behavior
    if (error && (error.includes('404') || error.includes('introuvable'))) return null;
    if (error) throw new Error(error);
    return data;
  },

  async getRelayCashDashboard() {
    return unwrap(api.getRelayCashDashboard());
  },
};
