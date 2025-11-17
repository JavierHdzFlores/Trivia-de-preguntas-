"use strict";

// --- 1. CONFIGURACIÓN INICIAL ---

// ¡¡IMPORTANTE!!
// Pega aquí tu clave de API de Google Gemini.
const API_KEY = ""; // <--- ¡PÉGALA AQUÍ!

// Modelo de Gemini que usaremos
const MODEL = "gemini-2.5-flash-preview-09-2025";

// Lista de temas
const temas = [
    "concepto de arreglo y operaciones sobre arreglos",
    "concepto de diccionarios y funciones básicas",
    "operadores lógicos, aritméticos, de comparación, ternario",
    "uso de la consola para debuggear",
    "funciones con parámetros por default",
    "diferencias entre var, let y const",
    "eventos del DOM en JavaScript",
    "propiedades de Flexbox en CSS",
    "selectores básicos de CSS",
    "etiquetas semánticas de HTML5"
];

// Referencias a los elementos del DOM
const correctasEl = document.getElementById('correctas');
const incorrectasEl = document.getElementById('incorrectas');
const questionEl = document.getElementById('question');
const optionsEl = document.getElementById('options');
const resetBtn = document.getElementById('reset-btn');

// Variables para llevar el estado
let correctas = 0;
let incorrectas = 0;
let datosPreguntaActual = null; // Para guardar la respuesta correcta
let cargando = false; // Para evitar clics múltiples

// --- 2. LÓGICA DE LOCALSTORAGE ---

/**
 * Carga los contadores desde localStorage y los muestra en la página.
 */
function desplegarContadores() {
    correctas = parseInt(localStorage.getItem('triviaCorrectas') || '0');
    incorrectas = parseInt(localStorage.getItem('triviaIncorrectas') || '0');
    correctasEl.textContent = correctas;
    incorrectasEl.textContent = incorrectas;
}

/**
 * Actualiza el contador (correctas o incorrectas) y lo guarda en localStorage.
 * @param {boolean} esCorrecta - True si la respuesta fue correcta.
 */
function actualizarContador(esCorrecta) {
    if (esCorrecta) {
        correctas++;
    } else {
        incorrectas++;
    }
    // Guardar en localStorage
    localStorage.setItem('triviaCorrectas', correctas);
    localStorage.setItem('triviaIncorrectas', incorrectas);
    // Actualizar la vista
    correctasEl.textContent = correctas;
    incorrectasEl.textContent = incorrectas;
}

/**
 * Reinicia los marcadores a 0.
 */
function reiniciarMarcador() {
    localStorage.clear(); // Limpia todo el localStorage para esta app
    correctas = 0;
    incorrectas = 0;
    correctasEl.textContent = correctas;
    incorrectasEl.textContent = incorrectas;
    // Carga una nueva pregunta para empezar de nuevo
    cargarPregunta();
}

// --- 3. LÓGICA DE LA API DE GEMINI ---

/**
 * Llama a la API de Gemini para obtener una nueva pregunta.
 */
