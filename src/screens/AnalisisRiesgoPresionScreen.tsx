import { useNavigation } from "@react-navigation/native";
import React from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";

export default function AnalisisRiesgoPresionScreen() {
  const navigation = useNavigation<any>();

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.headerTitle}>Evaluación de Riesgo</Text>

      {/* Tarjeta Principal de Riesgo */}
      <View style={styles.card}>
        <Text style={styles.riesgoNivel}>Alto</Text>
        <Text style={styles.riesgoLabel}>Riesgo de Hipertensión</Text>
        <Text style={styles.riesgoFecha}>Último análisis hace 2 días</Text>
      </View>

      {/* Factores Principales */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Factores Principales</Text>
        <Text style={styles.subTitle}>Qué influye en tu resultado</Text>

        <View style={styles.factorRow}>
          <Text>IMC</Text>
          <Text style={styles.alto}>Alto</Text>
        </View>
        <View style={styles.factorRow}>
          <Text>Antecedentes familiares</Text>
          <Text style={styles.alto}>Alto</Text>
        </View>
        <View style={styles.factorRow}>
          <Text>Consumo de sal</Text>
          <Text style={styles.moderado}>Moderado</Text>
        </View>
        <View style={styles.factorRow}>
          <Text>Actividad física</Text>
          <Text style={styles.moderado}>Moderado</Text>
        </View>
      </View>

      {/* Recomendaciones */}
      <View style={styles.card}>
        <View style={styles.headerRecomendacion}>
          <Text style={styles.sectionTitle}>Recomendaciones</Text>
          <Image
            source={require("../assets/imagenes/lista.png")}
            style={styles.icono}
          />
        </View>
        <Text style={styles.subTitle}>En base a tus resultados</Text>
        {[
          "Reducir consumo de sal",
          "Incrementar actividad física",
          "Mantener un peso saludable",
          "Control periódico de presión",
        ].map((rec, i) => (
          <Text key={i} style={styles.checkItem}>
            ✓ {rec}
          </Text>
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
    paddingBottom: 100, // Esto soluciona el scroll cortado al final
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
    color: "#DC2626",
    textAlign: "center",
  },
  riesgoLabel: {
    fontSize: 18,
    color: "#DC2626",
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
  subTitle: { fontSize: 12, color: "#999", marginBottom: 15 },
  factorRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  alto: { color: "#DC2626", fontWeight: "bold" },
  moderado: { color: "#D97706", fontWeight: "bold" },
  headerRecomendacion: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  icono: { width: 40, height: 40 },
  checkItem: { marginVertical: 6, fontSize: 14 },
  historialRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
});
