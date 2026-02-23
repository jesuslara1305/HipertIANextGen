import React from "react";
import { StyleSheet, Text, View } from "react-native";

export default function MedicionScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pantalla de Medición</Text>
      <Text style={styles.subtitle}>
        Aquí irá el formulario para agregar presión.
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
