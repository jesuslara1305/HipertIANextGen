import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import React from "react";
import { Image, StyleSheet, TouchableOpacity } from "react-native";

import InicioStack from "../navigation/InicioStack";
import MedicionStack from "../navigation/MedicionStack";
import AjustesScreen from "../screens/AjustesScreen";
import ChatScreen from "../screens/ChatScreen";

import iconAjustes from "../assets/imagenes/ajustes.png";
import iconBauma from "../assets/imagenes/baumanometro.png";
import iconChat from "../assets/imagenes/chat.png";
import iconInicio from "../assets/imagenes/inicio.png";

const iconShare = require("../assets/iconos/share.png");

export type BottomTabParamList = {
  Inicio: undefined;
  Historial: undefined;
  Medicion: undefined;
  Chat: undefined;
  Ajustes: undefined;
};

const Tab = createBottomTabNavigator<BottomTabParamList>();

const BotonFlotante = ({ onPress, accessibilityState }: any) => {
  const focused = accessibilityState?.selected;

  return (
    <TouchableOpacity style={styles.botonFlotante} onPress={onPress}>
      <Image
        source={iconBauma}
        style={{
          width: 36,
          height: 36,
          tintColor: focused ? "#007AFF" : "#aaa",
        }}
        resizeMode="contain"
      />
    </TouchableOpacity>
  );
};

export default function BottomTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        headerTitleAlign: "center",
        headerStyle: { backgroundColor: "#f7f7f7" },
        headerTitleStyle: { color: "#333", fontWeight: "bold" },

        tabBarShowLabel: true,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: "#007AFF",
        tabBarInactiveTintColor: "#aaa",
      }}
    >
      <Tab.Screen
        name="Inicio"
        component={InicioStack}
        options={{
          headerShown: false,
          title: "Inicio",
          tabBarIcon: ({ color }) => (
            <Image
              source={iconInicio}
              style={{ width: 24, height: 24, tintColor: color }}
              resizeMode="contain"
            />
          ),
        }}
      />

      <Tab.Screen
        name="Medicion"
        component={MedicionStack}
        options={{
          title: "Medición",
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <Image
              source={iconBauma}
              style={{ width: 24, height: 24, tintColor: color }}
              resizeMode="contain"
            />
          ),

          headerRight: () => (
            <TouchableOpacity
              onPress={() => {}}
              style={{ paddingHorizontal: 14 }}
            >
              <Image
                source={iconShare}
                style={{ width: 22, height: 22, tintColor: "#007AFF" }}
                resizeMode="contain"
              />
            </TouchableOpacity>
          ),
        }}
      />

      <Tab.Screen
        name="Chat"
        component={ChatScreen}
        options={{
          title: "Chat",
          tabBarIcon: ({ color }) => (
            <Image
              source={iconChat}
              style={{ width: 24, height: 24, tintColor: color }}
              resizeMode="contain"
            />
          ),
        }}
      />

      <Tab.Screen
        name="Ajustes"
        component={AjustesScreen}
        options={{
          title: "Ajustes",
          tabBarIcon: ({ color }) => (
            <Image
              source={iconAjustes}
              style={{ width: 24, height: 24, tintColor: color }}
              resizeMode="contain"
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: "absolute",
    bottom: 0,
    left: 20,
    right: 20,
    elevation: 5,
    backgroundColor: "#fff",
    borderRadius: 20,
    height: 70,
    paddingBottom: 5,
  },
  botonFlotante: {
    top: -30,
    justifyContent: "center",
    alignItems: "center",
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#fff",
    borderWidth: 4,
    borderColor: "#007AFF",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 4,
    elevation: 8,
  },
});
