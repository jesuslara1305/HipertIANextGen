import React, { useMemo, useState } from "react";
import {
  Alert,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { useAuth } from "../../../providers/AuthProvider";
import { supabase } from "../../services/supabase";
import { OnboardingStackParamList } from "./OnboardingStack";

type Nav = NativeStackNavigationProp<OnboardingStackParamList, "Permisos">;

export default function PermisosScreen() {
  const navigation = useNavigation<Nav>();
  const { session } = useAuth();

  const [notifGranted, setNotifGranted] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const canFinish = useMemo(() => {
    return Boolean(session?.user) && acceptTerms && acceptPrivacy;
  }, [session?.user, acceptTerms, acceptPrivacy]);

  const requestNotifications = async () => {
    if (Platform.OS !== "android") {
      setNotifGranted(true);
      return;
    }

    try {
      if (Platform.Version >= 33) {
        const res = await PermissionsAndroid.request(
          "android.permission.POST_NOTIFICATIONS" as any,
        );

        setNotifGranted(res === PermissionsAndroid.RESULTS.GRANTED);
      } else {
        setNotifGranted(true);
      }
    } catch {
      setNotifGranted(false);
    }
  };

  const handleFinish = async () => {
    if (!canFinish || !session?.user || submitting) {
      Alert.alert(
        "Falta consentimiento",
        "Debes aceptar los términos y la privacidad.",
      );
      return;
    }

    setSubmitting(true);

    try {
      const consent = {
        accepted_terms: acceptTerms,
        accepted_privacy: acceptPrivacy,
        notifications_permission: notifGranted,
        accepted_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("profiles")
        .update({
          consent,
          onboarding_complete: true,
        })
        .eq("id", session.user.id);

      if (error) {
        console.log("update consent error:", error.message);
        Alert.alert("Error", "No se pudo guardar el consentimiento.");
        return;
      }

      navigation.reset({
        index: 0,
        routes: [{ name: "Tabs" as never }],
      });
    } catch (e: any) {
      console.log("finish onboarding error:", e?.message || e);
      Alert.alert("Error", "Ocurrió un problema al finalizar.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Permisos y consentimiento</Text>
        <Text style={styles.subtitle}>Para darte una mejor experiencia</Text>

        <Text style={styles.label}>Notificaciones (opcional)</Text>

        <TouchableOpacity
          style={[
            styles.actionBtn,
            notifGranted && { backgroundColor: "#34C759" },
          ]}
          onPress={requestNotifications}
        >
          <Text style={styles.actionText}>
            {notifGranted ? "Concedido" : "Permitir"}
          </Text>
        </TouchableOpacity>

        <Text style={styles.label}>Consentimiento</Text>

        <View style={{ flexDirection: "row", gap: 8 }}>
          <CheckChip
            text="Acepto términos"
            active={acceptTerms}
            onPress={() => setAcceptTerms((v) => !v)}
          />

          <CheckChip
            text="Acepto privacidad"
            active={acceptPrivacy}
            onPress={() => setAcceptPrivacy((v) => !v)}
          />
        </View>

        <TouchableOpacity
          style={[
            styles.nextBtn,
            (!canFinish || submitting) && { opacity: 0.5 },
          ]}
          onPress={handleFinish}
          disabled={!canFinish || submitting}
        >
          <Text style={styles.nextText}>
            {submitting ? "Guardando..." : "Finalizar"}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function CheckChip({
  text,
  active,
  onPress,
}: {
  text: string;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.chipText, active && { color: "#fff" }]}>{text}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: "#f7f7f7" },
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 16 },
  title: { fontSize: 20, fontWeight: "bold" },
  subtitle: { fontSize: 14, marginBottom: 12 },
  label: { fontSize: 14, marginTop: 12 },
  actionBtn: {
    backgroundColor: "#007AFF",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignSelf: "flex-start",
    marginTop: 6,
  },
  actionText: { color: "#fff", fontWeight: "600" },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: "#eee",
  },
  chipActive: { backgroundColor: "#007AFF" },
  chipText: { fontWeight: "600" },
  nextBtn: {
    backgroundColor: "#007AFF",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
  },
  nextText: { color: "#fff", fontWeight: "600", fontSize: 16 },
});
