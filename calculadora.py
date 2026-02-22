"""
calculadora.py — Interfaz Streamlit profesional para la Calculadora Pusher vs Puller.
By Reucherfit
"""

import streamlit as st
from logic import calcular_ratios, calcular_indice, clasificar

# ─────────────────────────────────────────────
# Configuración de página
# ─────────────────────────────────────────────
st.set_page_config(
    page_title="Pusher vs Puller | Reucherfit",
    page_icon="🏋️",
    layout="wide",
    initial_sidebar_state="collapsed",
)

# ─────────────────────────────────────────────
# Estado de sesión
# ─────────────────────────────────────────────
if "dark_mode" not in st.session_state:
    st.session_state.dark_mode = True
if "resultado" not in st.session_state:
    st.session_state.resultado = None


# ─────────────────────────────────────────────
# CSS dinámico según tema
# ─────────────────────────────────────────────
def inject_css(dark: bool) -> None:
    if dark:
        bg          = "#000000"
        surface     = "#0D0D0D"
        card        = "#141414"
        border      = "#2A2A2A"
        text        = "#FFFFFF"
        muted       = "#888888"
        btn_bg      = "#FFFFFF"
        btn_text    = "#000000"
        inp_bg      = "#0D0D0D"
        inp_border  = "#333333"
        badge_bg    = "#FFFFFF"
        badge_text  = "#000000"
        toggle_bg   = "#1A1A1A"
        toggle_bdr  = "#333333"
        toggle_txt  = "#FFFFFF"
        pusher_bg   = "#0A1F0A"
        pusher_bdr  = "#1E5C1E"
        pusher_txt  = "#4ADE80"
        mixto_bg    = "#1F1500"
        mixto_bdr   = "#5C3D00"
        mixto_txt   = "#FBBF24"
        puller_bg   = "#1F0A0A"
        puller_bdr  = "#5C1E1E"
        puller_txt  = "#F87171"
        bar_bg      = "#1A1A1A"
        tip_bg      = "#141414"
        tip_bdr     = "#2A2A2A"
    else:
        bg          = "#FFFFFF"
        surface     = "#F7F7F7"
        card        = "#F0F0F0"
        border      = "#E0E0E0"
        text        = "#000000"
        muted       = "#666666"
        btn_bg      = "#000000"
        btn_text    = "#FFFFFF"
        inp_bg      = "#FFFFFF"
        inp_border  = "#D0D0D0"
        badge_bg    = "#000000"
        badge_text  = "#FFFFFF"
        toggle_bg   = "#F0F0F0"
        toggle_bdr  = "#D0D0D0"
        toggle_txt  = "#000000"
        pusher_bg   = "#ECFDF5"
        pusher_bdr  = "#6EE7B7"
        pusher_txt  = "#065F46"
        mixto_bg    = "#FFFBEB"
        mixto_bdr   = "#FCD34D"
        mixto_txt   = "#92400E"
        puller_bg   = "#FEF2F2"
        puller_bdr  = "#FCA5A5"
        puller_txt  = "#991B1B"
        bar_bg      = "#E5E5E5"
        tip_bg      = "#F7F7F7"
        tip_bdr     = "#E0E0E0"

    st.markdown(f"""
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,300;0,400;0,500;0,600;0,700;0,900;1,400&display=swap');

    /* ── Reset global ── */
    *, *::before, *::after {{
        box-sizing: border-box;
        font-family: 'Inter', sans-serif !important;
    }}

    html, body, .stApp,
    [data-testid="stAppViewContainer"],
    [data-testid="stMain"],
    [data-testid="block-container"] {{
        background-color: {bg} !important;
        color: {text} !important;
    }}

    [data-testid="stHeader"] {{
        background-color: {bg} !important;
        border-bottom: 1px solid {border};
    }}

    section[data-testid="stSidebar"] {{
        background-color: {surface} !important;
    }}

    /* ── Ocultar marca Streamlit ── */
    #MainMenu, footer, header {{ visibility: hidden; }}

    /* ── Textos generales ── */
    h1, h2, h3, h4, h5, h6, p, span, div, label, small {{
        color: {text} !important;
    }}

    .rf-muted {{ color: {muted} !important; }}

    /* ── Inputs ── */
    [data-testid="stNumberInput"] input {{
        background-color: {inp_bg} !important;
        color: {text} !important;
        border: 1px solid {inp_border} !important;
        border-radius: 8px !important;
        padding: 10px 14px !important;
        font-size: 15px !important;
        transition: border-color 0.2s;
    }}
    [data-testid="stNumberInput"] input:focus {{
        border-color: {text} !important;
        outline: none !important;
        box-shadow: none !important;
    }}
    [data-testid="stNumberInput"] label {{
        font-size: 13px !important;
        font-weight: 500 !important;
        color: {muted} !important;
        letter-spacing: 0.3px;
    }}

    /* ── Botón principal ── */
    div[data-testid="stButton"] > button {{
        background-color: {btn_bg} !important;
        color: {btn_text} !important;
        border: none !important;
        border-radius: 10px !important;
        font-weight: 700 !important;
        font-size: 15px !important;
        letter-spacing: 0.8px !important;
        padding: 14px 0 !important;
        width: 100% !important;
        text-transform: uppercase !important;
        transition: opacity 0.2s, transform 0.1s !important;
        cursor: pointer !important;
    }}
    div[data-testid="stButton"] > button:hover {{
        opacity: 0.88 !important;
        transform: translateY(-1px) !important;
    }}
    div[data-testid="stButton"] > button:active {{
        transform: translateY(0px) !important;
    }}

    /* ── Cards ── */
    .rf-card {{
        background-color: {card};
        border: 1px solid {border};
        border-radius: 14px;
        padding: 22px 24px 18px;
        margin-bottom: 14px;
    }}
    .rf-card-title {{
        font-size: 11px !important;
        font-weight: 700 !important;
        text-transform: uppercase !important;
        letter-spacing: 2px !important;
        color: {muted} !important;
        margin: 0 0 16px 0 !important;
    }}

    /* ── Badge Reucherfit ── */
    .rf-badge {{
        display: inline-block;
        background-color: {badge_bg};
        color: {badge_text} !important;
        font-size: 11px !important;
        font-weight: 700 !important;
        letter-spacing: 1.8px !important;
        text-transform: uppercase;
        padding: 5px 12px;
        border-radius: 20px;
    }}

    /* ── Toggle tema ── */
    .rf-toggle {{
        display: inline-flex;
        align-items: center;
        gap: 8px;
        background-color: {toggle_bg};
        border: 1px solid {toggle_bdr};
        color: {toggle_txt} !important;
        font-size: 13px !important;
        font-weight: 500 !important;
        padding: 8px 16px;
        border-radius: 8px;
        cursor: pointer;
        user-select: none;
    }}

    /* ── Divider ── */
    .rf-divider {{
        border: none;
        border-top: 1px solid {border};
        margin: 28px 0;
    }}

    /* ── Resultado: Pusher ── */
    .rf-result-pusher {{
        background-color: {pusher_bg};
        border: 1px solid {pusher_bdr};
        border-radius: 14px;
        padding: 28px 30px;
    }}
    .rf-result-pusher .rf-type {{
        color: {pusher_txt} !important;
        font-size: 26px !important;
        font-weight: 900 !important;
        margin: 0 !important;
    }}

    /* ── Resultado: Mixto ── */
    .rf-result-mixto {{
        background-color: {mixto_bg};
        border: 1px solid {mixto_bdr};
        border-radius: 14px;
        padding: 28px 30px;
    }}
    .rf-result-mixto .rf-type {{
        color: {mixto_txt} !important;
        font-size: 26px !important;
        font-weight: 900 !important;
        margin: 0 !important;
    }}

    /* ── Resultado: Puller ── */
    .rf-result-puller {{
        background-color: {puller_bg};
        border: 1px solid {puller_bdr};
        border-radius: 14px;
        padding: 28px 30px;
    }}
    .rf-result-puller .rf-type {{
        color: {puller_txt} !important;
        font-size: 26px !important;
        font-weight: 900 !important;
        margin: 0 !important;
    }}

    /* ── Índice numérico ── */
    .rf-index-value {{
        font-size: 48px !important;
        font-weight: 900 !important;
        letter-spacing: -2px !important;
        line-height: 1 !important;
        margin: 8px 0 4px !important;
    }}
    .rf-index-label {{
        font-size: 12px !important;
        font-weight: 600 !important;
        text-transform: uppercase !important;
        letter-spacing: 1.5px !important;
        color: {muted} !important;
    }}

    /* ── Barra de progreso custom ── */
    .rf-bar-bg {{
        background-color: {bar_bg};
        border-radius: 6px;
        height: 8px;
        width: 100%;
        margin: 12px 0 6px;
        overflow: hidden;
    }}

    /* ── Tip card ── */
    .rf-tip {{
        background-color: {tip_bg};
        border: 1px solid {tip_bdr};
        border-radius: 10px;
        padding: 16px 20px;
        margin-top: 14px;
    }}
    .rf-tip-title {{
        font-size: 11px !important;
        font-weight: 700 !important;
        text-transform: uppercase !important;
        letter-spacing: 1.5px !important;
        color: {muted} !important;
        margin-bottom: 6px !important;
    }}
    .rf-tip-body {{
        font-size: 14px !important;
        line-height: 1.6 !important;
    }}

    /* ── Separador de ratio ── */
    .rf-ratio-row {{
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 6px 0;
        border-bottom: 1px solid {border};
        font-size: 13px;
    }}
    .rf-ratio-row:last-child {{ border-bottom: none; }}
    .rf-ratio-key {{ color: {muted} !important; }}
    .rf-ratio-val {{ font-weight: 600 !important; }}

    /* ── Error ── */
    .rf-error {{
        background-color: {puller_bg};
        border: 1px solid {puller_bdr};
        color: {puller_txt} !important;
        border-radius: 10px;
        padding: 14px 18px;
        font-size: 14px;
        font-weight: 500;
    }}
    </style>
    """, unsafe_allow_html=True)


