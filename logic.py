"""
logic.py — Funciones puras de cálculo biomecánico.
Separadas de la UI para permitir pruebas unitarias independientes.
"""


def calcular_ratios(femur: float, tibia: float, torso: float,
                    arm: float, squat_force: float, deadlift_force: float) -> dict:
    """
    Calcula las proporciones corporales y de fuerza.

    Args:
        femur: Longitud del fémur (cm)
        tibia: Longitud de la tibia (cm)
        torso: Longitud del torso (cm)
        arm: Longitud del brazo (cm)
        squat_force: Fuerza de sentadilla (relativa)
        deadlift_force: Fuerza de peso muerto (relativa)

    Returns:
        dict con los cuatro ratios calculados.

    Raises:
        ValueError: Si torso, fémur o deadlift_force son cero.
    """
    if torso <= 0:
        raise ValueError("La longitud del torso debe ser mayor que cero.")
    if femur <= 0:
        raise ValueError("La longitud del fémur debe ser mayor que cero.")
    if deadlift_force <= 0:
        raise ValueError("La fuerza de peso muerto debe ser mayor que cero.")

    return {
        "R_femur_torso":    femur / torso,
        "R_tibia_femur":    tibia / femur,
        "R_brazo_torso":    arm / torso,
        "R_squat_deadlift": squat_force / deadlift_force,
    }


def calcular_indice(ratios: dict, dorsiflexion: float,
                    cadera: float, hombro: float) -> float:
    """
    Calcula el índice de clasificación ponderado.

    Pesos:
        R_femur_torso    → 0.25
        R_tibia_femur    → 0.20
        R_brazo_torso    → 0.15
        dorsiflexion     → 0.10
        cadera           → 0.10
        hombro           → 0.10
        R_squat_deadlift → 0.10
        Total            → 1.00
    """
    return (
        0.25 * ratios["R_femur_torso"]    +
        0.20 * ratios["R_tibia_femur"]    +
        0.15 * ratios["R_brazo_torso"]    +
        0.10 * dorsiflexion               +
        0.10 * cadera                     +
        0.10 * hombro                     +
        0.10 * ratios["R_squat_deadlift"]
    )


def clasificar(indice: float) -> tuple[str, str]:
    """
    Clasifica el índice calculado.

    Returns:
        Tupla (etiqueta, tipo) donde tipo es 'pusher' | 'mixto' | 'puller'.
    """
    if indice > 2.0:
        return "Pusher — Hip Squatter", "pusher"
    elif indice < 1.5:
        return "Puller — Back Squatter", "puller"
    else:
        return "Mixto — Balanceado", "mixto"
