// js/productos.js

// Funciones globales para que el HTML pueda acceder a ellas
window.guardarProducto = guardarProducto;
window.eliminarProducto = eliminarProducto;
window.cambiarSeccion = cambiarSeccion;
window.agregarAlCarrito = agregarAlCarrito;
window.finalizarVenta = finalizarVenta;
window.vaciarCarrito = vaciarCarrito;
window.cerrarModal = cerrarModal;

let carrito = [];

document.addEventListener("DOMContentLoaded", () => {
  cargarProductos();
  cargarVentas();
  activarTiempoReal();
});

// --- NAVEGACIÓN ---
function cambiarSeccion(objetivo) {
  document.querySelectorAll('.seccion').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
  
  document.getElementById(objetivo).classList.add('active');
  document.getElementById('nav-' + objetivo).classList.add('active');
}

// --- TIEMPO REAL ---
function activarTiempoReal() {
  const canal = db.channel("realtime-abarrotes");

  canal
    .on("postgres_changes", { event: "*", schema: "public", table: "productos" }, () => {
      cargarProductos();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "ventas" }, () => {
      cargarVentas();
    })
    .subscribe();
}

// --- GESTIÓN DE PRODUCTOS (INVENTARIO) ---
async function cargarProductos() {
  const { data, error } = await db
    .from("productos")
    .select("*")
    .order("nombre", { ascending: true });

  if (error) return console.error(error);

  renderizarInventario(data);
  renderizarPOS(data);
}

function renderizarInventario(productos) {
  const tabla = document.getElementById("tabla-inventario");
  tabla.innerHTML = "";

  productos.forEach(p => {
    const estadoClass = p.stock <= 0 ? 'stock-agotado' : (p.stock <= 5 ? 'stock-bajo' : '');
    const estadoText = p.stock <= 0 ? 'Agotado' : (p.stock <= 5 ? 'Bajo Stock' : 'Disponible');

    const fila = document.createElement("tr");
    fila.innerHTML = `
      <td>${p.nombre}</td>
      <td>$${p.precio}</td>
      <td>$${p.costo || 0}</td>
      <td class="${estadoClass}">${p.stock}</td>
      <td><span class="${estadoClass}">${estadoText}</span></td>
      <td class="acciones">
        <button class="btn btn-warning btn-sm" onclick="prepararEdicion('${p.id}', '${p.nombre}', ${p.precio}, ${p.costo}, ${p.stock})">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn btn-danger btn-sm" onclick="eliminarProducto('${p.id}')">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    `;
    tabla.appendChild(fila);
  });
}

async function guardarProducto() {
  const id = document.getElementById("prod-id").value;
  const nombre = document.getElementById("prod-nombre").value.trim();
  const precio = parseFloat(document.getElementById("prod-precio").value);
  const costo = parseFloat(document.getElementById("prod-costo").value) || 0;
  const stock = parseInt(document.getElementById("prod-stock").value);

  if (!nombre || isNaN(precio) || isNaN(stock)) return alert("Completa los campos obligatorios");

  const datos = { nombre, precio, costo, stock };

  let resultado;
  if (id) {
    resultado = await db.from("productos").update(datos).eq("id", id);
  } else {
    resultado = await db.from("productos").insert([datos]);
  }

  if (resultado.error) alert("Error: " + resultado.error.message);
  else {
    limpiarFormulario();
    alert("Producto guardado correctamente");
  }
}

async function eliminarProducto(id) {
  if (!confirm("¿Eliminar este producto permanentemente?")) return;
  const { error } = await db.from("productos").delete().eq("id", id);
  if (error) alert(error.message);
}

// --- PUNTO DE VENTA (POS) ---
function renderizarPOS(productos) {
  const grid = document.getElementById("display-productos");
  grid.innerHTML = "";

  productos.forEach(p => {
    const sinStock = p.stock <= 0;
    const card = document.createElement("div");
    card.className = `producto-card ${sinStock ? 'sin-stock' : ''}`;
    card.onclick = () => !sinStock && agregarAlCarrito(p.id, p.nombre, p.precio, p.stock);
    
    card.innerHTML = `
      <div class="producto-icon"><i class="fas fa-box"></i></div>
      <h3>${p.nombre}</h3>
      <p class="precio">$${p.precio}</p>
      <p class="stock">Stock: ${p.stock}</p>
    `;
    grid.appendChild(card);
  });
}

