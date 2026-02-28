document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btnGuardar")
    .addEventListener("click", crearProducto);

  document.getElementById("btnVender")
    .addEventListener("click", registrarVenta);

  cargarProductos();
  cargarVentas();
  activarTiempoReal();
});

function activarTiempoReal() {
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
  const { data, error } = await supabase
    .from("productos")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return console.error(error);

  const contenedor = document.getElementById("listaProductos");
  const selectVenta = document.getElementById("productoVenta");

  contenedor.innerHTML = "";
  selectVenta.innerHTML = "";

  data.forEach(p => {
    const ganancia = p.precio - p.costo;

    const item = document.createElement("div");
    item.innerHTML = `
      <strong>${p.nombre}</strong>
      | Precio: $${p.precio}
      | Stock: ${p.stock}
      | Ganancia: $${ganancia}
      <button onclick="eliminarProducto('${p.id}')">Eliminar</button>
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

  if (error) return console.error(error);

  const contenedor = document.getElementById("listaVentas");
  const resumen = document.getElementById("resumenVentas");

  contenedor.innerHTML = "";

  let totalVentas = 0;
  let totalCostos = 0;

  data.forEach(v => {
    totalVentas += v.total;
    totalCostos += v.productos.costo * v.cantidad;

    const item = document.createElement("div");
    item.innerHTML = `
      ${v.productos.nombre}
      | Cantidad: ${v.cantidad}
      | Total: $${v.total}
    `;
    contenedor.appendChild(item);
  });

  const ganancia = totalVentas - totalCostos;

  resumen.innerHTML = `
    Ventas totales: $${totalVentas} <br>
    Inversión: $${totalCostos} <br>
    Ganancia neta: $${ganancia}
  `;
}

async function crearProducto() {
  const nombre = document.getElementById("nombre").value.trim();
  const precio = parseFloat(document.getElementById("precio").value);
  const costo = parseFloat(document.getElementById("costo").value);
  const stock = parseInt(document.getElementById("stock").value);

  if (!nombre) return alert("Nombre obligatorio");
  if (isNaN(precio) || precio <= 0) return alert("Precio inválido");
  if (isNaN(costo) || costo < 0) return alert("Costo inválido");
  if (precio <= costo) return alert("No puedes vender perdiendo dinero");
  if (isNaN(stock) || stock < 0) return alert("Stock inválido");

  const { count } = await supabase
    .from("productos")
    .select("*", { count: "exact", head: true });

  if (count >= 50) return alert("Límite de 50 productos alcanzado");

  const { error } = await supabase
    .from("productos")
    .insert([{ nombre, precio, costo, stock }]);

  if (error) return alert("Error al guardar producto");

  limpiarCampos();
}

async function registrarVenta() {
  const producto_id = document.getElementById("productoVenta").value;
  const cantidad = parseInt(document.getElementById("cantidadVenta").value);

  if (!producto_id || isNaN(cantidad) || cantidad <= 0)
    return alert("Datos inválidos");

  const { data: producto } = await supabase
    .from("productos")
    .select("*")
    .eq("id", producto_id)
    .single();

  if (producto.stock < cantidad)
    return alert("Stock insuficiente");

  const total = producto.precio * cantidad;

  await supabase.from("ventas")
    .insert([{ producto_id, cantidad, total }]);

  await supabase.from("productos")
    .update({ stock: producto.stock - cantidad })
    .eq("id", producto_id);

  document.getElementById("cantidadVenta").value = "";
}

async function eliminarProducto(id) {
  if (!confirm("¿Seguro que quieres eliminar este producto?")) return;

  const { error } = await supabase
    .from("productos")
    .delete()
    .eq("id", id);

  if (error) console.error(error);
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