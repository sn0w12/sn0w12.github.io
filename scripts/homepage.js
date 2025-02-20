dynamicClock();

window.onload = function () {
    shouldDrawDroplet = false;
    const header = document.querySelector(".header");
    const content = document.querySelector(".content");
    const separators = document.querySelectorAll(".separator");
    const subheaders = document.querySelectorAll(".subheader-link");
    const svg = document.getElementById("arathia-svg");

    const statue = document.getElementById("statue");
    const tree = document.getElementById("tree");
    const birds = document.getElementById("birds");
    const allHovers = [statue, tree, birds];
    const hoveredOpacity = 0.8;
    let isHovered = false;

    function resetHover(opacity = true) {
        allHovers.forEach((hover) => {
            if (!hover) return;

            if (opacity) {
                hover.style.opacity = "0";
            }
            hover.classList.remove("hover");
            hover.classList.remove("left");
        });
    }

    subheaders.forEach((link, index) => {
        insertBackgrounds(link);
        const underline = link.querySelector(".underline-2");

        link.addEventListener("mouseover", () => {
            isHovered = true;
            switch (index) {
                case 0:
                    resetHover();
                    statue.style.opacity = hoveredOpacity;
                    statue.classList.add("hover");
                    break;
                case 1:
                    resetHover();
                    tree.style.opacity = hoveredOpacity;
                    tree.classList.add("hover");
                    tree.classList.add("left");
                    break;
                case 2:
                    resetHover();
                    birds.style.opacity = hoveredOpacity;
                    birds.classList.add("hover");
                    break;
                default:
                    statue.style.opacity = "0";
                    tree.style.opacity = "0";
                    break;
            }
            underline.style.opacity = "1";
        });

        link.addEventListener("mouseout", () => {
            isHovered = false;
            underline.style.opacity = "0";

            resetHover(false);
            setTimeout(() => {
                if (!isHovered) {
                    resetHover();
                }
            }, 100);
        });
    });
    setupAnimators();
    content.style.opacity = "1";

    const startTime = 500;
    const subTime = 250;

    setTimeout(() => {
        content.classList.add("animated");
    }, startTime); // Stagger the fade-in with a delay

    // Fade in the subheader links one by one
    separators[0].addEventListener("transitionend", () => {
        header.style.opacity = "1";

        subheaders.forEach((link, index) => {
            setTimeout(() => {
                link.style.opacity = "1";
            }, (index + 1) * subTime); // Stagger the fade-in with a delay
        });

        // Fade in the SVG after the last subheader
        setTimeout(() => {
            svg.style.opacity = "1";
        }, (subheaders.length + 1) * subTime); // Trigger after the last subheader
    });
};

function setupAnimators() {
    const memberBackgrounds = document.querySelectorAll(".member-background");
    const animators = [];

    memberBackgrounds.forEach((backgroundElement) => {
        const animator = new BadgeAnimator(backgroundElement, 200);
        animators.push(animator);
        if (!backgroundElement.classList.contains("white")) {
            backgroundElement.style.setProperty(
                "--background-color",
                "var(--link-text-color)"
            );
        }

        backgroundElement.parentElement.addEventListener("mouseenter", () => {
            backgroundElement.style.opacity = 1;
            animator.startAnimation();
        });
        backgroundElement.parentElement.addEventListener("mouseleave", () => {
            backgroundElement.style.opacity = 0;
            animator.stopAnimation();
        });
    });
}

function insertBackgrounds(element, count = 5, whiteCount = 1) {
    for (let i = 0; i < count; i++) {
        const background = document.createElement("div");
        background.classList.add("member-background");
        if (i < whiteCount) {
            background.classList.add("white");
        }
        element.appendChild(background);
    }
}

function getNeighboringNumbers(number, max) {
    let numbers = [number];
    for (let i = 1; i <= max; i++) {
        numbers.push((number + i) % 12);
        numbers.unshift((number - i + 12) % 12);
    }
    numbers = numbers.map((n) => (n === 0 ? 12 : n));
    return numbers;
}

