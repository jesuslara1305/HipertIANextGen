import { useNavigation } from "@react-navigation/native";
import React, { useMemo, useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { HistorialContent } from "../screens/HistorialScreen";

import caraFeliz from "../assets/imagenes/feliz.png";
import caraNeutro from "../assets/imagenes/neutro.png";
import caraTriste from "../assets/imagenes/triste.png";

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

type Medicion = {
  id: string;
  systolica: number;
  diastolica: number;
  measured_at: string;
};

export default function PresionArterialScreen() {
  const navigation = useNavigation<any>();

  const mediciones: Medicion[] = [
    {
      id: "1",
      systolica: 118,
      diastolica: 79,
      measured_at: new Date().toISOString(),
    },
    {
      id: "2",
      systolica: 122,
      diastolica: 81,
      measured_at: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: "3",
      systolica: 135,
      diastolica: 88,
      measured_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    },
  ];

  const [estadoSalud, setEstadoSalud] = useState<"feliz" | "neutro" | "triste">(
    "neutro",
  );
  const [puntuacion, setPuntuacion] = useState(0);

  const promedio = useMemo(() => {
    if (mediciones.length === 0) {
      setEstadoSalud("neutro");
      setPuntuacion(50);
      return { systolica: 0, diastolica: 0 };
    }

    const systolica = Math.round(
      mediciones.reduce((acc, m) => acc + m.systolica, 0) / mediciones.length,
    );
    const diastolica = Math.round(
      mediciones.reduce((acc, m) => acc + m.diastolica, 0) / mediciones.length,
    );

    if (systolica < 120 && diastolica < 80) {
      setEstadoSalud("feliz");
      setPuntuacion(95);
    } else if (systolica <= 140 && diastolica <= 90) {
      setEstadoSalud("neutro");
      setPuntuacion(75);
    } else {
      setEstadoSalud("triste");
      setPuntuacion(40);
    }

    return { systolica, diastolica };
  }, []);

  const ultimas = mediciones.slice(0, 3);

  const getCircleColor = () => {
    if (puntuacion >= 80) return "#4CAF50";
    if (puntuacion >= 60) return "#FFC107";
    return "#F44336";
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.container, { paddingBottom: 150 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Mi Presión Arterial</Text>
        <Text style={styles.subtitle}>Monitoreo diario</Text>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Promedio</Text>
            <Text style={styles.statValue}>
              {promedio.systolica}/{promedio.diastolica} mmHg
            </Text>
          </View>

          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Tendencia</Text>
            <Text style={[styles.statValue, { color: "green" }]}>Bien</Text>
            <Text style={styles.subinfo}>Últimos 7 días</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={styles.cardBig}
        activeOpacity={0.9}
        onPress={() => {}}
      >
        <View style={styles.healthLeft}>
          <View style={[styles.circle, { borderColor: getCircleColor() }]}>
            <Text style={[styles.scoreText, { color: getCircleColor() }]}>
              {puntuacion}
            </Text>
          </View>
          <Text style={styles.scoreLabel}>Puntuación</Text>
        </View>

        <View style={styles.healthRight}>
          <Image
            source={
              estadoSalud === "feliz"
                ? caraFeliz
                : estadoSalud === "neutro"
                  ? caraNeutro
                  : caraTriste
            }
            style={styles.heartImage}
            resizeMode="contain"
          />
        </View>
      </TouchableOpacity>

      <View style={styles.card}>
        <Text style={styles.title}>Lecturas Recientes</Text>

        {ultimas.map((m) => (
          <View key={m.id} style={styles.recentRow}>
            <Text style={styles.reading}>
              {m.systolica}/{m.diastolica} mmHg
            </Text>
            <Text style={styles.readingTime}>{fmtHoyAyer(m.measured_at)}</Text>
          </View>
        ))}
      </View>
      <View style={styles.card}>
        <Text style={styles.title}>Lecturas Recientes</Text>

        {ultimas.map((m) => (
          <View key={m.id} style={styles.recentRow}>
            <Text style={styles.reading}>
              {m.systolica}/{m.diastolica} mmHg
            </Text>
            <Text style={styles.readingTime}>{fmtHoyAyer(m.measured_at)}</Text>
          </View>
        ))}
      </View>

      {/* ✅ HISTORIAL DEBAJO */}
      <HistorialContent />
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
  scoreLabel: { marginTop: 4, fontSize: 15, color: "#555" },

  heartImage: { width: 130, height: 130 },

  title: { fontSize: 18, fontWeight: "bold" },
  subtitle: { fontSize: 14, color: "#555" },

  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },

  statBox: { flex: 1 },
  statLabel: { fontSize: 14, color: "#999" },
  statValue: { fontSize: 20, fontWeight: "bold", marginTop: 4 },
  subinfo: { fontSize: 12, color: "#888" },

  recentRow: {
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingVertical: 10,
  },
  reading: { fontSize: 16, fontWeight: "bold" },
  readingTime: { fontSize: 12, color: "#888" },

  primaryBtn: {
    backgroundColor: "#007AFF",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 16,
    elevation: 2,
  },
  primaryBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
});
