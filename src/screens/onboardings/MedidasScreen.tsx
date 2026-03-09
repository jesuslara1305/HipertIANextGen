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

type Nav = NativeStackNavigationProp<OnboardingStackParamList, "Medidas">;

export default function MedidasScreen() {
  const navigation = useNavigation<Nav>();
  const { session } = useAuth();

  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");

  const h = Number(height);
  const w = Number(weight);

  const bmi = useMemo(() => {
    if (!h || !w) return null;
    const m = h / 100;
    return Math.round((w / (m * m)) * 10) / 10;
  }, [h, w]);

  const canSave = session?.user && h > 0 && w > 0;

  const handleSave = async () => {
    if (!canSave || !session?.user) return;

    const { error } = await supabase
      .from("profiles")
      .update({
        height_cm: h,
        weight_kg: w,
        bmi: bmi,
      })
      .eq("id", session.user.id);

    if (error) {
      console.log("medidas error:", error.message);
      Alert.alert("Error", "No se pudo guardar");
      return;
    }

    navigation.navigate("Salud");
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Medidas</Text>

        <Text style={styles.label}>Estatura (cm)</Text>

        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={height}
          onChangeText={setHeight}
        />

        <Text style={styles.label}>Peso (kg)</Text>

        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={weight}
          onChangeText={setWeight}
        />

        <Text style={styles.imc}>IMC: {bmi ?? "--"}</Text>

        <TouchableOpacity
          style={[styles.nextBtn, !canSave && { opacity: 0.5 }]}
          onPress={handleSave}
          disabled={!canSave}
        >
          <Text style={styles.nextText}>Continuar</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: "#f7f7f7" },
  card: { backgroundColor: "#fff", padding: 16, borderRadius: 12 },
  title: { fontSize: 20, fontWeight: "bold" },
  label: { marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 12,
  },
  imc: { marginTop: 12 },
  nextBtn: {
    marginTop: 20,
    backgroundColor: "#007AFF",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  nextText: { color: "#fff", fontWeight: "600" },
});
