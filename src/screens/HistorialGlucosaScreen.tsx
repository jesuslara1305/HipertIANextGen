import React, { useMemo, useState } from "react";
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
import { getCategoriaGlucosa, MedicionGlucosa } from "./GlucosaScreen";

type Punto = { label: string; a: number; p: number };

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

function getCategoriaRegistro(item: MedicionGlucosa) {
  const ayunoVal = item.ayunas ?? 0;
  const postVal = item.postprandial ?? 0;
  return getCategoriaGlucosa(ayunoVal, postVal);
}

function getLabelRegistro(item: MedicionGlucosa) {
  if (item.ayunas !== null && item.postprandial !== null)
    return "Ayuno / Postprandial";
  if (item.ayunas !== null) return "Ayuno";
  if (item.postprandial !== null) return "Postprandial";
  return "";
}

function getMainValue(item: MedicionGlucosa) {
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

export function HistorialGlucosaContent({
  embedded = true,
  items,
  loading,
  onDelete,
}: {
  embedded?: boolean;
  items: MedicionGlucosa[];
  loading: boolean;
  onDelete: (id: string) => Promise<boolean>;
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const dualData: Punto[] = useMemo(
    () =>
      items
        .slice()
        .reverse()
        .map((m) => ({
          label: fmtHoyAyer(m.measured_at),
          a: m.ayunas ?? 0,
          p: m.postprandial ?? 0,
        })),
    [items],
  );

  const resumen7 = useMemo(() => {
    if (items.length === 0) return null;

    const limite = new Date();
    limite.setDate(limite.getDate() - 7);

    const ult7 = items.filter((m) => new Date(m.measured_at) >= limite);
    if (ult7.length === 0) return null;

    const ayunos = ult7
      .map((m) => m.ayunas)
      .filter((v): v is number => v !== null && v !== undefined);

    const posts = ult7
      .map((m) => m.postprandial)
      .filter((v): v is number => v !== null && v !== undefined);

    const aAvg =
      ayunos.length > 0
        ? Math.round(ayunos.reduce((acc, v) => acc + v, 0) / ayunos.length)
        : 0;

    const pAvg =
      posts.length > 0
        ? Math.round(posts.reduce((acc, v) => acc + v, 0) / posts.length)
        : 0;

    const cat = getCategoriaGlucosa(aAvg, pAvg);
    return { aAvg, pAvg, cat, count: ult7.length };
  }, [items]);

  const confirmDelete = (id: string) => {
    Alert.alert(
      "Eliminar medición",
      "¿Seguro que deseas eliminar esta medición?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            setDeletingId(id);
            const ok = await onDelete(id);
            setDeletingId(null);

            if (!ok) {
              Alert.alert("Error", "No se pudo eliminar la medición.");
            }
          },
        },
      ],
    );
  };

  const renderMedicion = ({ item }: { item: MedicionGlucosa }) => {
    const isDeleting = deletingId === item.id;
    const cat = getCategoriaRegistro(item);

    return (
      <View style={styles.itemRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.measure}>{getMainValue(item)}</Text>
          <Text style={styles.subMeasure}>{getLabelRegistro(item)}</Text>
          <Text style={styles.date}>{fmtHoyAyer(item.measured_at)}</Text>
        </View>

        <View
          style={[styles.badge, { backgroundColor: cat.bg, marginRight: 8 }]}
        >
          <Text style={[styles.badgeText, { color: cat.fg }]}>{cat.label}</Text>
        </View>

        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => confirmDelete(item.id)}
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

export default function HistorialGlucosaScreen() {
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#f7f7f7" }}
      contentContainerStyle={{ paddingBottom: 140 }}
      showsVerticalScrollIndicator
    >
      <View style={styles.screen}>
        <Text style={styles.header}>Historial</Text>
        <Text style={styles.empty}>
          Esta vista standalone ya no se usa sola en este flujo.
        </Text>
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
