import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type ChatMsg = { from: "user" | "ia"; text: string };

export default function ChatScreen() {
  const [pregunta, setPregunta] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMsg[]>([]);
  const [loading, setLoading] = useState(false);

  const scrollRef = useRef<ScrollView | null>(null);

  const handleEnviarPregunta = async () => {
    if (!pregunta.trim()) return;

    const texto = pregunta.trim();

    setChatHistory((prev) => [...prev, { from: "user", text: texto }]);
    setPregunta("");
    setLoading(true);

    try {
      const response = await fetch(
        "https://healthmed-api-nlp.onrender.com/preguntar",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pregunta: texto }),
        },
      );

      const data = await response.json();
      const respuesta = String(data?.respuesta ?? "No se recibió respuesta.");

      setChatHistory((prev) => [...prev, { from: "ia", text: respuesta }]);
    } catch (error) {
      console.error("Error al hacer la pregunta:", error);
      setChatHistory((prev) => [
        ...prev,
        {
          from: "ia",
          text: "Ocurrió un error al conectar. Intenta de nuevo.",
        },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
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
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    backgroundColor: "#fff",
    marginBottom: 120,
  },

  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    paddingHorizontal: 12,
    marginRight: 8,
  },

  boton: {
    backgroundColor: "#007AFF",
    borderRadius: 10,
    paddingHorizontal: 16,
    justifyContent: "center",
  },

  botonTexto: { color: "#fff", fontWeight: "600" },
});
