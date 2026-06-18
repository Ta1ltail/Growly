import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Production source maps disabled for smaller bundles
  productionBrowserSourceMaps: false,
  
  // Image optimization for data-URI avatars
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: "inline",
  },
};

export default nextConfig;
