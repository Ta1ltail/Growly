// AppNavigator — Bottom tab navigator with 5 primary tabs + a "More" drawer
// for all secondary screens (Habits, Goals, Achievements, Shop, Notes, etc.)

import React, { useState, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Modal,
  Animated,
  Platform,
} from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import TodayScreen from "../screens/TodayScreen";
import TrackerScreen from "../screens/TrackerScreen";
import DashboardScreen from "../screens/DashboardScreen";
import CalendarScreen from "../screens/CalendarScreen";
import StatsScreen from "../screens/StatsScreen";
import HabitsScreen from "../screens/HabitsScreen";
import GoalsScreen from "../screens/GoalsScreen";
import AchievementsScreen from "../screens/AchievementsScreen";
import ShopScreen from "../screens/ShopScreen";
import NotesScreen from "../screens/NotesScreen";
import ProfileScreen from "../screens/ProfileScreen";
import FriendsScreen from "../screens/FriendsScreen";
import LeaderboardScreen from "../screens/LeaderboardScreen";
import NotificationsScreen from "../screens/NotificationsScreen";
import SuggestionsScreen from "../screens/SuggestionsScreen";
import TemplatesScreen from "../screens/TemplatesScreen";
import SettingsScreen from "../screens/SettingsScreen";
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import OfflineScreen from "../screens/OfflineScreen";

const Tab = createBottomTabNavigator();

const PRIMARY_TABS = [
  { name: "Today", label: "Today", icon: "📅", screen: TodayScreen },
  { name: "Tracker", label: "Tracker", icon: "✅", screen: TrackerScreen },
  { name: "Dashboard", label: "Dashboard", icon: "📊", screen: DashboardScreen },
  { name: "Calendar", label: "Calendar", icon: "📆", screen: CalendarScreen },
  { name: "Stats", label: "Stats", icon: "📈", screen: StatsScreen },
] as const;

interface DrawerGroup {
  title: string;
  items: { name: string; label: string; icon: string }[];
}

const DRAWER_GROUPS: DrawerGroup[] = [
  {
    title: "Overview",
    items: [
      { name: "Profile", label: "Profile", icon: "👤" },
    ],
  },
  {
    title: "Manage",
    items: [
      { name: "Habits", label: "Habits", icon: "📋" },
      { name: "Goals", label: "Goals", icon: "🎯" },
      { name: "Templates", label: "Templates", icon: "📐" },
      { name: "Notes", label: "Notes", icon: "📝" },
    ],
  },
  {
    title: "Social",
    items: [
      { name: "Friends", label: "Friends", icon: "👥" },
      { name: "Leaderboard", label: "Leaderboard", icon: "🏆" },
      { name: "Notifications", label: "Notifications", icon: "🔔" },
      { name: "Suggestions", label: "Suggestions", icon: "💡" },
    ],
  },
  {
    title: "Collection",
    items: [
      { name: "Achievements", label: "Achievements", icon: "🏅" },
      { name: "Shop", label: "Shop", icon: "🛒" },
    ],
  },
  {
    title: "System",
    items: [
      { name: "Login", label: "Login", icon: "🔐" },
      { name: "Register", label: "Register", icon: "📝" },
      { name: "Settings", label: "Settings", icon: "⚙️" },
    ],
  },
];

const SCREEN_MAP: Record<string, React.ComponentType> = {
  Habits: HabitsScreen,
  Goals: GoalsScreen,
  Achievements: AchievementsScreen,
  Shop: ShopScreen,
  Notes: NotesScreen,
  Profile: ProfileScreen,
  Friends: FriendsScreen,
  Leaderboard: LeaderboardScreen,
  Notifications: NotificationsScreen,
  Suggestions: SuggestionsScreen,
  Templates: TemplatesScreen,
  Settings: SettingsScreen,
  Login: LoginScreen,
  Register: RegisterScreen,
  Offline: OfflineScreen,
};

