// Globale Hilfsfunktion für Animationen
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Laden der Bilder
function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = (err) => reject(new Error(`Fehler beim Laden von Bild: ${src.substring(0, 30)}...`));
        img.src = src;
    });
}

// Globale Chart-Variablen
let bananaChart;
let musicChart;

// Startet die gesamte Anwendung, wenn das Fenster geladen ist
window.onload = () => {
    console.log('window.onload wurde ausgelöst. Skript startet.');
    
    // --- Globale App-Steuerung (Tab-Navigation) ---
    const navButtons = document.querySelectorAll('.nav-button');
    const modules = document.querySelectorAll('.module');

    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            navButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            const targetModuleId = button.getAttribute('data-target');
            
            modules.forEach(module => {
                module.classList.remove('active');
                if (module.id === targetModuleId) {
                    module.classList.add('active');
                }
            });
            
            setTimeout(() => {
                if (targetModuleId === 'modul-1' && bananaChart) {
                    bananaChart.resize();
                } else if (targetModuleId === 'modul-2' && musicChart) {
                    musicChart.resize();
                }
            }, 10);
        });
    });
    
    const BANANA_LECKER_SVG = 'banane-lecker.svg';
    const BANANA_NICHTLECKER_SVG = 'banane-nichtlecker.svg';
    const BANANA_GREY_SVG = 'banane-grey.svg';
    
    
    // Starte das Laden aller Bilder mit der neuen Hilfsfunktion
    const loadLecker = loadImage(BANANA_LECKER_SVG);
    const loadNichtLecker = loadImage(BANANA_NICHTLECKER_SVG);
    const loadGrey = loadImage(BANANA_GREY_SVG);
    
    // Warte, bis ALLE Bilder geladen sind
    Promise.all([loadLecker, loadNichtLecker, loadGrey]).then(([bananaLeckerImg, bananaNichtLeckerImg, bananaGreyImg]) => {
        
        console.log('Bilder erfolgreich geladen. Initialisiere Module...');
        
        // 1. Initialisiere Modul 1 (Bananen) und übergib die geladenen Bilder
        try {
            initBananaModule(bananaLeckerImg, bananaNichtLeckerImg, bananaGreyImg);
            console.log('Modul 1 (Bananen) erfolgreich initialisiert.');
        } catch (e) {
            console.error("FEHLER bei initBananaModule:", e);
        }

        // 2. Initialisiere Modul 2 (Musik)
        try {
            initMusicModule();
            console.log('Modul 2 (Musik) erfolgreich initialisiert.');
        } catch (e) {
            console.error("FEHLER bei initMusicModule:", e);
        }
        
        // 3. Initialisiere Modul 3 (Robo)
        try {
            initRoboModule();
            console.log('Modul 3 (Robo) erfolgreich initialisiert.');
        } catch (e) {
            console.error("FEHLER bei initRoboModule:", e);
        }

        console.log("Alle Module initialisiert.");

    }).catch(error => {
        // Falls ein Bild *wirklich* nicht laden kann
        console.error("Kritischer Fehler: Ein oder mehrere Bananen-Bilder konnten nicht geladen werden:", error);
    });
};

// ===================================================================
// MODUL 1: DER BANANEN-CHECKER
// ===================================================================
class BananaClassifier {
    constructor(chart, elements) {
        this.chart = chart;
        this.elements = elements;
        
        // Initialer Zustand
        this.trainingData = [];
        this.testData = [];
        this.labeledData = { lecker: [], nichtLecker: [] };
        this.currentPointIndex = 0;
        this.learnedBoundaries = { b1: 0, b2: 10 };
    }

    // Datengenerierung
    generateData(trainingCount = 15, testCount = 5) {
        this.trainingData = Array.from({ length: trainingCount }, () => ({
            x: Math.random() * 10, 
            y: 1 
        }));
        this.testData = Array.from({ length: testCount }, () => ({
            x: Math.random() * 10, 
            y: 0.5 
        }));
    }

