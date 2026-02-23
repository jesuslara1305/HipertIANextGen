import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import React, { useMemo, useRef } from "react";
import {
  GestureResponderEvent,
  PanResponder,
  PanResponderGestureState,
  PanResponderInstance,
  View,
} from "react-native";
import type { BottomTabParamList } from "../navigation/BottomTabNavigator";

type TabKey = keyof BottomTabParamList;

const TAB_ORDER: TabKey[] = [
  "Inicio",
  "Historial",
  "Medicion",
  "Chat",
  "Ajustes",
];

const SWIPE_MIN_DISTANCE = 45;
const SWIPE_MIN_VELOCITY = 0.25;

export default function SwipeTabs({
  current,
  children,
}: {
  current: TabKey;
  children: React.ReactNode;
}) {
  const navigation =
    useNavigation<BottomTabNavigationProp<BottomTabParamList>>();
  const index = useMemo(() => TAB_ORDER.indexOf(current), [current]);

  const goPrev = () => {
    if (index > 0) navigation.navigate(TAB_ORDER[index - 1]);
  };
  const goNext = () => {
    if (index < TAB_ORDER.length - 1) navigation.navigate(TAB_ORDER[index + 1]);
  };

  const panRef = useRef<PanResponderInstance>(
    PanResponder.create({
      onMoveShouldSetPanResponder: (
        _e: GestureResponderEvent,
        g: PanResponderGestureState,
      ) => {
        const { dx, dy } = g;

        return Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.2;
      },
      onPanResponderRelease: (_e, g) => {
        const { dx, vx } = g;

        if (dx < -SWIPE_MIN_DISTANCE && Math.abs(vx) > SWIPE_MIN_VELOCITY) {
          goNext();
          return;
        }

        if (dx > SWIPE_MIN_DISTANCE && Math.abs(vx) > SWIPE_MIN_VELOCITY) {
          goPrev();
        }
      },
    }),
  );

  return (
    <View {...panRef.current.panHandlers} style={{ flex: 1 }}>
      {children}
    </View>
  );
}
