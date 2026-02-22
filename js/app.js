/* ============================================
   PUSHER vs PULLER - Pose Detection App
   Main Application Logic
   ============================================ */

// ── MediaPipe Landmark Indices ─────────────────────
const LANDMARKS = {
    NOSE: 0,
    LEFT_EYE_INNER: 1,
    LEFT_EYE: 2,
    LEFT_EYE_OUTER: 3,
    RIGHT_EYE_INNER: 4,
    RIGHT_EYE: 5,
    RIGHT_EYE_OUTER: 6,
    LEFT_EAR: 7,
    RIGHT_EAR: 8,
    LEFT_SHOULDER: 11,
    RIGHT_SHOULDER: 12,
    LEFT_ELBOW: 13,
    RIGHT_ELBOW: 14,
    LEFT_WRIST: 15,
    RIGHT_WRIST: 16,
    LEFT_HIP: 23,
    RIGHT_HIP: 24,
    LEFT_KNEE: 25,
    RIGHT_KNEE: 26,
    LEFT_ANKLE: 27,
    RIGHT_ANKLE: 28,
    LEFT_HEEL: 29,
    RIGHT_HEEL: 30,
    LEFT_FOOT_INDEX: 31,
    RIGHT_FOOT_INDEX: 32,
};

// ── Segment Colors (matching CSS measurement colors) ──
const SEGMENT_COLORS = {
    femur:     '#ff6b6b',
    tibia:     '#4ecdc4',
    torso:     '#45b7d1',
    brazo:     '#f9ca24',
    humero:    '#f0932b',
    antebrazo: '#eb4d4b',
    wingspan:  '#be2edd',
    default:   '#00b4ff',
};

// ── Configuration ──────────────────────────────────
const CONFIG = {
    smoothingFrames: 12,
    minVisibility: 0.6,
    modelComplexity: 2,       // 0, 1, or 2 (2 = most accurate)
    minDetectionConfidence: 0.6,
    minTrackingConfidence: 0.6,
    jointCircleRadius: 5,
    lineWidth: 3,
    labelFontSize: 13,
};

// ── App State ──────────────────────────────────────
const state = {
    isRunning: false,
    isCaptured: false,
    pose: null,
    camera: null,
    measurementHistory: [],
    currentMeasurements: null,
    userHeightCm: 175,
};

// ── DOM Elements ───────────────────────────────────
const dom = {
    video: document.getElementById('videoElement'),
    canvas: document.getElementById('canvasOverlay'),
    placeholder: document.getElementById('cameraPlaceholder'),
    loading: document.getElementById('loadingOverlay'),
    cameraContainer: document.getElementById('cameraContainer'),
    confidenceBadge: document.getElementById('confidenceBadge'),
    confidenceText: document.getElementById('confidenceText'),
    btnStart: document.getElementById('btnStart'),
    btnCapture: document.getElementById('btnCapture'),
    btnReset: document.getElementById('btnReset'),
    heightInput: document.getElementById('heightInput'),
    // Measurement values
    valFemur: document.getElementById('valFemur'),
    valTibia: document.getElementById('valTibia'),
    valTorso: document.getElementById('valTorso'),
    valBrazo: document.getElementById('valBrazo'),
    valHumero: document.getElementById('valHumero'),
    valAntebrazo: document.getElementById('valAntebrazo'),
    valWingspan: document.getElementById('valWingspan'),
    // Ratio elements
    ratFemurTorso: document.getElementById('ratFemurTorso'),
    ratTibiaFemur: document.getElementById('ratTibiaFemur'),
    ratBrazoTorso: document.getElementById('ratBrazoTorso'),
    ratApeIndex: document.getElementById('ratApeIndex'),
    barFemurTorso: document.getElementById('barFemurTorso'),
    barTibiaFemur: document.getElementById('barTibiaFemur'),
    barBrazoTorso: document.getElementById('barBrazoTorso'),
    barApeIndex: document.getElementById('barApeIndex'),
    // Result elements
    resultBadge: document.getElementById('resultBadge'),
    resultCard: document.getElementById('resultCard'),
    meterFill: document.getElementById('meterFill'),
    meterIndicator: document.getElementById('meterIndicator'),
    meterValue: document.getElementById('meterValue'),
    resultDescription: document.getElementById('resultDescription'),
};

