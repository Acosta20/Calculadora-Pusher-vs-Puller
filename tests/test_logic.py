"""
tests/test_logic.py — Pruebas unitarias para las funciones de cálculo biomecánico.
Ejecutar con: pytest tests/
"""

import pytest
from logic import calcular_ratios, calcular_indice, clasificar


# ─────────────────────────────────────────────
# Fixtures de datos válidos
# ─────────────────────────────────────────────
@pytest.fixture
def medidas_pusher():
    """Medidas que producen un índice > 2.0 (Pusher)."""
    return {
        "femur": 50.0, "tibia": 42.0, "torso": 30.0, "arm": 70.0,
        "dorsiflexion": 25.0, "cadera": 20.0, "hombro": 18.0,
        "squat_force": 2.0, "deadlift_force": 1.0,
    }


@pytest.fixture
def medidas_puller():
    """Medidas que producen un índice < 1.5 (Puller).

    Nota: los ángulos se usan en grados directamente en la fórmula,
    por lo que valores altos de ángulo elevan mucho el índice.
    Para obtener un Puller se necesitan ángulos pequeños y ratios desfavorables.
    """
    return {
        "femur": 40.0, "tibia": 38.0, "torso": 55.0, "arm": 45.0,
        "dorsiflexion": 1.0, "cadera": 1.0, "hombro": 1.0,
        "squat_force": 0.8, "deadlift_force": 2.0,
    }


@pytest.fixture
def medidas_mixto():
    """Medidas que producen un índice entre 1.5 y 2.0 (Mixto)."""
    return {
        "femur": 45.0, "tibia": 40.0, "torso": 45.0, "arm": 55.0,
        "dorsiflexion": 3.0, "cadera": 3.0, "hombro": 3.0,
        "squat_force": 1.2, "deadlift_force": 1.5,
    }


# ─────────────────────────────────────────────
# Tests: calcular_ratios
# ─────────────────────────────────────────────
class TestCalcularRatios:

    def test_ratios_correctos(self, medidas_pusher):
        m = medidas_pusher
        ratios = calcular_ratios(m["femur"], m["tibia"], m["torso"],
                                 m["arm"], m["squat_force"], m["deadlift_force"])
        assert ratios["R_femur_torso"]    == pytest.approx(50.0 / 30.0)
        assert ratios["R_tibia_femur"]    == pytest.approx(42.0 / 50.0)
        assert ratios["R_brazo_torso"]    == pytest.approx(70.0 / 30.0)
        assert ratios["R_squat_deadlift"] == pytest.approx(2.0  / 1.0)

    def test_error_torso_cero(self):
        with pytest.raises(ValueError, match="torso"):
            calcular_ratios(50, 42, 0, 70, 2.0, 1.0)

    def test_error_femur_cero(self):
        with pytest.raises(ValueError, match="fémur"):
            calcular_ratios(0, 42, 30, 70, 2.0, 1.0)

    def test_error_deadlift_cero(self):
        with pytest.raises(ValueError, match="peso muerto"):
            calcular_ratios(50, 42, 30, 70, 2.0, 0)

    def test_error_valores_negativos_torso(self):
        with pytest.raises(ValueError):
            calcular_ratios(50, 42, -5, 70, 2.0, 1.0)

    def test_error_valores_negativos_femur(self):
        with pytest.raises(ValueError):
            calcular_ratios(-1, 42, 30, 70, 2.0, 1.0)

    def test_claves_presentes(self, medidas_pusher):
        m = medidas_pusher
        ratios = calcular_ratios(m["femur"], m["tibia"], m["torso"],
                                 m["arm"], m["squat_force"], m["deadlift_force"])
        assert set(ratios.keys()) == {"R_femur_torso", "R_tibia_femur",
                                      "R_brazo_torso", "R_squat_deadlift"}

    def test_ratios_positivos(self, medidas_puller):
        m = medidas_puller
        ratios = calcular_ratios(m["femur"], m["tibia"], m["torso"],
                                 m["arm"], m["squat_force"], m["deadlift_force"])
        for v in ratios.values():
            assert v > 0


