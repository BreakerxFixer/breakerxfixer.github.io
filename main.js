document.addEventListener("DOMContentLoaded", () => {
    // Referencias a los contenedores
    const redTeamBox = document.getElementById("redTeam");
    const blueTeamBox = document.getElementById("blueTeam");

    // Lógica interactiva simple para el Red Team (opcional, solo para demostrar funcionalidad)
    if (redTeamBox) {
        redTeamBox.addEventListener("click", () => {
            // Efecto visual rápido al hacer clic
            redTeamBox.style.backgroundColor = "#ffe6e6"; // Fondo rojo claro

            setTimeout(() => {
                redTeamBox.style.backgroundColor = "#ffffff";
            }, 200);

            console.log("¡Red Team seleccionado!");
        });
    }

    // Lógica interactiva simple para el Blue Team (opcional)
    if (blueTeamBox) {
        blueTeamBox.addEventListener("click", () => {
            // Efecto visual rápido al hacer clic
            blueTeamBox.style.backgroundColor = "#e6eaff"; // Fondo azul claro

            setTimeout(() => {
                blueTeamBox.style.backgroundColor = "#ffffff";
            }, 200);

            console.log("¡Blue Team seleccionado!");
        });
    }

    const navLinks = document.querySelectorAll('.top-nav a');

    navLinks.forEach(link => {
        const originalText = link.textContent;
        // Se reduce el multiplicador significativamente para acelerar la animación de la barra
        const totalDuration = originalText.length * 15;
        link.style.setProperty('--bar-time', `${totalDuration}ms`);

        link.addEventListener('mouseenter', () => {
            clearInterval(link.dataset.intervalID);
            let i = 0;
            link.dataset.intervalID = setInterval(() => {
                if (i <= originalText.length) {
                    const uppercased = originalText.substring(0, i).toUpperCase();
                    const remaining = originalText.substring(i);
                    link.textContent = uppercased + remaining;
                    i++;
                } else {
                    clearInterval(link.dataset.intervalID);
                }
            }, 15); // Sincronizado con la barra
        });

        link.addEventListener('mouseleave', () => {
            clearInterval(link.dataset.intervalID);
            let i = originalText.length;
            link.dataset.intervalID = setInterval(() => {
                if (i >= 0) {
                    const uppercased = originalText.substring(0, i).toUpperCase();
                    const remaining = originalText.substring(i);
                    link.textContent = uppercased + remaining;
                    i--;
                } else {
                    clearInterval(link.dataset.intervalID);
                    link.textContent = originalText;
                }
            }, 15); // Más rápido al salir también
        });
    });
});
