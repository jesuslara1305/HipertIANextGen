import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
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

export default function RegistroGlucosaManualScreen() {
  const [ayunas, setAyunas] = useState("");
  const [postprandial, setPostprandial] = useState("");
  const [fecha, setFecha] = useState(new Date());
  const [modalVisible, setModalVisible] = useState(false);

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

  const guardarRegistro = () => {
    if (!ayunas && !postprandial) return;

    setModalVisible(true);
    setTimeout(() => {
      setModalVisible(false);
    }, 1200);
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.inputBox}>
          <Text style={styles.label}>En ayunas</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={ayunas}
            onChangeText={setAyunas}
          />
        </View>

        <View style={[styles.inputBox, { marginRight: 0 }]}>
          <Text style={styles.label}>Postprandial</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={postprandial}
            onChangeText={setPostprandial}
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
