import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { useNavigation } from "@react-navigation/native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImageManipulator from "expo-image-manipulator";
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

type ImagenGlucosa = {
  uri: string;
  base64: string;
};

const GLUCOSA_API_URL = "https://hipergia-api.onrender.com/leer-glucosa";

export default function RegistroGlucosaManualScreen() {
  const [ayunas, setAyunas] = useState("");
  const [postprandial, setPostprandial] = useState("");
  const [fecha, setFecha] = useState(new Date());
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [procesandoFoto, setProcesandoFoto] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const [mostrarCamara, setMostrarCamara] = useState(false);
  const [imagenCapturada, setImagenCapturada] = useState<ImagenGlucosa | null>(
    null,
  );

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);

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

  const prepararImagenGlucosa = async (uri: string): Promise<ImagenGlucosa> => {
    const manipResult = await ImageManipulator.manipulateAsync(
      uri,
      [
        {
          resize: {
            width: 1000,
          },
        },
      ],
      {
        compress: 0.75,
        base64: true,
        format: ImageManipulator.SaveFormat.JPEG,
      },
    );

    if (!manipResult.base64) {
      throw new Error("No se pudo preparar la imagen.");
    }

    return {
      uri: manipResult.uri,
      base64: manipResult.base64,
    };
  };

  const abrirCamaraGlucosa = async () => {
    if (!permission?.granted) {
      const { status } = await requestPermission();

      if (status !== "granted") {
        Alert.alert("Permiso denegado", "Se requiere acceso a la cámara.");
        return;
      }
    }

    setMostrarCamara(true);
    setImagenCapturada(null);
  };

  const capturarFotoGlucosa = async () => {
    if (!cameraRef.current) return;

    setProcesandoFoto(true);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: false,
        quality: 1,
      });

      const imagenPreparada = await prepararImagenGlucosa(photo.uri);
      setImagenCapturada(imagenPreparada);
    } catch (error: any) {
      Alert.alert(
        "Error",
        error?.message || "Ocurrió un problema al capturar la imagen.",
      );
    } finally {
      setProcesandoFoto(false);
    }
  };

  const seleccionarImagenGaleria = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      Alert.alert(
        "Permiso denegado",
        "Se requiere acceso a la galería para seleccionar una imagen.",
      );
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 1,
        base64: false,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      setProcesandoFoto(true);

      const asset = result.assets[0];
      const imagenPreparada = await prepararImagenGlucosa(asset.uri);

      setMostrarCamara(false);
      setImagenCapturada(imagenPreparada);
    } catch (error: any) {
      Alert.alert(
        "Error",
        error?.message || "Ocurrió un problema al seleccionar la imagen.",
      );
    } finally {
      setProcesandoFoto(false);
    }
  };

  const llamarGeminiGlucosa = async (imagen: ImagenGlucosa) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      console.log("Enviando glucosa a:", GLUCOSA_API_URL);
      console.log("Tamaño base64 glucosa:", imagen.base64.length);

      const response = await fetch(GLUCOSA_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageBase64: imagen.base64,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      console.log("RESPUESTA GLUCOSA:", data);

      if (!response.ok || !data.ok) {
        throw new Error(
          data?.message ||
            "No se pudo detectar el valor de glucosa en la imagen.",
        );
      }

      return data;
    } catch (error: any) {
      clearTimeout(timeoutId);

      console.log("ERROR GLUCOSA:", error);

      if (error.name === "AbortError") {
        throw new Error(
          "El servidor tardó demasiado en responder. Intenta con una imagen más clara o menos pesada.",
        );
      }

      throw new Error(
        error?.message ||
          "No se pudo conectar con el servidor. Verifica que Flask esté encendido y que la IP sea correcta.",
      );
    }
  };

  const aplicarValorDetectado = (valor: number) => {
    Alert.alert(
      "Valor detectado",
      `Se detectó: ${valor} mg/dL\n\n¿Dónde quieres colocar este valor?`,
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Ayunas",
          onPress: () => {
            setAyunas(valor.toString());
            setPostprandial("");
            setMostrarCamara(false);
            setImagenCapturada(null);
          },
        },
        {
          text: "Postprandial",
          onPress: () => {
            setPostprandial(valor.toString());
            setAyunas("");
            setMostrarCamara(false);
            setImagenCapturada(null);
          },
        },
      ],
      { cancelable: true },
    );
  };

  const procesarImagenGlucosa = async () => {
    if (!imagenCapturada?.base64) return;

    setProcesandoFoto(true);

    try {
      const resultado = await llamarGeminiGlucosa(imagenCapturada);
      const valorGlucosa = Number(resultado.glucosa);

      if (!Number.isFinite(valorGlucosa)) {
        throw new Error("La respuesta no contiene un valor válido de glucosa.");
      }

      if (valorGlucosa < 20 || valorGlucosa > 600) {
        throw new Error(
          "El valor detectado está fuera de un rango humano realista.",
        );
      }

      aplicarValorDetectado(valorGlucosa);
    } catch (error: any) {
      Alert.alert(
        "Lectura fallida",
        error?.message ||
          "No se pudo detectar el número de glucosa. Intenta con una foto más cercana y clara.",
      );
    } finally {
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

  if (imagenCapturada) {
    return (
      <View style={styles.previewContainer}>
        <Text style={styles.previewTitle}>Verifica tu foto</Text>

        <Text style={styles.previewSubtitle}>
          Asegúrate de que el número principal del glucómetro se vea claro,
          grande y sin reflejos.
        </Text>

        <Image
          source={{ uri: imagenCapturada.uri }}
          style={styles.previewImage}
          resizeMode="contain"
        />

        <View style={styles.previewActions}>
          <TouchableOpacity
            style={styles.btnReintentar}
            onPress={() => setImagenCapturada(null)}
            disabled={procesandoFoto}
          >
            <Text style={styles.btnText}>Reintentar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnExtraer}
            onPress={procesarImagenGlucosa}
            disabled={procesandoFoto}
          >
            {procesandoFoto ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Procesar imagen</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (mostrarCamara) {
    return (
      <View style={styles.cameraScreen}>
        <CameraView style={styles.camera} ref={cameraRef} facing="back">
          <View style={styles.overlay}>
            <View style={styles.unfocusedContainer} />

            <View style={styles.middleContainer}>
              <View style={styles.unfocusedContainer} />

              <View style={styles.focusedBox}>
                <View style={styles.cornerTopLeft} />
                <View style={styles.cornerTopRight} />
                <View style={styles.cornerBottomLeft} />
                <View style={styles.cornerBottomRight} />

                <Text style={styles.instruccionScanner}>ALINEAR</Text>
                <Text style={styles.instruccionScannerInfo}>
                  Coloca el número grande del glucómetro.
                </Text>
              </View>

              <View style={styles.unfocusedContainer} />
            </View>

            <View style={styles.unfocusedBottomContainer}>
              <View style={styles.cameraActions}>
                <TouchableOpacity
                  style={styles.cancelarCamaraBtn}
                  onPress={() => {
                    setMostrarCamara(false);
                    setImagenCapturada(null);
                  }}
                >
                  <Text style={styles.cancelarCamaraText}>Volver</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.captureBtn}
                  onPress={capturarFotoGlucosa}
                  disabled={procesandoFoto}
                >
                  {procesandoFoto ? (
                    <ActivityIndicator color="#000" size="large" />
                  ) : (
                    <View style={styles.captureBtnInner} />
                  )}
                </TouchableOpacity>

                <View style={{ width: 80 }} />
              </View>
            </View>
          </View>
        </CameraView>
      </View>
    );
  }

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
            <Text style={styles.fotoTitulo}>Escaneo de glucómetro</Text>

            <Text style={styles.fotoDescripcion}>
              Toma una foto o sube una imagen de la pantalla de tu glucómetro.
              La app detectará el número grande de glucosa y después podrás
              elegir si corresponde a "Ayunas" o "Postprandial".
            </Text>

            <TouchableOpacity
              style={styles.botonFoto}
              onPress={abrirCamaraGlucosa}
              disabled={procesandoFoto || loading}
            >
              {procesandoFoto ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.botonFotoTexto}>Abrir escáner</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.botonGaleria}
              onPress={seleccionarImagenGaleria}
              disabled={procesandoFoto || loading}
            >
              {procesandoFoto ? (
                <ActivityIndicator color="#007AFF" />
              ) : (
                <Text style={styles.botonGaleriaTexto}>
                  Subir imagen desde galería
                </Text>
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

  botonGaleria: {
    marginTop: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#007AFF",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },

  botonGaleriaTexto: {
    color: "#007AFF",
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

  previewContainer: {
    flex: 1,
    backgroundColor: "#111",
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
  },

  previewTitle: {
    color: "#4CAF50",
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 10,
  },

  previewSubtitle: {
    color: "#ccc",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 30,
    lineHeight: 20,
  },

  previewImage: {
    width: "100%",
    height: 350,
    borderColor: "#4CAF50",
    borderWidth: 2,
    borderRadius: 10,
    marginBottom: 40,
    backgroundColor: "#222",
  },

  previewActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },

  btnReintentar: {
    backgroundColor: "#dc3545",
    padding: 15,
    borderRadius: 10,
    flex: 1,
    marginRight: 10,
    alignItems: "center",
  },

  btnExtraer: {
    backgroundColor: "#28a745",
    padding: 15,
    borderRadius: 10,
    flex: 1,
    marginLeft: 10,
    alignItems: "center",
  },

  btnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },

  cameraScreen: {
    flex: 1,
    backgroundColor: "black",
  },

  camera: {
    flex: 1,
  },

  overlay: {
    flex: 1,
  },

  unfocusedContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
  },

  unfocusedBottomContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
  },

  middleContainer: {
    flexDirection: "row",
    height: "55%",
  },

  focusedBox: {
    width: "45%",
    borderColor: "#4CAF50",
    borderWidth: 3,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },

  instruccionScanner: {
    color: "#4CAF50",
    fontSize: 20,
    fontWeight: "bold",
    opacity: 0.9,
    textAlign: "center",
    letterSpacing: 1,
  },

  instruccionScannerInfo: {
    color: "#fff",
    fontSize: 12,
    opacity: 0.7,
    marginTop: 5,
    textAlign: "center",
    paddingHorizontal: 8,
  },

  cameraActions: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    width: "100%",
  },

  cancelarCamaraBtn: {
    padding: 15,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 10,
  },

  cancelarCamaraText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },

  captureBtn: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },

  captureBtnInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#000",
  },

  cornerTopLeft: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 20,
    height: 20,
    borderTopWidth: 5,
    borderLeftWidth: 5,
    borderColor: "#4CAF50",
  },

  cornerTopRight: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 20,
    height: 20,
    borderTopWidth: 5,
    borderRightWidth: 5,
    borderColor: "#4CAF50",
  },

  cornerBottomLeft: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: 20,
    height: 20,
    borderBottomWidth: 5,
    borderLeftWidth: 5,
    borderColor: "#4CAF50",
  },

  cornerBottomRight: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderBottomWidth: 5,
    borderRightWidth: 5,
    borderColor: "#4CAF50",
  },
});
