// script.js

// ACTIVE MENU
const menuLinks = document.querySelectorAll(".menu a");

menuLinks.forEach(link => {

    link.addEventListener("click", function(){

        menuLinks.forEach(item => {
            item.classList.remove("active");
        });

        this.classList.add("active");

    });

});


// CARD CLICK EFFECT
const cards = document.querySelectorAll(".overview-card");

cards.forEach(card => {

    card.addEventListener("mousedown", () => {

        card.style.transform = "scale(0.98)";

    });

    card.addEventListener("mouseup", () => {

        card.style.transform = "";

    });

});


// PAGE LOAD ANIMATION
window.addEventListener("load", () => {

    document.body.style.opacity = "0";

    document.body.style.transition = "0.4s";

    setTimeout(() => {

        document.body.style.opacity = "1";

    },100);

});