function animateClock() {
    const hourHand = document.getElementById("hour-hand");
    const minuteHand = document.getElementById("minute-hand");
    const secondHand = document.getElementById("second-hand");

    const hourCircle = document.getElementById("hour-circle");
    const minuteCircle = document.getElementById("minute-circle");
    const secondCircle = document.getElementById("second-circle");

    const crossCircle = document.getElementById("cross-circle");
    const crossHands = document.querySelectorAll(".cross-hand");
    setTimeout(() => {
        crossCircle.style.opacity = 1;
        crossHands.forEach((hand, index) => {
            setTimeout(() => {
                hand.style.opacity = 1;
            }, 150 * (index + 1));
        });
    }, 2000);

    const clockFills = document.querySelectorAll(".clock-fill");
    clockFills.forEach((fill, index) => {
        setTimeout(() => {
            if (fill.id === "hour-fill") {
                fill.style.opacity = 0.4;
                return;
            }
            fill.style.opacity = 0.2;
        }, 1500 + 500 * (index + 1));
    });

    const delay = 500;
    setTimeout(() => {
        secondHand.style.opacity = 0.75;
        setTimeout(() => {
            secondCircle.style.opacity = 1;
            minuteHand.style.opacity = 1;
            setTimeout(() => {
                minuteCircle.style.opacity = 1;
                hourHand.style.opacity = 1;
                setTimeout(() => {
                    hourCircle.style.opacity = 1;
                }, delay);
            }, delay);
        }, delay);
    }, delay);
}

