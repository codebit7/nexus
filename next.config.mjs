/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@react-pdf/renderer'],
    optimizePackageImports: [
      'lucide-react',
      '@supabase/supabase-js',
      // @radix-ui/* entries removed — Next.js' experimental package
      // optimization has caused ref-composition loops in Radix Dialog /
      // Presence when combined with dev Fast Refresh. The infinite
      // setNode/setRef update cycle we saw was triggered by this.
    ],
    // staleTimes removed — it caused stale data after mutations (e.g. task
    // board drag-and-drop) because the client-side router served cached pages
    // for 30s, ignoring server revalidation.
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  webpack: (config) => {
    // pdfjs-dist (lib/file-processor.ts) has an optional `canvas` dependency it
    // uses to RENDER pdf pages in Node. We only read the text layer in the
    // browser and never render, but webpack still tries to resolve the import
    // and fails the build with "Module not found: Can't resolve 'canvas'".
    //
    // Aliasing it to false tells webpack to skip it. Installing `canvas`
    // instead would pull in a native build toolchain for something we never call.
    config.resolve.alias = { ...config.resolve.alias, canvas: false };
    return config;
  },
};

export default nextConfig;
