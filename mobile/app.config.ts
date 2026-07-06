// Expo app config — reads environment variables from .env at build time.
// Required for EAS Build to inject EXPO_PUBLIC_* variables into the bundle.

const config = {
  name: "Project 101",
  slug: "project-101",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "dark",
  splash: {
    image: "./assets/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#0f172a",
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.project101.app",
  },
  android: {
    package: "com.project101.app",
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/android-icon-foreground.png",
      backgroundImage: "./assets/android-icon-background.png",
      monochromeImage: "./assets/android-icon-monochrome.png",
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    favicon: "./assets/favicon.png",
  },
  extra: {
    eas: {
      projectId: "750f12b9-cec2-48a5-9a21-a5f61ec48cba",
    },
  },
  plugins: [
    "expo-secure-store",
  ],
};

export default config;
