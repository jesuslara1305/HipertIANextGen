import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";

import MedicionScreen from "./MedicionScreen";
import MedidasScreen from "./MedidasScreen";
import PerfilScreen from "./PerfilScreen";
import PermisosScreen from "./PermisosScreen";
import SaludScreen from "./SaludScreen";

export type OnboardingStackParamList = {
  Perfil: undefined;
  Medidas: undefined;
  Salud: undefined;
  Medicion: undefined;
  Permisos: undefined;
};

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export default function OnboardingStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Perfil"
        component={PerfilScreen}
        options={{ title: "Tu perfil" }}
      />

      <Stack.Screen
        name="Medidas"
        component={MedidasScreen}
        options={{ title: "Medidas corporales" }}
      />

      <Stack.Screen
        name="Salud"
        component={SaludScreen}
        options={{ title: "Salud" }}
      />

      <Stack.Screen
        name="Medicion"
        component={MedicionScreen}
        options={{ title: "Medición" }}
      />

      <Stack.Screen
        name="Permisos"
        component={PermisosScreen}
        options={{ title: "Permisos y consentimiento" }}
      />
    </Stack.Navigator>
  );
}