    // Optimierte Grenzfindung
    findBestBoundaries() {
        const { lecker, nichtLecker } = this.labeledData;
        let bestB1 = 0, bestB2 = 10;
        let minError = Infinity;

        // Schrittweite 0.25 für präzisere Grenzen
        for (let i = 0; i < 40; i++) {
            let b1 = i * 0.25;
            for (let j = i + 1; j <= 40; j++) {
                let b2 = j * 0.25;
                
                const error = this.calculateClassificationError(b1, b2, lecker, nichtLecker);
                
                if (error < minError || (error === minError && Math.abs((b1 + b2) / 2 - 5) < Math.abs((bestB1 + bestB2) / 2 - 5))) {
                    minError = error;
                    bestB1 = b1;
                    bestB2 = b2;
                }
            }
        }
        return { b1: bestB1, b2: bestB2 };
    }

    // Fehlerberechnung
    calculateClassificationError(b1, b2, leckerData, nichtLeckerData) {
        let error = 0;
        
        leckerData.forEach(point => {
            if (point.x < b1 || point.x > b2) error++;
        });
        nichtLeckerData.forEach(point => {
            if (point.x >= b1 && point.x <= b2) error++;
        });
        return error;
    }

    // Initialisierung
    init() {
        this.bindEvents();
        this.startLabeling();
    }

    // Event-Binding
    bindEvents() {
        this.elements.leckerButton.addEventListener('click', () => this.labelCurrentBanana(true));
        this.elements.nichtLeckerButton.addEventListener('click', () => this.labelCurrentBanana(false));
        this.elements.trainButton.addEventListener('click', () => this.trainClassifier());
        this.elements.testButton.addEventListener('click', () => this.testClassifier());
    }

    // Banane labeln
    labelCurrentBanana(isLecker) {
        if (this.currentPointIndex >= this.trainingData.length) return;
        
        const currentPoint = this.trainingData[this.currentPointIndex];
        
        if (isLecker) {
            this.labeledData.lecker.push(currentPoint);
            this.updateChartDataset(0, this.labeledData.lecker);
        } else {
            this.labeledData.nichtLecker.push(currentPoint);
            this.updateChartDataset(1, this.labeledData.nichtLecker);
        }
        
        this.currentPointIndex++;
        this.showNextBanana();
    }

    // Chart-Datensatz aktualisieren
    updateChartDataset(datasetIndex, data) {
        this.chart.data.datasets[datasetIndex].data = [...data];
        this.chart.update('none'); // Ohne Animation für Datenpunkte
    }

    // Nächste Banane anzeigen
    showNextBanana() {
        if (this.currentPointIndex < this.trainingData.length) {
            this.elements.labelPrompt.textContent = 
                `Bewerte Banane ${this.currentPointIndex + 1} von ${this.trainingData.length}:`;
            
            // Aktuelle Banane anzeigen
            this.chart.data.datasets[2].data = [this.trainingData[this.currentPointIndex]];
            this.chart.update('none');
        } else {
            this.finishLabeling();
        }
    }

    // Labeling abschließen
    finishLabeling() {
        this.elements.labelPrompt.textContent = 'Alle 15 Bananen gelabelt!';
        this.chart.data.datasets[2].data = []; 
        this.elements.labelControls.style.display = 'none'; 
        this.elements.trainButton.style.display = 'block';
        this.chart.update('none');
    }

    // Klassifikator trainieren
    async trainClassifier() {
        this.elements.trainButton.disabled = true;
        this.elements.labelPrompt.textContent = 'KI lernt... (findet besten "Lecker"-Bereich)';
        
        // Kleine Verzögerung für UI-Update
        await sleep(100);
        
        this.learnedBoundaries = this.findBestBoundaries();
        
        // Grenzen mit Animation setzen
        this.setBoundaries(this.learnedBoundaries.b1, this.learnedBoundaries.b2, true);
        
        await sleep(1500); // Animationszeit
        
        this.elements.testButton.disabled = false;
        this.elements.labelPrompt.textContent = 'Training abgeschlossen!';
        
        // Die gelernten Grenzen als Text formatieren
        const b1Text = this.learnedBoundaries.b1.toFixed(2);
        const b2Text = this.learnedBoundaries.b2.toFixed(2);

        this.elements.testResultDisplay.innerHTML = 
            `<p>Die KI hat den "Lecker"-Bereich gelernt!</p>
             <p><strong>Gelernte Grenzen: ${b1Text}</strong> bis <strong>${b2Text}</strong></p>
             <p>Teste sie jetzt.</p>`;
    }

