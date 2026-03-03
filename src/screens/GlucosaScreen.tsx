import { useNavigation } from "@react-navigation/native";
import React, { useMemo } from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import pancreasFeliz from "../assets/imagenes/pancreas_feliz.png";
import pancreasSerio from "../assets/imagenes/pancreas_serio.png";
import pancreasTriste from "../assets/imagenes/pancreas_tite.png";
import { HistorialGlucosaContent } from "./HistorialGlucosaScreen";

function fmtHoyAyer(iso: string) {
  const d = new Date(iso);
  const hoy = new Date();
  const ayer = new Date();
  ayer.setDate(hoy.getDate() - 1);

  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");

  if (same(d, hoy)) return `Hoy ${hh}:${mm}`;
  if (same(d, ayer)) return `Ayer ${hh}:${mm}`;
  return d.toLocaleString();
}

type LecturaGlucosa = {
  id: string;
  mgdl: number;
  measured_at: string;
  nota?: string;
};

export default function GlucosaScreen() {
  const navigation = useNavigation<any>();

  const lecturas: LecturaGlucosa[] = [
    {
      id: "g1",
      mgdl: 70,
      measured_at: new Date().toISOString(),
      nota: "Antes de comer",
    },
    {
      id: "g2",
      mgdl: 120,
      measured_at: new Date(Date.now() - 86400000).toISOString(),
      nota: "Dos horas después de comer",
    },
    {
      id: "g3",
      mgdl: 65,
      measured_at: new Date(Date.now() - 2 * 86400000).toISOString(),
      nota: "Dos horas después de comer",
    },
  ];

  const evaluacion = useMemo(() => {
    if (lecturas.length === 0) {
      return { estado: "serio" as const, score: 50, color: "#FFC107", avg: 0 };
    }

    const avg = Math.round(
      lecturas.reduce((acc, l) => acc + l.mgdl, 0) / lecturas.length,
    );

    if (avg < 100) {
      return { estado: "feliz" as const, score: 100, color: "#4CAF50", avg };
    }

    if (avg <= 140) {
      return { estado: "serio" as const, score: 75, color: "#FFC107", avg };
    }

    return { estado: "triste" as const, score: 40, color: "#F44336", avg };
  }, []);

  const pancreasImg =
    evaluacion.estado === "feliz"
      ? pancreasFeliz
      : evaluacion.estado === "serio"
        ? pancreasSerio
        : pancreasTriste;
  const lectura70 = lecturas[0];
  const lectura120 = lecturas[1];

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.container, { paddingBottom: 150 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Mis Niveles de Glucosa</Text>
        <Text style={styles.subtitle}>Monitoreo diario</Text>

        <View style={styles.topRow}>
          <View style={styles.leftCol}>
            <Text style={styles.muted}>Promedio</Text>

            <Text style={styles.bigValue}>{lectura70?.mgdl ?? 0} mg/dL</Text>
            <Text style={styles.italicHint}>
              {lectura70?.nota ?? "Antes de comer"}
            </Text>

            <View style={{ height: 16 }} />

            <Text style={styles.bigValue}>{lectura120?.mgdl ?? 0} mg/dL</Text>
            <Text style={styles.italicHint}>
              {lectura120?.nota ?? "Dos horas después de comer"}
            </Text>
          </View>

          <View style={styles.rightCol}>
            <Text style={styles.muted}>Tendencia</Text>
            <Text style={styles.trendGood}>Bien</Text>
            <Text style={styles.trendHint}>últimos 7 días</Text>
          </View>
        </View>
      </View>

      <View style={styles.cardBig}>
        <View style={styles.healthLeft}>
          <View style={[styles.circle, { borderColor: evaluacion.color }]}>
            <Text style={[styles.scoreText, { color: evaluacion.color }]}>
              {evaluacion.score}
            </Text>
          </View>
          <Text style={styles.scoreLabel}>Puntuación</Text>
        </View>

        <View style={styles.healthRight}>
          <Image
            source={pancreasImg}
            style={styles.pancreasImage}
            resizeMode="contain"
          />
        </View>
      </View>

      <Text style={styles.sectionTitle}>Lecturas Recientes</Text>

      {lecturas.map((m) => (
        <View key={m.id} style={styles.recentCard}>
          <Text style={styles.recentValue}>{m.mgdl} mg/dL</Text>
          <Text style={styles.recentDate}>{fmtHoyAyer(m.measured_at)}</Text>

          <View style={{ flex: 1 }} />

          <Text style={styles.recentHintRight}>últimos 7 días</Text>

          <View style={{ height: 26 }} />

          {m.nota ? <Text style={styles.recentNote}>{m.nota}</Text> : null}
        </View>
      ))}
      {lecturas.map((m) => (
        <View key={m.id} style={styles.recentCard}>
          <Text style={styles.recentValue}>{m.mgdl} mg/dL</Text>
          <Text style={styles.recentDate}>{fmtHoyAyer(m.measured_at)}</Text>

          <View style={{ flex: 1 }} />

          <Text style={styles.recentHintRight}>últimos 7 días</Text>

          <View style={{ height: 26 }} />

          {m.nota ? <Text style={styles.recentNote}>{m.nota}</Text> : null}
        </View>
      ))}

      <HistorialGlucosaContent />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f7f7f7" },
  container: { padding: 16, backgroundColor: "#f7f7f7" },

  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },

  title: { fontSize: 18, fontWeight: "bold" },
  subtitle: { fontSize: 14, color: "#555", marginTop: 2 },

  topRow: {
    flexDirection: "row",
    marginTop: 18,
    alignItems: "flex-start",
    justifyContent: "space-between",
  },

  leftCol: { flex: 1, paddingRight: 10 },
  rightCol: { width: 140, alignItems: "flex-start" },

  muted: { fontSize: 14, color: "#999" },

  bigValue: { fontSize: 20, fontWeight: "bold", marginTop: 8 },
  italicHint: {
    fontSize: 12,
    color: "#888",
    fontStyle: "italic",
    marginTop: 4,
  },

  trendGood: { fontSize: 20, fontWeight: "bold", color: "green", marginTop: 8 },
  trendHint: { fontSize: 12, color: "#888", fontStyle: "italic", marginTop: 4 },

  cardBig: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    elevation: 2,
    alignItems: "center",
  },

  healthLeft: { flex: 1, alignItems: "center" },
  healthRight: { flex: 1, alignItems: "center" },

  circle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 5,
    alignItems: "center",
    justifyContent: "center",
  },

  scoreText: { fontSize: 26, fontWeight: "bold" },
  scoreLabel: { marginTop: 10, fontSize: 15, color: "#555" },

  pancreasImage: { width: 160, height: 110 },

  primaryBtn: {
    backgroundColor: "#007AFF",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 16,
    elevation: 2,
  },
  primaryBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 6,
    marginBottom: 10,
  },

  recentCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    minHeight: 160,
  },

  recentValue: { fontSize: 22, fontWeight: "bold" },
  recentDate: { fontSize: 14, color: "#999", marginTop: 10 },

  recentHintRight: {
    textAlign: "right",
    color: "#888",
    fontStyle: "italic",
    marginTop: -10,
  },

  recentNote: { fontSize: 14, color: "#888", fontStyle: "italic" },
});
