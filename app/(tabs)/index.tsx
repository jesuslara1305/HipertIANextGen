import React, { useEffect } from "react";
import { Text, TextInput } from "react-native";
import BottomTabNavigator from "../../src/navigation/BottomTabNavigator";

import {
  Montserrat_400Regular,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
} from "@expo-google-fonts/montserrat";
import { useFonts } from "expo-font";

export default function TabOneScreen() {
  const [loaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
  });

  useEffect(() => {
    // ✅ Default global para TODO Text
    const TextRender = (Text as any).render;
    if (!TextRender) return;

    if (!(Text as any).__patched) {
      (Text as any).__patched = true;
      (Text as any).render = function (...args: any[]) {
        const origin = TextRender.call(this, ...args);
        return React.cloneElement(origin, {
          style: [{ fontFamily: "Montserrat_400Regular" }, origin.props.style],
        });
      };
    }

    // ✅ Default global para TextInput también (opcional pero recomendado)
    const InputRender = (TextInput as any).render;
    if (InputRender && !(TextInput as any).__patched) {
      (TextInput as any).__patched = true;
      (TextInput as any).render = function (...args: any[]) {
        const origin = InputRender.call(this, ...args);
        return React.cloneElement(origin, {
          style: [{ fontFamily: "Montserrat_400Regular" }, origin.props.style],
        });
      };
    }
  }, []);

  if (!loaded) return null;

  return <BottomTabNavigator />;
}
