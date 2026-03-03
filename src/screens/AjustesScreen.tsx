import { useNavigation } from "@react-navigation/native";
import React, { useMemo } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function AjustesScreen() {
  const navigation = useNavigation<any>();

  const email = "amantesdelcodigo26@gmail.com";
  const firstInitial = useMemo(
    () => email.trim().charAt(0).toUpperCase() || "U",
    [email],
  );

  const onExportar = () => {
    Alert.alert("Exportar datos (PDF)", "Función en construcción.", [
      { text: "OK" },
    ]);
  };

  const onCompartir = () => {
    Alert.alert("Compartir por WhatsApp", "Función en construcción.", [
      { text: "OK" },
    ]);
  };

  const onCerrarSesion = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: "LoginScreen" }],
    });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: 150 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.perfil}>
        <View style={styles.avatar}>
          <Text style={styles.inicial}>{firstInitial}</Text>
        </View>
        <Text style={styles.nombre}>{email}</Text>
      </View>

      <TouchableOpacity
        activeOpacity={0.9}
        style={styles.miPerfil}
        onPress={() => navigation.navigate("MiPerfilScreen")}
      >
        <Text style={styles.miPerfilTexto}>Mi perfil</Text>
        <Text style={styles.cambiar}>Ver</Text>
      </TouchableOpacity>

      <View style={styles.section}>
        <ItemAjuste
          titulo="Exportar datos (PDF)"
          subtitulo="Descarga tu historial de los últimos 30 días"
          accion={
            <TouchableOpacity onPress={onExportar}>
              <Text style={styles.cambiar}>Exportar</Text>
            </TouchableOpacity>
          }
        />

        <ItemAjuste
          titulo="Compartir por WhatsApp"
          subtitulo="WhatsApp no está instalado. Compartir por otra app"
          accion={
            <TouchableOpacity onPress={onCompartir} style={styles.whatsBtn}>
              <Image
                source={require("../assets/iconos/whatsapp.png")}
                style={styles.whatsIcon}
                resizeMode="contain"
              />
              <Text style={styles.cambiar}>Compartir...</Text>
            </TouchableOpacity>
          }
          noBorder
        />
      </View>

      <View style={styles.section}>
        <ItemAjuste titulo="Privacidad" />
        <ItemAjuste titulo="Términos y condiciones" />
        <ItemAjuste titulo="Ayuda y soporte" noBorder />
      </View>

      <TouchableOpacity
        activeOpacity={0.9}
        style={styles.logout}
        onPress={onCerrarSesion}
      >
        <Text style={styles.logoutTexto}>Cerrar sesión</Text>
      </TouchableOpacity>

      <Text style={styles.version}>V 1.0.1</Text>
    </ScrollView>
  );
}

function ItemAjuste({
  titulo,
  subtitulo,
  accion,
  noBorder,
}: {
  titulo: string;
  subtitulo?: string;
  accion?: React.ReactNode;
  noBorder?: boolean;
}) {
  return (
    <View style={[styles.item, noBorder && { borderBottomWidth: 0 }]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.itemTitulo}>{titulo}</Text>
        {subtitulo ? (
          <Text style={styles.itemSubtitulo}>{subtitulo}</Text>
        ) : null}
      </View>
      {accion}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f7f7f7" },
  content: { padding: 20 },

  perfil: { alignItems: "center", marginBottom: 10 },
  avatar: {
    backgroundColor: "#cce2ff",
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
  },
  inicial: { fontSize: 32, color: "#007AFF", fontWeight: "bold" },
  nombre: { marginTop: 10, fontSize: 18, fontWeight: "600" },

  miPerfil: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginVertical: 10,
    elevation: 1,
  },
  miPerfilTexto: { fontSize: 16, fontWeight: "500" },

  section: {
    marginBottom: 20,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 8,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomColor: "#eee",
    borderBottomWidth: 1,
  },
  itemTitulo: { fontSize: 16, fontWeight: "600" },
  itemSubtitulo: { fontSize: 13, color: "#777", marginTop: 2 },

  cambiar: { color: "#007AFF", fontWeight: "600" },

  whatsBtn: { flexDirection: "row", alignItems: "center" },
  whatsIcon: { width: 26, height: 26, marginRight: 8, opacity: 0.6 },

  logout: {
    borderWidth: 1,
    borderColor: "#FF3B30",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
    backgroundColor: "#fff",
  },
  logoutTexto: { color: "#FF3B30", fontWeight: "bold", fontSize: 16 },

  version: { textAlign: "center", fontSize: 12, color: "#aaa", marginTop: 20 },
});
