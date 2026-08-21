import fs from 'fs';
const envFile = fs.readFileSync('.env.example', 'utf8');
const urlMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/);
const keyMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/);
console.log('url:', urlMatch ? urlMatch[1] : 'not found');