# ─────────────────────────────────────────────
# Tests: calcular_indice
# ─────────────────────────────────────────────
class TestCalcularIndice:

    def _ratios_from(self, m):
        return calcular_ratios(m["femur"], m["tibia"], m["torso"],
                               m["arm"], m["squat_force"], m["deadlift_force"])

    def test_indice_es_float(self, medidas_pusher):
        ratios = self._ratios_from(medidas_pusher)
        idx = calcular_indice(ratios, 25.0, 20.0, 18.0)
        assert isinstance(idx, float)

    def test_indice_positivo(self, medidas_pusher):
        ratios = self._ratios_from(medidas_pusher)
        idx = calcular_indice(ratios, 25.0, 20.0, 18.0)
        assert idx > 0

    def test_pesos_suman_uno(self):
        """Verifica implícitamente que los pesos suman 1.0 usando ratios = 1.0."""
        ratios_unitarios = {
            "R_femur_torso": 1.0, "R_tibia_femur": 1.0,
            "R_brazo_torso": 1.0, "R_squat_deadlift": 1.0,
        }
        idx = calcular_indice(ratios_unitarios, 1.0, 1.0, 1.0)
        assert idx == pytest.approx(1.0)

    def test_indice_mayor_angulos_mayores(self):
        """A igualdad de ratios, más ángulos → mayor índice."""
        ratios = {"R_femur_torso": 1.0, "R_tibia_femur": 1.0,
                  "R_brazo_torso": 1.0, "R_squat_deadlift": 1.0}
        idx_bajo = calcular_indice(ratios, 5.0,  5.0,  5.0)
        idx_alto = calcular_indice(ratios, 30.0, 30.0, 30.0)
        assert idx_alto > idx_bajo

    def test_formula_manual(self):
        ratios = {
            "R_femur_torso": 1.5, "R_tibia_femur": 0.9,
            "R_brazo_torso": 2.0, "R_squat_deadlift": 1.2,
        }
        esperado = (0.25 * 1.5 + 0.20 * 0.9 + 0.15 * 2.0 +
                    0.10 * 10.0 + 0.10 * 8.0 + 0.10 * 6.0 + 0.10 * 1.2)
        resultado = calcular_indice(ratios, 10.0, 8.0, 6.0)
        assert resultado == pytest.approx(esperado)


# ─────────────────────────────────────────────
# Tests: clasificar
# ─────────────────────────────────────────────
class TestClasificar:

    def test_pusher_sobre_2(self):
        etiqueta, tipo = clasificar(2.5)
        assert tipo == "pusher"
        assert "Pusher" in etiqueta

    def test_puller_bajo_15(self):
        etiqueta, tipo = clasificar(1.2)
        assert tipo == "puller"
        assert "Puller" in etiqueta

    def test_mixto_entre_15_y_2(self):
        etiqueta, tipo = clasificar(1.75)
        assert tipo == "mixto"
        assert "Mixto" in etiqueta

    def test_limite_inferior_exacto(self):
        """Exactamente 1.5 → Mixto (no Puller)."""
        _, tipo = clasificar(1.5)
        assert tipo == "mixto"

    def test_limite_superior_exacto(self):
        """Exactamente 2.0 → Mixto (no Pusher)."""
        _, tipo = clasificar(2.0)
        assert tipo == "mixto"

    def test_justo_sobre_2(self):
        _, tipo = clasificar(2.001)
        assert tipo == "pusher"

    def test_justo_bajo_15(self):
        _, tipo = clasificar(1.499)
        assert tipo == "puller"

    def test_retorna_tupla(self):
        result = clasificar(1.8)
        assert isinstance(result, tuple)
        assert len(result) == 2

    def test_tipos_validos(self):
        tipos_validos = {"pusher", "mixto", "puller"}
        for indice in [0.5, 1.0, 1.5, 1.75, 2.0, 2.5, 3.0]:
            _, tipo = clasificar(indice)
            assert tipo in tipos_validos


# ─────────────────────────────────────────────
# Tests de integración (flujo completo)
# ─────────────────────────────────────────────
class TestIntegracion:

    def _flujo(self, m):
        ratios = calcular_ratios(m["femur"], m["tibia"], m["torso"],
                                 m["arm"], m["squat_force"], m["deadlift_force"])
        indice = calcular_indice(ratios, m["dorsiflexion"], m["cadera"], m["hombro"])
        etiqueta, tipo = clasificar(indice)
        return indice, etiqueta, tipo

    def test_flujo_pusher(self, medidas_pusher):
        indice, _, tipo = self._flujo(medidas_pusher)
        assert tipo == "pusher"
        assert indice > 2.0

    def test_flujo_puller(self, medidas_puller):
        indice, _, tipo = self._flujo(medidas_puller)
        assert tipo == "puller"
        assert indice < 1.5

    def test_flujo_mixto(self, medidas_mixto):
        indice, _, tipo = self._flujo(medidas_mixto)
        assert tipo == "mixto"
        assert 1.5 <= indice <= 2.0

    def test_clasificacion_nunca_falla_con_datos_validos(self, medidas_pusher, medidas_puller, medidas_mixto):
        for m in [medidas_pusher, medidas_puller, medidas_mixto]:
            indice, etiqueta, tipo = self._flujo(m)
            assert isinstance(indice, float)
            assert isinstance(etiqueta, str)
            assert isinstance(tipo, str)
            assert len(etiqueta) > 0