    // Grenzen im Chart setzen
    setBoundaries(b1, b2, animate = true) {
        // Animation für Linien/Bereich steuern
        if (animate) {
            this.chart.options.animation = {
                duration: 1500,
                easing: 'easeInOutQuad'
            };
        } else {
            this.chart.options.animation = false;
        }
        
        // Grenzlinien setzen
        this.chart.data.datasets[3].data = [{x: b1, y: 0}, {x: b1, y: 2}];
        this.chart.data.datasets[4].data = [{x: b2, y: 0}, {x: b2, y: 2}];
        
        // Fläche zwischen den Grenzen
        this.chart.data.datasets[5].data = [
            {x: b1, y: 0}, 
            {x: b1, y: 2}, 
            {x: b2, y: 2},
            {x: b2, y: 0}, 
            {x: b1, y: 0} 
        ];
        
        this.chart.update();
        
        // Animation zurücksetzen
        if (animate) {
            this.chart.options.animation = {
                duration: 1500,
                easing: 'easeInOutQuad'
            };
        }
    }

    // Klassifikator testen
    async testClassifier() {
        this.elements.testResultDisplay.innerHTML = 
            '<p>Teste 5 neue Bananen (graue Icons)...</p>';
        this.elements.testButton.disabled = true;
        
        // Testdaten im Chart anzeigen
        this.chart.data.datasets[2].data = [...this.testData];
        this.chart.update('none');
       
        await sleep(2000); // Dramatische Pause
        
        // Klassifikation durchführen
        const classifiedLecker = this.testData.filter(
            point => point.x >= this.learnedBoundaries.b1 && 
                     point.x <= this.learnedBoundaries.b2
        );
        const classifiedNichtLecker = this.testData.filter(
            point => point.x < this.learnedBoundaries.b1 || 
                     point.x > this.learnedBoundaries.b2
        );

        // Graue Test-Punkte entfernen
        this.chart.data.datasets[2].data = [];
        
        // Ergebnisse im Chart anzeigen
        this.chart.data.datasets[0].data = [...this.labeledData.lecker, ...classifiedLecker];
        this.chart.data.datasets[1].data = [...this.labeledData.nichtLecker, ...classifiedNichtLecker];
        this.chart.update('none');

        // Ergebnis-Text anzeigen
        this.elements.testResultDisplay.innerHTML = 
            `<p><strong>Test abgeschlossen!</strong></p>
             <p>Die KI hat <strong>${classifiedLecker.length}</strong> Banane(n) als 'Lecker' und 
             <strong>${classifiedNichtLecker.length}</strong> als 'Nicht Lecker' klassifiziert.</p>`;
        
        //this.elements.testButton.disabled = false;
    }
    
    // Startet den gesamten Prozess
    startLabeling() {
        this.currentPointIndex = 0;
        this.labeledData = { lecker: [], nichtLecker: [] };
        this.generateData(15, 5); 
        
        // Chart zurücksetzen
        this.updateChartDataset(0, []);
        this.updateChartDataset(1, []);
        this.updateChartDataset(2, []);
        
        // Linien verstecken
        this.setBoundaries(0, 0, false);
        
        // UI zurücksetzen
        this.elements.labelControls.style.display = 'flex';
        this.elements.trainButton.style.display = 'none';
        this.elements.testButton.disabled = true;
        this.elements.testResultDisplay.innerHTML = 
            '<p>Bitte trainiere die KI, indem du 15 Bananen labelst.</p>';
        
        this.showNextBanana();
    }
}

// ===================================================================
// MODUL 1: INITIALISIERUNG
// ===================================================================

