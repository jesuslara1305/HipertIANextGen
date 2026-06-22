import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { useNavigation } from "@react-navigation/native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImageManipulator from "expo-image-manipulator";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../../providers/AuthProvider";
import { supabase } from "../services/supabase";

export default function RegistroPresionManualScreen() {
  const [sistolica, setSistolica] = useState("");
  const [diastolica, setDiastolica] = useState("");
  const [pulso, setPulso] = useState("");
  const [fecha, setFecha] = useState(new Date());
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [procesandoFoto, setProcesandoFoto] = useState(false);

  const [mostrarCamara, setMostrarCamara] = useState(false);
  const [imagenRecortada, setImagenRecortada] = useState<{
    uri: string;
    base64: string;
  } | null>(null);

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);

  const navigation = useNavigation<any>();
  const { session } = useAuth();

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
            is24Hour: true,
            display: "default",
          });
        }
      },
      mode: "date",
      is24Hour: true,
      display: "default",
    });
  };

  const abrirCamara = async () => {
    if (!permission?.granted) {
      const { status } = await requestPermission();
      if (status !== "granted") {
        Alert.alert(
          "Permiso denegado",
          "Se requiere acceso a la cámara para el escáner.",
        );
        return;
      }
    }
    setMostrarCamara(true);
    setImagenRecortada(null);
  };

  const capturarYRecortar = async () => {
    if (!cameraRef.current) return;
    setProcesandoFoto(true);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: false,
        quality: 1,
      });

      const cropWidth = photo.width * 0.35;
      const cropHeight = photo.height * 0.85;
      const originX = (photo.width - cropWidth) / 2;
      const originY = (photo.height - cropHeight) / 2;

      const manipResult = await ImageManipulator.manipulateAsync(
        photo.uri,
        [{ crop: { originX, originY, width: cropWidth, height: cropHeight } }],
        {
          compress: 0.9,
          base64: true,
          format: ImageManipulator.SaveFormat.JPEG,
        },
      );

      if (manipResult.base64) {
        setImagenRecortada({
          uri: manipResult.uri,
          base64: manipResult.base64,
        });
      } else {
        throw new Error("No se pudo generar el recorte.");
      }
    } catch (error) {
      Alert.alert("Error", "Ocurrió un problema al capturar la imagen.");
    } finally {
      setProcesandoFoto(false);
    }
  };

  const procesarImagenConfirmada = async () => {
    if (!imagenRecortada?.base64) return;
    setProcesandoFoto(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const OCR_API_KEY = "K82959862488957";
    const OCR_URL = "https://api.ocr.space/parse/image";

    try {
      const formData = new FormData();
      formData.append(
        "base64Image",
        "data:image/jpeg;base64,${imagenRecortada.base64}",
      );
      formData.append("language", "eng");
      formData.append("isOverlayRequired", "false");
      formData.append("scale", "true");
      formData.append("isTable", "false");
      formData.append("OCREngine", "1");

      const response = await fetch(OCR_URL, {
        method: "POST",
        headers: { apikey: OCR_API_KEY },
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) throw new Error("BadResponse");

      const data = await response.json();

      if (
        data.IsErroredOnProcessing ||
        !data.ParsedResults ||
        data.ParsedResults.length === 0
      ) {
        throw new Error("NoDetected");
      }

      const rawText = data.ParsedResults[0].ParsedText as string;
      const textoLimpio = rawText.replace(/[^\d\s\n]/g, " ").trim();
      const arrayNumerosBrutos = textoLimpio.split(/\s+/).filter(Boolean);

      let valoresMedicosValidos = arrayNumerosBrutos
        .map((numStr) => parseInt(numStr, 10))
        .filter((num) => num >= 30 && num <= 300);
      if (valoresMedicosValidos.length < 2) {
        const digitosPuros = rawText.replace(/\D/g, "");
        if (digitosPuros.length >= 6 && digitosPuros.length <= 8) {
          if (digitosPuros.length === 7) {
            valoresMedicosValidos = [
              parseInt(digitosPuros.slice(0, 3), 10),
              parseInt(digitosPuros.slice(3, 5), 10),
              parseInt(digitosPuros.slice(5), 10),
            ];
          } else if (digitosPuros.length === 6) {
            valoresMedicosValidos = [
              parseInt(digitosPuros.slice(0, 2), 10),
              parseInt(digitosPuros.slice(2, 4), 10),
              parseInt(digitosPuros.slice(4), 10),
            ];
          } else if (digitosPuros.length === 8) {
            valoresMedicosValidos = [
              parseInt(digitosPuros.slice(0, 3), 10),
              parseInt(digitosPuros.slice(3, 6), 10),
              parseInt(digitosPuros.slice(6), 10),
            ];
          } else if (digitosPuros.length === 5) {
            valoresMedicosValidos = [
              parseInt(digitosPuros.slice(0, 3), 10),
              parseInt(digitosPuros.slice(3, 5), 10),
            ];
          }
        }
      }

      if (valoresMedicosValidos.length >= 2) {
        setSistolica(valoresMedicosValidos[0].toString());
        setDiastolica(valoresMedicosValidos[1].toString());

        if (valoresMedicosValidos.length >= 3) {
          setPulso(valoresMedicosValidos[2].toString());
        }

        Alert.alert(
          "Extracción exitosa",
          "Revisa que los datos en los campos coincidan exactamente con tu foto.",
        );
        setMostrarCamara(false);
        setImagenRecortada(null);
      } else {
        throw new Error(
          `La IA no pudo descifrar los dígitos con claridad.\n\nIntentó leer:\n"${rawText}"\n\nPrueba tomar la foto evitando los reflejos en la pantalla.`,
        );
      }
    } catch (error: any) {
      if (error.name === "AbortError") {
        Alert.alert(
          "Tiempo agotado",
          "La IA tardó demasiado en procesar la foto por problemas de red.",
        );
      } else {
        Alert.alert(
          "Lectura fallida",
          error.message !== "NoDetected" && error.message !== "BadResponse"
            ? error.message
            : "No se pudieron aislar los números con claridad.",
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

    if (!sistolica.trim() || !diastolica.trim() || !pulso.trim()) {
      Alert.alert(
        "Campos requeridos",
        "Ingresa la presión sistólica, diastólica y el pulso.",
      );
      return;
    }

    const sistolicaNum = Number(sistolica);
    const diastolicaNum = Number(diastolica);
    const pulsoNum = Number(pulso);

    if (
      !Number.isFinite(sistolicaNum) ||
      !Number.isFinite(diastolicaNum) ||
      !Number.isFinite(pulsoNum)
    ) {
      Alert.alert("Datos inválidos", "Ingresa valores numéricos válidos.");
      return;
    }
    if (sistolicaNum < 60 || sistolicaNum > 300) {
      Alert.alert(
        "Valor irreal",
        "La presión sistólica ingresada está fuera de rango.",
      );
      return;
    }
    if (diastolicaNum < 40 || diastolicaNum > 200) {
      Alert.alert(
        "Valor irreal",
        "La presión diastólica ingresada está fuera de rango.",
      );
      return;
    }
    if (diastolicaNum >= sistolicaNum) {
      Alert.alert(
        "Datos inválidos",
        "La presión sistólica siempre debe ser mayor a la diastólica.",
      );
      return;
    }
    if (pulsoNum < 30 || pulsoNum > 250) {
      Alert.alert("Valor irreal", "El pulso ingresado está fuera de rango.");
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.from("bp_measurements").insert({
        user_id: session.user.id,
        systolica: sistolicaNum,
        diastolica: diastolicaNum,
        heart_rate: pulsoNum,
        measured_at: fecha.toISOString(),
        source: "manual",
      });

      if (error) {
        Alert.alert("Error", "No se pudo guardar la medición.");
        return;
      }

      setModalVisible(true);

      setTimeout(() => {
        setModalVisible(false);
        setSistolica("");
        setDiastolica("");
        setPulso("");
      }, 1200);
    } catch (e) {
      Alert.alert("Error", "Ocurrió un problema al guardar la medición.");
    } finally {
      setLoading(false);
    }
  };

  if (mostrarCamara && imagenRecortada) {
    return (
      <View style={styles.previewContainer}>
        <Text style={styles.previewTitle}>Verifica tu foto</Text>
        <Text style={styles.previewSubtitle}>
          ¿Los números se ven claros y grandes? Si hay mucho brillo o salieron
          borrosos, vuelve a intentarlo.
        </Text>

        <Image
          source={{ uri: imagenRecortada.uri }}
          style={styles.previewImage}
          resizeMode="contain"
        />

        <View style={styles.previewActions}>
          <TouchableOpacity
            style={styles.btnReintentar}
            onPress={() => setImagenRecortada(null)}
            disabled={procesandoFoto}
          >
            <Text style={styles.btnText}>Reintentar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnExtraer}
            onPress={procesarImagenConfirmada}
            disabled={procesandoFoto}
          >
            {procesandoFoto ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Procesar IA</Text>
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
                  Solo números. Evita el brillo.
                </Text>
              </View>

              <View style={styles.unfocusedContainer} />
            </View>

            <View style={styles.unfocusedBottomContainer}>
              <View style={styles.cameraActions}>
                <TouchableOpacity
                  style={styles.cancelarCamaraBtn}
                  onPress={() => setMostrarCamara(false)}
                >
                  <Text style={styles.cancelarCamaraText}>Volver</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.captureBtn}
                  onPress={capturarYRecortar}
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
    <ScrollView
      style={{ flex: 1, backgroundColor: "#fff" }}
      contentContainerStyle={styles.container}
    >
      <View style={styles.fotoSeccion}>
        <Text style={styles.fotoTitulo}>Escaneo Guiado de Pantalla</Text>
        <Text style={styles.fotoDescripcion}>
          Abre la cámara y alinea los 3 números grandes dentro del marco verde.
          Luego presiona el botón para procesar la imagen con Inteligencia
          Artificial.
        </Text>
        <TouchableOpacity
          style={styles.botonFoto}
          onPress={abrirCamara}
          disabled={loading}
        >
          <Text style={styles.botonFotoTexto}>Abrir Escáner</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.divisor} />

      <Text style={styles.seccionTitulo}>Captura Manual</Text>

      <View style={styles.row}>
        <View style={[styles.inputBox, { marginRight: 8 }]}>
          <Text style={styles.label}>Sistólica</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            placeholder="Ej. 120"
            value={sistolica}
            onChangeText={setSistolica}
            editable={!loading}
          />
        </View>

        <View style={[styles.inputBox, { marginRight: 8 }]}>
          <Text style={styles.label}>Diastólica</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            placeholder="Ej. 80"
            value={diastolica}
            onChangeText={setDiastolica}
            editable={!loading}
          />
        </View>

        <View style={styles.inputBox}>
          <Text style={styles.label}>Pulso</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            placeholder="Ej. 70"
            value={pulso}
            onChangeText={setPulso}
            editable={!loading}
          />
        </View>
      </View>

      <View style={styles.fechaContainer}>
        <Text style={styles.label}>Fecha y hora</Text>
        <TouchableOpacity
          onPress={mostrarSelectorFechaYHora}
          disabled={loading}
        >
          <Text style={styles.fecha}>{fecha.toLocaleString()}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.boton}
        onPress={guardarRegistro}
        disabled={loading}
      >
        <Text style={styles.botonTexto}>
          {loading ? "Guardando..." : "Guardar"}
        </Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Image
              source={require("../assets/imagenes/correcto.png")}
              style={{ width: 100, height: 100, marginBottom: 20 }}
              resizeMode="contain"
            />
            <Text style={{ fontSize: 18, fontWeight: "bold" }}>
              ¡Medición guardada!
            </Text>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, flexGrow: 1, backgroundColor: "#fff" },
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
  botonFotoTexto: { color: "#fff", fontSize: 15, fontWeight: "600" },
  divisor: { height: 1, backgroundColor: "#dee2e6", marginBottom: 20 },
  seccionTitulo: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#212529",
  },
  row: { flexDirection: "row", justifyContent: "space-between" },
  inputBox: { flex: 1 },
  label: { fontWeight: "600", marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  fechaContainer: { marginBottom: 20 },
  fecha: { color: "#007AFF", fontSize: 16, marginTop: 8 },
  boton: {
    backgroundColor: "#007AFF",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  botonTexto: { color: "#fff", fontSize: 16, fontWeight: "600" },
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
  btnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },

  cameraScreen: { flex: 1, backgroundColor: "black" },
  camera: { flex: 1 },
  overlay: { flex: 1 },
  unfocusedContainer: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)" },
  unfocusedBottomContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
  },
  middleContainer: { flexDirection: "row", height: "55%" },
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
  cancelarCamaraText: { color: "white", fontSize: 16, fontWeight: "bold" },
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
