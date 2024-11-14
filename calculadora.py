import streamlit as st

def main():
    st.title("Calculadora Pusher vs Puller")

    # Entradas del usuario
    st.header("Ingresa tus medidas")
    femur = st.number_input("Longitud del Fémur (cm)", min_value=0.0, format="%.2f")
    tibia = st.number_input("Longitud de la Tibia (cm)", min_value=0.0, format="%.2f")
    torso = st.number_input("Longitud del Torso (cm)", min_value=0.0, format="%.2f")
    arm = st.number_input("Longitud del Brazo (cm)", min_value=0.0, format="%.2f")
    dorsiflexion = st.number_input("Ángulo de Dorsiflexión (grados)", min_value=0.0, format="%.2f")
    cadera = st.number_input("Ángulo de Flexión de la Cadera (grados)", min_value=0.0, format="%.2f")
    hombro = st.number_input("Ángulo de Flexión del Hombro (grados)", min_value=0.0, format="%.2f")
    squat_force = st.number_input("Fuerza de Sentadilla (relativa)", min_value=0.0, format="%.2f")
    deadlift_force = st.number_input("Fuerza de Peso Muerto (relativa)", min_value=0.0, format="%.2f")

    # Botón para calcular
    if st.button("Calcular"):
        if all([femur, tibia, torso, arm, dorsiflexion, cadera, hombro, squat_force, deadlift_force]):
            # Calcular proporciones
            R_femur_torso = femur / torso
            R_tibia_femur = tibia / femur
            R_brazo_torso = arm / torso
            R_squat_deadlift = squat_force / deadlift_force

            # Coeficientes
            alpha1, alpha2, alpha3, alpha4, alpha5, alpha6, alpha7 = 0.25, 0.2, 0.15, 0.1, 0.1, 0.1, 0.1

            # Índice de Clasificación
            classification_index = (
                alpha1 * R_femur_torso +
                alpha2 * R_tibia_femur +
                alpha3 * R_brazo_torso +
                alpha4 * dorsiflexion +
                alpha5 * cadera +
                alpha6 * hombro +
                alpha7 * R_squat_deadlift
            )

            # Clasificación
            if classification_index > 2.0:
                tipo = "Pusher - Hip Squatter"
                color = "green"
            elif classification_index < 1.5:
                tipo = "Puller - Back Squatter"
                color = "red"
            else:
                tipo = "Mixto - Balanceado"
                color = "orange"

            # Mostrar resultado
            st.success(f"Clasificación: {tipo}")
            st.write(f"Índice de Clasificación: {classification_index:.2f}")
        else:
            st.error("Por favor, completa todos los campos.")

if __name__ == "__main__":
    main()
