import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
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

export default function RegistroGlucosaManualScreen() {
  const [ayunas, setAyunas] = useState("");
  const [postprandial, setPostprandial] = useState("");
  const [fecha, setFecha] = useState(new Date());
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [procesandoFoto, setProcesandoFoto] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const navigation = useNavigation<any>();
  const { session } = useAuth();
  const scrollRef = useRef<ScrollView | null>(null);

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

  const mostrarSelectorFechaYHora = () => {
    DateTimePickerAndroid.open({
      value: fecha,
      onChange: (_, selectedDate) => {
        if (selectedDate) {
          const nuevaFecha = new Date(selectedDate);

          DateTimePickerAndroid.open({
            value: nuevaFecha,
            onChange: (_, selectedHora) => {
              if (selectedHora) {
                const final = new Date(nuevaFecha);
                final.setHours(selectedHora.getHours());
                final.setMinutes(selectedHora.getMinutes());
                setFecha(final);
              }
            },
            mode: "time",
            is24Hour: false,
            display: "default",
          });
        }
      },
      mode: "date",
      is24Hour: false,
      display: "default",
    });
  };

  const tomarFotoGlucosa = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permiso denegado", "Se requiere acceso a la cámara.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 1,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets[0].base64) {
      procesarImagen(result.assets[0].base64);
    }
  };

  const procesarImagen = async (base64: string) => {
    setProcesandoFoto(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    const OCR_API_KEY = "K82959862488957";
    const OCR_URL = "https://api.ocr.space/parse/image";

    try {
      const formData = new FormData();
      formData.append("base64Image", `data:image/jpeg;base64,${base64}`);
      formData.append("language", "eng");
      formData.append("isOverlayRequired", "false");
      formData.append("scale", "true");
      // Cambiamos al Engine 1, suele ser mejor ignorando el "ruido" y uniendo caracteres
      formData.append("OCREngine", "1");

      const response = await fetch(OCR_URL, {
        method: "POST",
        headers: {
          apikey: OCR_API_KEY,
        },
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error("BadResponse");
      }

      const data = await response.json();

      if (
        data.IsErroredOnProcessing ||
        !data.ParsedResults ||
        data.ParsedResults.length === 0
      ) {
        throw new Error("NoDetected");
      }

      const rawText = data.ParsedResults[0].ParsedText as string;

      // Buscamos cualquier número que tenga de 2 a 3 dígitos
      const numerosEncontrados = rawText.match(/\d{2,3}/g);

      if (numerosEncontrados && numerosEncontrados.length >= 1) {
        // En los glucómetros, a veces lee la hora (ej: 16:12).
        // Vamos a tomar el número más grande que encuentre asumiendo que es la glucosa.
        const numerosOrdenados = numerosEncontrados
          .map(Number)
          .sort((a, b) => b - a);
        const valorGlucosa = String(numerosOrdenados[0]);

        setAyunas(valorGlucosa);
        setPostprandial("");

        Alert.alert(
          "Dato extraído",
          `Se detectó el valor ${valorGlucosa} mg/dL y se colocó en "Ayunas". Si tu medición fue después de comer, por favor bórralo y escríbelo en "Postprandial".`,
        );
      } else {
        throw new Error(
          `Lectura fallida. El escáner leyó esto:\n"${rawText}"\n\nNo logró identificar el número grande de la glucosa.`,
        );
      }
    } catch (error: any) {
      if (error.name === "AbortError") {
        Alert.alert(
          "Tiempo agotado",
          "La API de OCR tardó demasiado en responder. Intenta de nuevo.",
        );
      } else {
        Alert.alert(
          "Lectura fallida",
          error.message !== "NoDetected" && error.message !== "BadResponse"
            ? error.message
            : "No se pudo detectar el número de glucosa con claridad. Por favor ingrésalo de forma manual.",
        );
      }
    } finally {
      clearTimeout(timeoutId);
      setProcesandoFoto(false);
    }
  };

  const guardarRegistro = async () => {
    if (!session?.user?.id) {
      Alert.alert("Error", "No se encontró la sesión del usuario.");
      return;
    }

    if (!ayunas.trim() && !postprandial.trim()) {
      Alert.alert("Campos requeridos", "Ingresa al menos un valor de glucosa.");
      return;
    }

    const ayunasNum = ayunas.trim() ? Number(ayunas) : null;
    const postprandialNum = postprandial.trim() ? Number(postprandial) : null;

    if (
      (ayunasNum !== null && (!Number.isFinite(ayunasNum) || ayunasNum <= 0)) ||
      (postprandialNum !== null &&
        (!Number.isFinite(postprandialNum) || postprandialNum <= 0))
    ) {
      Alert.alert("Datos inválidos", "Ingresa valores válidos de glucosa.");
      return;
    }

    if (
      (ayunasNum !== null && (ayunasNum < 20 || ayunasNum > 600)) ||
      (postprandialNum !== null &&
        (postprandialNum < 20 || postprandialNum > 600))
    ) {
      Alert.alert(
        "Valor irreal",
        "El nivel de glucosa ingresado está fuera de un rango humano realista (20 - 600 mg/dL).",
      );
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.from("glucose_measurements").insert({
        user_id: session.user.id,
        ayunas: ayunasNum,
        postprandial: postprandialNum,
        measured_at: fecha.toISOString(),
      });

      if (error) {
        Alert.alert("Error", "No se pudo guardar el registro.");
        return;
      }

      setModalVisible(true);

      setTimeout(() => {
        setModalVisible(false);
        setAyunas("");
        setPostprandial("");
      }, 1200);
    } catch (e) {
      Alert.alert("Error", "Ocurrió un problema al guardar el registro.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View
      style={[styles.container, { paddingBottom: keyboardVisible ? 0 : 85 }]}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.fotoSeccion}>
            <Text style={styles.fotoTitulo}>Escaneo con cámara</Text>
            <Text style={styles.fotoDescripcion}>
              Toma una foto de la pantalla de tu glucómetro. Por defecto, el
              valor se guardará en "Ayunas".
            </Text>
            <TouchableOpacity
              style={styles.botonFoto}
              onPress={tomarFotoGlucosa}
              disabled={procesandoFoto || loading}
            >
              {procesandoFoto ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.botonFotoTexto}>Capturar monitor</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.divisor} />

          <Text style={styles.seccionTitulo}>Captura Manual</Text>

          <View style={styles.row}>
            <View style={styles.inputBox}>
              <Text style={styles.label}>En ayunas</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={ayunas}
                placeholder="Ej. 95"
                onChangeText={setAyunas}
                editable={!loading && !procesandoFoto}
              />
            </View>

            <View style={[styles.inputBox, { marginRight: 0 }]}>
              <Text style={styles.label}>Postprandial</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={postprandial}
                placeholder="Ej. 140"
                onChangeText={setPostprandial}
                editable={!loading && !procesandoFoto}
              />
            </View>
          </View>

          <View style={styles.fechaContainer}>
            <Text style={styles.label}>Fecha y hora</Text>
            <TouchableOpacity
              onPress={mostrarSelectorFechaYHora}
              disabled={loading || procesandoFoto}
            >
              <Text style={styles.fecha}>{fecha.toLocaleString()}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.boton}
            onPress={guardarRegistro}
            disabled={loading || procesandoFoto}
          >
            <Text style={styles.botonTexto}>
              {loading ? "Guardando..." : "Guardar"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Image
              source={require("../assets/imagenes/correcto.png")}
              style={{ width: 100, height: 100, marginBottom: 20 }}
              resizeMode="contain"
            />
            <Text style={{ fontSize: 18, fontWeight: "bold" }}>
              ¡Registro guardado!
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: 26,
  },
  fotoSeccion: {
    backgroundColor: "#f8f9fa",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  fotoTitulo: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#343a40",
  },
  fotoDescripcion: {
    fontSize: 13,
    color: "#6c757d",
    marginBottom: 16,
    lineHeight: 18,
  },
  botonFoto: {
    backgroundColor: "#28a745",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  botonFotoTexto: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  divisor: {
    height: 1,
    backgroundColor: "#dee2e6",
    marginBottom: 20,
  },
  seccionTitulo: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#212529",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  inputBox: {
    flex: 1,
    marginRight: 14,
  },
  label: {
    fontWeight: "600",
    marginBottom: 8,
    color: "#111",
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  fechaContainer: {
    marginTop: 4,
    marginBottom: 18,
  },
  fecha: {
    color: "#007AFF",
    fontSize: 14,
    marginTop: 10,
  },
  boton: {
    backgroundColor: "#007AFF",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  botonTexto: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
    elevation: 5,
  },
});