# ─────────────────────────────────────────────
# Descripciones por tipo
# ─────────────────────────────────────────────
TIPS = {
    "pusher": (
        "Tus proporciones favorecen la sentadilla profunda (Hip Squatter). "
        "Tu fémur largo relativo a tu torso, junto con buena movilidad de cadera, "
        "te permite generar fuerza eficientemente desde las caderas. "
        "Entrena sentadillas, sumo y variantes de empuje."
    ),
    "mixto": (
        "Tienes proporciones balanceadas. Puedes desarrollar tanto "
        "movimientos de empuje (sentadilla) como de tirón (peso muerto) "
        "con buen potencial. Aprovecha la variedad en tu programación."
    ),
    "puller": (
        "Tus proporciones biomecánicas favorecen los movimientos de tirón (Back Squatter). "
        "Tu estructura te da ventaja en peso muerto y variantes de jalón. "
        "Un torso largo relativo al fémur te permite mantener mejor posición en jalones."
    ),
}

EMOJIS = {"pusher": "🦵", "mixto": "⚖️", "puller": "💪"}


# ─────────────────────────────────────────────
# Barra de progreso visual (HTML)
# ─────────────────────────────────────────────
def render_progress_bar(indice: float, dark: bool) -> str:
    clamped = max(0.0, min(indice, 3.0))
    pct = (clamped / 3.0) * 100

    if indice > 2.0:
        fill_color = "#4ADE80" if dark else "#059669"
    elif indice < 1.5:
        fill_color = "#F87171" if dark else "#DC2626"
    else:
        fill_color = "#FBBF24" if dark else "#D97706"

    bar_bg = "#1A1A1A" if dark else "#E5E5E5"

    return f"""
    <div class="rf-bar-bg" style="background-color:{bar_bg};">
        <div style="width:{pct:.1f}%;height:100%;background-color:{fill_color};
                    border-radius:6px;transition:width 0.4s ease;"></div>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:11px;color:#888;">
        <span>0.0 — Puller</span><span>1.5</span><span>2.0</span><span>3.0 — Pusher</span>
    </div>
    """


