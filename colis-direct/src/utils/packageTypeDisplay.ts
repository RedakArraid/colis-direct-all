/**
 * Utility function to display package type in French
 */
export function getPackageTypeLabel(packageType: string | null | undefined): string {
  if (!packageType) return 'N/A';
  
  const normalized = packageType.toLowerCase();
  switch (normalized) {
    case 'petit':
      return 'Petit';
    case 'moyen':
      return 'Moyen';
    case 'grand':
      return 'Grand';
    // Legacy support for old values
    case 'courier':
      return 'Courrier';
    case 'colis':
      return 'Colis';
    default:
      return packageType;
  }
}

