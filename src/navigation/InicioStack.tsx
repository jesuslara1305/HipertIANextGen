import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";

import GlucosaScreen from "../screens/GlucosaScreen";
import InicioScreen from "../screens/InicioScreen";
import PresionArterialScreen from "../screens/PresionArterialScreen";
import RegistroGlucosaManualScreen from "../screens/RegistroGlucosaManualScreen";
import RegistroPresionManualScreen from "../screens/RegistroPresionManualScreen";

const Stack = createNativeStackNavigator();

export default function InicioStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerTitleAlign: "center",
        headerStyle: { backgroundColor: "#f7f7f7" },
        headerTitleStyle: {
          color: "#111",
          fontWeight: "800",
        },
      }}
    >
      <Stack.Screen
        name="InicioHome"
        component={InicioScreen}
        options={{ title: "Inicio" }}
      />
      <Stack.Screen
        name="RegistroGlucosaManual"
        component={RegistroGlucosaManualScreen}
        options={{
          title: "Registro de glucosa",
          headerTitleStyle: { color: "#111", fontWeight: "800" },
        }}
      />
      <Stack.Screen
        name="PresionArterial"
        component={PresionArterialScreen}
        options={{
          title: "Presión Arterial",
          headerTitleStyle: { color: "#111", fontWeight: "800" },
        }}
      />
      <Stack.Screen
        name="Glucosa"
        component={GlucosaScreen}
        options={{ title: "Niveles de Glucosa" }}
      />
      <Stack.Screen
        name="RegistroPresionManual"
        component={RegistroPresionManualScreen}
        options={{
          title: "Presión de presión arterial",
          headerTitleStyle: { color: "#111", fontWeight: "800" },
        }}
      />
    </Stack.Navigator>
  );
}
