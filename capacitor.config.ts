import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.growly.app",
  appName: "Growly",
  webDir: "public",
  server: {
    url: "https://growlybeta.vercel.app",
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
  // Capacitor splash screen preferences — the app loads from the live URL,
  // so this splash shows while the WebView connects.
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#24222e",
      androidScaleType: "CENTER_CROP",
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#24222e",
      overlaysWebView: false,
    },
  },
};

export default config;
