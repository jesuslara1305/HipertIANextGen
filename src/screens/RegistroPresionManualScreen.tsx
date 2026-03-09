import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { useNavigation } from "@react-navigation/native";
import React, { useState } from "react";
import {
  Alert,
  Image,
  Modal,
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
  const [fecha, setFecha] = useState(new Date());
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);

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

  const guardarRegistro = async () => {
    if (!session?.user?.id) {
      Alert.alert("Error", "No se encontró la sesión del usuario.");
      return;
    }

    if (!sistolica.trim() || !diastolica.trim()) {
      Alert.alert(
        "Campos requeridos",
        "Ingresa la presión sistólica y diastólica.",
      );
      return;
    }

    const sistolicaNum = Number(sistolica);
    const diastolicaNum = Number(diastolica);

    if (
      !Number.isFinite(sistolicaNum) ||
      !Number.isFinite(diastolicaNum) ||
      sistolicaNum <= 0 ||
      diastolicaNum <= 0
    ) {
      Alert.alert(
        "Datos inválidos",
        "Ingresa valores válidos para la presión.",
      );
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.from("bp_measurements").insert({
        user_id: session.user.id,
        systolica: sistolicaNum,
        diastolica: diastolicaNum,
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
      }, 1200);
    } catch (e) {
      Alert.alert("Error", "Ocurrió un problema al guardar la medición.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.inputBox}>
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

        <View style={styles.inputBox}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    flex: 1,
    backgroundColor: "#fff",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  inputBox: {
    flex: 1,
    marginRight: 10,
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
});
