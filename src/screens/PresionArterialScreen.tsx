import { useFocusEffect, useNavigation } from "@react-navigation/native";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../../providers/AuthProvider";
import { HistorialContent } from "../screens/HistorialScreen";
import { supabase } from "../services/supabase";

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

export type MedicionPresion = {
  id: string;
  systolica: number;
  diastolica: number;
  measured_at: string;
};

export type CategoriaPresion = {
  label: "Normal" | "Ligeramente elevada" | "Elevada" | "Alta" | "Muy alta";
  bg: string;
  fg: string;
};

export function getCategoriaPresion(s: number, d: number): CategoriaPresion {
  if (s < 120 && d < 80) {
    return { label: "Normal", bg: "#DCFCE7", fg: "#166534" };
  }
  if (s >= 120 && s < 130 && d < 80) {
    return { label: "Ligeramente elevada", bg: "#E9F8D8", fg: "#3F6212" };
  }
  if ((s >= 130 && s < 140) || (d >= 80 && d < 90)) {
    return { label: "Elevada", bg: "#FEF9C3", fg: "#92400E" };
  }
  if (s >= 140 || d >= 90) {
    return { label: "Alta", bg: "#FFEDD5", fg: "#9A3412" };
  }
  return { label: "Muy alta", bg: "#FEE2E2", fg: "#991B1B" };
}

function getTrendInfo(s: number, d: number) {
  const cat = getCategoriaPresion(s, d);

  if (cat.label === "Normal") {
    return { text: "Bien", color: "#16A34A" };
  }
  if (cat.label === "Ligeramente elevada") {
    return { text: "Estable", color: "#CA8A04" };
  }
  if (cat.label === "Elevada") {
    return { text: "Atención", color: "#D97706" };
  }
  return { text: "Alta", color: "#DC2626" };
}

function getScore(s: number, d: number) {
  if (s < 120 && d < 80) return 95;
  if (s >= 120 && s < 130 && d < 80) return 85;
  if ((s >= 130 && s < 140) || (d >= 80 && d < 90)) return 70;
  if (s >= 140 || d >= 90) return 40;
  return 50;
}

export default function PresionArterialScreen() {
  const navigation = useNavigation<any>();
  const { session } = useAuth();

  const [loading, setLoading] = useState(true);
  const [mediciones, setMediciones] = useState<MedicionPresion[]>([]);

  const loadMediciones = useCallback(async () => {
    if (!session?.user?.id) {
      setMediciones([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from("bp_measurements")
      .select("id, systolica, diastolica, measured_at")
      .eq("user_id", session.user.id)
      .order("measured_at", { ascending: false });

    if (error) {
      console.log("bp_measurements load error:", error.message);
      setMediciones([]);
      setLoading(false);
      return;
    }

    const safeData: MedicionPresion[] = (data ?? []).map((m: any) => ({
      id: m.id,
      systolica: Number(m.systolica ?? 0),
      diastolica: Number(m.diastolica ?? 0),
      measured_at: m.measured_at,
    }));

    setMediciones(safeData);
    setLoading(false);
  }, [session?.user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadMediciones();
    }, [loadMediciones]),
  );

  const ultimos7 = useMemo(() => {
    const limite = new Date();
    limite.setDate(limite.getDate() - 7);

    return mediciones.filter((m) => new Date(m.measured_at) >= limite);
  }, [mediciones]);

  const promedio7 = useMemo(() => {
    if (ultimos7.length === 0) {
      return { systolica: 0, diastolica: 0 };
    }

    const systolica = Math.round(
      ultimos7.reduce((acc, m) => acc + m.systolica, 0) / ultimos7.length,
    );
    const diastolica = Math.round(
      ultimos7.reduce((acc, m) => acc + m.diastolica, 0) / ultimos7.length,
    );

    return { systolica, diastolica };
  }, [ultimos7]);

  const trend = useMemo(() => {
    if (ultimos7.length === 0) {
      return { text: "Sin datos", color: "#888" };
    }
    return getTrendInfo(promedio7.systolica, promedio7.diastolica);
  }, [ultimos7, promedio7]);

  const puntuacion = useMemo(() => {
    if (ultimos7.length === 0) return 0;
    return getScore(promedio7.systolica, promedio7.diastolica);
  }, [ultimos7, promedio7]);

  const estadoSalud = useMemo<"feliz" | "neutro" | "triste">(() => {
    if (puntuacion >= 85) return "feliz";
    if (puntuacion >= 60) return "neutro";
    return "triste";
  }, [puntuacion]);

  const ultimas3 = useMemo(() => mediciones.slice(0, 3), [mediciones]);

  const getCircleColor = () => {
    if (puntuacion >= 80) return "#4CAF50";
    if (puntuacion >= 60) return "#FFC107";
    return "#F44336";
  };

  const handleDelete = async (id: string) => {
    if (!session?.user?.id) return false;

    const { error } = await supabase
      .from("bp_measurements")
      .delete()
      .eq("id", id)
      .eq("user_id", session.user.id);

    if (error) {
      return false;
    }

    setMediciones((prev) => prev.filter((m) => m.id !== id));
    return true;
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
            {loading ? (
              <ActivityIndicator size="small" />
            ) : (
              <Text style={styles.statValue}>
                {promedio7.systolica}/{promedio7.diastolica} mmHg
              </Text>
            )}
          </View>

          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Tendencia</Text>
            {loading ? (
              <ActivityIndicator size="small" />
            ) : (
              <>
                <Text style={[styles.statValue, { color: trend.color }]}>
                  {trend.text}
                </Text>
                <Text style={styles.subinfo}>Últimos 7 días</Text>
              </>
            )}
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

        {loading ? (
          <Text style={styles.readingTime}>Cargando...</Text>
        ) : ultimas3.length === 0 ? (
          <Text style={styles.readingTime}>No hay mediciones registradas</Text>
        ) : (
          ultimas3.map((m) => (
            <View key={m.id} style={styles.recentRow}>
              <Text style={styles.reading}>
                {m.systolica}/{m.diastolica} mmHg
              </Text>
              <Text style={styles.readingTime}>
                {fmtHoyAyer(m.measured_at)}
              </Text>
            </View>
          ))
        )}
      </View>

      <HistorialContent
        items={mediciones}
        loading={loading}
        onDelete={handleDelete}
      />
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
});
