import { useNavigation, useRoute } from "@react-navigation/native";
import React from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";

export default function AnalisisRiesgoPresionScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  // Leemos los datos enviados desde PresionArterialScreen
  const nivelRiesgo = route.params?.nivelRiesgoParam || "Bajo";
  const fechaRiesgo = route.params?.fechaParam || "Último análisis hace 2 días";

  // Variables dinámicas para Factores y Recomendaciones
  let factores: { label: string; val: string; color: string }[] = [];
  let recomendaciones: string[] = [];
  let mensajeExito = "";

  if (nivelRiesgo === "Bajo") {
    mensajeExito = "¡Sigue así!";
    factores = [
      { label: "IMC", val: "Normal", color: "#16A34A" },
      { label: "Antecedentes familiares", val: "Alto", color: "#DC2626" },
      { label: "Consumo de sal", val: "Normal", color: "#16A34A" },
      { label: "Actividad física", val: "Alta", color: "#16A34A" },
    ];
    recomendaciones = [
      "Tus hábitos actuales ayudan a mantener un bajo riesgo de hipertensión",
      "Continúa realizando actividad física, manteniendo una alimentación equilibrada y monitoreando tu salud periódicamente.",
    ];
  } else {
    // Para riesgo Moderado y Alto
    factores = [
      { label: "IMC", val: "Alto", color: "#DC2626" },
      { label: "Antecedentes familiares", val: "Alto", color: "#DC2626" },
      { label: "Consumo de sal", val: "Moderado", color: "#D97706" },
      { label: "Actividad física", val: "Moderado", color: "#D97706" },
    ];
    recomendaciones = [
      "Reducir consumo de sal",
      "Incrementar actividad física",
      "Mantener un peso saludable",
      "Control periódico de presión arterial",
    ];
  }

  // Estilos dinámicos para la tarjeta principal
  const getColorRiesgo = () => {
    if (nivelRiesgo === "Bajo") return "#16A34A"; // Verde
    if (nivelRiesgo === "Moderado") return "#D97706"; // Naranja
    return "#DC2626"; // Rojo
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.headerTitle}>Evaluación de Riesgo</Text>

      {/* Tarjeta Principal de Riesgo */}
      <View style={styles.card}>
        <Text style={[styles.riesgoNivel, { color: getColorRiesgo() }]}>
          {nivelRiesgo}
        </Text>
        <Text style={[styles.riesgoLabel, { color: getColorRiesgo() }]}>
          Riesgo de Hipertensión
        </Text>
        <Text style={styles.riesgoFecha}>{fechaRiesgo}</Text>
      </View>

      {/* Factores Principales */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Factores Principales</Text>
        <Text style={styles.subTitle}>Qué influye en tu resultado</Text>

        {factores.map((item, i) => (
          <View key={i} style={styles.factorRow}>
            <Text>{item.label}</Text>
            <Text style={{ color: item.color, fontWeight: "bold" }}>
              {item.val}
            </Text>
          </View>
        ))}
      </View>

      {/* Recomendaciones */}
      <View style={styles.card}>
        <View style={styles.headerRecomendacion}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Recomendaciones</Text>
            <Text style={styles.subTitle}>En base a tus resultados</Text>
          </View>
          <Image
            source={require("../assets/imagenes/lista.png")}
            style={styles.icono}
            resizeMode="contain"
          />
        </View>

        {/* Mensaje de éxito exclusivo para Riesgo Bajo */}
        {mensajeExito ? (
          <Text style={styles.mensajeExito}>{mensajeExito}</Text>
        ) : null}

        {/* Lista de recomendaciones dinámica */}
        {recomendaciones.map((rec, i) => (
          <View key={i} style={styles.itemContainer}>
            <Text style={styles.checkIcon}>✓</Text>
            <Text style={styles.checkItem}>{rec}</Text>
          </View>
        ))}
      </View>

      {/* Historial */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Historial de análisis</Text>
        <Text style={styles.subTitle}>Tus resultados anteriores</Text>
        {[
          { date: "08/06/2026", res: "Riesgo alto", color: "#DC2626" },
          { date: "01/06/2026", res: "Riesgo moderado", color: "#D97706" },
          { date: "24/05/2026", res: "Riesgo moderado", color: "#D97706" },
          { date: "17/05/2026", res: "Riesgo bajo", color: "#16A34A" },
        ].map((item, i) => (
          <View key={i} style={styles.historialRow}>
            <Text>{item.date}</Text>
            <Text style={{ color: item.color, fontWeight: "600" }}>
              {item.res}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f7f7f7",
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginVertical: 20,
    textAlign: "center",
  },
  card: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
  },
  riesgoNivel: {
    fontSize: 40,
    fontWeight: "bold",
    textAlign: "center",
  },
  riesgoLabel: {
    fontSize: 18,
    textAlign: "center",
    fontWeight: "600",
  },
  riesgoFecha: {
    fontSize: 12,
    color: "#888",
    textAlign: "center",
    marginTop: 5,
  },
  sectionTitle: { fontSize: 18, fontWeight: "bold" },
  subTitle: { fontSize: 12, color: "#999", marginBottom: 15, marginTop: 4 },
  factorRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#fafafa",
  },
  headerRecomendacion: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  icono: { width: 50, height: 50 },
  mensajeExito: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#16A34A",
    textAlign: "center",
    marginBottom: 15,
  },
  itemContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 8,
    paddingRight: 10,
  },
  checkIcon: {
    color: "#16A34A",
    fontSize: 18,
    fontWeight: "bold",
    marginRight: 10,
  },
  checkItem: {
    fontSize: 14,
    color: "#333",
    flex: 1,
  },
  historialRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
});