function agregarAlCarrito(id, nombre, precio, stockMax) {
  const item = carrito.find(i => i.id === id);
  if (item) {
    if (item.cantidad >= stockMax) return alert("No hay más stock disponible");
    item.cantidad++;
  } else {
    carrito.push({ id, nombre, precio, cantidad: 1, stockMax });
  }
  actualizarCarritoUI();
}

function actualizarCarritoUI() {
  const lista = document.getElementById("lista-carrito");
  lista.innerHTML = "";

  if (carrito.length === 0) {
    lista.innerHTML = '<div class="carrito-vacio"><p>Tu carrito está vacío</p></div>';
    document.getElementById("total-venta").textContent = "$0.00";
    return;
  }

  let subtotal = 0;
  carrito.forEach(item => {
    const totalItem = item.precio * item.cantidad;
    subtotal += totalItem;
    
    const div = document.createElement("div");
    div.className = "carrito-item";
    div.innerHTML = `
      <div class="carrito-item-info">
        <div class="carrito-item-nombre">${item.nombre}</div>
        <div class="carrito-item-precio">$${item.precio} x ${item.cantidad}</div>
      </div>
      <div class="carrito-item-total">$${totalItem.toFixed(2)}</div>
    `;
    lista.appendChild(div);
  });

  const iva = subtotal * 0.16;
  const total = subtotal + iva;

  document.getElementById("subtotal").textContent = `$${subtotal.toFixed(2)}`;
  document.getElementById("iva").textContent = `$${iva.toFixed(2)}`;
  document.getElementById("total-venta").textContent = `$${total.toFixed(2)}`;
}

async function finalizarVenta() {
  if (carrito.length === 0) return alert("El carrito está vacío");

  const totalVenta = parseFloat(document.getElementById("total-venta").textContent.replace('$', ''));

  // Procesar cada producto del carrito
  for (const item of carrito) {
    // 1. Registrar venta
    await db.from("ventas").insert([{ 
      producto_id: item.id, 
      cantidad: item.cantidad, 
      total: item.precio * item.cantidad 
    }]);

    // 2. Descontar stock
    await db.from("productos").update({ 
      stock: item.stockMax - item.cantidad 
    }).eq("id", item.id);
  }

  document.getElementById("modal-total").textContent = `$${totalVenta.toFixed(2)}`;
  document.getElementById("modal-cobro").classList.add("active");
  vaciarCarrito();
}

// --- REPORTES ---
async function cargarVentas() {
  const { data, error } = await db
    .from("ventas")
    .select("*, productos(nombre, costo)")
    .order("created_at", { ascending: false });

  if (error) return;

  const tabla = document.getElementById("tabla-ventas");
  tabla.innerHTML = "";

  let hoyVentas = 0;
  let hoyProductos = 0;
  let hoyGanancia = 0;

  data.forEach(v => {
    hoyVentas += v.total;
    hoyProductos += v.cantidad;
    if(v.productos) {
        hoyGanancia += (v.total - (v.productos.costo * v.cantidad));
    }

    const fila = document.createElement("tr");
    fila.innerHTML = `
      <td>#${v.id.toString().slice(0,8)}</td>
      <td>${new Date(v.created_at).toLocaleString()}</td>
      <td>${v.productos ? v.productos.nombre : 'Eliminado'} x${v.cantidad}</td>
      <td>$${v.total}</td>
      <td>$${v.productos ? (v.total - (v.productos.costo * v.cantidad)).toFixed(2) : '0.00'}</td>
    `;
    tabla.appendChild(fila);
  });

  document.getElementById("ventas-hoy").textContent = `$${hoyVentas.toFixed(2)}`;
  document.getElementById("productos-vendidos").textContent = hoyProductos;
  document.getElementById("ganancia-hoy").textContent = `$${hoyGanancia.toFixed(2)}`;
}

// --- UTILIDADES ---
function vaciarCarrito() {
  carrito = [];
  actualizarCarritoUI();
}

function cerrarModal() {
  document.getElementById("modal-cobro").classList.remove("active");
}

window.prepararEdicion = function(id, nombre, precio, costo, stock) {
  document.getElementById("prod-id").value = id;
  document.getElementById("prod-nombre").value = nombre;
  document.getElementById("prod-precio").value = precio;
  document.getElementById("prod-costo").value = costo;
  document.getElementById("prod-stock").value = stock;
  window.scrollTo(0, 0);
};

function limpiarFormulario() {
  document.getElementById("prod-id").value = "";
  document.getElementById("prod-nombre").value = "";
  document.getElementById("prod-precio").value = "";
  document.getElementById("prod-costo").value = "";
  document.getElementById("prod-stock").value = "";
}
