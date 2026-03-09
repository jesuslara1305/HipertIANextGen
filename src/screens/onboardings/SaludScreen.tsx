import React, { useMemo, useState } from "react";
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { useAuth } from "../../../providers/AuthProvider";
import { supabase } from "../../services/supabase";
import { OnboardingStackParamList } from "./OnboardingStack";

type Nav = NativeStackNavigationProp<OnboardingStackParamList, "Salud">;

type Smoking = "never" | "former" | "current";
type Alcohol = "none" | "occasional" | "frequent";

const COMORBIDITIES = [
  "Diabetes",
  "Dislipidemia",
  "Enfermedad renal crónica",
  "Apnea del sueño",
  "Cardiopatía",
];

const PMH = ["Infarto", "EVC", "Insuficiencia cardiaca", "Enfermedad renal"];

export default function SaludScreen() {
  const navigation = useNavigation<Nav>();
  const { session } = useAuth();

  const [hta, setHta] = useState<boolean | null>(null);
  const [htaYear, setHtaYear] = useState("");
  const [comorbids, setComorbids] = useState<string[]>([]);
  const [meds, setMeds] = useState("");
  const [smoking, setSmoking] = useState<Smoking>("never");
  const [alcohol, setAlcohol] = useState<Alcohol>("none");
  const [familyHTA, setFamilyHTA] = useState<boolean | null>(null);
  const [pmh, setPmh] = useState<string[]>([]);

  const canSave = useMemo(() => {
    return session?.user && hta !== null && familyHTA !== null;
  }, [session?.user, hta, familyHTA]);

  const toggle = (arr: string[], val: string) =>
    arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];

  const handleSave = async () => {
    if (!canSave || !session?.user) return;

    const health = {
      hta_dx: hta,
      hta_dx_year: htaYear ? Number(htaYear) : null,
      comorbidities: comorbids,
      medications: meds.trim() || null,
      smoking_status: smoking,
      alcohol_use: alcohol,
      family_history_hta: familyHTA,
      personal_history: pmh,
    };

    const { error } = await supabase
      .from("profiles")
      .update({ health })
      .eq("id", session.user.id);

    if (error) {
      console.log("update salud error:", error.message);
      Alert.alert("Error", "No se pudo guardar tu información de salud.");
      return;
    }

    navigation.navigate("Medicion");
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Salud</Text>
        <Text style={styles.subtitle}>Información clínica básica</Text>

        <Text style={styles.label}>¿Tienes diagnóstico de hipertensión?</Text>

        <View style={styles.segment}>
          <Chip text="Sí" active={hta === true} onPress={() => setHta(true)} />
          <Chip
            text="No"
            active={hta === false}
            onPress={() => setHta(false)}
          />
        </View>

        {hta === true && (
          <>
            <Text style={styles.label}>Año de diagnóstico</Text>

            <TextInput
              style={styles.input}
              placeholder="Ej. 2018"
              keyboardType="numeric"
              value={htaYear}
              onChangeText={setHtaYear}
            />
          </>
        )}

        <Text style={styles.label}>Comorbilidades</Text>

        <View style={styles.wrap}>
          {COMORBIDITIES.map((item) => (
            <Chip
              key={item}
              text={item}
              active={comorbids.includes(item)}
              onPress={() => setComorbids((prev) => toggle(prev, item))}
            />
          ))}
        </View>

        <Text style={styles.label}>Medicamentos</Text>

        <TextInput
          style={styles.input}
          placeholder="Ej. IECA, ARA-II..."
          value={meds}
          onChangeText={setMeds}
        />

        <Text style={styles.label}>Tabaco</Text>

        <View style={styles.segment}>
          <Chip
            text="Nunca"
            active={smoking === "never"}
            onPress={() => setSmoking("never")}
          />
          <Chip
            text="Exfumador"
            active={smoking === "former"}
            onPress={() => setSmoking("former")}
          />
          <Chip
            text="Actual"
            active={smoking === "current"}
            onPress={() => setSmoking("current")}
          />
        </View>

        <Text style={styles.label}>Alcohol</Text>

        <View style={styles.segment}>
          <Chip
            text="Nada"
            active={alcohol === "none"}
            onPress={() => setAlcohol("none")}
          />
          <Chip
            text="Ocasional"
            active={alcohol === "occasional"}
            onPress={() => setAlcohol("occasional")}
          />
          <Chip
            text="Frecuente"
            active={alcohol === "frequent"}
            onPress={() => setAlcohol("frequent")}
          />
        </View>

        <Text style={styles.label}>Antecedente familiar HTA</Text>

        <View style={styles.segment}>
          <Chip
            text="Sí"
            active={familyHTA === true}
            onPress={() => setFamilyHTA(true)}
          />
          <Chip
            text="No"
            active={familyHTA === false}
            onPress={() => setFamilyHTA(false)}
          />
        </View>

        <TouchableOpacity
          style={[styles.nextBtn, !canSave && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={!canSave}
        >
          <Text style={styles.nextText}>Continuar</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function Chip({
  text,
  active,
  onPress,
}: {
  text: string;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
    >
      <Text style={[styles.chipText, active && { color: "#fff" }]}>{text}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: "#f7f7f7" },
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 16 },
  title: { fontSize: 20, fontWeight: "bold" },
  subtitle: { fontSize: 14, marginBottom: 12 },
  label: { fontSize: 14, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 12,
  },
  segment: { flexDirection: "row", gap: 8 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: "#eee",
  },
  chipActive: { backgroundColor: "#007AFF" },
  chipText: { fontWeight: "600" },
  nextBtn: {
    backgroundColor: "#007AFF",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
  },
  nextText: { color: "#fff", fontWeight: "600", fontSize: 16 },
});