function initBananaModule(bananaLeckerImg, bananaNichtLeckerImg, bananaGreyImg) {
    const ctx = document.getElementById('bananaChart').getContext('2d');
    
    // Chart erstellen mit Bildern (pointStyle) statt farbigen Punkten
    bananaChart = new Chart(ctx, {
        type: 'scatter', 
        data: {
            datasets: [
                { 
                    label: 'Lecker', 
                    data: [], 
                    pointStyle: bananaLeckerImg, 
                    order: 2
                },
                { 
                    label: 'Nicht Lecker', 
                    data: [], 
                    pointStyle: bananaNichtLeckerImg,
                    order: 2
                },
                { 
                    label: 'Aktuelle Banane', 
                    data: [], 
                    pointStyle: bananaGreyImg,
                    order: 2
                },
                {
                    label: 'Grenze 1', 
                    type: 'line', 
                    data: [], 
                    borderColor: '#333', 
                    borderWidth: 3, 
                    pointRadius: 0,
                    order: 1 
                },
                {
                    label: 'Grenze 2', 
                    type: 'line', 
                    data: [], 
                    borderColor: '#333', 
                    borderWidth: 3, 
                    pointRadius: 0,
                    order: 1
                },
                {
                    label: 'Lecker-Bereich', 
                    type: 'line', 
                    data: [], 
                    backgroundColor: 'rgba(46, 204, 113, 0.2)', 
                    borderColor: 'transparent', 
                    pointRadius: 0,
                    fill: true, 
                    order: 0 
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 1500,
                easing: 'easeInOutQuad'
            },
            scales: {
                x: { 
                    title: { 
                        display: true, 
                        text: 'Bananen-Reife (Grün ➜ Gelb ➜ Braun)',
                        font: { size: 13 }
                    }, 
                    min: 0, 
                    max: 10, 
                    ticks: { display: false },
                    grid: { display: false }
                },
                y: { 
                    display: false, 
                    min: 0, 
                    max: 2 
                }
            },
            plugins: {
                legend: { 
                    display: true,
                    labels: {
                        filter: (item) => !item.text.includes('Grenze') && 
                                         !item.text.includes('Bereich'),
                        usePointStyle: true
                    }
                },
                tooltip: {
                    enabled: false
                }
            }
        }
    });

    // DOM-Elemente für die Klasse sammeln
    const domElements = {
        labelControls: document.getElementById('banana-labeling-controls'),
        labelPrompt: document.getElementById('banana-labeling-prompt'),
        leckerButton: document.getElementById('label-lecker'),
        nichtLeckerButton: document.getElementById('label-nicht-lecker'),
        trainButton: document.getElementById('train-banana-button'),
        testButton: document.getElementById('test-banana-button'),
        testResultDisplay: document.getElementById('banana-test-result')
    };

    // Prüfen ob alle Elemente vorhanden sind
    const missingElements = Object.entries(domElements)
        .filter(([key, el]) => !el)
        .map(([key]) => key);
    
    if (missingElements.length > 0) {
        console.error('Fehlende DOM-Elemente:', missingElements);
        return;
    }

    // Klasse instanziieren und starten
    const classifier = new BananaClassifier(bananaChart, domElements);
    classifier.init();
}


// ===================================================================
// MODUL 2: MUSIK-ENTDECKER
// ===================================================================

let songData = [];
const clusterColors = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#e67e22'];

function initMusicModule() {
    const kSlider = document.getElementById('k-slider');
    const kValueSpan = document.getElementById('k-value');
    const clusterButton = document.getElementById('cluster-button');
    const clusterAnalysis = document.getElementById('cluster-analysis');
    const ctx = document.getElementById('musicChart').getContext('2d');

    songData = generateSpreadSongs(100);

    musicChart = new Chart(ctx, {
        type: 'scatter',
        data: { 
            datasets: [{
                label: 'Songs',
                data: songData,
                backgroundColor: 'grey',
                radius: 5 
            }, 
            {
                label: 'Cluster-Mitten',
                data: [],
                backgroundColor: 'black',
                pointStyle: 'rectRot', 
                radius: 12, 
                borderColor: '#000', 
                borderWidth: 2
            }] 
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { title: { display: true, text: 'Energie (niedrig -> hoch)' }, min: 0, max: 100 },
                y: { title: { display: true, text: 'Tanzbarkeit (niedrig -> hoch)' }, min: 0, max: 100 }
            },
            plugins: { 
                legend: { 
                    display: true,
                    labels: {
                    generateLabels: function(chart) {
                        const labels = Chart.defaults.plugins.legend.labels.generateLabels(chart);

                            labels.forEach(label => {

                            if (label.text === "Songs") {
                                label.pointStyle = "circle";    // Kreis in Legende
                                label.fillStyle = "grey";
                                label.strokeStyle = "grey";
                            }

                            if (label.text === "Cluster-Mitten") {
                                label.fillStyle = "black";
                                label.strokeStyle = "#000";

                                // ✅ eigener Shape für Legende
                                label.pointStyle = {
                                draw(ctx, x, y, radius) {
                                    ctx.beginPath();
                                    ctx.moveTo(x - radius * 0.5, y - radius * 0.8);
                                    ctx.lineTo(x + radius * 0.5, y - radius * 0.8);
                                    ctx.lineTo(x + radius * 0.8, y + radius * 0.8);
                                    ctx.lineTo(x - radius * 0.8, y + radius * 0.8);
                                    ctx.closePath();
                                    ctx.fill();
                                    ctx.stroke();
                                }
                                };
                            }

                            });
                            return labels;
                    }
                }
                } 
            },
            animation: { 
                duration: 1500,
                easing: 'easeInOutQuad'
            } 
        }
    });

    resetMusicChart();

    kSlider.addEventListener('input', (e) => kValueSpan.textContent = e.target.value);

    clusterButton.addEventListener('click', async () => {
        clusterButton.disabled = true;
        kSlider.disabled = true;
        const k = parseInt(kSlider.value);
        await runKMeansAnimation(songData, k, clusterAnalysis);
        clusterAnalysis.innerHTML = `<p><b>Fertig!</b> Die KI hat ${k} Gruppen gefunden.</p>`;
        clusterButton.disabled = false;
        kSlider.disabled = false;
    });
}

