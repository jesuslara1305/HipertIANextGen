import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type Punto = { label: string; a: number; p: number };

type Categoria = {
  label: "Normal" | "Ligeramente elevada" | "Elevada" | "Alta";
  bg: string;
  fg: string;
};

type MedicionGlucosa = {
  id: string;
  ayuno: number; // mg/dL
  postprandial: number; // mg/dL
  measured_at: string;
};

const MOCK_GLUCO: MedicionGlucosa[] = [
  {
    id: "g1",
    ayuno: 70,
    postprandial: 120,
    measured_at: new Date().toISOString(),
  },
  {
    id: "g2",
    ayuno: 78,
    postprandial: 135,
    measured_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "g3",
    ayuno: 85,
    postprandial: 142,
    measured_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: "g4",
    ayuno: 92,
    postprandial: 155,
    measured_at: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: "g5",
    ayuno: 76,
    postprandial: 128,
    measured_at: new Date(Date.now() - 4 * 86400000).toISOString(),
  },
  {
    id: "g6",
    ayuno: 88,
    postprandial: 160,
    measured_at: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: "g7",
    ayuno: 96,
    postprandial: 170,
    measured_at: new Date(Date.now() - 6 * 86400000).toISOString(),
  },
  {
    id: "g8",
    ayuno: 82,
    postprandial: 140,
    measured_at: new Date(Date.now() - 7 * 86400000).toISOString(),
  },
];

function getCategoriaGlucosa(ayunoAvg: number, postAvg: number): Categoria {
  const worst = Math.max(
    ayunoAvg >= 126 ? 3 : ayunoAvg >= 100 ? 2 : 1,
    postAvg >= 200 ? 3 : postAvg >= 140 ? 2 : 1,
  );

  if (worst === 1) return { label: "Normal", bg: "#DCFCE7", fg: "#166534" };
  if (worst === 2) return { label: "Elevada", bg: "#FEF9C3", fg: "#92400E" };
  return { label: "Alta", bg: "#FFEDD5", fg: "#9A3412" };
}

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

const DualBarChartGlucosa = ({
  data,
  height = 200,
  colorA = "#10B981",
  colorP = "#F59E0B",
}: {
  data: Punto[];
  height?: number;
  colorA?: string;
  colorP?: string;
}) => {
  const max = useMemo(
    () => Math.max(1, ...data.flatMap((d) => [d.a, d.p])),
    [data],
  );
  const TOP_PAD = 18;
  const areaHeight = height - 28 - TOP_PAD;

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: "#f7f7f7" }}
      data={data}
      keyExtractor={(_, i) => String(i)}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: 12,
        paddingBottom: 8,
        paddingTop: TOP_PAD,
      }}
      renderItem={({ item: d }) => {
        const ha = Math.max(8, (d.a / max) * areaHeight);
        const hp = Math.max(8, (d.p / max) * areaHeight);

        return (
          <View style={[styles.groupSlot, { height }]}>
            <View style={[styles.barsRow, { height: areaHeight }]}>
              <View style={styles.barWrap}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: ha,
                      backgroundColor: colorA,
                      borderWidth: 1,
                      borderColor: "rgba(0,0,0,0.06)",
                    },
                  ]}
                />
                <Text style={[styles.valueOnBar, { bottom: ha + 2 }]}>
                  {d.a}
                </Text>
              </View>

              <View style={styles.barWrap}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: hp,
                      backgroundColor: colorP,
                      borderWidth: 1,
                      borderColor: "rgba(0,0,0,0.06)",
                    },
                  ]}
                />
                <Text style={[styles.valueOnBar, { bottom: hp + 2 }]}>
                  {d.p}
                </Text>
              </View>
            </View>

            <Text style={styles.groupLabel} numberOfLines={1}>
              {d.label}
            </Text>
          </View>
        );
      }}
    />
  );
};

