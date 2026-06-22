import { useNavigation } from "@react-navigation/native";
import React from "react";
import {
    Image,
    ScrollView,
    StyleSheet,
    Text,
    View
} from "react-native";

export default function AnalisisRiesgoGlucosaScreen() {
  const navigation = useNavigation<any>();

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.headerTitle}>Evaluación de Riesgo</Text>

      {/* Tarjeta Principal */}
      <View style={styles.card}>
        <View style={styles.circleNivel}>
          <Text style={styles.riesgoNivel}>Bajo</Text>
        </View>
        <Text style={styles.riesgoLabel}>Riesgo de Hipertensión</Text>
        <Text style={styles.riesgoFecha}>Último análisis hace 2 días</Text>
      </View>

      {/* Factores Principales */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Factores Principales</Text>
        <Text style={styles.subTitle}>Qué influye en tu resultado</Text>
        {[
          { label: "IMC", val: "Normal", color: "#16A34A" },
          { label: "Antecedentes familiares", val: "Alto", color: "#DC2626" },
          { label: "Consumo de sal", val: "Normal", color: "#16A34A" },
          { label: "Actividad física", val: "Alta", color: "#16A34A" },
        ].map((item, i) => (
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
          <Text style={styles.sectionTitle}>Recomendaciones</Text>
          <Image
            source={require("../assets/imagenes/corazon.png")}
            style={styles.icono}
          />
        </View>
        <Text style={styles.exitoText}>¡Sigue así!</Text>
        <Text style={styles.checkItem}>
          ✓ Tus hábitos actuales ayudan a mantener un bajo riesgo de
          hipertensión.
        </Text>
        <Text style={styles.checkItem}>
          ✓ Continúa realizando actividad física, manteniendo una alimentación
          equilibrada y monitoreando tu salud periódicamente.
        </Text>
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
  screen: { flex: 1, backgroundColor: "#f7f7f7" },
  contentContainer: { padding: 20, paddingBottom: 100 },
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
  circleNivel: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: "#16A34A",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 10,
  },
  riesgoNivel: { fontSize: 28, fontWeight: "bold", color: "#16A34A" },
  riesgoLabel: {
    fontSize: 18,
    color: "#16A34A",
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
  headerRecomendacion: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  icono: { width: 50, height: 50 },
  exitoText: {
    color: "#16A34A",
    fontWeight: "bold",
    textAlign: "center",
    marginVertical: 10,
  },
  checkItem: { marginVertical: 6, fontSize: 14, color: "#444" },
  historialRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
});