function resetMusicChart() {
    musicChart.data.datasets[0].backgroundColor = songData.map(() => 'grey');
    musicChart.data.datasets[1].data = [];
    musicChart.options.animation.duration = 0;
    musicChart.update();
    musicChart.options.animation.duration = 1500;
}

async function runKMeansAnimation(data, k, analysisBox) {
    let centroids = [];
    let assignments = new Array(data.length).fill(0);
    
    // 1. Raten
    for (let i = 0; i < k; i++) {
        centroids.push(data[Math.floor(Math.random() * data.length)]);
    }
    analysisBox.innerHTML = "<p><b>Phase 1 (Raten):</b> Setze k zufällige Cluster-Mitten (🎯)...</p>";
    updateChartForKMeans(data, assignments, centroids, k, false);
    await sleep(2000);

    let iterations = 0;
    let changed = true;

    while (iterations < 4 && changed) {
        changed = false;
        
        // 2. Zuweisen (Punkte färben)
        analysisBox.innerHTML = `<p><b>Iteration ${iterations + 1}: Phase 2 (Zuweisen)...</b><br>Färbe Punkte (sofort) basierend auf der nächsten Mitte...</p>`;
        let newAssignments = assignPoints(data, centroids, k);
        if (JSON.stringify(newAssignments) !== JSON.stringify(assignments)) {
            changed = true;
        }
        assignments = newAssignments;
        
        musicChart.data.datasets[0].backgroundColor = data.map((_, i) => clusterColors[assignments[i] % clusterColors.length]);
        musicChart.options.animation.duration = 0; // Animation aus
        musicChart.update(); 
        
        await sleep(1000); 

        // 3. Anpassen (Zentroide wandern)
        analysisBox.innerHTML = `<p><b>Iteration ${iterations + 1}: Phase 3 (Anpassen)...</b><br>Verschiebe Mitten ins Zentrum (animiert)...</p>`;
        centroids = updateCentroids(data, assignments, k);
        
        musicChart.options.animation.duration = 1500; // Animation an
        updateChartForKMeans(data, assignments, centroids, k, true);
        
        await sleep(2000);
        
        iterations++;
    }
    musicChart.options.animation.duration = 1500;
}

