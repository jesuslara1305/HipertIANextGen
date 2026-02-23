import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { useNavigation } from "@react-navigation/native";
import React, { useState } from "react";
import {
  Image,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function RegistroPresionManualScreen() {
  const [systolica, setSistolica] = useState("");
  const [diastolica, setDiastolica] = useState("");
  const [fecha, setFecha] = useState(new Date());
  const [modalVisible, setModalVisible] = useState(false);
  const navigation = useNavigation<any>();

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

  const guardarRegistro = () => {
    console.log("S:", systolica);
    console.log("D:", diastolica);
    console.log("Fecha:", fecha);

    setModalVisible(true);

    setTimeout(() => {
      setModalVisible(false);
    }, 1200);
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
            value={systolica}
            onChangeText={setSistolica}
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
          />
        </View>
      </View>

      <View style={styles.fechaContainer}>
        <Text style={styles.label}>Fecha y hora</Text>
        <TouchableOpacity onPress={mostrarSelectorFechaYHora}>
          <Text style={styles.fecha}>{fecha.toLocaleString()}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.boton} onPress={guardarRegistro}>
        <Text style={styles.botonTexto}>Guardar</Text>
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
