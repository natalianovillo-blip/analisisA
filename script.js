// ===== VARIABLES GLOBALES =====
let modo = "nodo";
let svg = document.getElementById("canvas");
let nodoSeleccionado = null;
let radioNodo = 25;
let draggingNode = null;
let ultimoColorIndex = -1;
let contadorNodos = 0;
let estadoTexto = document.getElementById('status-text');
let editandoPeso = false; // Variable para controlar edición de pesos

// Configuración de Flechas (Marcador)
const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
const marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
marker.setAttribute("id", "arrowhead");
marker.setAttribute("markerWidth", "10");
marker.setAttribute("markerHeight", "7");
marker.setAttribute("refX", "9");
marker.setAttribute("refY", "3.5");
marker.setAttribute("orient", "auto");
const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
polygon.setAttribute("points", "0 0, 10 3.5, 0 7");
polygon.setAttribute("fill", "#2c3e50");
marker.appendChild(polygon);
defs.appendChild(marker);
svg.appendChild(defs);

// ===== FUNCIONES DE MODO =====
function modoNodo() { 
    modo = "nodo"; 
    actualizarBotones();
    limpiarSeleccion();
    estadoTexto.innerText = "Modo: Nodo. Doble tap para crear un nodo.";
}

function modoArista() { 
    modo = "arista"; 
    actualizarBotones();
    limpiarSeleccion();
    estadoTexto.innerText = "Modo: Arista. Tap a un nodo y luego a otro para conectarlos.";
}

function modoBorrar() { 
    modo = "borrar"; 
    actualizarBotones();
    limpiarSeleccion();
    estadoTexto.innerText = "Modo: Eliminar. Tap en un nodo o arista para borrarlo.";
}

function actualizarBotones() {
    document.getElementById("btn-nodo").classList.remove("btn-activo");
    document.getElementById("btn-arista").classList.remove("btn-activo");
    document.getElementById("btn-borrar").classList.remove("btn-activo");

    if (modo === "nodo") document.getElementById("btn-nodo").classList.add("btn-activo");
    if (modo === "arista") document.getElementById("btn-arista").classList.add("btn-activo");
    if (modo === "borrar") document.getElementById("btn-borrar").classList.add("btn-activo");
}

function limpiarSeleccion() {
    if (nodoSeleccionado) {
        nodoSeleccionado.setAttribute("stroke", "black");
        nodoSeleccionado.setAttribute("stroke-width", "2");
        nodoSeleccionado = null;
    }
}

// ===== OBTENER COORDENADAS (Mouse o Touch) =====
function getCoords(e) {
    const rect = svg.getBoundingClientRect();
    let clientX, clientY;
    
    if (e.touches) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }
    
    // Asegurar que las coordenadas estén dentro del canvas
    let x = Math.max(radioNodo, Math.min(clientX - rect.left, svg.clientWidth - radioNodo));
    let y = Math.max(radioNodo, Math.min(clientY - rect.top, svg.clientHeight - radioNodo));
    
    return { x, y };
}

// ===== EVENTOS DEL CANVAS =====
svg.addEventListener("dblclick", (e) => {
    e.preventDefault();
    if (modo === "nodo") {
        const { x, y } = getCoords(e);
        crearNodo(x, y);
    }
});

// Eventos táctiles y de mouse
svg.addEventListener("touchstart", handleDragStart, { passive: false });
svg.addEventListener("mousedown", handleDragStart);

svg.addEventListener("touchmove", handleDragMove, { passive: false });
svg.addEventListener("mousemove", handleDragMove);

svg.addEventListener("touchend", handleDragEnd);
svg.addEventListener("touchcancel", handleDragEnd);
svg.addEventListener("mouseup", handleDragEnd);
svg.addEventListener("mouseleave", handleDragEnd);

function handleDragStart(e) {
    const target = e.target;
    if (target.tagName === "circle" && modo === "nodo") {
        e.stopPropagation();
        e.preventDefault();
        draggingNode = target;
    }
}

function handleDragMove(e) {
    if (draggingNode) {
        e.preventDefault();
        const { x, y } = getCoords(e);
        draggingNode.setAttribute("cx", x);
        draggingNode.setAttribute("cy", y);
        actualizarGrafo();
    }
}

function handleDragEnd() {
    draggingNode = null;
}

