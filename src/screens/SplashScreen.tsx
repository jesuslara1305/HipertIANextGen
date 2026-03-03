import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Image, StyleSheet, Text, View } from "react-native";
import { RootStackParamList } from "../navigation/RootStack";

type Nav = NativeStackNavigationProp<RootStackParamList, "SplashScreen">;

export default function SplashScreen() {
  const navigation = useNavigation<Nav>();

  const progress = useRef(new Animated.Value(0)).current;
  const [percent, setPercent] = useState(0);

  const tipIndex = useRef(Math.floor(Math.random() * 5)).current;

  const tips = useMemo(
    () => [
      "La hipertensión puede ser primaria o secundaria.",
      "Reducir el consumo de sal ayuda a controlar la presión arterial.",
      "La actividad física regular puede ayudar a bajar la presión arterial.",
      "En ayunas, niveles de glucosa elevados pueden indicar riesgo metabólico.",
      "Después de comer, la glucosa suele subir; monitorearla ayuda a ajustar hábitos.",
    ],
    [],
  );

  useEffect(() => {
    const listener = progress.addListener(({ value }) => {
      setPercent(Math.floor(value * 100));
    });

    Animated.timing(progress, {
      toValue: 1,
      duration: 3500,
      useNativeDriver: false,
    }).start(() => {
      navigation.replace("LoginScreen");
    });

    return () => {
      progress.removeListener(listener);
    };
  }, [navigation, progress]);

  const width = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={styles.container}>
      <Image
        source={require("../assets/imagenes/logo.png")}
        style={styles.logo}
        resizeMode="contain"
      />

      <View style={styles.bottom}>
        <Text style={styles.tip}>{tips[tipIndex]}</Text>

        <View style={styles.progressOuter}>
          <Animated.View style={[styles.progressInner, { width }]} />
          <View style={styles.progressLabelWrap}>
            <Text style={styles.progressLabel}>{percent}%</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const BAR_H = 18;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  logo: {
    width: 220,
    height: 220,
  },
  bottom: {
    position: "absolute",
    left: 24,
    right: 24,
    bottom: 48,
  },
  tip: {
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
    color: "#111111",
    marginBottom: 14,
  },
  progressOuter: {
    height: BAR_H,
    borderRadius: BAR_H / 2,
    backgroundColor: "#F1F1F1",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  progressInner: {
    height: "100%",
    backgroundColor: "#C5161D",
  },
  progressLabelWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  progressLabel: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
});
