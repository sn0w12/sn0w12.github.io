window.onload = function() {
    // Fade in the main header
    const header = document.querySelector('.header');
    const content = document.querySelector('.content');
    const news = document.querySelector('.news-updates');
    const separators = document.querySelectorAll('.separator');
    const subheaders = document.querySelectorAll('.subheader-link');
    const svg = document.getElementById('arathia-svg');

    const footer = document.querySelector('.footer');

    //svg.style.height = `${textContent.offsetHeight}px`;
    content.style.opacity = '1';

    const startTime = 500;
    const subTime = 250;

    setTimeout(() => {
        content.classList.add("animated");
    }, startTime); // Stagger the fade-in with a delay

    // Fade in the subheader links one by one
    separators[0].addEventListener('transitionend', () => {
        header.style.opacity = '1';

        subheaders.forEach((link, index) => {
            setTimeout(() => {
                link.style.opacity = '1';
            }, (index + 1) * subTime); // Stagger the fade-in with a delay
        });

        // Fade in the SVG after the last subheader
        setTimeout(() => {
            svg.style.opacity = '1';
        }, (subheaders.length + 1) * subTime); // Trigger after the last subheader
    });

    /*
    svg.addEventListener('transitionend', () => {
        setTimeout(() => {
            footer.classList.add("animated");
        }, startTime);
    });

    const footerPs = footer.querySelectorAll("p");
    footer.addEventListener('transitionend', () => {
        setTimeout(() => {
            footerPs.forEach(text => {
                text.style.opacity = '1';
            });
        }, subTime);
    });
    */
};
