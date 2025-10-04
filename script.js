// Juego de Dados profesional y organizado

// Elementos del DOM
const ELEMENTS = {
    dice: document.getElementById('dice'),
    lastResult: document.getElementById('lastResult'),
    total: document.getElementById('total'),
    mode: document.getElementById('mode'),
    mean: document.getElementById('mean'),
    median: document.getElementById('median'),
    freqTableBody: document.querySelector('#freqTable tbody'),
    rollBtn: document.getElementById('rollBtn'),
    autoRollBtn: document.getElementById('autoRollBtn'),
    resetBtn: document.getElementById('resetBtn'),
    nRollsInput: document.getElementById('nRolls'),
    chartCanvas: document.getElementById('frequencyChart'),
    toastContainer: document.getElementById('toastContainer'),
    diceFacesTemplate: document.getElementById('dice-faces-template')
};

// --- CONFIGURACIÓN Y ESTADO ---
const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
const NUM_FACES = DICE_FACES.length;

let counts = Array(NUM_FACES).fill(0);
let rollHistory = []; // Historial para calcular la mediana
let totalRolls = 0;
let chart;
let randomSpins = { x: 0, y: 0 }; // Para la animación del dado 3D
let onRollCompleteCallback = null; // Callback para ejecutar cuando la animación del dado termina

// Mapa de rotaciones para cada cara del dado 3D
const rotationsForFace = {
    1: { x: 0, y: 0 },    // Cara frontal
    2: { x: 0, y: 90 },     // Para ver la cara izquierda (2), rotamos el cubo a la derecha
    3: { x: -90, y: 0 },    // Para ver la cara superior (3), rotamos el cubo hacia abajo
    4: { x: 90, y: 0 },     // Para ver la cara inferior (4), rotamos el cubo hacia arriba
    5: { x: 0, y: -90 },    // Para ver la cara derecha (5), rotamos el cubo a la izquierda
    6: { x: 0, y: 180 }     // Para ver la cara trasera (6), rotamos 180 grados
};

// --- FUNCIONES DE UI ---

/**
 * Habilita o deshabilita los botones de control para prevenir clics durante animaciones.
 * @param {boolean} disabled 
 */
function setControlsDisabled(disabled) {
    ELEMENTS.rollBtn.disabled = disabled;
    ELEMENTS.autoRollBtn.disabled = disabled;
    ELEMENTS.resetBtn.disabled = disabled;
    ELEMENTS.nRollsInput.disabled = disabled;
}

/**
 * Anima el dado 3D para que gire y muestre el resultado.
 * @param {number} result El resultado de la tirada (0-5).
 */
function rollAndShow(result) {
    const dice = ELEMENTS.dice;
    const face = result + 1;
    const targetRotation = rotationsForFace[face];

    // Añade giros completos aleatorios para un efecto de volteo
    randomSpins.x += 360 * (Math.floor(Math.random() * 2) + 4);
    randomSpins.y += 360 * (Math.floor(Math.random() * 2) + 4);

    dice.classList.add('is-rolling');
    dice.style.transform = `rotateX(${randomSpins.x + targetRotation.x}deg) rotateY(${randomSpins.y + targetRotation.y}deg)`;
}

/** Pone el dado en su estado visual inicial. */
function setInitialDiceState() {
    const dice = ELEMENTS.dice;
    dice.style.transition = 'none';
    dice.style.transform = `rotateX(-25deg) rotateY(35deg)`;
    void dice.offsetWidth; // Forzar reflow
    dice.style.transition = 'transform 1.5s cubic-bezier(0.4, 0, 0.2, 1)';
}

/**
 * Muestra una notificación toast.
 * @param {string} message El mensaje a mostrar.
 * @param {'info' | 'success' | 'error'} type El tipo de notificación.
 */
function showToast(message, type = 'info') {
    const icons = {
        info: 'fa-info-circle',
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle'
    };
    const icon = icons[type] || icons.info;

    const toast = document.createElement('div');
    toast.className = `toast-message show ${type}`;
    toast.innerHTML = `<i class="fas ${icon}"></i> ${message}`;
    ELEMENTS.toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.classList.remove('show');
        toast.classList.add('hide');
        setTimeout(() => toast.remove(), 400);
    }, 2200);
}

// Actualiza toda la interfaz de usuario llamando a las funciones específicas.
function updateUI() {
    updateFrequencyTable();
    updateChart();
}

