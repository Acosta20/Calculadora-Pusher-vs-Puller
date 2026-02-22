# Calculadora Pusher vs Puller

> **By Reucherfit**
> Herramienta biomecánica para determinar si eres un **Pusher (Hip Squatter)** o un **Puller (Back Squatter)** basado en tus proporciones corporales, movilidad y ratios de fuerza.

---

## Cómo funciona

El algoritmo toma 9 medidas del usuario y calcula un **Índice de Clasificación** ponderado:

| Variable              | Peso |
|-----------------------|------|
| Fémur / Torso         | 0.25 |
| Tibia / Fémur         | 0.20 |
| Brazo / Torso         | 0.15 |
| Dorsiflexión (°)      | 0.10 |
| Flexión Cadera (°)    | 0.10 |
| Flexión Hombro (°)    | 0.10 |
| Sentadilla / P. Muerto| 0.10 |

**Escala de clasificación:**
- `Índice > 2.0` → **Pusher — Hip Squatter**
- `1.5 ≤ Índice ≤ 2.0` → **Mixto — Balanceado**
- `Índice < 1.5` → **Puller — Back Squatter**

---

## Instalación

```bash
git clone https://github.com/Acosta20/Calculadora-Pusher-vs-Puller.git
cd Calculadora-Pusher-vs-Puller
pip install -r requirements.txt
```

## Ejecutar la app

```bash
streamlit run calculadora.py
```

## Ejecutar pruebas

```bash
pytest tests/ -v
```

---

## Estructura del proyecto

```
.
├── calculadora.py       # Interfaz Streamlit (UI profesional)
├── logic.py             # Funciones puras de cálculo (testeable)
├── requirements.txt     # Dependencias
├── tests/
│   ├── __init__.py
│   └── test_logic.py    # Pruebas unitarias e integración
└── README.md
```

---

*By Reucherfit — Todos los derechos reservados*
