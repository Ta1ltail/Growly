import type { NextConfig } from "next";
import withBundleAnalyzer from "@next/bundle-analyzer";

const withBA = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  // Production source maps disabled for smaller bundles
  productionBrowserSourceMaps: false,

  // Image optimization for data-URI avatars (avoids unsafe-inline SVG handling)
  // Note: dangerouslyAllowSVG was removed because avatars are JPEG, never SVG.
  // If SVG support is needed in the future, add svg sanitization alongside it.
  images: {
    contentDispositionType: "inline",
  },
};

export default withBA(nextConfig);