// ===== CREAR UN NODO =====
function crearNodo(x, y) {
    let circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", x); 
    circle.setAttribute("cy", y);
    circle.setAttribute("r", radioNodo); 
    circle.setAttribute("fill", obtenerColorSinRepetir());
    circle.setAttribute("stroke", "black"); 
    circle.setAttribute("stroke-width", "2");

    // Generar nombre automático: A, B, C, ... Z, AA, AB...
    let nombreAuto = generarNombreNodo(contadorNodos);
    contadorNodos++;

    // Evento de clic/tap para seleccionar (en modo arista) o borrar
    circle.addEventListener("click", (e) => {
        e.stopPropagation();
        if (modo === "borrar") { 
            borrarNodo(circle); 
            return; 
        }
        if (modo === "arista") {
            if (!nodoSeleccionado) {
                // Primer nodo seleccionado
                nodoSeleccionado = circle;
                circle.setAttribute("stroke", "#e67e22"); 
                circle.setAttribute("stroke-width", "5");
                estadoTexto.innerText = "Modo: Arista. Ahora selecciona el segundo nodo.";
            } else {
                if (nodoSeleccionado !== circle) {
                    // Verificar si ya existe una arista en esa dirección
                    if (!existeArista(nodoSeleccionado, circle)) {
                        crearArista(nodoSeleccionado, circle);
                    } else {
                        alert("Ya existe una arista en esa dirección");
                    }
                } else {
                    // Verificar si ya existe un bucle
                    if (!existeArista(circle, circle)) {
                        crearArista(circle, circle);
                    } else {
                        alert("Ya existe un bucle en este nodo");
                    }
                }
                // Limpiar selección
                nodoSeleccionado.setAttribute("stroke", "black");
                nodoSeleccionado.setAttribute("stroke-width", "2");
                nodoSeleccionado = null;
                estadoTexto.innerText = "Modo: Arista. Tap en un nodo y luego en otro para conectarlos.";
            }
        }
    });

    // Evento de doble clic/tap para renombrar
    circle.addEventListener("dblclick", (e) => {
        e.stopPropagation();
        e.preventDefault();
        let lbl = Array.from(document.querySelectorAll(".nodo-label")).find(l => l.nodoRef === circle);
        let nombreActual = lbl ? lbl.textContent : "";
        let nuevoNombre = prompt("Nuevo nombre del nodo:", nombreActual);
        if (nuevoNombre && nuevoNombre.trim() !== "") {
            if (lbl) lbl.textContent = nuevoNombre.trim();
            actualizarGrafo();
        }
    });

    svg.appendChild(circle);
    agregarTextoNodo(circle, nombreAuto);
    actualizarGrafo();
}

// Verificar si ya existe una arista entre dos nodos
function existeArista(n1, n2) {
    let aristas = Array.from(document.querySelectorAll("path")).filter(p => p.n1 && p.n2);
    return aristas.some(arista => arista.n1 === n1 && arista.n2 === n2);
}

// Generar nombres como A, B, C, ..., Z, AA, AB...
function generarNombreNodo(index) {
    let letras = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    if (index < 26) return letras[index];
    else {
        let primerIndice = Math.floor(index / 26) - 1;
        let segundoIndice = index % 26;
        return letras[primerIndice] + letras[segundoIndice];
    }
}

// ===== CREAR UNA ARISTA =====
function crearArista(n1, n2) {
    let path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("stroke", "#2c3e50"); 
    path.setAttribute("stroke-width", "2.5");
    path.setAttribute("fill", "none"); 
    path.setAttribute("marker-end", "url(#arrowhead)");
    path.n1 = n1; 
    path.n2 = n2;

    // Añadir peso por defecto
    path.peso = 1;

    // Crear etiqueta para el peso
    let label = agregarTextoArista(path.peso, path);
    path.labelElement = label;

    // Evento para cambiar peso (tap en la etiqueta) - CORREGIDO
    label.addEventListener("click", function(e) {
        e.stopPropagation();
        e.preventDefault();
        
        // Evitar múltiples llamadas
        if (editandoPeso) return;
        editandoPeso = true;
        
        let nuevoPeso = prompt("Nuevo peso (número):", path.peso);
        
        if (nuevoPeso !== null && !isNaN(nuevoPeso) && nuevoPeso.trim() !== "") {
            path.peso = parseFloat(nuevoPeso);
            this.textContent = path.peso;
            actualizarGrafo();
        }
        
        // Resetear después de un tiempo
        setTimeout(() => {
            editandoPeso = false;
        }, 500);
    });

    // Evento para eliminar arista
    path.addEventListener("click", (e) => { 
        if (modo === "borrar") { 
            e.stopPropagation();
            e.preventDefault();
            if (path.labelElement) path.labelElement.remove(); 
            path.remove(); 
        } 
    });

    svg.insertBefore(path, svg.firstChild);
    actualizarGrafo();
}

