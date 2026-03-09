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

type Nav = NativeStackNavigationProp<OnboardingStackParamList, "Medicion">;

type Arm = "left" | "right" | "either";

export default function MedicionScreen() {
  const navigation = useNavigation<Nav>();
  const { session } = useAuth();

  const [preferredArm, setPreferredArm] = useState<Arm>("either");
  const [circ, setCirc] = useState("");

  const circNum = useMemo(() => {
    if (!circ) return null;
    const n = Number(circ);
    return Number.isFinite(n) ? n : null;
  }, [circ]);

  const canContinue = !!session?.user;

  const handleNext = async () => {
    if (!canContinue || !session?.user) return;

    const measurement = {
      preferred_arm: preferredArm,
      arm_circumference_cm: circNum,
    };

    const { error } = await supabase
      .from("profiles")
      .update({ measurement })
      .eq("id", session.user.id);

    if (error) {
      console.log("update measurement error:", error.message);
      Alert.alert("Error", "No se pudo guardar.");
      return;
    }

    navigation.navigate("Permisos");
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Medición</Text>

        <Text style={styles.label}>Brazo preferido</Text>

        <View style={styles.segment}>
          <Chip
            text="Izquierdo"
            active={preferredArm === "left"}
            onPress={() => setPreferredArm("left")}
          />
          <Chip
            text="Derecho"
            active={preferredArm === "right"}
            onPress={() => setPreferredArm("right")}
          />
          <Chip
            text="Cualquiera"
            active={preferredArm === "either"}
            onPress={() => setPreferredArm("either")}
          />
        </View>

        <Text style={styles.label}>Circunferencia brazo (cm)</Text>

        <TextInput
          style={styles.input}
          placeholder="Ej. 28"
          keyboardType="numeric"
          value={circ}
          onChangeText={setCirc}
        />

        <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
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
  label: { fontSize: 14, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 12,
  },
  segment: { flexDirection: "row", gap: 8 },
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
  nextText: { color: "#fff", fontWeight: "600" },
});
