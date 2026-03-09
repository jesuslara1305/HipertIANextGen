import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useState } from "react";
import {
  Alert,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { RootStackParamList } from "../navigation/RootStack";
import { signIn } from "../services/authService";
import { supabase } from "../services/supabase";

type NavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "LoginScreen"
>;

export default function LoginScreen() {
  const navigation = useNavigation<NavigationProp>();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Campos requeridos", "Ingresa correo y contraseña");
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await signIn(email.trim(), password.trim());

      if (error) {
        Alert.alert("Error de inicio de sesión", error.message);
        return;
      }

      const userId = data.user?.id;

      if (!userId) {
        Alert.alert("Error", "No se pudo obtener el usuario.");
        return;
      }

      // 🔹 buscar el perfil
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("onboarding_complete")
        .eq("id", userId)
        .maybeSingle();

      if (profileError) {
        console.log("profile error:", profileError.message);
      }

      // 🔹 decidir navegación
      if (!profile || profile.onboarding_complete === false) {
        navigation.reset({
          index: 0,
          routes: [{ name: "Onboarding" }],
        });
      } else {
        navigation.reset({
          index: 0,
          routes: [{ name: "Tabs" }],
        });
      }
    } catch (error) {
      Alert.alert("Error", "Ocurrió un problema al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    Alert.alert("Próximamente", "El inicio con Google se configurará después.");
  };

  const handleFacebookLogin = () => {
    Alert.alert(
      "Próximamente",
      "El inicio con Facebook se configurará después.",
    );
  };

  return (
    <View style={styles.container}>
      <Image
        source={require("../assets/imagenes/logo.png")}
        style={styles.logo}
        resizeMode="contain"
      />

      <Text style={styles.title}>Bienvenido a HipertIA</Text>

      <TextInput
        style={styles.input}
        placeholder="Correo electrónico"
        placeholderTextColor="#6F6F6F"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        editable={!loading}
      />

      <View style={styles.passwordContainer}>
        <TextInput
          style={styles.passwordInput}
          placeholder="Contraseña"
          placeholderTextColor="#6F6F6F"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          editable={!loading}
        />

        <TouchableOpacity
          onPress={() => setShowPassword(!showPassword)}
          disabled={loading}
        >
          <Image
            source={
              showPassword
                ? require("../assets/iconos/cerrar_ojo.png")
                : require("../assets/iconos/abrir_ojo.png")
            }
            style={styles.eyeIcon}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.loginButton}
        onPress={handleLogin}
        disabled={loading}
      >
        <Text style={styles.loginButtonText}>
          {loading ? "Iniciando..." : "Iniciar sesión"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => navigation.navigate("RegisterScreen")}
        disabled={loading}
      >
        <Text style={styles.registerText}>¿No tienes cuenta? Regístrate</Text>
      </TouchableOpacity>

      <View style={styles.socialContainer}>
        <TouchableOpacity
          style={[styles.socialButton, { backgroundColor: "#DB4437" }]}
          onPress={handleGoogleLogin}
          disabled={loading}
        >
          <Text style={styles.socialButtonText}>Iniciar con Google</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.socialButton, { backgroundColor: "#3b5998" }]}
          onPress={handleFacebookLogin}
          disabled={loading}
        >
          <Text style={styles.socialButtonText}>Iniciar con Facebook</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },

  logo: {
    width: 120,
    height: 120,
    alignSelf: "center",
    marginBottom: 24,
  },

  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 24,
    color: "#111111",
  },

  input: {
    borderWidth: 1,
    borderColor: "#BDBDBD",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    backgroundColor: "#FFFFFF",
    color: "#111111",
  },

  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#BDBDBD",
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    backgroundColor: "#FFFFFF",
  },

  passwordInput: {
    flex: 1,
    paddingVertical: 12,
    color: "#111111",
  },

  eyeIcon: {
    width: 24,
    height: 24,
    marginLeft: 8,
  },

  loginButton: {
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 16,
    backgroundColor: "#007AFF",
  },

  loginButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 16,
  },

  registerText: {
    textAlign: "center",
    marginBottom: 24,
    color: "#007AFF",
  },

  socialContainer: {
    gap: 12,
  },

  socialButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },

  socialButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
});
