import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
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

type ImagenOCR = {
  uri: string;
  base64: string;
  width: number;
  height: number;
};

type CandidatoNumero = {
  valor: number;
  top: number;
  left: number;
  height: number;
  raw: string;
  fuente: "overlay" | "texto";
};

type ValoresDetectados = {
  sistolica: number;
  diastolica: number;
  pulso: number;
  rawText: string;
};

const OPENCV_API_URL = "https://hipergia-api.onrender.com/leer-presion";

const esNumeroValidoGeneral = (num: number) => {
  return Number.isFinite(num) && num >= 30 && num <= 300;
};

const esTrioMedicoValido = (
  sistolica: number,
  diastolica: number,
  pulso: number,
) => {
  if (sistolica < 60 || sistolica > 300) return false;
  if (diastolica < 40 || diastolica > 200) return false;
  if (pulso < 30 || pulso > 250) return false;
  if (diastolica >= sistolica) return false;

  return true;
};

const normalizarTokenParaOCR = (token: string) => {
  let limpio = token.trim();

  limpio = limpio.replace(/[Oo]/g, "0");
  limpio = limpio.replace(/[Il|!]/g, "1");

  /*
    Solo convertimos S en 5 cuando el token es corto.
    Esto evita que palabras como SYS se conviertan en números falsos.
  */
  if (limpio.length <= 4 && /\d/.test(limpio)) {
    limpio = limpio.replace(/[Ss]/g, "5");
  }

  return limpio;
};

const extraerNumerosDeToken = (token: string) => {
  const limpio = normalizarTokenParaOCR(token);
  const grupos = limpio.match(/\d+/g) || [];

  const numeros: number[] = [];

  grupos.forEach((grupo) => {
    if (grupo.length >= 2 && grupo.length <= 3) {
      const num = parseInt(grupo, 10);
      if (esNumeroValidoGeneral(num)) {
        numeros.push(num);
      }
    }
  });

  return numeros;
};

const extraerCandidatosDesdeTexto = (rawText: string): CandidatoNumero[] => {
  const candidatos: CandidatoNumero[] = [];
  const lineas = rawText.split(/\n/).map((linea) => linea.trim());
  let orden = 0;

  lineas.forEach((linea) => {
    if (!linea) return;

    const tokens = linea
      .replace(/[/:;,_-]/g, " ")
      .split(/\s+/)
      .filter(Boolean);

    tokens.forEach((token) => {
      const numeros = extraerNumerosDeToken(token);

      numeros.forEach((num) => {
        candidatos.push({
          valor: num,
          top: orden * 100,
          left: 0,
          height: 20,
          raw: token,
          fuente: "texto",
        });

        orden += 1;
      });
    });
  });

  return candidatos;
};

const extraerCandidatosDesdeOverlay = (
  parsedResult: any,
): CandidatoNumero[] => {
  const candidatos: CandidatoNumero[] = [];
  const lineas = parsedResult?.TextOverlay?.Lines || [];

  lineas.forEach((linea: any, lineaIndex: number) => {
    const palabras = linea?.Words || [];
    const lineTop = Number(linea?.MinTop ?? lineaIndex * 100);
    const lineHeight = Number(linea?.MaxHeight ?? 20);

    palabras.forEach((palabra: any) => {
      const raw = String(palabra?.WordText ?? "").trim();
      if (!raw) return;

      const numeros = extraerNumerosDeToken(raw);

      numeros.forEach((num) => {
        candidatos.push({
          valor: num,
          top: Number(palabra?.Top ?? lineTop),
          left: Number(palabra?.Left ?? 0),
          height: Number(palabra?.Height ?? lineHeight),
          raw,
          fuente: "overlay",
        });
      });
    });
  });

  return candidatos;
};

const limpiarDuplicadosCercanos = (candidatos: CandidatoNumero[]) => {
  const ordenados = [...candidatos].sort((a, b) => {
    if (a.top !== b.top) return a.top - b.top;
    return a.left - b.left;
  });

  const resultado: CandidatoNumero[] = [];

  ordenados.forEach((actual) => {
    const repetido = resultado.some((guardado) => {
      const mismoValor = guardado.valor === actual.valor;
      const cercaVertical = Math.abs(guardado.top - actual.top) <= 18;
      const cercaHorizontal = Math.abs(guardado.left - actual.left) <= 40;

      return mismoValor && cercaVertical && cercaHorizontal;
    });

    if (!repetido) {
      resultado.push(actual);
    }
  });

  return resultado;
};

