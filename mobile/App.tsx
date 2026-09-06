import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { fetchHello, getApiBaseUrl } from './src/api';

export default function App() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const msg = await fetchHello();
      setMessage(msg);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
      setMessage(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>HotelStock</Text>
      <Text style={styles.subtitle}>API: {getApiBaseUrl()}</Text>

      <View style={styles.card}>
        {loading && <Text style={styles.hint}>Loading…</Text>}
        {message && <Text style={styles.message}>{message}</Text>}
        {error && <Text style={styles.error}>{error}</Text>}
      </View>

      <Pressable
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        onPress={load}
      >
        <Text style={styles.buttonText}>{loading ? 'Loading…' : 'Try again'}</Text>
      </Pressable>

      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 24,
  },
  card: {
    minHeight: 80,
    width: '100%',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    backgroundColor: '#f2f2f7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    fontSize: 16,
    color: '#111',
    textAlign: 'center',
  },
  error: {
    fontSize: 14,
    color: '#c0392b',
    textAlign: 'center',
  },
  hint: {
    fontSize: 14,
    color: '#888',
  },
  button: {
    backgroundColor: '#0a7ea4',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  buttonPressed: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});