import { MD3LightTheme } from "react-native-paper";

// Tokens de diseño: paleta neutra, un solo acento oscuro, sombras suaves.
export const colors = {
  paper: "#F7F7F8",
  surface: "#FFFFFF",
  ink: "#1C1C1E",
  muted: "#6B7280",
  accent: "#1C1C1E",
  line: "#E5E7EB",
  error: "#DC2626",
} as const;

// Títulos de pantalla: serif (Lora). El cuerpo usa la sans del sistema.
export const displayFont = "Lora_600SemiBold";

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

export const shadow = {
  sm: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
} as const;

export const theme = {
  ...MD3LightTheme,
  roundness: radius.md,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.accent,
    onPrimary: "#FFFFFF",
    background: colors.paper,
    surface: colors.surface,
    surfaceVariant: "#F2F2F3",
    onSurface: colors.ink,
    onSurfaceVariant: colors.muted,
    outline: colors.line,
    error: colors.error,
  },
};
