import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import React, { useEffect, useMemo, useState } from "react";
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

type Sex = "male" | "female" | "other";
type Smoking = "never" | "former" | "current";
type Alcohol = "none" | "occasional" | "frequent";
type Arm = "left" | "right" | "either";

const COMORBIDITIES = [
  "Diabetes",
  "Dislipidemia",
  "Enfermedad renal crónica",
  "Apnea del sueño",
  "Cardiopatía",
];
const PMH = ["Infarto", "EVC", "Insuficiencia cardiaca", "Enfermedad renal"];

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
      activeOpacity={0.9}
      onPress={onPress}
      style={[styles.chip, active ? styles.chipActive : null]}
    >
      <Text style={[styles.chipText, active ? { color: "#fff" } : null]}>
        {text}
      </Text>
    </TouchableOpacity>
  );
}

function calcBMI(h?: number | null, w?: number | null) {
  if (!h || !w || h <= 0) return null;
  const m = h / 100;
  const v = w / (m * m);
  return Math.round(v * 10) / 10;
}
function bmiTag(bmi: number) {
  if (bmi < 18.5) return { label: "Bajo peso", color: "#FFA000" };
  if (bmi < 25) return { label: "Normal", color: "#4CAF50" };
  if (bmi < 30) return { label: "Sobrepeso", color: "#FF9800" };
  return { label: "Obesidad", color: "#F44336" };
}