const seleccionarMejorTrio = (candidatos: CandidatoNumero[]) => {
  const filtrados = limpiarDuplicadosCercanos(
    candidatos.filter((c) => esNumeroValidoGeneral(c.valor)),
  );

  if (filtrados.length < 3) return null;

  const ordenados = [...filtrados].sort((a, b) => {
    if (a.top !== b.top) return a.top - b.top;
    return a.left - b.left;
  });

  let mejorTrio: [CandidatoNumero, CandidatoNumero, CandidatoNumero] | null =
    null;
  let mejorPuntaje = -Infinity;

  for (let i = 0; i < ordenados.length - 2; i++) {
    for (let j = i + 1; j < ordenados.length - 1; j++) {
      for (let k = j + 1; k < ordenados.length; k++) {
        const a = ordenados[i];
        const b = ordenados[j];
        const c = ordenados[k];

        const sistolica = a.valor;
        const diastolica = b.valor;
        const pulso = c.valor;

        if (!esTrioMedicoValido(sistolica, diastolica, pulso)) {
          continue;
        }

        const alturaTotal = a.height + b.height + c.height;
        const diferenciaHorizontal =
          Math.abs(a.left - b.left) + Math.abs(b.left - c.left);

        const distanciaAB = Math.abs(b.top - a.top);
        const distanciaBC = Math.abs(c.top - b.top);
        const equilibrioVertical = Math.abs(distanciaAB - distanciaBC);

        let puntaje = 0;

        /*
          Los números grandes del display suelen tener mayor altura.
          Por eso les damos más peso.
        */
        puntaje += alturaTotal * 10;

        /*
          Los 3 valores del baumanómetro suelen estar alineados en columna.
        */
        puntaje -= diferenciaHorizontal * 0.15;

        /*
          Normalmente están separados de forma relativamente uniforme.
        */
        puntaje -= equilibrioVertical * 0.05;

        /*
          Rangos comunes para presión y pulso.
        */
        if (sistolica >= 80 && sistolica <= 220) puntaje += 30;
        if (diastolica >= 45 && diastolica <= 130) puntaje += 30;
        if (pulso >= 40 && pulso <= 180) puntaje += 30;

        if (puntaje > mejorPuntaje) {
          mejorPuntaje = puntaje;
          mejorTrio = [a, b, c];
        }
      }
    }
  }

  if (!mejorTrio) return null;

  return {
    sistolica: mejorTrio[0].valor,
    diastolica: mejorTrio[1].valor,
    pulso: mejorTrio[2].valor,
  };
};

const detectarPorDigitosPegados = (rawText: string) => {
  const normalizado = rawText
    .replace(/[Oo]/g, "0")
    .replace(/[Il|!]/g, "1")
    .replace(/[Ss]/g, "5");

  const digitos = normalizado.replace(/\D/g, "");

  const probarTrio = (a: string, b: string, c: string) => {
    const sistolica = parseInt(a, 10);
    const diastolica = parseInt(b, 10);
    const pulso = parseInt(c, 10);

    if (esTrioMedicoValido(sistolica, diastolica, pulso)) {
      return { sistolica, diastolica, pulso };
    }

    return null;
  };

  if (digitos.length === 7) {
    return probarTrio(
      digitos.slice(0, 3),
      digitos.slice(3, 5),
      digitos.slice(5, 7),
    );
  }

  if (digitos.length === 6) {
    return probarTrio(
      digitos.slice(0, 2),
      digitos.slice(2, 4),
      digitos.slice(4, 6),
    );
  }

  if (digitos.length === 8) {
    const opcion1 = probarTrio(
      digitos.slice(0, 3),
      digitos.slice(3, 6),
      digitos.slice(6, 8),
    );

    if (opcion1) return opcion1;

    return probarTrio(
      digitos.slice(0, 3),
      digitos.slice(3, 5),
      digitos.slice(5, 8),
    );
  }

  return null;
};

const extraerValoresMedicion = (data: any): ValoresDetectados => {
  const parsedResult = data?.ParsedResults?.[0];

  if (!parsedResult) {
    throw new Error("NoDetected");
  }

  const rawText = String(parsedResult?.ParsedText ?? "");

  console.log("TEXTO OCR COMPLETO:", rawText);

  const candidatosOverlay = extraerCandidatosDesdeOverlay(parsedResult);
  console.log("CANDIDATOS OVERLAY:", candidatosOverlay);

  const trioOverlay = seleccionarMejorTrio(candidatosOverlay);

  if (trioOverlay) {
    return {
      ...trioOverlay,
      rawText,
    };
  }

  const candidatosTexto = extraerCandidatosDesdeTexto(rawText);
  console.log("CANDIDATOS TEXTO:", candidatosTexto);

  const trioTexto = seleccionarMejorTrio(candidatosTexto);

  if (trioTexto) {
    return {
      ...trioTexto,
      rawText,
    };
  }

  const trioPegado = detectarPorDigitosPegados(rawText);

  if (trioPegado) {
    return {
      ...trioPegado,
      rawText,
    };
  }

  throw new Error(
    `No se pudieron identificar 3 valores médicos válidos.\n\nOCR leyó:\n"${rawText}"`,
  );
};

