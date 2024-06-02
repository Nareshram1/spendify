import * as SecureStore from 'expo-secure-store';

// Define types for the function parameters
export async function save(key: string, value: string): Promise<void> {
  await SecureStore.setItemAsync(key, value);
}

export async function getValueFor(key: string): Promise<string | null> {
  const result = await SecureStore.getItemAsync(key);
  return result;
}

export async function deleteValueFor(key: string): Promise<void> {
  await SecureStore.deleteItemAsync(key);
}
