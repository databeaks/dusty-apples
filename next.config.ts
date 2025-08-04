/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  distDir: 'build',
  images: {
    unoptimized: true,
  },
  // When running in FastAPI, we'll serve from root path
  basePath: '',
  // Disable server-side features since we're exporting static files
  trailingSlash: true,
  typescript: {
    // We're handling type checking in CI/CD
    ignoreBuildErrors: true,
  },
  experimental: {
    // Skip static optimization to avoid React hook issues
    optimizeCss: false,
  },
};

export default nextConfig;