/**
 * Rôles autorisés à passer p_bypass_scanner_checks=true dans process_shipment_scan
 * (aligné sur PATCH /api/shipments/:id/status).
 */
export function processScanBypassFromRole(role: string | undefined | null): boolean {
  if (!role) return false;
  return role === 'admin' || role === 'support' || role === 'support_supervisor';
}