function dynamicClock() {
    const hourHand = document.getElementById("hour-hand");
    const minuteHand = document.getElementById("minute-hand");
    const secondHand = document.getElementById("second-hand");
    const clockNumbers = document.querySelectorAll(".hour-number");
    const bgClockNumbers = document.querySelectorAll(".bg-hour-number");

    const hourCircle = document.getElementById("hour-circle");
    const minuteCircle = document.getElementById("minute-circle");
    const secondCircle = document.getElementById("second-circle");

    const crossCircle = document.getElementById("cross-circle");
    const crossHands = document.querySelectorAll(".cross-hand");

    centerClockHands();
    window.addEventListener("resize", centerClockHands);

    let secondsRotation = 0;
    let minutesRotation = 0;
    let hoursRotation = 0;
    let lastSeconds = new Date().getSeconds();
    let lastMinutes = new Date().getMinutes();
    let lastHours = new Date().getHours() % 12;

    function updateClockColors(hours, minutes, animate = false) {
        const nextHourPercentage = minutes / 60;
        const maxNeighboringNumbers = 4;
        const neighbors = getNeighboringNumbers(hours, maxNeighboringNumbers);
        const baseDelay = animate ? 100 : 0;

        // First pass: Set all numbers to transparent
        clockNumbers.forEach((number) => {
            number.style.fill = "transparent";
            number.style.opacity = 0;
        });

        // Second pass: Animate numbers with delays
        clockNumbers.forEach((number) => {
            const numberHour = parseInt(number.id.split("-")[1]);

            // Calculate the minimum distance to the current hour
            let distance = Math.min(
                Math.abs(numberHour - hours),
                Math.abs(numberHour - (hours + 12)),
                Math.abs(numberHour + 12 - hours)
            );

            // Special case for hour 12
            if (hours === 0 && numberHour === 12) {
                distance = 0;
            }

            // Calculate delay based on distance
            const delay = distance * baseDelay;

            setTimeout(() => {
                if (
                    number.id === `hour-${hours}` ||
                    (hours === 0 && number.id === "hour-12")
                ) {
                    number.style.fill = "var(--background-color)";
                    number.style.opacity = 1;
                } else if (
                    neighbors.includes(parseInt(number.id.split("-")[1]))
                ) {
                    const numberHour = parseInt(number.id.split("-")[1]);
                    const neighborDistance =
                        neighbors.indexOf(numberHour) - maxNeighboringNumbers;
                    const opacity =
                        1 -
                        (Math.abs(neighborDistance) - 1) /
                            maxNeighboringNumbers;
                    number.style.fill = "white";
                    if (neighborDistance < 0) {
                        number.style.opacity =
                            opacity * (1.5 - nextHourPercentage);
                    } else {
                        number.style.opacity = opacity;
                    }
                }
            }, delay);
        });

        // Handle background numbers without animation
        bgClockNumbers.forEach((number) => {
            if (number.id === `bg-hour-${hours}`) {
                number.style.fill = "var(--link-text-color)";
                number.style.opacity = 1 - nextHourPercentage;
            } else if (number.id === `bg-hour-${hours + 1}`) {
                number.style.fill = "var(--link-text-color)";
                number.style.opacity = nextHourPercentage;
            } else if (hours === 0 && number.id === "bg-hour-12") {
                number.style.fill = "var(--link-text-color)";
                number.style.opacity = 1 - nextHourPercentage;
            } else {
                number.style.fill = "transparent";
            }
        });
    }

    const crossOffset = 37;
    function onSecondChange(seconds, totalSecondRotation) {
        Ui.playSound("8", 0.2);
        setTimeout(() => {
            Ui.playSound("8", 0.1);
            const crossRotation = totalSecondRotation + crossOffset;
            crossCircle.style.transform = `translate(-50%, -50%) rotate(${crossRotation}deg)`;
            crossHands.forEach((hand) => {
                n = parseInt(hand.id.split("-")[2]);
                hand.style.transform = `rotate(${crossRotation + 45 * n}deg)`;
            });
        }, 500);
    }

    function onMinuteChange(minutes) {
        if (minutes % 15 === 0) {
            Ui.playSound("5", 0.3);
            return;
        }
        Ui.playSound("7", 0.3);
    }

    function onHourChange(hours) {
        Ui.playSound("6", 0.4);
    }

    function updateClock(setColors = true, animate = false) {
        const now = new Date();
        const hours = now.getHours() % 12;
        const minutes = now.getMinutes();
        const seconds = now.getSeconds();

        // Make sure the clock hands rotate the shortest way around
        if (seconds < lastSeconds) {
            secondsRotation += 360;
        }
        if (minutes < lastMinutes) {
            minutesRotation += 360;
        }
        if (hours < lastHours) {
            hoursRotation += 360;
        }

        const totalSecondRotation = seconds * 6 + secondsRotation;
        const totalMinuteRotation = minutes * 6 + minutesRotation;
        const totalHourRotation = hours * 30 + minutes * 0.5 + hoursRotation;

        if (setColors) {
            updateClockColors(hours, minutes, animate);
        } else {
            const crossRotation = totalSecondRotation + crossOffset;
            crossCircle.style.transform = `translate(-50%, -50%) rotate(${crossRotation}deg)`;
            crossHands.forEach((hand) => {
                n = parseInt(hand.id.split("-")[2]);
                hand.style.transform = `rotate(${crossRotation + 45 * n}deg)`;
            });
        }

        if (hours !== lastHours) {
            onHourChange(hours);
        } else if (minutes !== lastMinutes) {
            onMinuteChange(minutes);
        }
        if (seconds !== lastSeconds) {
            onSecondChange(seconds, totalSecondRotation);
        }

        hourHand.style.transform = `rotate(${totalHourRotation}deg)`;
        hourCircle.style.transform = `translate(-50%, -50%) rotate(${totalHourRotation}deg)`;
        minuteHand.style.transform = `rotate(${totalMinuteRotation}deg)`;
        minuteCircle.style.transform = `translate(-50%, -50%) rotate(${totalMinuteRotation}deg)`;
        secondHand.style.transform = `rotate(${totalSecondRotation}deg)`;
        secondCircle.style.transform = `translate(-50%, -50%) rotate(${totalSecondRotation}deg)`;

        lastSeconds = seconds;
        lastMinutes = minutes;
        lastHours = hours;
    }

    updateClock(false);
    setTimeout(() => {
        hourHand.style.transition =
            "transform 1s ease-out, opacity 1s ease-in-out";
        hourCircle.style.transition =
            "transform 1s ease-out, opacity 1s ease-in-out";
        minuteHand.style.transition =
            "transform 0.3s ease-out, opacity 1s ease-in-out";
        minuteCircle.style.transition =
            "transform 0.3s ease-out, opacity 1s ease-in-out";
        secondHand.style.transition =
            "transform 0.1s ease-out, opacity 1s ease-in-out";
        secondCircle.style.transition =
            "transform 0.1s ease-out, opacity 1s ease-in-out";
        crossCircle.style.transition =
            "transform 0.1s ease-out, opacity 1s ease-in-out";
        crossHands.forEach((hand) => {
            hand.style.transition =
                "transform 0.1s ease-out, opacity 1s ease-in-out";
        });
        animateClock();
        updateClock(true, true);
    }, 10);
    setInterval(updateClock, 1000);
}

function centerClockHands() {
    const clockBody = document.getElementById("clock-body");
    const hourHand = document.getElementById("hour-hand");
    const minuteHand = document.getElementById("minute-hand");
    const secondHand = document.getElementById("second-hand");

    const clockRect = clockBody.getBoundingClientRect();
    const clockCenterX = clockRect.left + clockRect.width / 2;
    const bodyRect = document.body.getBoundingClientRect();

    // Calculate the position as a percentage of the viewport width
    const centerPercentage = (clockCenterX / bodyRect.width) * 100;

    // Adjust for the width of the hands
    const handAdjustment = 0.2;

    // Apply the centered position to all hands
    [hourHand, minuteHand, secondHand].forEach((hand) => {
        hand.style.left = `calc(${centerPercentage}% - ${handAdjustment}vh)`;
    });
}