async function obtenerDatosPregunta() {
    if (cargando) return; // Evita llamadas duplicadas
    cargando = true;

    if (!API_KEY) {
        questionEl.textContent = 'Error: API_KEY no configurada. Por favor, edita js/app.js y añade tu clave.';
        questionEl.className = 'fs-5 text-danger';
        cargando = false;
        return null;
    }

    // Selecciona un tema aleatorio
    const temaAleatorio = temas[Math.floor(Math.random() * temas.length)];

    // Prompt
    const prompt = `En el contexto de JavaScript, CSS y HTML. Genera una pregunta de opción múltiple sobre el siguiente tema: ${temaAleatorio}. Proporciona cuatro opciones de respuesta y señala cuál es la correcta.
    Genera la pregunta y sus posibles respuestas en formato JSON como el siguiente ejemplo, asegurándote de que el resultado SÓLO contenga el objeto JSON y no texto adicional:
    {
      "question": "¿Cuál de los siguientes métodos agrega un elemento al final de un arreglo en JavaScript?",
      "options": [
        "a) shift()",
        "b) pop()",
        "c) push()",
        "d) unshift()",
      ],
      "correct_answer": "c) push()",
      "explanation": "El método push() agrega uno o más elementos al final de un arreglo."
    }`;

    const url = `https://generativelace.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

    try {
        const response = await fetch(
            url,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: prompt }]
                    }],
                    generationConfig: {
                        temperature: 0.5, 
                        responseMimeType: "application/json"
                    },
                }),
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Error HTTP ${response.status}: ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();

        // Extracción del texto
        const textResult = data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (textResult) {
            // Limpiamos la respuesta
            const textResultTrimmed = textResult.trim();
            const firstBraceIndex = textResultTrimmed.indexOf('{');
            const lastBraceIndex = textResultTrimmed.lastIndexOf('}');
            const jsonString = textResultTrimmed.substring(firstBraceIndex, lastBraceIndex + 1);

            const questionData = JSON.parse(jsonString);
            cargando = false;
            return questionData;
        } else {
            throw new Error("No se pudo extraer el texto de la respuesta de la API.");
        }

    } catch (error) {
        console.error("Hubo un error en la petición:", error);
        questionEl.textContent = 'Error al cargar la pregunta. Revisa la consola para más detalles.';
        questionEl.className = 'fs-5 text-danger';
        cargando = false;
        return null;
    }
}

// --- 4. LÓGICA DEL JUEGO ---

/**
 * Muestra la pregunta y las opciones en la página.
 * @param {object} datosPregunta - El objeto JSON de la API.
 */
function desplegarPregunta(datosPregunta) {
    if (!datosPregunta) return;

    datosPreguntaActual = datosPregunta; // Guarda los datos para verificación

    // Muestra la pregunta
    questionEl.textContent = datosPregunta.question;
    questionEl.className = 'fs-5 text-dark'; // Clase normal

    // Limpia opciones anteriores
    optionsEl.innerHTML = '';

    // Crea y añade los botones de opciones
    datosPregunta.options.forEach(option => {
        const button = document.createElement('button');
        button.className = 'btn btn-outline-primary';
        button.textContent = option;
        
        // Añade el evento de clic para verificar la respuesta
        button.onclick = () => verificarRespuesta(option);
        
        optionsEl.appendChild(button);
    });
}

/**
 * Verifica la respuesta seleccionada por el usuario.
 * @param {string} opcionSeleccionada - El texto de la opción que el usuario eligió.
 */
function verificarRespuesta(opcionSeleccionada) {
    if (cargando) return; // No hacer nada si ya se está cargando la siguiente

    const esCorrecta = opcionSeleccionada === datosPreguntaActual.correct_answer;
    actualizarContador(esCorrecta);

    // Deshabilitar todos los botones y mostrar colores
    const botones = Array.from(optionsEl.children);
    botones.forEach(btn => {
        btn.disabled = true;
        // Si esta es la respuesta correcta, márcala en verde
        if (btn.textContent === datosPreguntaActual.correct_answer) {
            btn.className = 'btn btn-success';
        }
        // Si esta es la opción seleccionada y es incorrecta, márcala en rojo
        else if (btn.textContent === opcionSeleccionada) {
            btn.className = 'btn btn-danger';
        }
    });

    // Cargar la siguiente pregunta después de un breve retraso
    setTimeout(cargarPregunta, 2000); // Espera 2 segundos
}

/**
 * Función principal para cargar una nueva pregunta.
 */
async function cargarPregunta() {
    // Mostrar mensaje de carga
    questionEl.className = 'fs-5 text-muted'; // Un gris mientras carga
    questionEl.textContent = 'Cargando pregunta de Gemini...';
    optionsEl.innerHTML = '<div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div>'; // Spinner de Bootstrap

    const datosPregunta = await obtenerDatosPregunta();

    if (datosPregunta) {
        desplegarPregunta(datosPregunta);
    }
}

// --- 5. INICIO DE LA APLICACIÓN ---

/**
 * Se ejecuta cuando la página se carga por primera vez.
 */
window.onload = () => {
    console.log("Página cargada. Iniciando app de trivia.");
    desplegarContadores(); // Carga el marcador de localStorage
    cargarPregunta();     // Carga la primera pregunta
    
    // Asigna el evento al botón de reinicio
    resetBtn.onclick = reiniciarMarcador;
};
