import { useFocusEffect, useNavigation } from "@react-navigation/native";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAuth } from "../../providers/AuthProvider";
import pancreasFeliz from "../assets/imagenes/pancreas_feliz.png";
import pancreasSerio from "../assets/imagenes/pancreas_serio.png";
import pancreasTriste from "../assets/imagenes/pancreas_tite.png";
import { supabase } from "../services/supabase";
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

export type MedicionGlucosa = {
  id: string;
  ayunas: number | null;
  postprandial: number | null;
  measured_at: string;
};

export type CategoriaGlucosa = {
  label: "Normal" | "Ligeramente elevada" | "Elevada" | "Alta";
  bg: string;
  fg: string;
};

export function getCategoriaGlucosa(
  ayunoAvg: number,
  postAvg: number,
): CategoriaGlucosa {
  const ayunoLevel =
    ayunoAvg >= 126 ? 4 : ayunoAvg >= 100 ? 3 : ayunoAvg >= 70 ? 1 : 2;
  const postLevel =
    postAvg >= 200 ? 4 : postAvg >= 140 ? 3 : postAvg >= 70 ? 1 : 2;

  const worst = Math.max(ayunoLevel, postLevel);

  if (worst === 1) return { label: "Normal", bg: "#DCFCE7", fg: "#166534" };
  if (worst === 2)
    return { label: "Ligeramente elevada", bg: "#E9F8D8", fg: "#3F6212" };
  if (worst === 3) return { label: "Elevada", bg: "#FEF9C3", fg: "#92400E" };
  return { label: "Alta", bg: "#FFEDD5", fg: "#9A3412" };
}

function getTrendInfo(ayunoAvg: number, postAvg: number) {
  const cat = getCategoriaGlucosa(ayunoAvg, postAvg);

  if (cat.label === "Normal") return { text: "Bien", color: "#16A34A" };
  if (cat.label === "Ligeramente elevada")
    return { text: "Estable", color: "#CA8A04" };
  if (cat.label === "Elevada") return { text: "Atención", color: "#D97706" };
  return { text: "Alta", color: "#DC2626" };
}

function getScoreGlucosa(ayunoAvg: number, postAvg: number) {
  const cat = getCategoriaGlucosa(ayunoAvg, postAvg);

  if (cat.label === "Normal") return 100;
  if (cat.label === "Ligeramente elevada") return 85;
  if (cat.label === "Elevada") return 70;
  return 40;
}

function getNota(item: MedicionGlucosa) {
  if (item.ayunas !== null && item.postprandial !== null) {
    return "Ayuno / Postprandial";
  }
  if (item.ayunas !== null) {
    return "Antes de comer";
  }
  if (item.postprandial !== null) {
    return "Dos horas después de comer";
  }
  return "";
}

function getValorPrincipal(item: MedicionGlucosa) {
  if (item.ayunas !== null && item.postprandial !== null) {
    return `${item.ayunas}/${item.postprandial} mg/dL`;
  }
  if (item.ayunas !== null) {
    return `${item.ayunas} mg/dL`;
  }
  if (item.postprandial !== null) {
    return `${item.postprandial} mg/dL`;
  }
  return "--";
}

