import Constants from 'expo-constants';
import { Platform } from 'react-native';

const BACKEND_PORT = 8080;

export function getApiBaseUrl(): string {
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(':')[0];
    return `http://${host}:${BACKEND_PORT}`;
  }
  if (Platform.OS === 'android') {
    return `http://10.0.2.2:${BACKEND_PORT}`;
  }
  return `http://localhost:${BACKEND_PORT}`;
}

export async function fetchHello(): Promise<string> {
  const res = await fetch(`${getApiBaseUrl()}/api/hello`);
  if (!res.ok) {
    throw new Error(`Request failed with status ${res.status}`);
  }
  const data = (await res.json()) as { message: string };
  return data.message;
}