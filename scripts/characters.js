shouldDrawDroplet = false;
const characters = [
    {
        name: "Ianara Ustrina",
        title: "Blade of Adeline",
        wiki: "Ianara_Ustrina",
        imageUrl: "./images/character.gif",
        dataCharacter: "ianara",
        accentColor: "var(--link-text-color)",
    },
    {
        name: "Adeline Cineres",
        title: "The Scarlet Princess",
        wiki: "Adeline_Cineres",
        imageUrl: "./images/adeline.webp",
        dataCharacter: "adeline",
        accentColor: "#e70900",
    },
    {
        name: "Miyamoto Reiko",
        title: "",
        wiki: "Miyamoto_Reiko",
        imageUrl: "./images/reiko.webp",
        dataCharacter: "reiko",
        accentColor: "#050916",
    },
];

document.addEventListener("DOMContentLoaded", function () {
    initializeCharacters();
    const characterTitles = document.querySelectorAll(".character-info");
    let animationTimeout;

    characterTitles.forEach((title) => {
        const characterId = title.dataset.character;
        const image = document.querySelector(
            `img[data-character="${characterId}"]`
        );
        const numbers = document.querySelectorAll(
            `.character-number[data-character="${characterId}"]`
        );

        const animators = insertBackgrounds(title, 5, 1);
        title.addEventListener("mouseenter", () => {
            const randomSeed = Math.floor(Math.random() * 100);
            document.querySelectorAll("feTurbulence").forEach((turbulence) => {
                turbulence.setAttribute("seed", randomSeed);
            });

            animators.forEach((animator) => {
                animator.badge.style.opacity = 1;
                animator.startAnimation();
            });

            if (image.classList.contains("out")) {
                return;
            }

            clearTimeout(animationTimeout);
            animationTimeout = setTimeout(() => {
                image.classList.remove("hidden");
                image.classList.add("active");
                setTimeout(() => {
                    numbers.forEach((number) => {
                        number.style.opacity = 1;
                    });
                    image.classList.remove("active");
                }, 1000);
                document.getElementById("animateIn").beginElement();
                document.getElementById("animateInIntercept").beginElement();
            }, 150);
        });

        title.addEventListener("mouseleave", () => {
            animators.forEach((animator) => {
                animator.badge.style.opacity = 0;
                animator.stopAnimation();
            });

            function animateOut() {
                image.classList.add("out");
                numbers.forEach((number) => {
                    number.style.opacity = 0;
                });
                document.getElementById("animateOut").beginElement();
                document.getElementById("animateOutIntercept").beginElement();

                setTimeout(() => {
                    image.classList.add("hidden");
                    image.classList.remove("out");
                }, 1000);
            }

            if (image.classList.contains("active")) {
                setTimeout(() => {
                    animateOut();
                }, 1000 - 150); // Subtract the initial delay to sync with active state removal
            } else {
                animateOut();
            }
        });
    });
});

function insertBackgrounds(element, count = 5, whiteCount = 1) {
    const animators = [];

    for (let i = 0; i < count; i++) {
        const background = document.createElement("div");
        background.classList.add("member-background");
        if (i < whiteCount) {
            background.classList.add("white");
        }
        const animator = new BadgeAnimator(background, 200);
        animators.push(animator);
        element.appendChild(background);
    }
    return animators;
}

function initializeCharacters() {
    const container = document.querySelector(".character-container");
    if (!container) return;

    // Clear existing content
    container.innerHTML = "";

    // Add all characters
    characters.forEach((character, index) => {
        const characterElement = createCharacterElement(character, index + 1);
        container.appendChild(characterElement);
    });
}

function createCharacterElement(character, index) {
    const characterDiv = document.createElement("div");
    characterDiv.className = "character";

    let titlePadding = 0;
    if (character.title === "") {
        titlePadding = 2;
    }
    let margin = 14 + index;
    if (window.innerWidth < 800) {
        margin = margin / 1.5;
    } else if (window.innerWidth < 1200) {
        margin = margin / 1.25;
    }

    characterDiv.innerHTML = `
        <a class="character-info" data-character="${
            character.dataCharacter
        }" style="margin-left: ${margin}vh" href="https://arathia.net/wiki/${
        character.wiki
    }">
            <h2 class="text sm">${character.name}</h2>
            <div class="underline-2" style="width: 120%; left: -8%; top: -1.2vh"></div>
            <p class="text xxs" style="margin-top: -8%; padding-top: ${titlePadding}vh">${
        character.title
    }</p>
        </a>
        <img
            src="${character.imageUrl}"
            alt="${character.name}"
            class="hidden"
            data-character="${character.dataCharacter}"
            loading="eager"
        />
        <div class="character-number-container" data-character="${
            character.dataCharacter
        }">
            <p class="character-number text number-back" data-character="${
                character.dataCharacter
            }">${String(index).padStart(3, "0")}</p>
            <p class="character-number text number-front" style="color: ${
                character.accentColor
            }" data-character="${character.dataCharacter}">${String(
        index
    ).padStart(3, "0")}</p>
        </div>
    `;

    return characterDiv;
}
