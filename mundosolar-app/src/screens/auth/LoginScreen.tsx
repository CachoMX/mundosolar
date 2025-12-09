import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useAuth } from '../../contexts/AuthContext';
import { Colors, Spacing, BorderRadius, FontSizes } from '../../constants/colors';

export const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const sunScale = useSharedValue(1);
  const sunRotation = useSharedValue(0);

  React.useEffect(() => {
    // Pulsating sun animation
    sunScale.value = withRepeat(
      withSpring(1.1, { damping: 2 }),
      -1,
      true
    );

    // Rotating sun animation
    sunRotation.value = withRepeat(
      withTiming(360, { duration: 20000 }),
      -1,
      false
    );
  }, []);

  const sunStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: sunScale.value },
        { rotate: `${sunRotation.value}deg` },
      ],
    };
  });

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Por favor ingresa email y contraseña');
      return;
    }

    setLoading(true);
    try {
      const response = await signIn(email, password);
      if (!response.success) {
        Alert.alert('Error', response.message || 'Credenciales inválidas');
      }
    } catch (error) {
      Alert.alert('Error', 'Ocurrió un error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.backgroundGradient} />

      {/* Animated Sun Logo */}
      <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.logoContainer}>
        <Animated.View style={[styles.sunContainer, sunStyle]}>
          <View style={styles.sun}>
            <View style={styles.sunCore} />
            {[...Array(8)].map((_, i) => (
              <View
                key={i}
                style={[
                  styles.sunRay,
                  {
                    transform: [{ rotate: `${i * 45}deg` }],
                  },
                ]}
              />
            ))}
          </View>
        </Animated.View>
        <Animated.Text entering={FadeInUp.delay(400)} style={styles.title}>
          MundoSolar
        </Animated.Text>
        <Animated.Text entering={FadeInUp.delay(600)} style={styles.subtitle}>
          Sistema de Gestión Solar
        </Animated.Text>
      </Animated.View>

      {/* Login Form */}
      <Animated.View entering={FadeInUp.delay(800).springify()} style={styles.formContainer}>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="correo@ejemplo.com"
            placeholderTextColor={Colors.textLight}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            editable={!loading}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Contraseña</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor={Colors.textLight}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            editable={!loading}
          />
        </View>

        <TouchableOpacity
          style={[styles.loginButton, loading && styles.loginButtonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.loginButtonText}>Iniciar Sesión</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.forgotPassword} disabled={loading}>
          <Text style={styles.forgotPasswordText}>¿Olvidaste tu contraseña?</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Footer */}
      <Animated.View entering={FadeInUp.delay(1000)} style={styles.footer}>
        <Text style={styles.footerText}>
          © 2024 MundoSolar • Energía Renovable
        </Text>
      </Animated.View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.primary,
    opacity: 0.95,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  sunContainer: {
    marginBottom: Spacing.lg,
  },
  sun: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sunCore: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.accent,
    position: 'absolute',
  },
  sunRay: {
    position: 'absolute',
    width: 4,
    height: 25,
    backgroundColor: Colors.accent,
    borderRadius: 2,
    top: -5,
  },
  title: {
    fontSize: FontSizes.xxxl,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSizes.md,
    color: '#ffffff',
    opacity: 0.9,
  },
  formContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  inputContainer: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  loginButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.md,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: FontSizes.md,
    fontWeight: 'bold',
  },
  forgotPassword: {
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  forgotPasswordText: {
    color: Colors.primary,
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
  footer: {
    position: 'absolute',
    bottom: Spacing.xl,
    alignSelf: 'center',
  },
  footerText: {
    color: '#ffffff',
    fontSize: FontSizes.sm,
    opacity: 0.8,
  },
});
