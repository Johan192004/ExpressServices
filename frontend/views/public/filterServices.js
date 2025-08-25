const resultados = document.getElementById("resultados");
const filtroForm = document.getElementById("filtroForm");
const resetBtn = document.getElementById("resetBtn");
const categoryBtns = document.querySelectorAll(".category-btns .btn");

let categoriaSeleccionada = "todos";

// Renderizar servicios
function mostrarServicios(lista) {
    resultados.innerHTML = "";
    if (!Array.isArray(lista)) {
        resultados.innerHTML = `<p class="text-center text-danger">Error inesperado en la respuesta del servidor.</p>`;
        return;
    }
    if (lista.length === 0) {
        resultados.innerHTML = `<p class="text-center text-muted">No se encontraron servicios con esos filtros.</p>`;
        return;
    }
    lista.forEach(servicio => {
        resultados.innerHTML += `
                <div class="col-md-4">
                    <div class="card p-3 h-100">
                        <div class="card-body">
                            <h5 class="card-title">${servicio.nombre}</h5>
                            <p class="card-text">Experiencia: ${servicio.experiencia} años</p>
                            <p class="card-text">Precio: $${servicio.precio}</p>
                        </div>
                    </div>
                </div>
            `;
    });
}

// Llamada a la API
async function obtenerServicios() {
    const experiencia = document.getElementById("experiencia").value;
    const precio = document.getElementById("precio").value;

    const params = new URLSearchParams({
        categoria: categoriaSeleccionada,
        experiencia,
        precio
    });

    try {
        // Cambia la URL por la ruta correcta de tu backend si es necesario
        const res = await fetch(`http://localhost:3000/api/services?${params.toString()}`);
        const data = await res.json();
        mostrarServicios(data);
    } catch (error) {
        console.error("Error cargando servicios:", error);
        resultados.innerHTML = `<p class=\"text-center text-danger\">Error cargando servicios.</p>`;
    }
}

// Eventos categorías
categoryBtns.forEach(btn => {
    btn.addEventListener("click", () => {
        categoryBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        categoriaSeleccionada = btn.getAttribute("data-categoria");
        obtenerServicios();
    });
});

// Eventos filtros
filtroForm.addEventListener("submit", (e) => {
    e.preventDefault();
    obtenerServicios();
});

resetBtn.addEventListener("click", () => {
    document.getElementById("experiencia").value = "";
    document.getElementById("precio").value = "";
    categoriaSeleccionada = "todos";
    categoryBtns.forEach(b => b.classList.remove("active"));
    categoryBtns[0].classList.add("active");
    obtenerServicios();
});

// Mostrar todos al inicio
obtenerServicios(); 