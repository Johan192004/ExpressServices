const serviciosPlomeria = [
    {
      titulo: "Servicio de Plomería Profesional",
      profesional: "Carlos Mendoza",
      descripcion: "Soluciones rápidas y eficientes para fugas, instalaciones y reparaciones.",
      precio: "$50.000 /hora",
      
    },
    {
        imagen: "plomeria2.jpg",
        titulo: "Instalación de Sanitarios",
        profesional: "María López",
        descripcion: "Instalamos lavamanos, sanitarios y duchas con garantía.",
        precio: "$80.000"
    },

    {
        imagen: "plomeria3.jpg",
        titulo: "Reparación de Fugas",
        profesional: "Juan Rodríguez",
        descripcion: "Reparamos fugas de agua y filtraciones en el hogar.",
        precio: "$65.000"
    }
  ];

  
const serviciosElectricidad = [
    {
      imagen: "electricidad1.jpg",
      titulo: "Instalaciones Eléctricas",
      profesional: "Ana Torres",
      descripcion: "Instalamos cableado eléctrico seguro y eficiente.",
      precio: "$70.000"
    },
    {
      imagen: "electricidad2.jpg",
      titulo: "Reparación de Cortocircuitos",
      profesional: "Luis Fernández",
      descripcion: "Solucionamos fallas eléctricas y prevenimos riesgos.",
      precio: "$90.000"
    },
    {
      imagen: "electricidad3.jpg",
      titulo: "Mantenimiento Eléctrico",
      profesional: "Pedro Ramírez",
      descripcion: "Mantenimiento preventivo de sistemas eléctricos residenciales.",
      precio: "$100.000"
    }
];  

const serviciosCarpinteria = [
    {
      imagen: "carpinteria1.jpg",
      titulo: "Muebles a Medida",
      profesional: "Jorge Herrera",
      descripcion: "Diseño y construcción de muebles personalizados.",
      precio: "$120.000"
    },
    {
      imagen: "carpinteria2.jpg",
      titulo: "Restauración de Muebles",
      profesional: "Lucía Martínez",
      descripcion: "Devolvemos la vida a tus muebles antiguos.",
      precio: "$95.000"
    },
    {
      imagen: "carpinteria3.jpg",
      titulo: "Puertas y Ventanas",
      profesional: "Raúl Castro",
      descripcion: "Fabricación e instalación de puertas y ventanas de madera.",
      precio: "$150.000"
    }
];

const serviciosConstruccion = [
    {
      imagen: "construccion1.jpg",
      titulo: "Remodelación de Cocinas",
      profesional: "Andrea González",
      descripcion: "Diseño y remodelación completa de cocinas modernas.",
      precio: "$500.000"
    },
    {
      imagen: "construccion2.jpg",
      titulo: "Ampliaciones de Viviendas",
      profesional: "Fernando Ruiz",
      descripcion: "Ampliamos espacios de tu hogar con acabados profesionales.",
      precio: "$800.000"
    },
    {
      imagen: "construccion3.jpg",
      titulo: "Acabados Interiores",
      profesional: "Sofía Morales",
      descripcion: "Pintura, pisos y detalles estéticos para tu hogar.",
      precio: "$350.000"
    }
];


  let indiceServicio = 0;

const contenedor = document.getElementById("servicio-container");

const btnPlomeria = document.getElementById("btn-plomeria");
const btnElectricidad = document.getElementById("btn-electricidad");
const btnCarpinteria = document.getElementById("btn-carpinteria");
const btnConstruccion = document.getElementById("btn-construccion");

function mostrarServicios(lista) {
  contenedor.innerHTML = ""; 
  contenedor.className = "d-flex justify-content-center"; 

  lista.forEach(servicio => {
    contenedor.innerHTML += `
      <div class="card shadow-sm h-100 mx-3" style="flex: 1 1 30%; max-width: 350px;">
        <img src="${servicio.imagen}" class="card-img-top" alt="Servicio de plomería">
        <div class="card-body">
          <h5 class="card-title text-primary fw-bold">${servicio.titulo}</h5>
          <h6 class="card-subtitle mb-2 text-muted">Por ${servicio.profesional}</h6>
          <p class="card-text">${servicio.descripcion}</p>
          <div class="d-flex justify-content-between align-items-center">
            <span class="fw-bold">${servicio.precio}</span>
            <button class="btn btn-outline-primary btn-sm">Ver Más</button>
          </div>
        </div>
      </div>
    `;
  });
}
btnPlomeria.addEventListener("click", () => {
  mostrarServicios(serviciosPlomeria);
});

btnElectricidad.addEventListener("click", () => {
  mostrarServicios(serviciosElectricidad);
});

btnCarpinteria.addEventListener("click", () => {
  mostrarServicios(serviciosCarpinteria);
});

btnConstruccion.addEventListener("click", () => {
  mostrarServicios(serviciosConstruccion);
});