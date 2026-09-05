export interface BrandConfig {
  id: string;
  name: string;
  portalTitle: string;
  tagline: string;
  slogan: string;
  welcomeMessage: string;
  footerText: string;
  websiteUrl: string;
  supportEmail: string;
  primaryColor: string;
  accentColor: string;
  logoText: string;
  showPoweredBy: boolean;
}

const SANNA_BRAND: BrandConfig = {
  id: 'sannalms',
  name: 'SannaLMS',
  portalTitle: 'SannaLMS | Enterprise Multi-Tenant SaaS Learning Platform',
  tagline: 'The next-generation, cloud-native Learning Management System built for scale.',
  slogan: 'Seamless identity management, real-time analytics, and secure multi-tenant architecture.',
  welcomeMessage: 'Welcome to SannaLMS',
  footerText: '© 2026 Sanna Innovations. All rights reserved.',
  websiteUrl: 'https://sannainnovations.com',
  supportEmail: 'support@sannainnovations.com',
  primaryColor: '#4f46e5',
  accentColor: '#6366f1',
  logoText: 'SannaLMS',
  showPoweredBy: true
};

const EDULATERAL_BRAND: BrandConfig = {
  id: 'edulateral',
  name: 'Edulateral LMS',
  portalTitle: 'Edulateral LMS | Learning Management Portal',
  tagline: 'Empowering institutions with next-generation digital learning and assessments.',
  slogan: 'Ideate | Innovate | Integrate',
  welcomeMessage: 'Welcome to Edulateral Learning Portal',
  footerText: '© 2026 Edulateral Foundation. All Rights Reserved.',
  websiteUrl: 'https://edulateral.com',
  supportEmail: 'support@edulateral.com',
  primaryColor: '#ff9800',
  accentColor: '#3b82f6',
  logoText: 'Edulateral LMS',
  showPoweredBy: false
};

export function getBrandConfig(): BrandConfig {
  if (typeof window === 'undefined') {
    return SANNA_BRAND;
  }

  const host = window.location.hostname.toLowerCase();
  const searchParams = new URLSearchParams(window.location.search);
  const tenantParam = searchParams.get('tenant')?.toLowerCase() || searchParams.get('brand')?.toLowerCase();
  
  let storedBrand = '';
  try {
    storedBrand = localStorage.getItem('preferred_brand') || localStorage.getItem('preferred_tenant') || '';
  } catch (_) {}

  const hasCookieBrand = typeof document !== 'undefined' && (
    document.cookie.includes('preferred_brand=edulateral') ||
    document.cookie.includes('preferred_tenant=edulateral')
  );

  // If visiting edulateral domain, subdomain, with tenant parameter, or previously chosen
  if (
    host.includes('edulateral') ||
    host.includes('edulms') ||
    tenantParam === 'edulateral' ||
    storedBrand === 'edulateral' ||
    hasCookieBrand
  ) {
    try {
      localStorage.setItem('preferred_brand', 'edulateral');
      localStorage.setItem('preferred_tenant', 'edulateral');
      document.cookie = "preferred_brand=edulateral; path=/; max-age=31536000; SameSite=Lax";
      document.cookie = "preferred_tenant=edulateral; path=/; max-age=31536000; SameSite=Lax";
    } catch (_) {}
    return EDULATERAL_BRAND;
  }

  return SANNA_BRAND;
}
