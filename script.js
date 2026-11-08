// MOBIL MENÜ MEGNYITÁSA ÉS BEZÁRÁSA

const menuGomb = document.getElementById("menuGomb");
const navLinks = document.getElementById("navLinks");

menuGomb.addEventListener("click", function() {
    navLinks.classList.toggle("aktiv");
});

// MENÜ BEZÁRÁSA KATTINTÁS UTÁN

const menuLinkek = document.querySelectorAll(".nav-links a");

menuLinkek.forEach(function(link) {
    link.addEventListener("click", function() {
        navLinks.classList.remove("aktiv");
    });
});

// AKTUÁLIS ÉV KIÍRÁSA

document.getElementById("ev").textContent = new Date().getFullYear();
