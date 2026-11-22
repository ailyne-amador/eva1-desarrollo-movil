import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput as NativeTextInput,
  View,
} from "react-native";
import { Button, Text, TextInput as PaperTextInput } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { authSchema, type AuthFormValues } from "../schemas/authSchema";
import { colors, displayFont, radius } from "../theme";

type AuthMode = "login" | "register";

type AuthFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  onBlur: () => void;
  error?: string;
  keyboardType: "default" | "email-address";
  autoComplete: "email" | "current-password" | "new-password";
  secureTextEntry?: boolean;
};

function AuthField({
  label,
  value,
  onChangeText,
  onBlur,
  error,
  keyboardType,
  autoComplete,
  secureTextEntry = false,
}: AuthFieldProps) {
  const errorText = error ? (
    <Text variant="bodySmall" style={styles.errorText}>
      {error}
    </Text>
  ) : null;

  if (Platform.OS !== "web") {
    return (
      <View style={styles.field}>
        <PaperTextInput
          accessibilityLabel={label}
          label={label}
          mode="outlined"
          value={value}
          onChangeText={onChangeText}
          onBlur={onBlur}
          autoCapitalize="none"
          autoComplete={autoComplete}
          autoCorrect={false}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          error={Boolean(error)}
          style={styles.input}
          outlineStyle={styles.inputOutline}
        />
        {errorText}
      </View>
    );
  }

  return (
    <View style={styles.field}>
      <Text variant="labelLarge" style={styles.webLabel}>
        {label}
      </Text>
      <NativeTextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        onBlur={onBlur}
        autoCapitalize="none"
        autoComplete={autoComplete}
        autoCorrect={false}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        placeholderTextColor={colors.muted}
        style={[
          styles.webInput,
          { borderColor: error ? colors.error : colors.line },
        ]}
      />
      {errorText}
    </View>
  );
}

export function AuthScreen({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const { signIn, signUp } = useAuth();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [serverError, setServerError] = useState<string>();
  const { control, handleSubmit, formState } = useForm<AuthFormValues>({
    resolver: zodResolver(authSchema),
    defaultValues: { email: "", password: "" },
  });
  const submitLabel = mode === "login" ? "Iniciar sesión" : "Crear cuenta";

  const submit = handleSubmit(
    async ({ email, password }) => {
      try {
        if (mode === "login") await signIn(email, password);
        else await signUp(email, password);
        router.replace("/");
      } catch (error) {
        setServerError(
          error instanceof Error
            ? error.message
            : "No se pudo conectar con el servidor.",
        );
      }
    },
    () => setServerError(undefined),
  );

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>
          {mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
        </Text>
        <Controller
          control={control}
          name="email"
          render={({ field, fieldState }) => (
            <AuthField
              label="Correo electrónico"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              keyboardType="email-address"
              autoComplete="email"
            />
          )}
        />
        <Controller
          control={control}
          name="password"
          render={({ field, fieldState }) => (
            <AuthField
              label="Contraseña"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              keyboardType="default"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              secureTextEntry={!passwordVisible}
            />
          )}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            passwordVisible ? "Ocultar contraseña" : "Mostrar contraseña"
          }
          onPress={() => setPasswordVisible((visible) => !visible)}
          style={styles.visibilityToggle}
        >
          <Text style={styles.linkText}>
            {passwordVisible ? "Ocultar contraseña" : "Mostrar contraseña"}
          </Text>
        </Pressable>
        {serverError && (
          <Text accessibilityRole="alert" style={styles.errorText}>
            {serverError}
          </Text>
        )}
        <Button
          mode="contained"
          onPress={submit}
          disabled={formState.isSubmitting}
          style={styles.submit}
          contentStyle={styles.submitContent}
          buttonColor={colors.accent}
        >
          {formState.isSubmitting ? "Procesando..." : submitLabel}
        </Button>
        <Pressable
          accessibilityRole="link"
          onPress={() =>
            mode === "login"
              ? router.push("/register")
              : router.push("/login")
          }
          style={styles.switchMode}
        >
          <Text style={styles.linkText}>
            {mode === "login"
              ? "¿No tienes cuenta? Regístrate"
              : "¿Ya tienes cuenta? Inicia sesión"}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    gap: 18,
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  title: {
    fontFamily: displayFont,
    fontSize: 32,
    lineHeight: 40,
    color: colors.ink,
  },
  field: {
    gap: 6,
  },
  input: {
    backgroundColor: colors.surface,
  },
  inputOutline: {
    borderRadius: radius.md,
    borderWidth: 1,
  },
  errorText: {
    color: colors.error,
  },
  webLabel: {
    color: colors.muted,
  },
  webInput: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: radius.md,
    fontSize: 16,
    color: colors.ink,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
    ...({ outlineStyle: "none" } as object),
  },
  visibilityToggle: {
    alignSelf: "flex-start",
    paddingVertical: 4,
  },
  linkText: {
    color: colors.muted,
  },
  submit: {
    marginTop: 12,
    borderRadius: radius.md,
  },
  submitContent: {
    paddingVertical: 8,
  },
  switchMode: {
    alignSelf: "center",
    paddingVertical: 8,
  },
});