function assignPoints(data, centroids, k) {
    let assignments = [];
    for (let j = 0; j < data.length; j++) {
        let minDistance = Infinity;
        let bestCluster = 0;
        for (let i = 0; i < k; i++) {
            const distance = getEuclideanDistance(data[j], centroids[i]);
            if (distance < minDistance) { minDistance = distance; bestCluster = i; }
        }
        assignments[j] = bestCluster;
    }
    return assignments;
}

function updateCentroids(data, assignments, k) {
    let newCentroids = [];
    for (let i = 0; i < k; i++) {
        let sumX = 0, sumY = 0, count = 0;
        for (let j = 0; j < data.length; j++) {
            if (assignments[j] === i) {
                sumX += data[j].x; sumY += data[j].y; count++;
            }
        }
        if (count > 0) {
            newCentroids[i] = { x: sumX / count, y: sumY / count };
        } else {
            newCentroids[i] = data[Math.floor(Math.random() * data.length)];
        }
    }
    return newCentroids;
}

function updateChartForKMeans(data, assignments, centroids, k, showColors) {
    musicChart.data.datasets[1].data = centroids;
    musicChart.data.datasets[1].backgroundColor = clusterColors.slice(0, k);
    musicChart.update();
}

function generateSpreadSongs(count) {
    const data = [];
    const centers = [
        { x: 20, y: 80 },  // Oben links
        { x: 80, y: 80 },  // Oben rechts
        { x: 20, y: 20 },  // Unten links
        { x: 80, y: 20 },  // Unten rechts
        { x: 50, y: 50 }   // Mitte (kleinerer Cluster)
    ];
    
    // Unterschiedliche Cluster-Größen für mehr Spannung
    const clusterSizes = [22, 22, 22, 22, 12]; // Insgesamt 100 Punkte
    
    let pointIndex = 0;
    for (let clusterIdx = 0; clusterIdx < centers.length; clusterIdx++) {
        const center = centers[clusterIdx];
        const size = clusterSizes[clusterIdx];
        
        // Unterschiedliche Spreads für verschiedene Cluster
        const spreadFactor = clusterIdx === 4 ? 15 : 25; // Mitte enger
        
        for (let i = 0; i < size; i++) {
            // Gaussische Verteilung für natürlichere Cluster
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * spreadFactor;
            
            data.push({
                x: Math.max(5, Math.min(95, center.x + Math.cos(angle) * distance)),
                y: Math.max(5, Math.min(95, center.y + Math.sin(angle) * distance))
            });
            pointIndex++;
        }
    }
    
    return data;
}

function getEuclideanDistance(p1, p2) {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}


// ===================================================================
// MODUL 3: ROBO-FINDER
// ===================================================================

