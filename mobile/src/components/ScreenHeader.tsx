import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { colors, displayFont, radius } from "../theme";

// Encabezado de las pantallas de formulario: título serif + volver
export function ScreenHeader({ title }: { title: string }) {
  const router = useRouter();

  return (
    <View style={styles.header}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Volver a tareas"
        onPress={() => router.back()}
        style={({ pressed }) => [styles.back, pressed && styles.pressed]}
        hitSlop={8}
      >
        <Text variant="bodyLarge" style={styles.backText}>
          ← Volver
        </Text>
      </Pressable>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
    gap: 4,
  },
  back: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginLeft: -12,
    borderRadius: radius.md,
  },
  pressed: {
    opacity: 0.65,
  },
  backText: {
    color: colors.muted,
  },
  title: {
    fontFamily: displayFont,
    fontSize: 32,
    lineHeight: 40,
    color: colors.ink,
  },
});
