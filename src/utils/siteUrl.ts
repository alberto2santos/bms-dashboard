export function getSiteUrl(): URL {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configuredUrl) return new URL(configuredUrl);

  const productionDomain = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (productionDomain) return new URL(`https://${productionDomain}`);

  const deploymentDomain = process.env.VERCEL_URL;
  if (deploymentDomain) return new URL(`https://${deploymentDomain}`);

  return new URL("http://localhost:3000");
}