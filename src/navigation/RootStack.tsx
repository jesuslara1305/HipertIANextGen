import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";

import LoginScreen from "../screens/LoginScreen";
import MiPerfilScreen from "../screens/MiPerfilScreen";
import RegisterScreen from "../screens/RegisterScreen";
import SplashScreen from "../screens/SplashScreen";
import BottomTabNavigator from "./BottomTabNavigator";

export type RootStackParamList = {
  SplashScreen: undefined;
  LoginScreen: undefined;
  Tabs: undefined;
  RegisterScreen: undefined;
  MiPerfilScreen: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SplashScreen" component={SplashScreen} />
      <Stack.Screen name="LoginScreen" component={LoginScreen} />
      <Stack.Screen name="RegisterScreen" component={RegisterScreen} />
      <Stack.Screen name="Tabs" component={BottomTabNavigator} />
      <Stack.Screen
        name="MiPerfilScreen"
        component={MiPerfilScreen}
        options={{ headerShown: true, title: "Mi perfil" }}
      />
    </Stack.Navigator>
  );
}
