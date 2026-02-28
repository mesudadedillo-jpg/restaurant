// js/supabaseClient.js
const supabaseUrl = "https://slkcirdrnbwwwkbpzbas.supabase.co";
const supabaseKey = "sb_publishable_E7TtYDU3JL55oSzY-LuwkA_jiddw0C4";

// Creamos el cliente y lo asignamos a 'db' para evitar conflictos de nombres
const client = window.supabase.createClient(supabaseUrl, supabaseKey);

// Esta línea es la más importante para que productos.js funcione:
window.db = client; 

console.log("Conexión con Supabase establecida bajo el alias 'db'");
