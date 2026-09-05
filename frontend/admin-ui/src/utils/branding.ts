export interface BrandConfig {
  id: string;
  name: string;
  portalTitle: string;
  adminTitle: string;
  footerText: string;
  websiteUrl: string;
  supportEmail: string;
  primaryColor: string;
  accentColor: string;
}

export const SANNA_BRAND: BrandConfig = {
  id: 'sannalms',
  name: 'SannaLMS',
  portalTitle: 'Sanna LMS Admin Platform',
  adminTitle: 'SannaLMS Administration',
  footerText: '© 2026 Sanna Innovations. All rights reserved.',
  websiteUrl: 'https://sannainnovations.com',
  supportEmail: 'support@sannainnovations.com',
  primaryColor: '#4f46e5',
  accentColor: '#6366f1',
};

export const EDULATERAL_BRAND: BrandConfig = {
  id: 'edulateral',
  name: 'Edulateral LMS',
  portalTitle: 'Edulateral LMS Admin Platform',
  adminTitle: 'Edulateral Administration',
  footerText: '© 2026 Edulateral Foundation. All Rights Reserved.',
  websiteUrl: 'https://edulateral.com',
  supportEmail: 'support@edulateral.com',
  primaryColor: '#ff9800',
  accentColor: '#3b82f6',
};

export function getBrandConfig(): BrandConfig {
  if (typeof window === 'undefined') {
    return SANNA_BRAND;
  }

  const host = window.location.hostname.toLowerCase();
  const searchParams = new URLSearchParams(window.location.search);
  const tenantParam = searchParams.get('tenant')?.toLowerCase() || searchParams.get('brand')?.toLowerCase();

  if (
    host.includes('edulateral') ||
    host.includes('edulms') ||
    tenantParam === 'edulateral' ||
    localStorage.getItem('preferred_tenant') === 'edulateral'
  ) {
    if (tenantParam === 'edulateral') {
      try {
        localStorage.setItem('preferred_tenant', 'edulateral');
      } catch (_) {}
    }
    return EDULATERAL_BRAND;
  }

  return SANNA_BRAND;
}