// ===== ACTUALIZAR POSICIONES =====
function actualizarGrafo() {
    // Actualizar posiciones de etiquetas de nodos
    document.querySelectorAll(".nodo-label").forEach(l => {
        if (l.nodoRef && l.nodoRef.parentNode) {
            let x = parseFloat(l.nodoRef.getAttribute("cx"));
            let y = parseFloat(l.nodoRef.getAttribute("cy"));
            l.setAttribute("x", x);
            l.setAttribute("y", y);
        }
    });

    // Actualizar caminos de las aristas y posición de sus etiquetas
    document.querySelectorAll("path").forEach(p => {
        if (!p.n1 || !p.n2 || !p.n1.parentNode || !p.n2.parentNode) return;
        
        let x1 = parseFloat(p.n1.getAttribute("cx")), y1 = parseFloat(p.n1.getAttribute("cy"));
        let x2 = parseFloat(p.n2.getAttribute("cx")), y2 = parseFloat(p.n2.getAttribute("cy"));
        let d, tx, ty;

        if (p.n1 === p.n2) { // Bucle
            let dir = (x1 > svg.clientWidth / 2) ? 1 : -1;
            d = `M ${x1+15*dir} ${y1-22} C ${x1+70*dir} ${y1-70}, ${x1+70*dir} ${y1+70}, ${x1+25*dir} ${y1}`;
            tx = x1 + 35 * dir; 
            ty = y1 - 35;
        } else {
            let dx = x2 - x1, dy = y2 - y1, dist = Math.sqrt(dx*dx + dy*dy);
            
            // Evitar división por cero
            if (dist === 0) return;
            
            let x2A = x2 - (dx/dist)*25, y2A = y2 - (dy/dist)*25;
            
            // Verificar si existe arista en dirección contraria
            let existeContraria = existeArista(p.n2, p.n1);
            let offset = existeContraria ? 25 : 15; // Más separación si hay doble arista
            
            let cx = (x1+x2)/2 - (dy/dist)*offset, cy = (y1+y2)/2 + (dx/dist)*offset;
            d = `M ${x1} ${y1} Q ${cx} ${cy} ${x2A} ${y2A}`;
            
            // Posición de la etiqueta
            tx = (x1 + x2) / 2 - (dy/dist) * 10;
            ty = (y1 + y2) / 2 + (dx/dist) * 10;
        }
        
        p.setAttribute("d", d);
        if (p.labelElement && p.labelElement.parentNode) { 
            p.labelElement.setAttribute("x", tx); 
            p.labelElement.setAttribute("y", ty); 
        }
    });
}

// ===== AÑADIR TEXTO A UN NODO =====
function agregarTextoNodo(n, t) {
    let txt = document.createElementNS("http://www.w3.org/2000/svg", "text");
    txt.setAttribute("class", "nodo-label"); 
    txt.nodoRef = n;
    txt.setAttribute("text-anchor", "middle"); 
    txt.setAttribute("dominant-baseline", "middle");
    txt.style.pointerEvents = "none"; 
    txt.style.fontWeight = "bold";
    txt.style.fill = "#2c3e50";
    txt.style.fontSize = "14px";
    txt.textContent = t;
    svg.appendChild(txt);
}

// ===== AÑADIR TEXTO A UNA ARISTA (PESO) =====
function agregarTextoArista(t, pathRef) {
    let txt = document.createElementNS("http://www.w3.org/2000/svg", "text");
    txt.setAttribute("class", "arista-label");
    txt.setAttribute("text-anchor", "middle");
    txt.setAttribute("dominant-baseline", "middle");
    txt.style.fill = "#e67e22";
    txt.style.fontWeight = "bold";
    txt.style.cursor = "pointer";
    txt.style.fontSize = "14px";
    txt.style.textShadow = "1px 1px 2px white";
    txt.style.backgroundColor = "rgba(255,255,255,0.8)";
    txt.style.padding = "2px 6px";
    txt.style.borderRadius = "12px";
    txt.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
    txt.style.userSelect = "none"; // Evitar selección de texto
    txt.textContent = t;
    txt.pathRef = pathRef;
    svg.appendChild(txt);
    return txt;
}

