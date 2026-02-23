import React from "react";
import { StyleSheet, Text, View } from "react-native";

export default function AjustesScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pantalla de Ajustes</Text>
      <Text style={styles.subtitle}>
        Aquí irá la configuración del usuario.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f7f7f7",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
});
