import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../../providers/AuthProvider";
import { supabase } from "../services/supabase";

type ChatMsg = { from: "user" | "ia"; text: string };

function calcularEdad(dob: string | null) {
  if (!dob) return 0;
  const hoy = new Date();
  const cumple = new Date(dob);
  let edad = hoy.getFullYear() - cumple.getFullYear();
  const m = hoy.getMonth() - cumple.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < cumple.getDate())) edad--;
  return edad;
}

function alcoholANumero(frecuencia: string | null) {
  const mapa: Record<string, number> = {
    none: 0.0,
    occasional: 0.5,
    frequent: 1.0,
  };
  return mapa[frecuencia?.toLowerCase() ?? "none"] ?? 0.0;
}

export default function ChatScreen() {
  const [pregunta, setPregunta] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMsg[]>([]);
  const [loading, setLoading] = useState(false);
  const { session } = useAuth();
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSubscription = Keyboard.addListener(showEvent, () =>
      setKeyboardVisible(true),
    );
    const hideSubscription = Keyboard.addListener(hideEvent, () =>
      setKeyboardVisible(false),
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const scrollRef = useRef<ScrollView | null>(null);

  const handleEnviarPregunta = async () => {
    if (!pregunta.trim()) return;

    const textoUsuario = pregunta.trim();
    setChatHistory((prev) => [...prev, { from: "user", text: textoUsuario }]);
    setPregunta("");
    setLoading(true);

    try {
      let datosPaciente = {};
      let tienePerfilValido = false;

      if (session?.user?.id) {
        const [{ data: perfil }, { data: presion }, { data: glucosa }] =
          await Promise.all([
            supabase
              .from("profiles")
              .select("*")
              .eq("id", session.user.id)
              .single(),
            supabase
              .from("bp_measurements")
              .select("*")
              .eq("user_id", session.user.id)
              .order("measured_at", { ascending: false })
              .limit(1)
              .single(),
            supabase
              .from("glucose_measurements")
              .select("*")
              .eq("user_id", session.user.id)
              .order("measured_at", { ascending: false })
              .limit(1)
              .single(),
          ]);

        if (perfil && perfil.dob && perfil.weight_kg) {
          tienePerfilValido = true;
          const health = perfil.health || {};
          datosPaciente = {
            Age: calcularEdad(perfil.dob),
            Gender: perfil.sex_at_birth === "male" ? 1 : 0,
            BMI: perfil.bmi || 25,
            Cholesterol: health.cholesterol_level || 200,
            Triglycerides: health.triglycerides_level || 150,
            Smoking_Status:
              health.smoking_status === "current"
                ? 2
                : health.smoking_status === "former"
                  ? 1
                  : 0,
            Alcohol_Intake: alcoholANumero(health.alcohol_use),
            Physical_Activity_Level: health.physical_activity_level ?? 0,
            Family_History: health.family_history_hta ? 1 : 0,
            Diabetes: health.diabetes_diagnosed ? 1 : 0,
            Stress_Level: Math.min(health.stress_level || 4, 9),
            Salt_Intake: health.salt_intake || 2.5,
            Sleep_Duration: health.sleep_hours || 8,
            Heart_Rate: health.heart_rate || 80,
            Glucose: glucosa?.ayunas || glucosa?.postprandial || 90,
            Systolic_BP: presion?.systolica || 120,
            Diastolic_BP: presion?.diastolica || 80,
          };
        }
      }

      let textoParaIA = textoUsuario;
      if (!tienePerfilValido) {
        textoParaIA += `\n\n[INSTRUCCIÓN DEL SISTEMA: El usuario no tiene datos médicos registrados en la base de datos actualmente. Si su pregunta es general (ej. "¿qué es la hipertensión?"), respóndela de forma normal. Pero si pide que le calcules su riesgo, que analices sus datos o que evalúes su estado, NO inventes diagnósticos ni devuelvas un JSON. Discúlpate amablemente e indícale que primero necesita ir a la pestaña "Mi Perfil" o "Medición" para registrar sus datos y poder hacer la predicción.]`;
      }

      const payload = {
        pregunta: textoParaIA,
        perfil: datosPaciente,
      };

      const response = await fetch(
        "https://chatbot-bp.onrender.com/preguntar",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      const data = await response.json();

      let respuestaFinal = "";
      if (typeof data === "object" && (data.puntuacion || data.clasificacion)) {
        respuestaFinal = JSON.stringify(data, null, 2);
      } else {
        respuestaFinal = String(data?.respuesta ?? "No se recibió respuesta.");
      }

      setChatHistory((prev) => [...prev, { from: "ia", text: respuestaFinal }]);
    } catch (error) {
      setChatHistory((prev) => [
        ...prev,
        {
          from: "ia",
          text: "Ocurrió un error al conectar con la IA predictiva.",
        },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#fff" }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 85}
    >
      <View style={{ flex: 1, paddingBottom: keyboardVisible ? 20 : 85 }}>
        <ScrollView
          ref={(r) => {
            scrollRef.current = r;
          }}
          style={styles.chatBox}
          contentContainerStyle={{ paddingBottom: 16 }}
          onContentSizeChange={() =>
            scrollRef.current?.scrollToEnd({ animated: true })
          }
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {chatHistory.map((mensaje, index) => (
            <View
              key={index}
              style={
                mensaje.from === "user" ? styles.userBubble : styles.botBubble
              }
            >
              <Text style={styles.bubbleLabel}>
                {mensaje.from === "user" ? "Tú:" : "IA:"}
              </Text>
              <Text>{mensaje.text}</Text>
            </View>
          ))}

          {loading && (
            <View style={{ marginTop: 8 }}>
              <ActivityIndicator size="small" color="#007AFF" />
            </View>
          )}
        </ScrollView>

        <View style={styles.inputContainer}>
          <TextInput
            placeholder="Chatear sobre glucosa o hipertensión..."
            style={styles.input}
            value={pregunta}
            onChangeText={setPregunta}
            onSubmitEditing={handleEnviarPregunta}
            returnKeyType="send"
          />
          <TouchableOpacity style={styles.boton} onPress={handleEnviarPregunta}>
            <Text style={styles.botonTexto}>Enviar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  chatBox: { padding: 16, flexGrow: 1 },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: "#dcf8c6",
    padding: 10,
    borderRadius: 10,
    marginVertical: 6,
    maxWidth: "80%",
  },
  botBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#f1f0f0",
    padding: 10,
    borderRadius: 10,
    marginVertical: 6,
    maxWidth: "80%",
  },
  bubbleLabel: { fontWeight: "bold", marginBottom: 4 },
  inputContainer: {
    flexDirection: "row",
    paddingTop: 10,
    paddingHorizontal: 10,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    backgroundColor: "#fff",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    paddingHorizontal: 12,
    marginRight: 8,
    minHeight: 45,
  },
  boton: {
    backgroundColor: "#007AFF",
    borderRadius: 10,
    paddingHorizontal: 16,
    justifyContent: "center",
    minHeight: 45,
  },
  botonTexto: { color: "#fff", fontWeight: "600" },
});
