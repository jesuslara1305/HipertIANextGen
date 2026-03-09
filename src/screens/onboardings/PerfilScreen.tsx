import React, { useMemo, useState } from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { useAuth } from "../../../providers/AuthProvider";
import { supabase } from "../../services/supabase";
import { OnboardingStackParamList } from "./OnboardingStack";

type Nav = NativeStackNavigationProp<OnboardingStackParamList, "Perfil">;

type Sex = "male" | "female" | "prefer_not_to_say";

export default function PerfilScreen() {
  const navigation = useNavigation<Nav>();
  const { session } = useAuth();

  const [firstName, setFirstName] = useState("");
  const [lastP, setLastP] = useState("");
  const [lastM, setLastM] = useState("");
  const [dob, setDob] = useState<Date | null>(null);
  const [sex, setSex] = useState<Sex>("prefer_not_to_say");

  const age = useMemo(() => {
    if (!dob) return "";
    const t = new Date();
    let a = t.getFullYear() - dob.getFullYear();
    const m = t.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && t.getDate() < dob.getDate())) a--;
    return String(a);
  }, [dob]);

  const openDatePicker = () => {
    DateTimePickerAndroid.open({
      value: dob ?? new Date(1990, 0, 1),
      onChange: (_, d) => d && setDob(d),
      mode: "date",
      display: "calendar",
    });
  };

  const canContinue = firstName.trim() && lastP.trim() && dob;

  const handleNext = async () => {
    if (!canContinue || !session?.user) return;

    const payload = {
      id: session.user.id,
      first_name: firstName.trim(),
      last_name_paterno: lastP.trim(),
      last_name_materno: lastM.trim() || null,
      dob: dob!.toISOString().slice(0, 10),
      sex_at_birth: sex,
    };

    const { error } = await supabase
      .from("profiles")
      .upsert(payload, { onConflict: "id" });

    if (error) {
      console.log("perfil error:", error.message);
      return;
    }

    navigation.navigate("Medidas");
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Perfil</Text>

        <Text style={styles.label}>Nombre</Text>
        <TextInput
          style={styles.input}
          value={firstName}
          onChangeText={setFirstName}
        />

        <Text style={styles.label}>Apellido paterno</Text>
        <TextInput style={styles.input} value={lastP} onChangeText={setLastP} />

        <Text style={styles.label}>Apellido materno</Text>
        <TextInput style={styles.input} value={lastM} onChangeText={setLastM} />

        <Text style={styles.label}>Fecha de nacimiento</Text>

        <TouchableOpacity style={styles.dateBtn} onPress={openDatePicker}>
          <Text>{dob ? dob.toLocaleDateString() : "Seleccionar fecha"}</Text>
        </TouchableOpacity>

        <Text style={styles.ageText}>
          {age ? `Edad: ${age}` : "Edad automática"}
        </Text>

        {/* NUEVO SELECTOR DE SEXO */}

        <Text style={styles.label}>Sexo al nacer</Text>

        <View style={styles.segment}>
          <SexButton
            text="Masculino"
            active={sex === "male"}
            onPress={() => setSex("male")}
          />

          <SexButton
            text="Femenino"
            active={sex === "female"}
            onPress={() => setSex("female")}
          />

          <SexButton
            text="Prefiero no decir"
            active={sex === "prefer_not_to_say"}
            onPress={() => setSex("prefer_not_to_say")}
          />
        </View>

        <TouchableOpacity
          style={[styles.nextBtn, !canContinue && { opacity: 0.5 }]}
          disabled={!canContinue}
          onPress={handleNext}
        >
          <Text style={styles.nextText}>Continuar</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function SexButton({
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
      style={[styles.sexBtn, active && styles.sexBtnActive]}
      onPress={onPress}
    >
      <Text style={[styles.sexText, active && { color: "#fff" }]}>{text}</Text>
    </TouchableOpacity>
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

  dateBtn: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12,
    borderRadius: 10,
  },

  ageText: { marginTop: 6 },

  segment: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },

  sexBtn: {
    flex: 1,
    backgroundColor: "#eee",
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
  },

  sexBtnActive: {
    backgroundColor: "#007AFF",
  },

  sexText: {
    fontWeight: "600",
  },

  nextBtn: {
    marginTop: 20,
    backgroundColor: "#007AFF",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },

  nextText: {
    color: "#fff",
    fontWeight: "600",
  },
});
