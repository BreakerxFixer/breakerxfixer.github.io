document.addEventListener("DOMContentLoaded", () => {
    // Referencias a los contenedores
    const redTeamBox = document.getElementById("redTeam");
    const blueTeamBox = document.getElementById("blueTeam");

    // Lógica interactiva simple para el Red Team (opcional, solo para demostrar funcionalidad)
    redTeamBox.addEventListener("click", () => {
        // Efecto visual rápido al hacer clic
        redTeamBox.style.backgroundColor = "#ffe6e6"; // Fondo rojo claro

        setTimeout(() => {
            redTeamBox.style.backgroundColor = "#ffffff";
        }, 200);

        console.log("¡Red Team seleccionado!");
    });

    // Lógica interactiva simple para el Blue Team (opcional)
    blueTeamBox.addEventListener("click", () => {
        // Efecto visual rápido al hacer clic
        blueTeamBox.style.backgroundColor = "#e6eaff"; // Fondo azul claro

        setTimeout(() => {
            blueTeamBox.style.backgroundColor = "#ffffff";
        }, 200);

        console.log("¡Blue Team seleccionado!");
    });

    // Nota: El scroll continuo del carrusel está manejado 100% por CSS 
    // (@keyframes scrollLinear) lo cual es más eficiente.
    // CSS mueve el contenedor un 50% de sí mismo a la izquierda y se reinicia, 
    // creando un bucle perfecto ya que tenemos dos hijos .carousel-content exactamente iguales.
});
