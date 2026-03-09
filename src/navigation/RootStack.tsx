import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";

import LoginScreen from "../screens/LoginScreen";
import MiPerfilScreen from "../screens/MiPerfilScreen";
import RegisterScreen from "../screens/RegisterScreen";
import SplashScreen from "../screens/SplashScreen";
import BottomTabNavigator from "./BottomTabNavigator";

import OnboardingStack from "../screens/onboardings/OnboardingStack";

export type RootStackParamList = {
  SplashScreen: undefined;
  LoginScreen: undefined;
  RegisterScreen: undefined;
  Tabs: undefined;
  Onboarding: undefined;
  MiPerfilScreen: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SplashScreen" component={SplashScreen} />

      <Stack.Screen name="LoginScreen" component={LoginScreen} />

      <Stack.Screen name="RegisterScreen" component={RegisterScreen} />

      {/* flujo de onboarding */}
      <Stack.Screen name="Onboarding" component={OnboardingStack} />

      {/* app principal */}
      <Stack.Screen name="Tabs" component={BottomTabNavigator} />

      <Stack.Screen
        name="MiPerfilScreen"
        component={MiPerfilScreen}
        options={{ headerShown: true, title: "Mi perfil" }}
      />
    </Stack.Navigator>
  );
}
