import { MD3LightTheme } from "react-native-paper";

// Tokens de diseño: un solo acento (teal), neutros fríos, sin sombras
export const colors = {
  paper: "#F6F7F9",
  ink: "#17191D",
  muted: "#5C6470",
  teal: "#0E6B5C",
  line: "#E3E6EA",
  error: "#B3261E",
} as const;

// Títulos de pantalla: serif (Lora). El cuerpo usa la sans del sistema.
export const displayFont = "Lora_600SemiBold";

export const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.teal,
    onPrimary: "#FFFFFF",
    background: colors.paper,
    surface: colors.paper,
    surfaceVariant: "#EDEFF2",
    onSurface: colors.ink,
    onSurfaceVariant: colors.muted,
    outline: colors.line,
    error: colors.error,
  },
};
