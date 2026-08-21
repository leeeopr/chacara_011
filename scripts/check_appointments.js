const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data, error } = await supabase.from('appointments').select('id, parent_appointment_id').limit(1);
  if (error) {
    console.log('Error selecting parent_appointment_id:', error);
  } else {
    console.log('Successfully selected parent_appointment_id. Data:', data);
  }
}
run();