# ─────────────────────────────────────────────
# APP PRINCIPAL
# ─────────────────────────────────────────────
def main() -> None:
    dark = st.session_state.dark_mode
    inject_css(dark)

    # ── Header ──────────────────────────────
    col_logo, col_toggle = st.columns([4, 1])

    with col_logo:
        st.markdown("""
        <div style="padding:10px 0 4px;">
            <h1 style="font-size:30px;font-weight:900;margin:0;letter-spacing:-0.5px;">
                PUSHER VS PULLER
            </h1>
            <p class="rf-muted" style="font-size:13px;margin:2px 0 8px;">
                Calculadora Biomecánica &nbsp;·&nbsp;
                <span class="rf-badge">By Reucherfit</span>
            </p>
        </div>
        """, unsafe_allow_html=True)

    with col_toggle:
        st.markdown("<div style='padding-top:18px;'>", unsafe_allow_html=True)
        icon = "☀️ Modo Claro" if dark else "🌙 Modo Oscuro"
        if st.button(icon, key="theme_toggle"):
            st.session_state.dark_mode = not st.session_state.dark_mode
            st.rerun()
        st.markdown("</div>", unsafe_allow_html=True)

    st.markdown("<hr class='rf-divider'>", unsafe_allow_html=True)

    # ── Instrucciones ───────────────────────
    st.markdown("""
    <p style="font-size:14px;line-height:1.7;margin-bottom:24px;" class="rf-muted">
        Ingresa tus medidas corporales, ángulos de movilidad y ratios de fuerza.
        El algoritmo calculará tu perfil biomecánico y te clasificará como
        <strong>Pusher</strong>, <strong>Puller</strong> o <strong>Mixto</strong>.
    </p>
    """, unsafe_allow_html=True)

    # ── Inputs en 3 columnas ────────────────
    col1, col2, col3 = st.columns(3, gap="medium")

    with col1:
        st.markdown('<div class="rf-card">', unsafe_allow_html=True)
        st.markdown('<p class="rf-card-title">📐 Medidas Corporales</p>', unsafe_allow_html=True)
        femur  = st.number_input("Fémur (cm)",  min_value=0.0, format="%.2f", key="femur")
        tibia  = st.number_input("Tibia (cm)",  min_value=0.0, format="%.2f", key="tibia")
        torso  = st.number_input("Torso (cm)",  min_value=0.0, format="%.2f", key="torso")
        arm    = st.number_input("Brazo (cm)",  min_value=0.0, format="%.2f", key="arm")
        st.markdown('</div>', unsafe_allow_html=True)

    with col2:
        st.markdown('<div class="rf-card">', unsafe_allow_html=True)
        st.markdown('<p class="rf-card-title">🔄 Ángulos de Movilidad</p>', unsafe_allow_html=True)
        dorsiflexion = st.number_input("Dorsiflexión (°)", min_value=0.0, format="%.2f", key="dorsiflexion")
        cadera       = st.number_input("Flexión de Cadera (°)", min_value=0.0, format="%.2f", key="cadera")
        hombro       = st.number_input("Flexión de Hombro (°)", min_value=0.0, format="%.2f", key="hombro")
        st.markdown('</div>', unsafe_allow_html=True)

    with col3:
        st.markdown('<div class="rf-card">', unsafe_allow_html=True)
        st.markdown('<p class="rf-card-title">💥 Ratios de Fuerza</p>', unsafe_allow_html=True)
        squat_force    = st.number_input("Fuerza Sentadilla (rel.)", min_value=0.0, format="%.2f", key="squat")
        deadlift_force = st.number_input("Fuerza Peso Muerto (rel.)", min_value=0.0, format="%.2f", key="deadlift")
        st.markdown("""
        <p style="font-size:11px;line-height:1.6;margin-top:14px;" class="rf-muted">
            Usa valores relativos a tu peso corporal.<br>
            Ej: Sentadilla 1.5× y Peso Muerto 2.0×
        </p>
        """, unsafe_allow_html=True)
        st.markdown('</div>', unsafe_allow_html=True)

    # ── Botón Calcular ───────────────────────
    st.markdown("<div style='height:8px;'></div>", unsafe_allow_html=True)
    _, btn_col, _ = st.columns([1, 2, 1])
    with btn_col:
        calcular = st.button("⚡  Calcular mi Perfil", key="calcular")

    # ── Lógica de cálculo ────────────────────
    if calcular:
        campos = [femur, tibia, torso, arm, dorsiflexion, cadera, hombro, squat_force, deadlift_force]
        if not all(c > 0 for c in campos):
            st.markdown("""
            <div class="rf-error">
                ⚠️ Todos los campos deben ser mayores que cero. Completa todas las medidas.
            </div>
            """, unsafe_allow_html=True)
        else:
            try:
                ratios = calcular_ratios(femur, tibia, torso, arm, squat_force, deadlift_force)
                indice = calcular_indice(ratios, dorsiflexion, cadera, hombro)
                etiqueta, tipo = clasificar(indice)
                st.session_state.resultado = {
                    "indice": indice,
                    "etiqueta": etiqueta,
                    "tipo": tipo,
                    "ratios": ratios,
                }
            except ValueError as e:
                st.markdown(f'<div class="rf-error">⚠️ {e}</div>', unsafe_allow_html=True)

    # ── Resultado ────────────────────────────
    if st.session_state.resultado:
        r = st.session_state.resultado
        indice   = r["indice"]
        etiqueta = r["etiqueta"]
        tipo     = r["tipo"]
        ratios   = r["ratios"]

        st.markdown("<hr class='rf-divider'>", unsafe_allow_html=True)
        st.markdown('<p class="rf-card-title" style="font-size:11px;font-weight:700;'
                    'text-transform:uppercase;letter-spacing:2px;">📊 Tu Resultado</p>',
                    unsafe_allow_html=True)

        res_col, detail_col = st.columns([3, 2], gap="large")

        with res_col:
            emoji = EMOJIS[tipo]
            st.markdown(f"""
            <div class="rf-result-{tipo}">
                <p style="font-size:12px;font-weight:700;text-transform:uppercase;
                           letter-spacing:2px;margin:0 0 10px;" class="rf-muted">
                    {emoji} Clasificación
                </p>
                <p class="rf-type">{etiqueta}</p>
                <p class="rf-index-value" style="margin-top:14px;">{indice:.2f}</p>
                <p class="rf-index-label">Índice de Clasificación</p>
                {render_progress_bar(indice, dark)}
            </div>
            """, unsafe_allow_html=True)

            st.markdown(f"""
            <div class="rf-tip">
                <p class="rf-tip-title">💡 ¿Qué significa?</p>
                <p class="rf-tip-body">{TIPS[tipo]}</p>
            </div>
            """, unsafe_allow_html=True)

        with detail_col:
            st.markdown(f"""
            <div class="rf-card" style="margin-top:0;">
                <p class="rf-card-title">📋 Desglose de Ratios</p>
                <div class="rf-ratio-row">
                    <span class="rf-ratio-key">Fémur / Torso</span>
                    <span class="rf-ratio-val">{ratios['R_femur_torso']:.3f}</span>
                </div>
                <div class="rf-ratio-row">
                    <span class="rf-ratio-key">Tibia / Fémur</span>
                    <span class="rf-ratio-val">{ratios['R_tibia_femur']:.3f}</span>
                </div>
                <div class="rf-ratio-row">
                    <span class="rf-ratio-key">Brazo / Torso</span>
                    <span class="rf-ratio-val">{ratios['R_brazo_torso']:.3f}</span>
                </div>
                <div class="rf-ratio-row">
                    <span class="rf-ratio-key">Sentadilla / P. Muerto</span>
                    <span class="rf-ratio-val">{ratios['R_squat_deadlift']:.3f}</span>
                </div>
            </div>

            <div class="rf-card">
                <p class="rf-card-title">⚖️ Escala de Referencia</p>
                <div class="rf-ratio-row">
                    <span class="rf-ratio-key">Puller puro</span>
                    <span class="rf-ratio-val">&lt; 1.50</span>
                </div>
                <div class="rf-ratio-row">
                    <span class="rf-ratio-key">Mixto</span>
                    <span class="rf-ratio-val">1.50 — 2.00</span>
                </div>
                <div class="rf-ratio-row">
                    <span class="rf-ratio-key">Pusher puro</span>
                    <span class="rf-ratio-val">&gt; 2.00</span>
                </div>
            </div>
            """, unsafe_allow_html=True)

    # ── Footer ───────────────────────────────
    st.markdown("<hr class='rf-divider'>", unsafe_allow_html=True)
    st.markdown("""
    <div style="text-align:center;padding:8px 0 20px;">
        <p style="font-size:12px;" class="rf-muted">
            Calculadora Biomecánica &nbsp;·&nbsp;
            <strong>By Reucherfit</strong> &nbsp;·&nbsp;
            Todos los derechos reservados
        </p>
    </div>
    """, unsafe_allow_html=True)


if __name__ == "__main__":
    main()