const ctx = dom.canvas.getContext('2d');

// ── Utility Functions ──────────────────────────────

/** Euclidean distance between two 3D landmarks */
function distance3D(a, b) {
    return Math.sqrt(
        (a.x - b.x) ** 2 +
        (a.y - b.y) ** 2 +
        (a.z - b.z) ** 2
    );
}

/** Euclidean distance between two landmarks using only X and Y (ignores noisy Z from single camera) */
function distanceLandmark2D(a, b) {
    return Math.sqrt(
        (a.x - b.x) ** 2 +
        (a.y - b.y) ** 2
    );
}

/** Euclidean distance between two 2D points (pixel coordinates) */
function distance2D(x1, y1, x2, y2) {
    return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
}

/** Check if a landmark is visible enough */
function isVisible(landmark) {
    return landmark && landmark.visibility > CONFIG.minVisibility;
}

/** Normalize a value to 0-1 range */
function normalize(value, min, max) {
    return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

/** Lerp between two values */
function lerp(a, b, t) {
    return a + (b - a) * t;
}

/** Average of an array of numbers */
function average(arr) {
    if (arr.length === 0) return 0;
    return arr.reduce((s, v) => s + v, 0) / arr.length;
}

/** Format cm value */
function formatCm(value) {
    if (value === null || value === undefined || isNaN(value)) return '-- cm';
    return value.toFixed(1) + ' cm';
}

/** Format ratio */
function formatRatio(value) {
    if (value === null || value === undefined || isNaN(value)) return '--';
    return value.toFixed(2);
}

// ── Measurement Engine ─────────────────────────────

/**
 * Calculate all body segment lengths from pose landmarks.
 * Returns measurements in normalized coordinates (relative to image dimensions).
 * These are then scaled to cm using the user's height as reference.
 */
function calculateMeasurements(landmarks) {
    const lm = landmarks;

    // Check that all required landmarks are visible
    const requiredIndices = [
        LANDMARKS.LEFT_SHOULDER, LANDMARKS.RIGHT_SHOULDER,
        LANDMARKS.LEFT_HIP, LANDMARKS.RIGHT_HIP,
        LANDMARKS.LEFT_KNEE, LANDMARKS.RIGHT_KNEE,
        LANDMARKS.LEFT_ANKLE, LANDMARKS.RIGHT_ANKLE,
    ];

    for (const idx of requiredIndices) {
        if (!isVisible(lm[idx])) return null;
    }

    // ── Calculate distances using 2D (X, Y only) ──
    // Note: We use 2D distances because MediaPipe's Z from a single camera
    // is unreliable and inflates measurements significantly.

    // Torso: shoulder to hip (average of both sides)
    const torsoLeft = distanceLandmark2D(lm[LANDMARKS.LEFT_SHOULDER], lm[LANDMARKS.LEFT_HIP]);
    const torsoRight = distanceLandmark2D(lm[LANDMARKS.RIGHT_SHOULDER], lm[LANDMARKS.RIGHT_HIP]);
    const torso = (torsoLeft + torsoRight) / 2;

    // Femur: hip to knee (average of both sides)
    const femurLeft = distanceLandmark2D(lm[LANDMARKS.LEFT_HIP], lm[LANDMARKS.LEFT_KNEE]);
    const femurRight = distanceLandmark2D(lm[LANDMARKS.RIGHT_HIP], lm[LANDMARKS.RIGHT_KNEE]);
    const femur = (femurLeft + femurRight) / 2;

    // Tibia: knee to ankle (average of both sides)
    const tibiaLeft = distanceLandmark2D(lm[LANDMARKS.LEFT_KNEE], lm[LANDMARKS.LEFT_ANKLE]);
    const tibiaRight = distanceLandmark2D(lm[LANDMARKS.RIGHT_KNEE], lm[LANDMARKS.RIGHT_ANKLE]);
    const tibia = (tibiaLeft + tibiaRight) / 2;

    // Humero (upper arm): shoulder to elbow
    let humero = null;
    if (isVisible(lm[LANDMARKS.LEFT_ELBOW]) && isVisible(lm[LANDMARKS.RIGHT_ELBOW])) {
        const humLeft = distanceLandmark2D(lm[LANDMARKS.LEFT_SHOULDER], lm[LANDMARKS.LEFT_ELBOW]);
        const humRight = distanceLandmark2D(lm[LANDMARKS.RIGHT_SHOULDER], lm[LANDMARKS.RIGHT_ELBOW]);
        humero = (humLeft + humRight) / 2;
    }

    // Antebrazo (forearm): elbow to wrist
    let antebrazo = null;
    if (isVisible(lm[LANDMARKS.LEFT_ELBOW]) && isVisible(lm[LANDMARKS.RIGHT_ELBOW]) &&
        isVisible(lm[LANDMARKS.LEFT_WRIST]) && isVisible(lm[LANDMARKS.RIGHT_WRIST])) {
        const antLeft = distanceLandmark2D(lm[LANDMARKS.LEFT_ELBOW], lm[LANDMARKS.LEFT_WRIST]);
        const antRight = distanceLandmark2D(lm[LANDMARKS.RIGHT_ELBOW], lm[LANDMARKS.RIGHT_WRIST]);
        antebrazo = (antLeft + antRight) / 2;
    }

    // Brazo total (full arm): shoulder to wrist
    let brazo = null;
    if (humero !== null && antebrazo !== null) {
        brazo = humero + antebrazo;
    }

    // Wingspan: wrist to wrist through shoulders
    let wingspan = null;
    if (isVisible(lm[LANDMARKS.LEFT_WRIST]) && isVisible(lm[LANDMARKS.RIGHT_WRIST])) {
        const leftArm = distanceLandmark2D(lm[LANDMARKS.LEFT_WRIST], lm[LANDMARKS.LEFT_SHOULDER]);
        const shoulderWidth = distanceLandmark2D(lm[LANDMARKS.LEFT_SHOULDER], lm[LANDMARKS.RIGHT_SHOULDER]);
        const rightArm = distanceLandmark2D(lm[LANDMARKS.RIGHT_SHOULDER], lm[LANDMARKS.RIGHT_WRIST]);
        wingspan = leftArm + shoulderWidth + rightArm;
    }

    // Estimate full body height in normalized coordinates for scaling
    // Use head top estimation (above nose) to ankle
    // The distance nose→eye * 4 approximates the crown of the head
    const noseY = lm[LANDMARKS.NOSE].y;
    const eyeY = lm[LANDMARKS.LEFT_EYE].y;
    const headTopY = noseY - Math.abs(noseY - eyeY) * 4;

    const midAnkleY = (lm[LANDMARKS.LEFT_ANKLE].y + lm[LANDMARKS.RIGHT_ANKLE].y) / 2;

    // Use vertical distance (y-axis only) for height since camera faces front
    const bodyHeightNorm = Math.abs(midAnkleY - headTopY);

    // Scale factor: user's real height in cm / detected height in normalized coords
    const scaleCm = state.userHeightCm / bodyHeightNorm;

    return {
        femur: femur * scaleCm,
        tibia: tibia * scaleCm,
        torso: torso * scaleCm,
        humero: humero !== null ? humero * scaleCm : null,
        antebrazo: antebrazo !== null ? antebrazo * scaleCm : null,
        brazo: brazo !== null ? brazo * scaleCm : null,
        wingspan: wingspan !== null ? wingspan * scaleCm : null,
        bodyHeightNorm,
        scaleCm,
        // Raw normalized distances for debugging
        _raw: { femur, tibia, torso, humero, antebrazo, brazo, wingspan, bodyHeightNorm },
    };
}

/**
 * Add a measurement frame and return the smoothed average.
 */
function smoothMeasurements(newMeasurement) {
    if (!newMeasurement) return state.currentMeasurements;

    state.measurementHistory.push(newMeasurement);

    // Keep only the last N frames
    if (state.measurementHistory.length > CONFIG.smoothingFrames) {
        state.measurementHistory.shift();
    }

    const history = state.measurementHistory;
    const keys = ['femur', 'tibia', 'torso', 'humero', 'antebrazo', 'brazo', 'wingspan'];

    const smoothed = {};
    for (const key of keys) {
        const values = history.map(m => m[key]).filter(v => v !== null && !isNaN(v));
        smoothed[key] = values.length > 0 ? average(values) : null;
    }

    return smoothed;
}

// ── Classification Engine ──────────────────────────

/**
 * Classify as Pusher, Puller, or Mixto based on body proportions.
 *
 * Key ratios and their interpretation:
 * - Femur/Torso: Higher = more Puller (longer femurs relative to torso)
 * - Tibia/Femur: Higher = more Pusher (longer tibias compensate short femurs)
 * - Brazo/Torso: Higher = more Puller (longer arms for pulling)
 * - Ape Index (Wingspan/Height): Higher = more Puller
 *
 * Returns: { type, index (0-100), description }
 *   0 = strong Pusher, 100 = strong Puller
 */
function classify(measurements) {
    if (!measurements || !measurements.femur || !measurements.torso || !measurements.tibia) {
        return null;
    }

    const R_femurTorso = measurements.femur / measurements.torso;
    const R_tibiaFemur = measurements.tibia / measurements.femur;

    // Score each ratio from 0 (pusher) to 1 (puller)
    // Based on anthropometric research ranges

    // Femur/Torso ratio: typical range 0.70 - 1.10
    // Lower = Pusher (short femur, long torso), Higher = Puller (long femur, short torso)
    const scoreFemurTorso = normalize(R_femurTorso, 0.75, 1.05);

    // Tibia/Femur ratio: typical range 0.70 - 1.00
    // Higher = Pusher (long tibia helps stay upright), Lower = Puller
    const scoreTibiaFemur = 1 - normalize(R_tibiaFemur, 0.72, 0.95);

    let scoreArmTorso = 0.5; // default neutral
    let scoreApeIndex = 0.5;

    if (measurements.brazo !== null) {
        const R_brazoTorso = measurements.brazo / measurements.torso;
        // Arm/Torso: typical range 0.90 - 1.35
        // Higher = Puller (longer arms benefit deadlift)
        scoreArmTorso = normalize(R_brazoTorso, 0.95, 1.30);
    }

    if (measurements.wingspan !== null) {
        // Ape index: wingspan / height. Typical ~1.0, range 0.95 - 1.08
        const apeIndex = measurements.wingspan / state.userHeightCm;
        scoreApeIndex = normalize(apeIndex, 0.96, 1.06);
    }

    // Weighted combination
    // Femur/Torso is the most important factor
    const weights = {
        femurTorso: 0.40,
        tibiaFemur: 0.25,
        armTorso: 0.20,
        apeIndex: 0.15,
    };

    const index = (
        scoreFemurTorso * weights.femurTorso +
        scoreTibiaFemur * weights.tibiaFemur +
        scoreArmTorso * weights.armTorso +
        scoreApeIndex * weights.apeIndex
    ) * 100;

    // Clamp
    const clampedIndex = Math.max(0, Math.min(100, index));

    let type, description;

    if (clampedIndex < 38) {
        type = 'pusher';
        description = `<p>Tu estructura favorece movimientos de <span class="highlight">empuje</span>. ` +
            `Tienes un torso relativamente largo y femures cortos, lo que te permite mantener una posicion ` +
            `mas vertical en sentadilla.</p>` +
            `<p style="margin-top:0.5rem">Ejercicios donde destacas: <span class="highlight">Sentadilla frontal, Push Press, ` +
            `Sentadilla de espalda con barra alta</span>.</p>`;
    } else if (clampedIndex > 62) {
        type = 'puller';
        description = `<p>Tu estructura favorece movimientos de <span class="highlight">traccion</span>. ` +
            `Tienes femures relativamente largos y brazos largos, lo que te da ventaja mecanica en ` +
            `jalones y peso muerto.</p>` +
            `<p style="margin-top:0.5rem">Ejercicios donde destacas: <span class="highlight">Peso Muerto, Clean, Snatch, ` +
            `Remo</span>.</p>`;
    } else {
        type = 'mixto';
        description = `<p>Tienes proporciones <span class="highlight">balanceadas</span>. ` +
            `No tienes una ventaja mecanica clara hacia empuje o traccion, lo cual te permite ` +
            `ser versatil en ambos tipos de movimientos.</p>` +
            `<p style="margin-top:0.5rem">Eres adaptable a <span class="highlight">sentadilla, peso muerto y ` +
            `movimientos olimpicos</span> con tecnica apropiada.</p>`;
    }

    return {
        type,
        index: clampedIndex,
        description,
        ratios: {
            femurTorso: R_femurTorso,
            tibiaFemur: R_tibiaFemur,
            brazoTorso: measurements.brazo !== null ? measurements.brazo / measurements.torso : null,
            apeIndex: measurements.wingspan !== null ? measurements.wingspan / state.userHeightCm : null,
        },
        scores: {
            femurTorso: scoreFemurTorso,
            tibiaFemur: scoreTibiaFemur,
            armTorso: scoreArmTorso,
            apeIndex: scoreApeIndex,
        },
    };
}

// ── Canvas Drawing ─────────────────────────────────

/**
 * Draw the pose skeleton with measurements on the canvas overlay.
 */
function drawPose(landmarks, measurements) {
    const w = dom.canvas.width;
    const h = dom.canvas.height;
    ctx.clearRect(0, 0, w, h);

    if (!landmarks) return;

    const lm = landmarks;

    // Helper: convert normalized coords to pixel coords (mirror X for selfie camera)
    function toPixel(landmark) {
        return { x: w - landmark.x * w, y: landmark.y * h };
    }

    // Helper: draw a line segment with label
    function drawSegment(idx1, idx2, color, label, measurement) {
        if (!isVisible(lm[idx1]) || !isVisible(lm[idx2])) return;

        const p1 = toPixel(lm[idx1]);
        const p2 = toPixel(lm[idx2]);

        // Line
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = color;
        ctx.lineWidth = CONFIG.lineWidth;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Semi-transparent glow effect
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = color + '40';
        ctx.lineWidth = CONFIG.lineWidth + 6;
        ctx.stroke();

        // Label with measurement
        if (label && measurement !== null && measurement !== undefined) {
            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2;
            const text = `${label}: ${measurement.toFixed(1)}cm`;

            ctx.font = `bold ${CONFIG.labelFontSize}px ${getComputedStyle(document.body).fontFamily}`;
            const textWidth = ctx.measureText(text).width;

            // Background pill
            const padding = 6;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
            roundRect(ctx,
                midX - textWidth / 2 - padding,
                midY - CONFIG.labelFontSize / 2 - padding,
                textWidth + padding * 2,
                CONFIG.labelFontSize + padding * 2,
                6
            );
            ctx.fill();

            // Border
            ctx.strokeStyle = color + '80';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Text
            ctx.fillStyle = color;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, midX, midY);
        }
    }

    // Helper: draw a joint point
    function drawJoint(idx, color) {
        if (!isVisible(lm[idx])) return;
        const p = toPixel(lm[idx]);

        // Outer glow
        ctx.beginPath();
        ctx.arc(p.x, p.y, CONFIG.jointCircleRadius + 3, 0, Math.PI * 2);
        ctx.fillStyle = color + '30';
        ctx.fill();

        // Inner circle
        ctx.beginPath();
        ctx.arc(p.x, p.y, CONFIG.jointCircleRadius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        // Center highlight
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
    }

    // Helper: rounded rectangle
    function roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }

    const m = measurements || {};

    // ── Draw body segments with measurements ──

    // Torso (left side)
    drawSegment(LANDMARKS.LEFT_SHOULDER, LANDMARKS.LEFT_HIP,
        SEGMENT_COLORS.torso, 'Torso', m.torso);
    // Torso (right side, no label to avoid clutter)
    drawSegment(LANDMARKS.RIGHT_SHOULDER, LANDMARKS.RIGHT_HIP,
        SEGMENT_COLORS.torso, null, null);

    // Shoulder line
    drawSegment(LANDMARKS.LEFT_SHOULDER, LANDMARKS.RIGHT_SHOULDER,
        SEGMENT_COLORS.default, null, null);

    // Hip line
    drawSegment(LANDMARKS.LEFT_HIP, LANDMARKS.RIGHT_HIP,
        SEGMENT_COLORS.default, null, null);

    // Femur (left with label)
    drawSegment(LANDMARKS.LEFT_HIP, LANDMARKS.LEFT_KNEE,
        SEGMENT_COLORS.femur, 'Femur', m.femur);
    // Femur (right, no label)
    drawSegment(LANDMARKS.RIGHT_HIP, LANDMARKS.RIGHT_KNEE,
        SEGMENT_COLORS.femur, null, null);

    // Tibia (left with label)
    drawSegment(LANDMARKS.LEFT_KNEE, LANDMARKS.LEFT_ANKLE,
        SEGMENT_COLORS.tibia, 'Tibia', m.tibia);
    // Tibia (right, no label)
    drawSegment(LANDMARKS.RIGHT_KNEE, LANDMARKS.RIGHT_ANKLE,
        SEGMENT_COLORS.tibia, null, null);

    // Humero (left with label)
    drawSegment(LANDMARKS.LEFT_SHOULDER, LANDMARKS.LEFT_ELBOW,
        SEGMENT_COLORS.humero, 'Humero', m.humero);
    drawSegment(LANDMARKS.RIGHT_SHOULDER, LANDMARKS.RIGHT_ELBOW,
        SEGMENT_COLORS.humero, null, null);

    // Antebrazo (left with label)
    drawSegment(LANDMARKS.LEFT_ELBOW, LANDMARKS.LEFT_WRIST,
        SEGMENT_COLORS.antebrazo, 'Antebrazo', m.antebrazo);
    drawSegment(LANDMARKS.RIGHT_ELBOW, LANDMARKS.RIGHT_WRIST,
        SEGMENT_COLORS.antebrazo, null, null);

    // ── Draw all joint points ──
    const allJoints = [
        LANDMARKS.LEFT_SHOULDER, LANDMARKS.RIGHT_SHOULDER,
        LANDMARKS.LEFT_ELBOW, LANDMARKS.RIGHT_ELBOW,
        LANDMARKS.LEFT_WRIST, LANDMARKS.RIGHT_WRIST,
        LANDMARKS.LEFT_HIP, LANDMARKS.RIGHT_HIP,
        LANDMARKS.LEFT_KNEE, LANDMARKS.RIGHT_KNEE,
        LANDMARKS.LEFT_ANKLE, LANDMARKS.RIGHT_ANKLE,
    ];

    for (const idx of allJoints) {
        let color = SEGMENT_COLORS.default;
        if (idx === LANDMARKS.LEFT_HIP || idx === LANDMARKS.RIGHT_HIP) color = '#ffffff';
        if (idx === LANDMARKS.LEFT_KNEE || idx === LANDMARKS.RIGHT_KNEE) color = '#ffffff';
        if (idx === LANDMARKS.LEFT_ANKLE || idx === LANDMARKS.RIGHT_ANKLE) color = '#ffffff';
        drawJoint(idx, color);
    }

    // Draw nose/head point
    if (isVisible(lm[LANDMARKS.NOSE])) {
        drawJoint(LANDMARKS.NOSE, '#00e5ff');
    }
}

