import { useNavigation } from "@react-navigation/native";
import React from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import corazonFeliz from "../assets/imagenes/feliz.png";
import pancreasFeliz from "../assets/imagenes/pancreas_feliz.png";

export default function InicioScreen() {
  const navigation = useNavigation<any>();

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.header}>¿Qué deseas hacer?</Text>

      <TouchableOpacity
        activeOpacity={0.9}
        style={styles.card}
        onPress={() => navigation.navigate("PresionArterial")}
      >
        <View style={styles.cardLeft}>
          <Text style={styles.cardTitle}>Presión Arterial</Text>
          <Text style={styles.cardDesc}>
            Registra y monitorea tu{"\n"}presión arterial
          </Text>
        </View>

        <Image
          source={corazonFeliz}
          style={styles.cardImgHeart}
          resizeMode="contain"
        />
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.9}
        style={styles.card}
        onPress={() => navigation.navigate("Glucosa")}
      >
        <View style={styles.cardLeft}>
          <Text style={styles.cardTitle}>Niveles de Glucosa</Text>
          <Text style={styles.cardDesc}>
            Lleva un control de tus{"\n"}niveles de glucosa
          </Text>
        </View>

        <Image
          source={pancreasFeliz}
          style={styles.cardImgPancreas}
          resizeMode="contain"
        />
      </TouchableOpacity>

      <View style={{ flex: 1 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F3F3F3" },
  container: {
    flexGrow: 1,
    paddingTop: 24,
    paddingHorizontal: 18,
    backgroundColor: "#F3F3F3",
    paddingBottom: 110,
  },
  header: {
    textAlign: "center",
    fontSize: 18,
    fontWeight: "700",
    color: "#111",
    marginBottom: 18,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 18,
    marginBottom: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#ECECEC",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  cardLeft: { flex: 1, paddingRight: 12 },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111",
    marginBottom: 8,
  },
  cardDesc: { fontSize: 13, color: "#555", lineHeight: 18 },
  cardImgHeart: { width: 70, height: 70 },
  cardImgPancreas: { width: 90, height: 60 },
});
