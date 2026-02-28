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
  // Usamos el cliente global de Supabase
  const canal = supabase.channel("realtime-restaurante");

  canal
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "productos" },
      () => cargarProductos()
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "ventas" },
      () => cargarVentas()
    )
    .subscribe(status => {
      console.log("Estado realtime:", status);
    });
}

async function cargarProductos() {
  const { data, error } = await db // <--- Cambiado de supabase a db
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
    item.className = "producto-item"; // Útil para tu CSS
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
  const { data, error } = await supabase
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
    // Verificamos que la relación con productos exista para evitar errores
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

  // Validaciones básicas
  if (!nombre || isNaN(precio) || isNaN(costo) || isNaN(stock)) {
      return alert("Por favor completa todos los campos.");
  }

  const { error } = await supabase
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

  // Obtenemos el producto para verificar stock
  const { data: producto, error: errProd } = await supabase
    .from("productos")
    .select("*")
    .eq("id", producto_id)
    .single();

  if (errProd || !producto) return alert("Error al obtener el producto");

  if (producto.stock < cantidad) {
      return alert("No hay suficiente stock para esta venta");
  }

  const total = producto.precio * cantidad;

  // 1. Insertar la venta
  const { error: errVenta } = await supabase.from("ventas")
    .insert([{ producto_id, cantidad, total }]);

  if (errVenta) return alert("Error al registrar venta");

  // 2. Actualizar stock
  await supabase.from("productos")
    .update({ stock: producto.stock - cantidad })
    .eq("id", producto_id);

  document.getElementById("cantidadVenta").value = "";
}

async function eliminarProducto(id) {
  if (!confirm("¿Deseas eliminar este producto de la base de datos global?")) return;

  const { error } = await supabase
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