export default function GlucosaScreen() {
  const navigation = useNavigation<any>();
  const { session } = useAuth();

  const [loading, setLoading] = useState(true);
  const [lecturas, setLecturas] = useState<MedicionGlucosa[]>([]);

  const loadLecturas = useCallback(async () => {
    if (!session?.user?.id) {
      setLecturas([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from("glucose_measurements")
      .select("id, ayunas, postprandial, measured_at")
      .eq("user_id", session.user.id)
      .order("measured_at", { ascending: false });

    if (error) {
      console.log("glucose_measurements load error:", error.message);
      setLecturas([]);
      setLoading(false);
      return;
    }

    const safeData: MedicionGlucosa[] = (data ?? []).map((m: any) => ({
      id: m.id,
      ayunas:
        m.ayunas !== null && m.ayunas !== undefined ? Number(m.ayunas) : null,
      postprandial:
        m.postprandial !== null && m.postprandial !== undefined
          ? Number(m.postprandial)
          : null,
      measured_at: m.measured_at,
    }));

    setLecturas(safeData);
    setLoading(false);
  }, [session?.user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadLecturas();
    }, [loadLecturas]),
  );

  const ultimos7 = useMemo(() => {
    const limite = new Date();
    limite.setDate(limite.getDate() - 7);
    return lecturas.filter((m) => new Date(m.measured_at) >= limite);
  }, [lecturas]);

  const promedioAyunas = useMemo(() => {
    const vals = ultimos7
      .map((m) => m.ayunas)
      .filter((v): v is number => v !== null && v !== undefined);

    if (vals.length === 0) return 0;
    return Math.round(vals.reduce((acc, v) => acc + v, 0) / vals.length);
  }, [ultimos7]);

  const promedioPost = useMemo(() => {
    const vals = ultimos7
      .map((m) => m.postprandial)
      .filter((v): v is number => v !== null && v !== undefined);

    if (vals.length === 0) return 0;
    return Math.round(vals.reduce((acc, v) => acc + v, 0) / vals.length);
  }, [ultimos7]);

  const trend = useMemo(() => {
    if (ultimos7.length === 0) return { text: "Sin datos", color: "#888" };
    return getTrendInfo(promedioAyunas, promedioPost);
  }, [ultimos7, promedioAyunas, promedioPost]);

  const puntuacion = useMemo(() => {
    if (ultimos7.length === 0) return 0;
    return getScoreGlucosa(promedioAyunas, promedioPost);
  }, [ultimos7, promedioAyunas, promedioPost]);

  const estado = useMemo<"feliz" | "serio" | "triste">(() => {
    if (puntuacion >= 90) return "feliz";
    if (puntuacion >= 60) return "serio";
    return "triste";
  }, [puntuacion]);

  const colorScore = useMemo(() => {
    if (puntuacion >= 90) return "#4CAF50";
    if (puntuacion >= 60) return "#FFC107";
    return "#F44336";
  }, [puntuacion]);

  const pancreasImg =
    estado === "feliz"
      ? pancreasFeliz
      : estado === "serio"
        ? pancreasSerio
        : pancreasTriste;

  const ultimas3 = useMemo(() => lecturas.slice(0, 3), [lecturas]);

  const handleDelete = async (id: string) => {
    if (!session?.user?.id) return false;

    const { error } = await supabase
      .from("glucose_measurements")
      .delete()
      .eq("id", id)
      .eq("user_id", session.user.id);

    if (error) {
      return false;
    }

    setLecturas((prev) => prev.filter((m) => m.id !== id));
    return true;
  };

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

            {loading ? (
              <ActivityIndicator size="small" />
            ) : (
              <>
                <Text style={styles.bigValue}>{promedioAyunas} mg/dL</Text>
                <Text style={styles.italicHint}>Antes de comer</Text>

                <View style={{ height: 16 }} />

                <Text style={styles.bigValue}>{promedioPost} mg/dL</Text>
                <Text style={styles.italicHint}>
                  Dos horas después de comer
                </Text>
              </>
            )}
          </View>

          <View style={styles.rightCol}>
            <Text style={styles.muted}>Tendencia</Text>
            {loading ? (
              <ActivityIndicator size="small" />
            ) : (
              <>
                <Text style={[styles.trendGood, { color: trend.color }]}>
                  {trend.text}
                </Text>
                <Text style={styles.trendHint}>últimos 7 días</Text>
              </>
            )}
          </View>
        </View>
      </View>

      <View style={styles.cardBig}>
        <View style={styles.healthLeft}>
          <View style={[styles.circle, { borderColor: colorScore }]}>
            <Text style={[styles.scoreText, { color: colorScore }]}>
              {puntuacion}
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

      {loading ? (
        <View style={styles.recentCard}>
          <Text style={styles.recentDate}>Cargando...</Text>
        </View>
      ) : ultimas3.length === 0 ? (
        <View style={styles.recentCard}>
          <Text style={styles.recentDate}>No hay mediciones registradas</Text>
        </View>
      ) : (
        ultimas3.map((m) => (
          <View key={m.id} style={styles.recentCard}>
            <Text style={styles.recentValue}>{getValorPrincipal(m)}</Text>
            <Text style={styles.recentDate}>{fmtHoyAyer(m.measured_at)}</Text>

            <View style={{ flex: 1 }} />

            <Text style={styles.recentHintRight}>últimos 7 días</Text>

            <View style={{ height: 26 }} />

            {getNota(m) ? (
              <Text style={styles.recentNote}>{getNota(m)}</Text>
            ) : null}
          </View>
        ))
      )}

      <HistorialGlucosaContent
        items={lecturas}
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

  trendGood: { fontSize: 20, fontWeight: "bold", marginTop: 8 },
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