export function HistorialGlucosaContent({
  embedded = true,
}: {
  embedded?: boolean;
}) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<MedicionGlucosa[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setItems(MOCK_GLUCO);
      setLoading(false);
    }, 400);
    return () => clearTimeout(t);
  }, []);

  const dualData: Punto[] = useMemo(
    () =>
      items
        .slice()
        .reverse()
        .map((m) => ({
          label: fmtHoyAyer(m.measured_at),
          a: m.ayuno,
          p: m.postprandial,
        })),
    [items],
  );

  const resumen7 = useMemo(() => {
    if (items.length === 0) return null;
    const ult7 = items.slice(0, 7);
    const aAvg = Math.round(
      ult7.reduce((acc, m) => acc + m.ayuno, 0) / ult7.length,
    );
    const pAvg = Math.round(
      ult7.reduce((acc, m) => acc + m.postprandial, 0) / ult7.length,
    );
    const cat = getCategoriaGlucosa(aAvg, pAvg);
    return { aAvg, pAvg, cat, count: ult7.length };
  }, [items]);

  const onDelete = (id: string) => {
    Alert.alert(
      "Eliminar medición",
      "¿Seguro que deseas eliminar esta medición? (mock)",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            setDeletingId(id);
            setTimeout(() => {
              setItems((prev) => prev.filter((m) => m.id !== id));
              setDeletingId(null);
            }, 350);
          },
        },
      ],
    );
  };

  const renderMedicion = ({ item }: { item: MedicionGlucosa }) => {
    const isDeleting = deletingId === item.id;

    return (
      <View style={styles.itemRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.measure}>
            {item.ayuno}/{item.postprandial} mg/dL
          </Text>
          <Text style={styles.subMeasure}>Ayuno / Postprandial</Text>
          <Text style={styles.date}>{fmtHoyAyer(item.measured_at)}</Text>
        </View>

        {resumen7 ? (
          <View
            style={[
              styles.badge,
              { backgroundColor: resumen7.cat.bg, marginRight: 8 },
            ]}
          >
            <Text style={[styles.badgeText, { color: resumen7.cat.fg }]}>
              {resumen7.cat.label}
            </Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => onDelete(item.id)}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <ActivityIndicator size="small" />
          ) : (
            <Image
              source={require("../assets/imagenes/borrar.png")}
              style={styles.deleteIcon}
              resizeMode="contain"
            />
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={embedded ? { backgroundColor: "#f7f7f7" } : styles.screen}>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          Promedio (últimas {resumen7?.count ?? 0})
        </Text>

        {loading ? (
          <Text style={styles.empty}>Cargando...</Text>
        ) : resumen7 ? (
          <View style={styles.avgRow}>
            <View>
              <Text style={styles.avgValue}>
                {resumen7.aAvg}/{resumen7.pAvg} mg/dL
              </Text>
              <Text style={styles.avgHint}>Ayuno / Postprandial</Text>
            </View>

            <View style={[styles.badge, { backgroundColor: resumen7.cat.bg }]}>
              <Text style={[styles.badgeText, { color: resumen7.cat.fg }]}>
                {resumen7.cat.label}
              </Text>
            </View>
          </View>
        ) : (
          <Text style={styles.empty}>Sin datos</Text>
        )}
      </View>

      <View style={styles.card}>
        <View style={styles.legendRow}>
          <Text style={styles.sectionTitle}>Ayuno vs. Postprandial</Text>
          <View style={styles.legend}>
            <View style={[styles.legendDot, { backgroundColor: "#10B981" }]} />
            <Text style={styles.legendText}>Ayuno</Text>

            <View
              style={[
                styles.legendDot,
                { backgroundColor: "#F59E0B", marginLeft: 12 },
              ]}
            />
            <Text style={styles.legendText}>Post</Text>
          </View>
        </View>

        {loading ? (
          <Text style={styles.empty}>Cargando...</Text>
        ) : dualData.length === 0 ? (
          <Text style={styles.empty}>Sin datos</Text>
        ) : (
          <ScrollView
            style={{ maxHeight: 240 }}
            contentContainerStyle={{ paddingTop: 10, paddingBottom: 6 }}
            showsVerticalScrollIndicator={false}
          >
            <DualBarChartGlucosa data={dualData} height={220} />
          </ScrollView>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Mediciones</Text>

        {loading ? (
          <Text style={styles.empty}>Cargando...</Text>
        ) : items.length === 0 ? (
          <Text style={styles.empty}>No hay mediciones registradas</Text>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            renderItem={renderMedicion}
            style={styles.itemsList}
            contentContainerStyle={{ paddingBottom: 4 }}
            showsVerticalScrollIndicator
            nestedScrollEnabled
            scrollEnabled={false}
            initialNumToRender={12}
            windowSize={10}
          />
        )}
      </View>
    </View>
  );
}

/**
 * ✅ Pantalla standalone (por si luego la quieres como tab)
 */
export default function HistorialGlucosaScreen() {
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#f7f7f7" }}
      contentContainerStyle={{ paddingBottom: 140 }}
      showsVerticalScrollIndicator
    >
      <View style={styles.screen}>
        <Text style={styles.header}>Historial</Text>
        <HistorialGlucosaContent embedded={false} />
      </View>
    </ScrollView>
  );
}

const BAR_WIDTH = 18;

const styles = StyleSheet.create({
  screen: { padding: 16, backgroundColor: "#f7f7f7" },
  header: { fontSize: 22, fontWeight: "700", marginBottom: 12 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    elevation: 2,
  },
  sectionTitle: { fontSize: 16, fontWeight: "600" },
  empty: { color: "#666", fontSize: 13, paddingVertical: 10 },

  avgRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  avgValue: { fontSize: 20, fontWeight: "700" },
  avgHint: { fontSize: 12, color: "#666", marginTop: 4 },

  legendRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  legend: { flexDirection: "row", alignItems: "center" },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  legendText: { fontSize: 12, color: "#555" },

  groupSlot: { alignItems: "center", width: 64, marginHorizontal: 2 },
  barsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    width: "100%",
    overflow: "visible",
  },
  barWrap: {
    width: BAR_WIDTH + 6,
    alignItems: "center",
    justifyContent: "flex-end",
    position: "relative",
  },
  bar: { width: BAR_WIDTH, borderRadius: 6 },
  valueOnBar: { position: "absolute", fontSize: 10, color: "#374151" },
  groupLabel: { fontSize: 10, color: "#6B7280", marginTop: 4 },

  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  measure: { fontSize: 16, fontWeight: "600" },
  subMeasure: { fontSize: 12, color: "#666", marginTop: 2 },
  date: { fontSize: 12, color: "#666", marginTop: 6 },

  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14 },
  badgeText: { fontSize: 12, fontWeight: "700" },

  deleteBtn: {
    padding: 6,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteIcon: { width: 22, height: 22, opacity: 0.9 },

  itemsList: {},
});
