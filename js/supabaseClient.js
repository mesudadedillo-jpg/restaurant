const supabaseUrl = "https://slkcirdrnbwwwkbpzbas.supabase.co";
const supabaseKey = "sb_publishable_E7TtYDU3JL55oSzY-LuwkA_jiddw0C4";

window.supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

console.log("Cliente Supabase creado:", window.supabase);
