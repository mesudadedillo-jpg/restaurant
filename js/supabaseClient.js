// js/supabaseClient.js

// 1. Usamos la URL y la Publishable key de tus capturas
const supabaseUrl = "https://slkcirdrnbwwwkbpzbas.supabase.co";
const supabaseKey = "sb_publishable_E7TtYDU3JL55oSzY-LuwkA_jiddw0C4";

// 2. CORRECCIÓN: Usamos una validación para no declarar la constante dos veces
if (typeof window.supabaseClient === 'undefined') {
    // Creamos el cliente en una variable global diferente para evitar choques
    window.supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
    window.supabaseClient = true; // Marcamos que ya se creó
    console.log("Conexión con Supabase establecida correctamente.");
}
