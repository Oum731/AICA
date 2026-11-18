const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  outputFileTracingRoot: import.meta.dirname,
  experimental: { serverActions: { bodySizeLimit: '4mb' } },
  serverExternalPackages: ['sharp', 'postgres'],
  async redirects() {
    return [
      { source: '/actions', destination: '/evenements', permanent: true },
      { source: '/actions/:slug', destination: '/evenements/:slug', permanent: true },
    ];
  },
};
export default nextConfig;
