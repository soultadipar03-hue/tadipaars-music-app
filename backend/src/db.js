require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { autoRefreshToken: false, persistSession: false },
    realtime: { transport: ws },
  }
);

async function initDB() {
  // Light connectivity check — tables may not exist yet until schema is applied
  const { error } = await supabase.from('users').select('id').limit(1);
  if (error && error.code !== 'PGRST116' && !error.message.includes('schema cache')) {
    throw new Error(`Supabase connection failed: ${error.message}`);
  }
  console.log('Supabase connected. Run supabase_schema.sql if tables are missing.');
}

module.exports = { supabase, initDB };
