const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  "https://hzosqhwwtbzczipqirgj.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6b3NxaHd3dGJ6Y3ppcHFpcmdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzMjg2NDEsImV4cCI6MjA5NjkwNDY0MX0.chp8U0GBzCH65waQmfhYvY0B3Dd60aktqTUmpluGy48"
);

async function test() {
  const { data, error } = await supabase
    .from('community_contributions')
    .select('*')
    .limit(1);
  
  if (error) {
    console.error("Error reading from table:", error);
    process.exit(1);
  } else {
    console.log("Successfully connected and queried community_contributions table.");
    console.log("Data count:", data.length);
  }
}

test();