// ── UI Updates ─────────────────────────────────────

function updateMeasurementsUI(measurements) {
    if (!measurements) return;

    dom.valFemur.textContent = formatCm(measurements.femur);
    dom.valTibia.textContent = formatCm(measurements.tibia);
    dom.valTorso.textContent = formatCm(measurements.torso);
    dom.valBrazo.textContent = formatCm(measurements.brazo);
    dom.valHumero.textContent = formatCm(measurements.humero);
    dom.valAntebrazo.textContent = formatCm(measurements.antebrazo);
    dom.valWingspan.textContent = formatCm(measurements.wingspan);
}

function updateRatiosUI(classification) {
    if (!classification) return;

    const { ratios, scores } = classification;

    // Update ratio values
    dom.ratFemurTorso.textContent = formatRatio(ratios.femurTorso);
    dom.ratTibiaFemur.textContent = formatRatio(ratios.tibiaFemur);
    dom.ratBrazoTorso.textContent = formatRatio(ratios.brazoTorso);
    dom.ratApeIndex.textContent = formatRatio(ratios.apeIndex);

    // Update ratio bars (width as percentage, colored by meaning)
    function updateBar(barEl, score, value) {
        const pct = Math.max(5, Math.min(100, score * 100));
        barEl.style.width = pct + '%';

        // Color gradient: green (pusher) -> yellow (mixto) -> red (puller)
        if (score < 0.4) {
            barEl.style.background = `linear-gradient(90deg, var(--pusher-color), #44dd88)`;
        } else if (score > 0.6) {
            barEl.style.background = `linear-gradient(90deg, #ff6688, var(--puller-color))`;
        } else {
            barEl.style.background = `linear-gradient(90deg, var(--mixto-color), #ffdd44)`;
        }
    }

    updateBar(dom.barFemurTorso, scores.femurTorso, ratios.femurTorso);
    updateBar(dom.barTibiaFemur, scores.tibiaFemur, ratios.tibiaFemur);
    updateBar(dom.barBrazoTorso, scores.armTorso, ratios.brazoTorso);
    updateBar(dom.barApeIndex, scores.apeIndex, ratios.apeIndex);
}