export default function AppNavigator() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeScreen, setActiveScreen] = useState<string | null>(null);
  const { bottom } = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  function openDrawer() {
    setDrawerOpen(true);
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 12 }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }

  function closeDrawer() {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setDrawerOpen(false));
  }

  function navigateTo(screenName: string) {
    setActiveScreen(screenName);
    closeDrawer();
  }

  // Secondary screen view
  if (activeScreen) {
    const goBack = () => setActiveScreen(null);
    const renderScreen = () => {
      if (activeScreen === 'Login') return <LoginScreen onSuccess={goBack} />;
      if (activeScreen === 'Register') return <RegisterScreen onSuccess={goBack} />;
      const Comp = SCREEN_MAP[activeScreen];
      return Comp ? <Comp /> : null;
    };
    return (
      <View style={{ flex: 1, backgroundColor: "#0f172a" }}>
        <View style={{ paddingTop: Platform.OS === "ios" ? 54 : 36, paddingHorizontal: 16, paddingBottom: 8, flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Pressable
            onPress={goBack}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, padding: 8 })}
          >
            <Text style={{ fontSize: 20 }}>←</Text>
          </Pressable>
          <Text style={{ fontSize: 20, fontWeight: "700", color: "#f1f5f9" }}>{activeScreen}</Text>
        </View>
        {renderScreen()}
      </View>
    );
  }

  // Primary tab view with More FAB
  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>
              {PRIMARY_TABS.find((t) => t.name === route.name)?.icon ?? "❓"}
            </Text>
          ),
          tabBarActiveTintColor: "#3b82f6",
          tabBarInactiveTintColor: "#64748b",
          tabBarStyle: {
            backgroundColor: "#1e293b",
            borderTopColor: "#334155",
            borderTopWidth: 1,
            paddingBottom: bottom > 0 ? bottom : 24,
            paddingTop: 8,
            height: bottom > 0 ? 70 + bottom : 80,
          },
          tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        })}
      >
        {PRIMARY_TABS.map(({ name, label, screen: Screen }) => (
          <Tab.Screen
            key={name}
            name={name}
            component={Screen}
            options={{ tabBarLabel: label }}
          />
        ))}
      </Tab.Navigator>

      {/* More FAB */}
      <Pressable
        onPress={openDrawer}
        style={{
          position: "absolute",
          bottom: bottom > 0 ? bottom + 28 : 80,
          right: 16,
          backgroundColor: "#3b82f6",
          width: 48,
          height: 48,
          borderRadius: 24,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: "#3b82f6",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.4,
          shadowRadius: 12,
          elevation: 8,
        }}
      >
        <Text style={{ fontSize: 22 }}>☰</Text>
      </Pressable>

      {/* More drawer modal */}
      <Modal visible={drawerOpen} transparent animationType="none">
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.5)", opacity: fadeAnim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeDrawer} />
        </Animated.View>
        <Animated.View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: "#1e293b",
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingBottom: bottom > 0 ? bottom + 16 : 24,
            maxHeight: "80%",
            transform: [{ translateY: slideAnim.interpolate({ inputRange: [0, 1], outputRange: [600, 0] }) }],
          }}
        >
          <View style={{ alignItems: "center", paddingVertical: 12 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: "#334155" }} />
          </View>
          <Text style={{ color: "#94a3b8", fontSize: 13, fontWeight: "700", paddingHorizontal: 20, paddingBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>
            All sections
          </Text>
          <ScrollView style={{ paddingHorizontal: 12 }} showsVerticalScrollIndicator={false}>
            {DRAWER_GROUPS.map((group) => (
              <View key={group.title} style={{ marginBottom: 8 }}>
                <Text style={{ color: "#64748b", fontSize: 10, fontWeight: "700", paddingHorizontal: 8, paddingBottom: 6, paddingTop: 4, textTransform: "uppercase", letterSpacing: 1 }}>
                  {group.title}
                </Text>
                {group.items.map((item) => (
                  <Pressable
                    key={item.name}
                    onPress={() => navigateTo(item.name)}
                    style={({ pressed }) => ({
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      paddingVertical: 12,
                      paddingHorizontal: 12,
                      borderRadius: 12,
                      backgroundColor: pressed ? "#334155" : "transparent",
                    })}
                  >
                    <Text style={{ fontSize: 18 }}>{item.icon}</Text>
                    <Text style={{ color: "#cbd5e1", fontSize: 15, fontWeight: "500" }}>{item.label}</Text>
                  </Pressable>
                ))}
              </View>
            ))}
          </ScrollView>
        </Animated.View>
      </Modal>
    </View>
  );
}