// Actualiza la tabla de frecuencias
function updateFrequencyTable() {
    if (totalRolls === 0) {
        ELEMENTS.freqTableBody.innerHTML = '';
        ELEMENTS.total.textContent = '0';
        ELEMENTS.mode.textContent = '—';
        ELEMENTS.mean.textContent = '—';
        ELEMENTS.median.textContent = '—';
        return;
    }

    ELEMENTS.freqTableBody.innerHTML = '';
    const max = Math.max(...counts);
    const allEqualAndPositive = max > 0 && counts.every(c => c === counts[0]);

    // --- Cálculo de estadísticas ---
    // Media (Promedio)
    const sum = counts.reduce((acc, count, i) => acc + count * (i + 1), 0);
    const meanValue = sum / totalRolls;

    // Mediana
    rollHistory.sort((a, b) => a - b);
    let medianValue;
    const mid = Math.floor(rollHistory.length / 2);
    if (rollHistory.length % 2 === 0) {
        medianValue = (rollHistory[mid - 1] + rollHistory[mid]) / 2;
    } else {
        medianValue = rollHistory[mid];
    }

    counts.forEach((fa, i) => {
        const fr = totalRolls === 0 ? 0 : (fa / totalRolls);
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="face-number">${i + 1}</td>
            <td class="freq-bar-cell">
                <div class="freq-bar-container" title="${fa} tiradas">
                    <div class="freq-bar" style="width: ${(fr * 100).toFixed(2)}%;"></div>
                </div>
            </td>
            <td class="text-center">${fa}</td>
            <td class="text-center">${(fr * 100).toFixed(2)}%</td>
        `;
        if (!allEqualAndPositive && fa === max && max > 0) {
            tr.classList.add('table-success');
        }
        ELEMENTS.freqTableBody.appendChild(tr);
    });

    ELEMENTS.total.textContent = totalRolls;
    ELEMENTS.mean.textContent = meanValue.toFixed(2);
    ELEMENTS.median.textContent = medianValue.toFixed(2);

    if (allEqualAndPositive) {
        ELEMENTS.mode.textContent = `Ninguna (${max})`;
    } else {
        const modes = counts.map((c, i) => (c === max ? i + 1 : null)).filter(Boolean);
        ELEMENTS.mode.textContent = modes.join(', ') + ` (${max})`;
    }
}

// Actualiza el gráfico de barras
function updateChart() {
    if (!chart) {
        const getCssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
        const ctx = ELEMENTS.chartCanvas.getContext('2d');

        const createGradient = (colorStart, colorEnd) => {
            const chartHeight = ELEMENTS.chartCanvas.clientHeight;
            const gradient = ctx.createLinearGradient(0, 0, 0, chartHeight);
            gradient.addColorStop(0, colorStart);
            gradient.addColorStop(1, colorEnd);
            return gradient;
        };

        const baseColors = ['#81e6d9', '#f6e05e', '#b794f4', '#f687b3', '#f56565', '#63b3ed'];
        const gradientBackgrounds = [
            createGradient('rgba(129, 230, 217, 0.7)', 'rgba(129, 230, 217, 0.05)'),
            createGradient('rgba(246, 224, 94, 0.7)', 'rgba(246, 224, 94, 0.05)'),
            createGradient('rgba(183, 148, 244, 0.7)', 'rgba(183, 148, 244, 0.05)'),
            createGradient('rgba(246, 135, 179, 0.7)', 'rgba(246, 135, 179, 0.05)'),
            createGradient('rgba(245, 101, 101, 0.7)', 'rgba(245, 101, 101, 0.05)'),
            createGradient('rgba(99, 179, 237, 0.7)', 'rgba(99, 179, 237, 0.05)')
        ];

        chart = new Chart(ELEMENTS.chartCanvas, {
            type: 'bar',
            data: {
                labels: DICE_FACES,
                datasets: [{
                    label: 'Frecuencia',
                    data: counts,
                    backgroundColor: gradientBackgrounds,
                    borderColor: baseColors,
                    borderWidth: 2,
                    borderRadius: 8,
                    borderSkipped: false,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 800,
                    easing: 'easeOutCubic'
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0,
                            color: getCssVar('--color-text-muted')
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.08)',
                            borderColor: 'transparent'
                        }
                    },
                    x: {
                        ticks: {
                            color: getCssVar('--color-text-primary'),
                            font: {
                                size: 22,
                                family: getCssVar('--font-family-primary')
                            }
                        },
                        grid: {
                            display: false
                        }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        enabled: true,
                        backgroundColor: getCssVar('--color-bg-secondary'),
                        titleColor: getCssVar('--color-text-bright'),
                        bodyColor: getCssVar('--color-text-primary'),
                        borderColor: getCssVar('--color-accent'),
                        borderWidth: 1,
                        padding: 10,
                        cornerRadius: 8,
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) { label += ': '; }
                                if (context.parsed.y !== null) {
                                    label += context.parsed.y;
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });
    } else {
        chart.data.datasets[0].data = counts;
        chart.update();
    }
}

// --- LÓGICA DEL JUEGO ---

/**
 * Realiza una única tirada de dado, actualiza los contadores y devuelve el resultado.
 * @returns {number} El índice del resultado (0-5).
 */
function performRoll() {
    const result = Math.floor(Math.random() * NUM_FACES);
    counts[result]++;
    rollHistory.push(result + 1); // Guardamos el resultado (1-6)
    totalRolls++;
    return result;
}

/**
 * Ejecuta una secuencia de tirada, manejando la UI y las animaciones.
 * @param {function(): {lastResult: number, rollsCount: number}} rollFn La función que realiza las tiradas.
 * @param {string} successMessage El mensaje a mostrar al finalizar.
 */
function executeRoll(rollFn, successMessage) {
    if (ELEMENTS.rollBtn.disabled) return;
    
    setControlsDisabled(true);

    const { lastResult, rollsCount } = rollFn();
    rollAndShow(lastResult);

    onRollCompleteCallback = () => {
        ELEMENTS.lastResult.textContent = `${DICE_FACES[lastResult]} (${lastResult + 1})`;
        updateUI();
        document.body.classList.remove('is-simulating'); // Quitar clase de carga
        setControlsDisabled(false);

        // Feedback visual en la tabla para la última tirada
        const row = ELEMENTS.freqTableBody.children[lastResult];
        row.classList.add('is-last-roll');
        setTimeout(() => row.classList.remove('is-last-roll'), 1200);

        if (successMessage) {
            showToast(successMessage, 'success');
        }
    };
}

// Tira el dado una vez
function rollOnce() {
    executeRoll(() => {
        const result = performRoll();
        return { lastResult: result, rollsCount: 1 };
    });
}

// Simula N tiradas
function simulateRolls(n) {
    executeRoll(() => {
        let lastResult;
        for (let i = 0; i < n; i++) { lastResult = performRoll(); }
        return { lastResult, rollsCount: n };
    }, `Simuladas ${n} tiradas`);
}

// Reinicia el juego
function resetGame() {
    counts = Array(NUM_FACES).fill(0);
    rollHistory = [];
    totalRolls = 0;
    setInitialDiceState();
    onRollCompleteCallback = null; // Cancela cualquier actualización de UI pendiente
    ELEMENTS.lastResult.textContent = '—';
    updateUI();
    setControlsDisabled(false); // Asegura que los controles estén habilitados
    showToast('Juego reiniciado', 'success');

    // Lanza confeti para celebrar el reinicio
    if (typeof confetti === 'function') {
        confetti({
            particleCount: 150,
            spread: 90,
            origin: { y: 0.6 }
        });
    }
}

// --- EVENTOS ---
ELEMENTS.rollBtn.addEventListener('click', () => {
    rollOnce();
});

ELEMENTS.autoRollBtn.addEventListener('click', () => {
    const n = parseInt(ELEMENTS.nRollsInput.value, 10);
    if (isNaN(n) || n <= 0) {
        ELEMENTS.nRollsInput.classList.add('is-invalid');
        showToast('Ingresa un número válido mayor que 0', 'error');
        return;
    }
    simulateRolls(n);
});

ELEMENTS.resetBtn.addEventListener('click', resetGame);

ELEMENTS.nRollsInput.addEventListener('input', () => {
    ELEMENTS.nRollsInput.classList.remove('is-invalid');
});

ELEMENTS.nRollsInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
        e.preventDefault(); // Previene cualquier comportamiento por defecto (ej. submit de formulario)
        ELEMENTS.autoRollBtn.click();
    }
});

// Quita la clase 'is-rolling' cuando la animación de giro termina
ELEMENTS.dice.addEventListener('transitionend', () => {
    ELEMENTS.dice.classList.remove('is-rolling');
    if (onRollCompleteCallback) {
        onRollCompleteCallback();
        onRollCompleteCallback = null;
    }
});

// --- INICIALIZACIÓN ---

/** Inicializa la aplicación */
function initialize() {
    // Poblar el dado 3D principal con las caras del template
    const mainDiceFaces = ELEMENTS.diceFacesTemplate.content.cloneNode(true);
    ELEMENTS.dice.appendChild(mainDiceFaces);

    setInitialDiceState();
    updateUI();
}

initialize();