function initRoboModule() {
    const gridContainer = document.getElementById('grid-world');
    const trainButton = document.getElementById('train-agent-button');
    const showHeatmapButton = document.getElementById('show-heatmap-button');
    const showPathButton = document.getElementById('show-path-button');
    const trainingProgress = document.getElementById('training-progress');
    const trainingProgressBar = document.getElementById('training-progress-bar');
    const trainingResult = document.getElementById('training-result');
    const rewardInputs = {
        step: document.getElementById('reward-step'),
        lava: document.getElementById('reward-lava'),
        gold: document.getElementById('reward-gold')
    };

    const GRID_SIZE = 5;
    const gridLayout = [
        ['S', 0, 0, 0, 0],
        [0, 'F', 'F', 'F', 0],
        [0, 0, 0, 'F', 0],
        [0, 'F', 0, 0, 0],
        [0, 'F', 0, 'Z', 0]
    ];
    const START_STATE = { r: 0, c: 0 };
    const GOAL_STATE = { r: 4, c: 3 };

    let qTable = [];
    const actions = ['up', 'down', 'left', 'right'];
    const LEARNING_RATE = 0.1, DISCOUNT_FACTOR = 0.9, NUM_EPISODES = 5000;
    let EPSILON = 1.0, EPSILON_DECAY = 0.999;

    renderGrid();

    trainButton.addEventListener('click', async () => {
        trainButton.disabled = true;
        trainingResult.style.display = 'none';
        trainingProgress.style.display = 'block';
        resetGrid();
        
        qTable = Array(GRID_SIZE * GRID_SIZE).fill(0).map(() => Array(actions.length).fill(0));
        EPSILON = 1.0;
        const rewards = {
            step: parseFloat(rewardInputs.step.value),
            lava: parseFloat(rewardInputs.lava.value),
            gold: parseFloat(rewardInputs.gold.value)
        };

        for (let i = 0; i < NUM_EPISODES; i++) {
            await runEpisode(rewards);
            if (i % (NUM_EPISODES / 100) === 0) {
                trainingProgressBar.value = (i / NUM_EPISODES) * 100;
            }
        }
        
        trainingProgressBar.value = 100;
        trainingProgress.style.display = 'none';
        trainingResult.style.display = 'block';
        trainButton.disabled = false;
    });

    showHeatmapButton.addEventListener('click', () => {
        if (qTable.length === 0) { alert("Bitte trainiere zuerst den Agenten!"); return; }
        showHeatmap();
    });
    
    showPathButton.addEventListener('click', () => {
        if (qTable.length === 0) { alert("Bitte trainiere zuerst den Agenten!"); return; }
        showOptimalPath();
    });

    function renderGrid() {
        gridContainer.innerHTML = '';
        gridContainer.classList.remove('heatmap-active');
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                const cell = document.createElement('div');
                cell.className = 'grid-cell';
                cell.id = `cell-${r}-${c}`;
                const content = document.createElement('div');
                content.className = 'grid-cell-content';
                cell.appendChild(content);

                const type = gridLayout[r][c];
                if (type === 'S') { cell.classList.add('cell-start'); content.innerHTML = 'S'; }
                else if (type === 'F') { cell.classList.add('cell-lava'); content.innerHTML = 'F'; }
                else if (type === 'Z') { cell.classList.add('cell-goal'); content.innerHTML = 'Z'; }
                gridContainer.appendChild(cell);
            }
        }
    }
    
    function resetGrid() {
        gridContainer.classList.remove('heatmap-active');
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                const cell = document.getElementById(`cell-${r}-${c}`);
                const content = cell.querySelector('.grid-cell-content');
                cell.classList.remove('cell-path');
                cell.style.removeProperty('--heatmap-color');
                cell.style.removeProperty('--heatmap-opacity');
                content.innerHTML = '';
                const type = gridLayout[r][c];
                if (type === 'S') content.innerHTML = 'S';
                else if (type === 'F') content.innerHTML = 'F';
                else if (type === 'Z') content.innerHTML = 'Z';
            }
        }
    }

    function showHeatmap() {
        resetGrid();
        gridContainer.classList.add('heatmap-active');
        
        let maxVal = -Infinity, minVal = Infinity;
        const valueMap = new Array(GRID_SIZE * GRID_SIZE);

        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                const stateIndex = stateToIndex(r, c);
                let value = 0;
                const type = gridLayout[r][c];
                
                if (type === 'Z') value = parseFloat(rewardInputs.gold.value);
                else if (type === 'F') value = parseFloat(rewardInputs.lava.value);
                else if (qTable.length > 0) value = Math.max(...qTable[stateIndex]);
                
                valueMap[stateIndex] = value;
                if (type === 0 && value > maxVal) maxVal = value;
                if (type === 0 && value < minVal) minVal = value;
            }
        }
        if (maxVal <= minVal) { maxVal = minVal + 1; }

        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                const cell = document.getElementById(`cell-${r}-${c}`);
                const value = valueMap[stateToIndex(r, c)];
                const type = gridLayout[r][c];
                
                let opacity = 0;
                
                if (type === 'Z') {
                    cell.style.setProperty('--heatmap-color', '120, 100%, 45%'); 
                    opacity = 0.9;
                } else if (type === 'F') {
                    opacity = 0; 
                } else if (value > 0) {
                    opacity = Math.max(0.1, (value / maxVal) * 0.8);
                    cell.style.setProperty('--heatmap-color', '120, 100%, 45%');
                } else if (value <= 0) {
                    opacity = Math.max(0.1, (value / minVal) * 0.8);
                    cell.style.setProperty('--heatmap-color', '270, 100%, 50%');
                }
                
                cell.style.setProperty('--heatmap-opacity', opacity);
            }
        }
    }
    
    async function showOptimalPath() {
        resetGrid();
        let { r, c } = START_STATE;
        let steps = 0;
        
        while (steps < 25) {
            const cell = document.getElementById(`cell-${r}-${c}`);
            const content = cell.querySelector('.grid-cell-content');
            
            if (gridLayout[r][c] === 0) cell.classList.add('cell-path');
            let icon = (r === GOAL_STATE.r && c === GOAL_STATE.c) ? '🏆' : '🤖';
            content.innerHTML = `<div class="cell-path-agent">${icon}</div>`;
            
            if (r === GOAL_STATE.r && c === GOAL_STATE.c) break;
            await sleep(150);
            
            content.innerHTML = '';
            if (gridLayout[r][c] === 'S') content.innerHTML = 'S';

            const stateIndex = stateToIndex(r, c);
            const stateQValues = qTable[stateIndex];
            const bestActionIndex = stateQValues.indexOf(Math.max(...qTable[stateIndex]));
            
            const { nextR, nextC } = getNextStateAndReward(r, c, bestActionIndex, {});
            r = nextR; c = nextC;
            if (gridLayout[r][c] === 'F') break;
            steps++;
        }
    }

    function stateToIndex(r, c) { return r * GRID_SIZE + c; }
    
    function chooseAction(stateIndex) {
        if (Math.random() < EPSILON) {
            return Math.floor(Math.random() * actions.length);
        } else {
            return qTable[stateIndex].indexOf(Math.max(...qTable[stateIndex]));
        }
    }
    
    function getNextStateAndReward(r, c, actionIndex, rewards) {
        let nextR = r, nextC = c;
        const action = actions[actionIndex];
        if (action === 'up' && r > 0) nextR--;
        else if (action === 'down' && r < GRID_SIZE - 1) nextR++;
        else if (action === 'left' && c > 0) nextC--;
        else if (action === 'right' && c < GRID_SIZE - 1) nextC++;

        let reward = rewards.step || 0, isDone = false;
        const cellType = gridLayout[nextR][nextC];
        if (cellType === 'Z') { reward = rewards.gold; isDone = true; }
        else if (cellType === 'F') { reward = rewards.lava; isDone = true; }
        return { nextR, nextC, reward, isDone };
    }
    
    async function runEpisode(rewards) {
        let { r, c } = START_STATE, isDone = false;
        while (!isDone) {
            const stateIndex = stateToIndex(r, c);
            const actionIndex = chooseAction(stateIndex);
            const { nextR, nextC, reward, isDone: done } = getNextStateAndReward(r, c, actionIndex, rewards);
            isDone = done;
            const nextStateIndex = stateToIndex(nextR, nextC);
            const oldQValue = qTable[stateIndex][actionIndex];
            
            const maxNextQ = (isDone) ? 0 : Math.max(...qTable[nextStateIndex]);
            
            qTable[stateIndex][actionIndex] = oldQValue + LEARNING_RATE * (reward + DISCOUNT_FACTOR * maxNextQ - oldQValue);
            r = nextR; c = nextC;
        }
        EPSILON = Math.max(0.01, EPSILON * EPSILON_DECAY);
        return new Promise(resolve => setTimeout(resolve, 0));
    }
}