function updateClassificationUI(classification) {
    if (!classification) return;

    const { type, index, description } = classification;

    // Update badge
    dom.resultBadge.className = 'result-badge ' + type;
    dom.resultBadge.textContent = type === 'pusher' ? 'PUSHER' :
                                   type === 'puller' ? 'PULLER' : 'MIXTO';

    // Update meter
    dom.meterFill.style.width = '100%';
    dom.meterIndicator.classList.add('active');
    dom.meterIndicator.style.left = index + '%';

    // Meter value with color
    dom.meterValue.textContent = Math.round(index) + '%';
    if (type === 'pusher') {
        dom.meterValue.style.color = 'var(--pusher-color)';
        dom.meterValue.textContent = Math.round(100 - index) + '% Pusher';
    } else if (type === 'puller') {
        dom.meterValue.style.color = 'var(--puller-color)';
        dom.meterValue.textContent = Math.round(index) + '% Puller';
    } else {
        dom.meterValue.style.color = 'var(--mixto-color)';
        dom.meterValue.textContent = 'Mixto (' + Math.round(index) + '%)';
    }

    // Update description
    dom.resultDescription.innerHTML = description;
}

function updateConfidence(landmarks) {
    if (!landmarks) {
        dom.confidenceBadge.classList.remove('visible');
        return;
    }

    dom.confidenceBadge.classList.add('visible');
    const dot = dom.confidenceBadge.querySelector('.conf-dot');

    // Average visibility of key landmarks
    const keyIndices = [
        LANDMARKS.LEFT_SHOULDER, LANDMARKS.RIGHT_SHOULDER,
        LANDMARKS.LEFT_HIP, LANDMARKS.RIGHT_HIP,
        LANDMARKS.LEFT_KNEE, LANDMARKS.RIGHT_KNEE,
        LANDMARKS.LEFT_ANKLE, LANDMARKS.RIGHT_ANKLE,
    ];

    const avgVis = average(keyIndices.map(i => landmarks[i]?.visibility || 0));

    if (avgVis > 0.8) {
        dot.className = 'conf-dot good';
        dom.confidenceText.textContent = 'Deteccion: Excelente';
    } else if (avgVis > 0.6) {
        dot.className = 'conf-dot medium';
        dom.confidenceText.textContent = 'Deteccion: Buena';
    } else {
        dot.className = 'conf-dot poor';
        dom.confidenceText.textContent = 'Deteccion: Baja';
    }
}

