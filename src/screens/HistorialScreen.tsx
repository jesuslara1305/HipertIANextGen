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

type Punto = { label: string; s: number; d: number };
type Categoria = {
  label: "Normal" | "Ligeramente elevada" | "Elevada" | "Alta" | "Muy alta";
  bg: string;
  fg: string;
};

type Medicion = {
  id: string;
  systolica: number;
  diastolica: number;
  measured_at: string;
};

const MOCK_MEDICIONES: Medicion[] = [
  {
    id: "m1",
    systolica: 120,
    diastolica: 80,
    measured_at: "2025-11-27T17:34:39.000Z",
  },
  {
    id: "m2",
    systolica: 119,
    diastolica: 78,
    measured_at: "2025-11-27T10:09:30.000Z",
  },
  {
    id: "m3",
    systolica: 118,
    diastolica: 79,
    measured_at: "2025-11-26T02:15:38.000Z",
  },
  {
    id: "m4",
    systolica: 112,
    diastolica: 79,
    measured_at: "2025-11-26T02:14:55.000Z",
  },
  {
    id: "m5",
    systolica: 119,
    diastolica: 79,
    measured_at: "2025-11-26T00:23:31.000Z",
  },
  {
    id: "m6",
    systolica: 124,
    diastolica: 79,
    measured_at: "2025-11-25T22:10:10.000Z",
  },
  {
    id: "m7",
    systolica: 121,
    diastolica: 77,
    measured_at: "2025-11-25T08:10:10.000Z",
  },
  {
    id: "m8",
    systolica: 117,
    diastolica: 76,
    measured_at: "2025-11-24T10:10:10.000Z",
  },
];

function getCategoria(s: number, d: number): Categoria {
  if (s < 120 && d < 80)
    return { label: "Normal", bg: "#DCFCE7", fg: "#166534" };
  if (s >= 120 && s < 130 && d < 80)
    return { label: "Ligeramente elevada", bg: "#E9F8D8", fg: "#3F6212" };
  if ((s >= 130 && s < 140) || (d >= 80 && d < 90))
    return { label: "Elevada", bg: "#FEF9C3", fg: "#92400E" };
  if (s >= 140 || d >= 90)
    return { label: "Alta", bg: "#FFEDD5", fg: "#9A3412" };
  return { label: "Muy alta", bg: "#FEE2E2", fg: "#991B1B" };
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

const DualBarChart = ({
  data,
  height = 200,
  colorS = "#EF4444",
  colorD = "#0EA5E9",
}: {
  data: Punto[];
  height?: number;
  colorS?: string;
  colorD?: string;
}) => {
  const max = useMemo(
    () => Math.max(1, ...data.flatMap((d) => [d.s, d.d])),
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
        const hs = Math.max(8, (d.s / max) * areaHeight);
        const hd = Math.max(8, (d.d / max) * areaHeight);

        return (
          <View style={[styles.groupSlot, { height }]}>
            <View style={[styles.barsRow, { height: areaHeight }]}>
              <View style={styles.barWrap}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: hs,
                      backgroundColor: colorS,
                      borderWidth: 1,
                      borderColor: "rgba(0,0,0,0.06)",
                    },
                  ]}
                />
                <Text style={[styles.valueOnBar, { bottom: hs + 2 }]}>
                  {d.s}
                </Text>
              </View>

              <View style={styles.barWrap}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: hd,
                      backgroundColor: colorD,
                      borderWidth: 1,
                      borderColor: "rgba(0,0,0,0.06)",
                    },
                  ]}
                />
                <Text style={[styles.valueOnBar, { bottom: hd + 2 }]}>
                  {d.d}
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

export default function HistorialScreen() {
  const [loading, setLoading] = useState(true);

  const [items, setItems] = useState<Medicion[]>([]);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setItems(MOCK_MEDICIONES);
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
          s: m.systolica,
          d: m.diastolica,
        })),
    [items],
  );

  const resumen7 = useMemo(() => {
    if (items.length === 0) return null;
    const ult7 = items.slice(0, 7);
    const sAvg = Math.round(
      ult7.reduce((a, m) => a + m.systolica, 0) / ult7.length,
    );
    const dAvg = Math.round(
      ult7.reduce((a, m) => a + m.diastolica, 0) / ult7.length,
    );
    const cat = getCategoria(sAvg, dAvg);
    return { sAvg, dAvg, cat, count: ult7.length };
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

  const renderMedicion = ({ item }: { item: Medicion }) => {
    const cat = getCategoria(item.systolica, item.diastolica);
    const id = item.id;
    const isDeleting = deletingId === id;

    return (
      <View style={styles.itemRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.measure}>
            {item.systolica}/{item.diastolica} mmHg
          </Text>
          <Text style={styles.date}>{fmtHoyAyer(item.measured_at)}</Text>
        </View>

        <View
          style={[styles.badge, { backgroundColor: cat.bg, marginRight: 8 }]}
        >
          <Text style={[styles.badgeText, { color: cat.fg }]}>{cat.label}</Text>
        </View>

        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => onDelete(id)}
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
    <ScrollView
      style={{ flex: 1, backgroundColor: "#f7f7f7" }}
      contentContainerStyle={{ paddingBottom: 140 }}
      showsVerticalScrollIndicator
    >
      <View style={styles.screen}>
        <Text style={styles.header}>Historial</Text>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Promedio (últimas {resumen7?.count ?? 0})
          </Text>

          {loading ? (
            <Text style={styles.empty}>Cargando...</Text>
          ) : resumen7 ? (
            <View style={styles.avgRow}>
              <Text style={styles.avgValue}>
                {resumen7.sAvg}/{resumen7.dAvg} mmHg
              </Text>
              <View
                style={[styles.badge, { backgroundColor: resumen7.cat.bg }]}
              >
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
            <Text style={styles.sectionTitle}>Sistólica vs. Diastólica</Text>
            <View style={styles.legend}>
              <View
                style={[styles.legendDot, { backgroundColor: "#EF4444" }]}
              />
              <Text style={styles.legendText}>Sistólica</Text>
              <View
                style={[
                  styles.legendDot,
                  { backgroundColor: "#0EA5E9", marginLeft: 12 },
                ]}
              />
              <Text style={styles.legendText}>Diastólica</Text>
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
              <DualBarChart data={dualData} height={220} />
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
              initialNumToRender={12}
              windowSize={10}
            />
          )}
        </View>
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

  legendRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  legend: { flexDirection: "row", alignItems: "center" },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  legendText: { fontSize: 12, color: "#555" },

  chartArea: { flexDirection: "row", alignItems: "flex-end" },
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
  date: { fontSize: 12, color: "#666", marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14 },
  badgeText: { fontSize: 12, fontWeight: "700" },
  deleteBtn: {
    padding: 6,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteIcon: { width: 22, height: 22, opacity: 0.9 },

  itemsList: { maxHeight: 360 },
});
