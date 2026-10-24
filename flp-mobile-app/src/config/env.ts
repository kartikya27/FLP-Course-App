import Config from 'react-native-config';

function read(name: 'API_URL' | 'SUPABASE_URL' | 'SUPABASE_ANON_KEY'): string {
  const value = Config[name];
  if (!value) {
    throw new Error(`${name} is missing. Copy .env.example to .env and fill it in.`);
  }
  return value;
}

export const env = {
  apiUrl: read('API_URL'),
  supabaseUrl: read('SUPABASE_URL'),
  supabaseAnonKey: read('SUPABASE_ANON_KEY'),
};