function updateInstructions(step) {
    document.querySelectorAll('.instruction-step').forEach((el, i) => {
        const s = i + 1;
        el.classList.remove('active', 'done');
        if (s < step) el.classList.add('done');
        else if (s === step) el.classList.add('active');
    });
}

// ── MediaPipe Pose Setup ───────────────────────────

function initPose() {
    const pose = new Pose({
        locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5/${file}`;
        },
    });

    pose.setOptions({
        modelComplexity: CONFIG.modelComplexity,
        smoothLandmarks: true,
        enableSegmentation: false,
        minDetectionConfidence: CONFIG.minDetectionConfidence,
        minTrackingConfidence: CONFIG.minTrackingConfidence,
    });

    pose.onResults(onPoseResults);

    return pose;
}

function onPoseResults(results) {
    if (state.isCaptured) return; // Don't update if captured

    // Resize canvas to match video dimensions
    if (dom.canvas.width !== results.image.width || dom.canvas.height !== results.image.height) {
        dom.canvas.width = results.image.width;
        dom.canvas.height = results.image.height;
    }

    const landmarks = results.poseLandmarks;

    if (!landmarks || landmarks.length === 0) {
        ctx.clearRect(0, 0, dom.canvas.width, dom.canvas.height);
        updateConfidence(null);
        return;
    }

    // Update confidence indicator
    updateConfidence(landmarks);

    // Calculate measurements
    const rawMeasurements = calculateMeasurements(landmarks);
    const smoothed = smoothMeasurements(rawMeasurements);
    state.currentMeasurements = smoothed;

    // Draw pose on canvas
    drawPose(landmarks, smoothed);

    // Update UI
    if (smoothed) {
        updateMeasurementsUI(smoothed);
        const classification = classify(smoothed);
        if (classification) {
            updateRatiosUI(classification);
            updateClassificationUI(classification);
        }
    }
}

// ── Camera Setup ───────────────────────────────────

async function startCamera() {
    try {
        dom.loading.classList.add('active');
        dom.placeholder.classList.add('hidden');
        updateInstructions(3);

        // Initialize MediaPipe Pose
        state.pose = initPose();

        // Initialize camera
        state.camera = new Camera(dom.video, {
            onFrame: async () => {
                if (state.pose && state.isRunning) {
                    await state.pose.send({ image: dom.video });
                }
            },
            width: 1280,
            height: 960,
        });

        await state.camera.start();

        state.isRunning = true;
        dom.loading.classList.remove('active');
        dom.cameraContainer.classList.add('detecting');

        // Update button states
        dom.btnStart.disabled = true;
        dom.btnStart.textContent = 'Camara Activa';
        dom.btnCapture.disabled = false;
        dom.btnReset.disabled = false;

    } catch (error) {
        console.error('Error starting camera:', error);
        dom.loading.classList.remove('active');
        dom.placeholder.classList.remove('hidden');

        const msg = error.name === 'NotAllowedError'
            ? 'Permiso de camara denegado. Por favor permite el acceso a la camara.'
            : 'Error al iniciar la camara: ' + error.message;

        alert(msg);
    }
}

function captureMeasurements() {
    if (!state.currentMeasurements) {
        alert('No se detectan medidas. Asegurate de que tu cuerpo completo sea visible.');
        return;
    }

    state.isCaptured = true;
    dom.cameraContainer.classList.remove('detecting');
    dom.cameraContainer.classList.add('captured');
    dom.btnCapture.disabled = true;
    dom.btnCapture.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
        Medidas Capturadas
    `;

    updateInstructions(5);

    // Final classification with captured data
    const classification = classify(state.currentMeasurements);
    if (classification) {
        updateRatiosUI(classification);
        updateClassificationUI(classification);
    }
}

function resetApp() {
    state.isCaptured = false;
    state.measurementHistory = [];
    state.currentMeasurements = null;

    dom.cameraContainer.classList.remove('captured');
    dom.cameraContainer.classList.add('detecting');

    dom.btnCapture.disabled = false;
    dom.btnCapture.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>
        Capturar Medidas
    `;

    // Reset UI values
    ['valFemur', 'valTibia', 'valTorso', 'valBrazo', 'valHumero', 'valAntebrazo', 'valWingspan'].forEach(id => {
        dom[id].textContent = '-- cm';
    });
    ['ratFemurTorso', 'ratTibiaFemur', 'ratBrazoTorso', 'ratApeIndex'].forEach(id => {
        dom[id].textContent = '--';
    });
    ['barFemurTorso', 'barTibiaFemur', 'barBrazoTorso', 'barApeIndex'].forEach(id => {
        dom[id].style.width = '0%';
    });

    dom.resultBadge.className = 'result-badge';
    dom.resultBadge.textContent = 'ESPERANDO...';
    dom.meterFill.style.width = '0%';
    dom.meterIndicator.classList.remove('active');
    dom.meterValue.textContent = '--';
    dom.meterValue.style.color = 'var(--text-muted)';
    dom.resultDescription.innerHTML = '<p>Parate frente a la camara con el cuerpo completo visible para obtener tu clasificacion.</p>';

    updateInstructions(3);
}

// ── Event Listeners ────────────────────────────────

dom.btnStart.addEventListener('click', startCamera);
dom.btnCapture.addEventListener('click', captureMeasurements);
dom.btnReset.addEventListener('click', resetApp);

dom.heightInput.addEventListener('input', () => {
    const val = parseFloat(dom.heightInput.value);
    if (val && val >= 100 && val <= 250) {
        state.userHeightCm = val;
        // If already running, measurements will auto-update on next frame
        updateInstructions(2);
    }
});

// Initialize
updateInstructions(1);
