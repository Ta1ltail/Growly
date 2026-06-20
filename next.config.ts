import type { NextConfig } from "next";
import withBundleAnalyzer from "@next/bundle-analyzer";

const withBA = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  // Production source maps disabled for smaller bundles
  productionBrowserSourceMaps: false,

  // Image optimization for data-URI avatars
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: "inline",
  },
};

export default withBA(nextConfig);
