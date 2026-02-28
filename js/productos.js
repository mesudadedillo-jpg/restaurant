// js/productos.js

// Hacemos las funciones globales para que los botones del HTML (onclick) las encuentren
window.crearProducto = crearProducto;
window.registrarVenta = registrarVenta;
window.eliminarProducto = eliminarProducto;
window.mostrarSeccion = mostrarSeccion;

document.addEventListener("DOMContentLoaded", () => {
  // Asignamos eventos a los botones principales
  const btnGuardar = document.getElementById("btnGuardar");
  const btnVender = document.getElementById("btnVender");

  if (btnGuardar) btnGuardar.addEventListener("click", crearProducto);
  if (btnVender) btnVender.addEventListener("click", registrarVenta);

  // Carga inicial de datos
  cargarProductos();
  cargarVentas();
  activarTiempoReal();
});

function activarTiempoReal() {
  // Escuchamos cambios en la base de datos de Supabase usando el alias 'db'
  const canal = db.channel("cambios-en-vivo");

  canal
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "productos" },
      (payload) => {
        console.log("Cambio detectado en productos:", payload);
        cargarProductos(); 
      }
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "ventas" },
      (payload) => {
        console.log("Cambio detectado en ventas:", payload);
        cargarVentas(); 
      }
    )
    .subscribe();
}

async function cargarProductos() {
  const { data, error } = await db // <--- Unificado a db
    .from("productos")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return console.error("Error cargando productos:", error);

  const contenedor = document.getElementById("listaProductos");
  const selectVenta = document.getElementById("productoVenta");

  contenedor.innerHTML = "";
  selectVenta.innerHTML = "";

  data.forEach(p => {
    const ganancia = p.precio - p.costo;

    const item = document.createElement("div");
    item.className = "producto-item";
    item.innerHTML = `
      <strong>${p.nombre}</strong>
      | Precio: $${p.precio}
      | Stock: ${p.stock}
      | Ganancia: $${ganancia}
      <button onclick="eliminarProducto('${p.id}')" style="color:red">Eliminar</button>
    `;
    contenedor.appendChild(item);

    const option = document.createElement("option");
    option.value = p.id;
    option.textContent = p.nombre;
    selectVenta.appendChild(option);
  });
}

async function cargarVentas() {
  const { data, error } = await db // <--- Unificado a db
    .from("ventas")
    .select("*, productos(nombre, costo)");

  if (error) return console.error("Error cargando ventas:", error);

  const contenedor = document.getElementById("listaVentas");
  const resumen = document.getElementById("resumenVentas");

  contenedor.innerHTML = "";

  let totalVentas = 0;
  let totalCostos = 0;

  data.forEach(v => {
    totalVentas += v.total;
    if (v.productos) {
        totalCostos += v.productos.costo * v.cantidad;
    }

    const item = document.createElement("div");
    item.innerHTML = `
      ${v.productos ? v.productos.nombre : 'Producto eliminado'}
      | Cantidad: ${v.cantidad}
      | Total: $${v.total}
    `;
    contenedor.appendChild(item);
  });

  const ganancia = totalVentas - totalCostos;

  resumen.innerHTML = `
    <strong>Ventas totales:</strong> $${totalVentas} <br>
    <strong>Inversión:</strong> $${totalCostos} <br>
    <strong>Ganancia neta:</strong> $${ganancia}
  `;
}

async function crearProducto() {
  const nombre = document.getElementById("nombre").value.trim();
  const precio = parseFloat(document.getElementById("precio").value);
  const costo = parseFloat(document.getElementById("costo").value);
  const stock = parseInt(document.getElementById("stock").value);

  if (!nombre || isNaN(precio) || isNaN(costo) || isNaN(stock)) {
      return alert("Por favor completa todos los campos.");
  }

  const { error } = await db // <--- Unificado a db
    .from("productos")
    .insert([{ nombre, precio, costo, stock }]);

  if (error) {
      alert("Error al guardar: " + error.message);
  } else {
      limpiarCampos();
  }
}

async function registrarVenta() {
  const producto_id = document.getElementById("productoVenta").value;
  const cantidad = parseInt(document.getElementById("cantidadVenta").value);

  if (!producto_id || isNaN(cantidad) || cantidad <= 0) {
      return alert("Datos de venta inválidos");
  }

  const { data: producto, error: errProd } = await db // <--- Unificado a db
    .from("productos")
    .select("*")
    .eq("id", producto_id)
    .single();

  if (errProd || !producto) return alert("Error al obtener el producto");

  if (producto.stock < cantidad) {
      return alert("No hay suficiente stock para esta venta");
  }

  const total = producto.precio * cantidad;

  const { error: errVenta } = await db // <--- Unificado a db
    .from("ventas")
    .insert([{ producto_id, cantidad, total }]);

  if (errVenta) return alert("Error al registrar venta");

  await db.from("productos") // <--- Unificado a db
    .update({ stock: producto.stock - cantidad })
    .eq("id", producto_id);

  document.getElementById("cantidadVenta").value = "";
}

async function eliminarProducto(id) {
  if (!confirm("¿Deseas eliminar este producto de la base de datos global?")) return;

  const { error } = await db // <--- Unificado a db
    .from("productos")
    .delete()
    .eq("id", id);

  if (error) alert("Error al eliminar: " + error.message);
}

function mostrarSeccion(seccion) {
  document.getElementById("seccion-productos").style.display =
    seccion === "productos" ? "block" : "none";

  document.getElementById("seccion-ventas").style.display =
    seccion === "ventas" ? "block" : "none";
}

function limpiarCampos() {
  document.getElementById("nombre").value = "";
  document.getElementById("precio").value = "";
  document.getElementById("costo").value = "";
  document.getElementById("stock").value = "";
}
