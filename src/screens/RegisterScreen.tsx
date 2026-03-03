import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useState } from "react";
import {
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { RootStackParamList } from "../navigation/RootStack";

type NavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "RegisterScreen"
>;

export default function RegisterScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleRegister = () => {
    const e = email.trim();

    if (!e || !password || !confirmPassword) {
      Alert.alert("Campos requeridos", "Completa correo y contraseñas");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Contraseña débil", "Usa al menos 6 caracteres");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Las contraseñas no coinciden");
      return;
    }

    Alert.alert("Cuenta creada", "Registro en construcción.", [
      {
        text: "OK",
        onPress: () => navigation.replace("LoginScreen"),
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Crea tu cuenta</Text>

      <TextInput
        style={styles.input}
        placeholder="Correo electrónico"
        placeholderTextColor="#6F6F6F"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        returnKeyType="next"
      />

      <TextInput
        style={styles.input}
        placeholder="Contraseña"
        placeholderTextColor="#6F6F6F"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        returnKeyType="next"
      />

      <TextInput
        style={styles.input}
        placeholder="Confirma tu contraseña"
        placeholderTextColor="#6F6F6F"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        returnKeyType="done"
        onSubmitEditing={handleRegister}
      />

      <TouchableOpacity
        activeOpacity={0.9}
        style={styles.registerButton}
        onPress={handleRegister}
      >
        <Text style={styles.registerButtonText}>Continuar</Text>
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => navigation.replace("LoginScreen")}
      >
        <Text style={styles.backText}>¿Ya tienes cuenta? Inicia sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 24,
    color: "#333",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#fff",
    marginBottom: 12,
    color: "#111",
  },
  registerButton: {
    backgroundColor: "#007AFF",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 16,
  },
  registerButtonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  backText: { textAlign: "center", color: "#007AFF" },
});