export default function RegistroPresionManualScreen() {
  const [sistolica, setSistolica] = useState("");
  const [diastolica, setDiastolica] = useState("");
  const [pulso, setPulso] = useState("");
  const [fecha, setFecha] = useState(new Date());
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [procesandoFoto, setProcesandoFoto] = useState(false);

  const [mostrarCamara, setMostrarCamara] = useState(false);
  const [imagenRecortada, setImagenRecortada] = useState<ImagenOCR | null>(
    null,
  );

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);

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

  const prepararImagenParaOCR = async (
    uri: string,
    width?: number,
    height?: number,
    usarRecorteCentral = false,
  ): Promise<ImagenOCR> => {
    const acciones: any[] = [];

    if (usarRecorteCentral && width && height) {
      /*
        Este recorte debe coincidir con el marco verde.
        Antes tu recorte era muy angosto y muy alto.
        Eso podía cortar números o meter partes innecesarias.
      */
      const cropWidth = Math.round(width * 0.52);
      const cropHeight = Math.round(height * 0.62);
      const originX = Math.round((width - cropWidth) / 2);
      const originY = Math.round((height - cropHeight) / 2);

      acciones.push({
        crop: {
          originX,
          originY,
          width: cropWidth,
          height: cropHeight,
        },
      });

      acciones.push({
        resize: {
          width: 800,
        },
      });
    } else {
      acciones.push({
        resize: {
          width: 1000,
        },
      });
    }

    const manipResult = await ImageManipulator.manipulateAsync(uri, acciones, {
      compress: 0.7,
      base64: true,
      format: ImageManipulator.SaveFormat.JPEG,
    });

    if (!manipResult.base64) {
      throw new Error("No se pudo generar la imagen en base64.");
    }

    return {
      uri: manipResult.uri,
      base64: manipResult.base64,
      width: manipResult.width,
      height: manipResult.height,
    };
  };

  const crearVarianteParaOCR = async (
    imagen: ImagenOCR,
    tipo: "digitos" | "lcd" | "original",
  ): Promise<ImagenOCR> => {
    if (tipo === "original") {
      return imagen;
    }

    const width = imagen.width;
    const height = imagen.height;

    let crop;

    if (tipo === "digitos") {
      /*
      Esta variante intenta dejar solamente los números grandes.
      Quita casi todo el texto de la derecha: SYS, DIA, PUL, mmHg.
    */
      crop = {
        originX: Math.round(width * 0.18),
        originY: Math.round(height * 0.02),
        width: Math.round(width * 0.56),
        height: Math.round(height * 0.92),
      };
    } else {
      /*
      Esta variante deja toda la pantalla LCD,
      pero elimina la columna derecha de textos.
    */
      crop = {
        originX: 0,
        originY: 0,
        width: Math.round(width * 0.76),
        height,
      };
    }

    const manipResult = await ImageManipulator.manipulateAsync(
      imagen.uri,
      [
        {
          crop,
        },
        {
          resize: {
            width: 1600,
          },
        },
      ],
      {
        compress: 1,
        base64: true,
        format: ImageManipulator.SaveFormat.JPEG,
      },
    );

    if (!manipResult.base64) {
      throw new Error("No se pudo preparar la variante para OCR.");
    }

    return {
      uri: manipResult.uri,
      base64: manipResult.base64,
      width: manipResult.width,
      height: manipResult.height,
    };
  };
  /*
  const llamarOCR = async (imagen: ImagenOCR, signal: AbortSignal) => {
    const formData = new FormData();

    formData.append("base64Image", `data:image/jpeg;base64,${imagen.base64}`);

    formData.append("language", "eng");
    formData.append("isOverlayRequired", "true");
    formData.append("scale", "true");
    formData.append("isTable", "false");
    formData.append("detectOrientation", "true");
    formData.append("OCREngine", "2");

    const response = await fetch(OCR_URL, {
      method: "POST",
      headers: {
        apikey: OCR_API_KEY,
      },
      body: formData,
      signal,
    });

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

    return data;
  };
  */

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

  const seleccionarImagenGaleria = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permiso denegado",
          "Se requiere acceso a la galería para seleccionar una imagen.",
        );
        return;
      }

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

      const asset = result.assets[0];

      setProcesandoFoto(true);

      const imagenPreparada = await prepararImagenParaOCR(
        asset.uri,
        asset.width,
        asset.height,
        false,
      );

      setMostrarCamara(false);
      setImagenRecortada(imagenPreparada);
    } catch (error) {
      Alert.alert(
        "Error",
        "Ocurrió un problema al seleccionar o preparar la imagen.",
      );
    } finally {
      setProcesandoFoto(false);
    }
  };

  const capturarYRecortar = async () => {
    if (!cameraRef.current) return;

    setProcesandoFoto(true);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: false,
        quality: 1,
      });

      const imagenPreparada = await prepararImagenParaOCR(
        photo.uri,
        photo.width,
        photo.height,
        true,
      );

      setImagenRecortada(imagenPreparada);
    } catch (error) {
      Alert.alert("Error", "Ocurrió un problema al capturar la imagen.");
    } finally {
      setProcesandoFoto(false);
    }
  };

  const aplicarValoresDetectados = (valores: ValoresDetectados) => {
    Alert.alert(
      "Valores detectados",
      `Sistólica: ${valores.sistolica}\nDiastólica: ${valores.diastolica}\nPulso: ${valores.pulso}\n\nRevisa que coincidan con la foto antes de guardar.`,
      [
        {
          text: "Reintentar",
          style: "cancel",
        },
        {
          text: "Usar datos",
          onPress: () => {
            setSistolica(valores.sistolica.toString());
            setDiastolica(valores.diastolica.toString());
            setPulso(valores.pulso.toString());

            setMostrarCamara(false);
            setImagenRecortada(null);
          },
        },
      ],
      { cancelable: false },
    );
  };

  const llamarOpenCV = async (imagen: ImagenOCR) => {
    const response = await fetch(OPENCV_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true", // <--- EL TRUCO MAGICO QUE SALTA LA PANTALLA
      },
      body: JSON.stringify({
        imageBase64: imagen.base64,
      }),
    });

    // Validamos si la respuesta es realmente JSON antes de parsearla
    const textResponse = await response.text();

    try {
      const data = JSON.parse(textResponse);
      console.log("RESPUESTA OPENCV:", data);

      if (!response.ok || !data.ok) {
        throw new Error(
          data?.attempts
            ? `No se detectaron valores válidos.\n\nIntentos:\n${JSON.stringify(
                data.attempts,
                null,
                2,
              )}`
            : data?.message || "No se pudo leer la imagen.",
        );
      }

      return data;
    } catch (e) {
      // Si vuelve a fallar, este console.log te dirá EXACTAMENTE qué página HTML te está devolviendo
      console.log("HTML RECIBIDO EN VEZ DE JSON:", textResponse);
      throw new Error(
        "El servidor no devolvió datos válidos. Revisa la terminal de Python o asegúrate de que la URL termine en /leer-presion",
      );
    }
  };

  const procesarImagenConfirmada = async () => {
    if (!imagenRecortada?.base64) return;

    setProcesandoFoto(true);

    try {
      const resultado = await llamarOpenCV(imagenRecortada);

      aplicarValoresDetectados({
        sistolica: resultado.sistolica,
        diastolica: resultado.diastolica,
        pulso: resultado.pulso,
        rawText: "Lectura realizada con OpenCV",
      });
    } catch (error: any) {
      Alert.alert(
        "Lectura fallida",
        error?.message ||
          "No se pudieron detectar los valores. Intenta tomar la foto más cerca, centrando solo la pantalla del baumanómetro.",
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

  if (imagenRecortada) {
    return (
      <View style={styles.previewContainer}>
        <Text style={styles.previewTitle}>Verifica tu foto</Text>

        <Text style={styles.previewSubtitle}>
          Asegúrate de que los 3 números principales se vean claros, grandes y
          sin reflejos. Si se ven borrosos, vuelve a intentarlo.
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
                  Coloca solo los 3 números grandes.
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
                    setImagenRecortada(null);
                  }}
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
        <Text style={styles.fotoTitulo}>Escaneo de Baumanómetro</Text>

        <Text style={styles.fotoDescripcion}>
          Puedes tomar una foto directa al baumanómetro o subir una imagen desde
          la galería. La app intentará detectar sistólica, diastólica y pulso.
        </Text>

        <TouchableOpacity
          style={styles.botonFoto}
          onPress={abrirCamara}
          disabled={loading || procesandoFoto}
        >
          <Text style={styles.botonFotoTexto}>Abrir Escáner</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.botonGaleria}
          onPress={seleccionarImagenGaleria}
          disabled={loading || procesandoFoto}
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
  },

  inputBox: {
    flex: 1,
  },

  label: {
    fontWeight: "600",
    marginBottom: 6,
  },

  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },

  fechaContainer: {
    marginBottom: 20,
  },

  fecha: {
    color: "#007AFF",
    fontSize: 16,
    marginTop: 8,
  },

  boton: {
    backgroundColor: "#007AFF",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },

  botonTexto: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
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
