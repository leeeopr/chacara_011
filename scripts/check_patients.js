const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data, error } = await supabase.from('patients').select('*').limit(1);
  if (error) {
    console.error('Error fetching patients:', error);
  } else {
    console.log('Patient row keys:', data.length > 0 ? Object.keys(data[0]) : 'No rows found');
  }
}
run();