// ===== GENERAR MATRIZ DE ADYACENCIA CON MÁXIMOS =====
function generarMatriz() {
    const nodos = Array.from(document.querySelectorAll("circle"));
    const aristas = Array.from(document.querySelectorAll("path")).filter(p => p.n1 && p.n2);
    const contenedor = document.getElementById("resultado-matriz");
    
    if (!nodos.length) {
        alert("No hay nodos para mostrar en la matriz.");
        return;
    }

    // Obtener nombres de los nodos
    const nombres = nodos.map(n => {
        let lbl = Array.from(document.querySelectorAll(".nodo-label")).find(l => l.nodoRef === n);
        return lbl ? lbl.textContent : "?";
    });
    
    // Crear matriz de adyacencia
    let matriz = [];
    for (let i = 0; i < nodos.length; i++) {
        matriz[i] = [];
        for (let j = 0; j < nodos.length; j++) {
            let arista = aristas.find(ar => ar.n1 === nodos[i] && ar.n2 === nodos[j]);
            matriz[i][j] = arista ? (arista.peso !== undefined ? arista.peso : 1) : 0;
        }
    }
    
    // Calcular máximos por fila y columna
    let maxFila = [];
    let maxCol = [];
    
    for (let i = 0; i < nodos.length; i++) {
        maxFila[i] = Math.max(...matriz[i]);
        maxCol[i] = Math.max(...matriz.map(fila => fila[i]));
    }
    
    // Calcular suma total
    let total = matriz.reduce((sum, fila) => sum + fila.reduce((s, v) => s + v, 0), 0);
    
    // Crear tabla
    let html = "<div class='matriz-wrapper'><table class='matriz-table'>";
    
    // Encabezado
    html += "<tr><th></th>";
    nombres.forEach(n => html += `<th>${n}</th>`);
    html += "<th>Máx Fila</th></tr>";

    // Cuerpo de la matriz
    for (let i = 0; i < nodos.length; i++) {
        html += `<tr><th>${nombres[i]}</th>`;
        for (let j = 0; j < nodos.length; j++) {
            let valor = matriz[i][j];
            let clase = valor > 0 ? 'valor-positivo' : 'valor-cero';
            html += `<td class="${clase}">${valor}</td>`;
        }
        // Mostrar máximo de fila
        html += `<td class="max-fila"><strong>${maxFila[i]}</strong></td>`;
        html += "</tr>";
    }
    
    // Fila de máximos por columna
    html += "<tr><th>Máx Col</th>";
    maxCol.forEach(valor => html += `<td class="max-col"><strong>${valor}</strong></td>`);
    html += `<td class="total"><strong>${total}</strong></td></tr>`;
    
    html += "</table></div>";
    
    // Agregar estadísticas
    html += `<div class="estadisticas">
        <h3><i class="fas fa-chart-simple"></i> Resumen</h3>
        <p><span>Total de nodos:</span> <strong>${nodos.length}</strong></p>
        <p><span>Total de aristas:</span> <strong>${aristas.length}</strong></p>
        <p><span>Suma total de pesos:</span> <strong>${total}</strong></p>
        <p><span>Máximo global:</span> <strong>${Math.max(...maxFila, ...maxCol)}</strong></p>
    </div>`;

    contenedor.innerHTML = html;
    document.getElementById('modal-matriz').style.display = 'flex';
}

// ===== OBTENER COLOR SIN REPETIR =====
function obtenerColorSinRepetir() {
    const colores = ["#74b9ff", "#55efc4", "#ffeaa7", "#a29bfe", "#ff7675", "#fab1a0", "#00b894", "#fdcb6e"];
    let index;
    do { 
        index = Math.floor(Math.random() * colores.length); 
    } while (index === ultimoColorIndex && colores.length > 1);
    ultimoColorIndex = index;
    return colores[index];
}

// ===== BORRAR UN NODO Y SUS ARISTAS =====
function borrarNodo(nodo) {
    document.querySelectorAll("path").forEach(p => { 
        if (p.n1 === nodo || p.n2 === nodo) { 
            if (p.labelElement) p.labelElement.remove(); 
            p.remove(); 
        } 
    });
    document.querySelectorAll(".nodo-label").forEach(l => { 
        if (l.nodoRef === nodo) l.remove(); 
    });
    nodo.remove();
    actualizarGrafo();
}

// ===== LIMPIAR TODO =====
function limpiarTodo() { 
    if (confirm("¿Estás seguro de limpiar todo el canvas?")) {
        // Guardar defs (flechas)
        const markers = svg.querySelector("defs");
        svg.innerHTML = ""; 
        svg.appendChild(markers); 
        contadorNodos = 0; 
        nodoSeleccionado = null;
        modoNodo();
        estadoTexto.innerText = "Canvas limpiado. Modo Nodo: Doble tap para crear.";
    }
}

// ===== FUNCIONES DE MODALES =====
function cerrarBienvenida() { 
    document.getElementById('modal-bienvenida').style.display = 'none'; 
}

function cerrarMatriz() { 
    document.getElementById('modal-matriz').style.display = 'none'; 
}

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', function() {
    actualizarBotones();
    
    // Asegurar que el modal de bienvenida se muestre
    setTimeout(() => {
        document.getElementById('modal-bienvenida').style.display = 'flex';
    }, 500);
});

// Hacer funciones globales para los botones
window.modoNodo = modoNodo;
window.modoArista = modoArista;
window.modoBorrar = modoBorrar;
window.generarMatriz = generarMatriz;
window.limpiarTodo = limpiarTodo;
window.cerrarBienvenida = cerrarBienvenida;
window.cerrarMatriz = cerrarMatriz;