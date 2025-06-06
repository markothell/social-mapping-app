export function getAdminUrl(path: string = '/admin'): string {
  if (typeof window === 'undefined') {
    return path;
  }
  
  const adminSubdomain = process.env.NEXT_PUBLIC_ADMIN_SUBDOMAIN || 'admin';
  const currentHostname = window.location.hostname;
  const protocol = window.location.protocol;
  const port = window.location.port;
  
  // For localhost development
  if (currentHostname === 'localhost' || currentHostname.includes('localhost')) {
    const adminHost = `admin.localhost${port ? `:${port}` : ''}`;
    return `${protocol}//${adminHost}${path}`;
  }
  
  // For production/staging
  const hostParts = currentHostname.split('.');
  if (hostParts.length >= 2) {
    const domain = hostParts.slice(-2).join('.');
    const adminHost = `${adminSubdomain}.${domain}`;
    return `${protocol}//${adminHost}${path}`;
  }
  
  return path;
}

export function isAdminDomain(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  
  const adminSubdomain = process.env.NEXT_PUBLIC_ADMIN_SUBDOMAIN || 'admin';
  const hostname = window.location.hostname;
  
  // For localhost development
  if (hostname === 'admin.localhost') {
    return true;
  }
  
  // For production/staging
  const subdomain = hostname.split('.')[0];
  return subdomain === adminSubdomain;
}