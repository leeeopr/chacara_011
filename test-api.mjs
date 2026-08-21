import fs from 'fs';
const envFile = fs.readFileSync('.env.local', 'utf8') || fs.readFileSync('.env', 'utf8');
const urlMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/);
const keyMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/);

const url = urlMatch ? urlMatch[1].trim() : '';
const key = keyMatch ? keyMatch[1].trim() : '';

async function run() {
  const res = await fetch(`${url}/rest/v1/settings`, {
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`
    }
  });
  const data = await res.json();
  console.log('Settings Rows:', data.length);
  if (data.length > 0) {
      console.log('ID exists?', data.some(r => r.id === 1));
      console.log('Columns:', Object.keys(data[0]));
  } else {
      console.log('No rows in settings table.');
  }
}
run();
