// js/supabaseClient.js
const supabaseUrl = "https://slkcirdrnbwwwkbpzbas.supabase.co";
const supabaseKey = "sb_publishable_E7TtYDU3JL55oSzY-LuwkA_jiddw0C4";

// Cambiamos el nombre a 'client' para que no choque con la librería interna
const client = window.supabase.createClient(supabaseUrl, supabaseKey);

// Lo exportamos globalmente con un nombre que NO cause error
window.db = client; 

console.log("Conexión establecida con el alias 'db'");