const fmtDob = (d: Date) =>
  d.toLocaleDateString("es-MX", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

export default function MiPerfilScreen() {
  const [firstName, setFirstName] = useState("");
  const [lastP, setLastP] = useState("");
  const [lastM, setLastM] = useState("");
  const [dob, setDob] = useState<Date | null>(null);
  const [sex, setSex] = useState<Sex>("other");

  const [height, setHeight] = useState<string>("");
  const [weight, setWeight] = useState<string>("");

  const [hta, setHta] = useState<boolean | null>(null);
  const [htaYear, setHtaYear] = useState<string>("");
  const [comorbids, setComorbids] = useState<string[]>([]);
  const [meds, setMeds] = useState<string>("");
  const [smoking, setSmoking] = useState<Smoking>("never");
  const [alcohol, setAlcohol] = useState<Alcohol>("none");
  const [familyHTA, setFamilyHTA] = useState<boolean | null>(null);
  const [pmh, setPmh] = useState<string[]>([]);

  const [preferredArm, setPreferredArm] = useState<Arm>("either");
  const [armCirc, setArmCirc] = useState<string>("");
  const [remindersOn, setRemindersOn] = useState(false);
  const [rTimes, setRTimes] = useState<string[]>([]);

  const hNum = useMemo(
    () => (height ? Number(String(height).replace(",", ".")) : null),
    [height],
  );
  const wNum = useMemo(
    () => (weight ? Number(String(weight).replace(",", ".")) : null),
    [weight],
  );
  const bmi = useMemo(
    () => calcBMI(hNum ?? undefined, wNum ?? undefined),
    [hNum, wNum],
  );
  const bmiInfo = bmi ? bmiTag(bmi) : null;

  const pickDob = () => {
    DateTimePickerAndroid.open({
      value: dob ?? new Date(),
      onChange: (_, d) => d && setDob(d),
      mode: "date",
      is24Hour: true,
      display: "calendar",
    });
  };

  const toggle = (arr: string[], val: string) =>
    arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];

  const saveDatos = () => {
    if (!firstName.trim() || !lastP.trim() || !dob) {
      Alert.alert(
        "Datos incompletos",
        "Nombre, apellido paterno y fecha de nacimiento son obligatorios.",
      );
      return;
    }
    Alert.alert("Listo", "Datos personales guardados (mock).");
  };

  const saveMedidas = () => {
    if (!hNum || !wNum) {
      Alert.alert("Datos inválidos", "Indica estatura y peso válidos.");
      return;
    }
    Alert.alert("Listo", "Medidas guardadas (mock).");
  };

  const saveSalud = () => {
    if (hta === null || familyHTA === null) {
      Alert.alert(
        "Faltan campos",
        "Indica si tienes diagnóstico de HTA y antecedente familiar.",
      );
      return;
    }
    Alert.alert("Listo", "Información de salud guardada (mock).");
  };

  const saveMedicion = () => {
    if (remindersOn) {
      const clean = rTimes
        .map((x) => x.trim())
        .filter(Boolean)
        .filter((x) => /^\d{2}:\d{2}$/.test(x));
      if (clean.length === 0) {
        Alert.alert(
          "Horas inválidas",
          'Escribe al menos una hora válida. Ej: "08:00,20:00"',
        );
        return;
      }
      setRTimes(clean);
    }
    Alert.alert("Listo", "Preferencias de medición guardadas (mock).");
  };

  useEffect(() => {
    // valores mock opcionales (puedes borrar si no quieres)
    // setFirstName("Em");
  }, []);

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Datos personales</Text>

        <Text style={styles.label}>Nombre(s)</Text>
        <TextInput
          style={styles.input}
          value={firstName}
          onChangeText={setFirstName}
        />

        <Text style={styles.label}>Apellido paterno</Text>
        <TextInput style={styles.input} value={lastP} onChangeText={setLastP} />

        <Text style={styles.label}>Apellido materno (opcional)</Text>
        <TextInput style={styles.input} value={lastM} onChangeText={setLastM} />

        <Text style={styles.label}>Fecha de nacimiento</Text>
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.input}
          onPress={pickDob}
        >
          <Text style={dob ? styles.inputText : styles.placeholderText}>
            {dob ? fmtDob(dob) : "Selecciona una fecha"}
          </Text>
        </TouchableOpacity>

        <Text style={styles.label}>Sexo</Text>
        <View style={styles.segment}>
          <Chip
            text="Masculino"
            active={sex === "male"}
            onPress={() => setSex("male")}
          />
          <Chip
            text="Femenino"
            active={sex === "female"}
            onPress={() => setSex("female")}
          />
          <Chip
            text="Otro"
            active={sex === "other"}
            onPress={() => setSex("other")}
          />
        </View>

        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.saveBtn}
          onPress={saveDatos}
        >
          <Text style={styles.saveText}>Guardar</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Medidas corporales</Text>

        <Text style={styles.label}>Estatura (cm)</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={height}
          onChangeText={setHeight}
          placeholder="Ej. 175"
          placeholderTextColor="#9AA0A6"
        />

        <Text style={styles.label}>Peso (kg)</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={weight}
          onChangeText={setWeight}
          placeholder="Ej. 72.5"
          placeholderTextColor="#9AA0A6"
        />

        <View style={styles.bmiBox}>
          <Text style={styles.bmiMuted}>IMC</Text>
          <Text style={styles.bmiValue}>{bmi ?? "--"}</Text>
          <Text style={[styles.bmiTag, { color: bmiInfo?.color ?? "#999" }]}>
            {bmiInfo?.label ?? "—"}
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.saveBtn}
          onPress={saveMedidas}
        >
          <Text style={styles.saveText}>Guardar</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Salud</Text>

        <Text style={styles.label}>Diagnóstico de HTA</Text>
        <View style={styles.segment}>
          <Chip text="Sí" active={hta === true} onPress={() => setHta(true)} />
          <Chip
            text="No"
            active={hta === false}
            onPress={() => setHta(false)}
          />
        </View>

        {hta === true ? (
          <>
            <Text style={styles.label}>Año de diagnóstico (opcional)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={htaYear}
              onChangeText={setHtaYear}
              placeholder="Ej. 2019"
              placeholderTextColor="#9AA0A6"
            />
          </>
        ) : null}

        <Text style={[styles.label, { marginTop: 8 }]}>Comorbilidades</Text>
        <View style={styles.wrap}>
          {COMORBIDITIES.map((c) => (
            <Chip
              key={c}
              text={c}
              active={comorbids.includes(c)}
              onPress={() => setComorbids((prev) => toggle(prev, c))}
            />
          ))}
        </View>

        <Text style={styles.label}>Medicamentos</Text>
        <TextInput
          style={[styles.input, { minHeight: 48 }]}
          value={meds}
          onChangeText={setMeds}
          placeholder="Ej. IECA, ARA-II, tiazida…"
          placeholderTextColor="#9AA0A6"
          multiline
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

        <Text style={styles.label}>Antecedente familiar de HTA</Text>
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

        <Text style={styles.label}>Antecedentes personales</Text>
        <View style={styles.wrap}>
          {PMH.map((c) => (
            <Chip
              key={c}
              text={c}
              active={pmh.includes(c)}
              onPress={() => setPmh((prev) => toggle(prev, c))}
            />
          ))}
        </View>

        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.saveBtn}
          onPress={saveSalud}
        >
          <Text style={styles.saveText}>Guardar</Text>
        </TouchableOpacity>
      </View>

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

        <Text style={styles.label}>
          Circunferencia de brazo (cm) (opcional)
        </Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={armCirc}
          onChangeText={setArmCirc}
          placeholder="Ej. 28"
          placeholderTextColor="#9AA0A6"
        />

        <Text style={[styles.label, { marginTop: 8 }]}>Recordatorios</Text>
        <View style={styles.segment}>
          <Chip
            text="Desactivados"
            active={!remindersOn}
            onPress={() => setRemindersOn(false)}
          />
          <Chip
            text="Activados"
            active={remindersOn}
            onPress={() => setRemindersOn(true)}
          />
        </View>

        {remindersOn ? (
          <>
            <Text style={[styles.label, { marginTop: 8 }]}>
              Horas (formato HH:MM, 24h)
            </Text>
            <TextInput
              style={styles.input}
              placeholder='Ej. "08:00,20:00"'
              placeholderTextColor="#9AA0A6"
              value={rTimes.join(",")}
              onChangeText={(t) => setRTimes(t.split(",").map((x) => x.trim()))}
            />
          </>
        ) : null}

        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.saveBtn}
          onPress={saveMedicion}
        >
          <Text style={styles.saveText}>Guardar</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 28 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: "#f7f7f7" },

  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    marginBottom: 16,
  },

  title: { fontSize: 20, fontWeight: "bold" },

  label: { fontSize: 14, color: "#999", marginTop: 12, marginBottom: 6 },

  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#fff",
  },
  inputText: { color: "#111" },
  placeholderText: { color: "#777" },

  saveBtn: {
    backgroundColor: "#007AFF",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 16,
  },
  saveText: { color: "#fff", fontSize: 16, fontWeight: "600" },

  segment: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    flexWrap: "wrap",
  },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },

  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: "#eee",
  },
  chipActive: { backgroundColor: "#007AFF" },
  chipText: { fontWeight: "600", color: "#333" },

  bmiBox: { alignItems: "center", marginTop: 10 },
  bmiMuted: { color: "#999" },
  bmiValue: { fontSize: 24, fontWeight: "bold", marginTop: 4 },
  bmiTag: { fontWeight: "600", marginTop: 2 },
});
