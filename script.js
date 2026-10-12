/* ============================================
   ibox – Iskolai Ötletdoboz
   ============================================ */

// ✅ BEÁLLÍTOTT E-MAIL CÍM:
const KULDETO_EMAIL = "school.ibox.office@gmail.com";

// Mentési kulcs (localStorage)
const TAROLO_KULCS = "ibox_otletek";

// Kategóriák adatai
const KATEGORIAK = {
    oktatas:       { ikon: "📚", nev: "Oktatás & Tanulás" },
    kornyezet:     { ikon: "🏫", nev: "Iskolai környezet" },
    programok:     { ikon: "🎪", nev: "Programok & Rendezvények" },
    felszereltseg: { ikon: "🖥️", nev: "Felszereltség & Eszközök" },
    kozosseg:      { ikon: "👥", nev: "Közösség & Diákélet" },
    biztonsag:     { ikon: "🛡️", nev: "Biztonság & Egészség" },
    egyeb:         { ikon: "💡", nev: "Egyéb" }
};

let aktivSzuro = "all";

// ===== INDULÁS =====
document.addEventListener("DOMContentLoaded", () => {
    otletekMegjelenitese();
    statisztikaFrissitese();
    szuroGombokBeallitasa();
    urlapKezeles();
});

// ===== MENTÉS / BETÖLTÉS =====
function otletekBetoltese() {
    try {
        return JSON.parse(localStorage.getItem(TAROLO_KULCS)) || [];
    } catch {
        return [];
    }
}

function otletekMentese(lista) {
    localStorage.setItem(TAROLO_KULCS, JSON.stringify(lista));
}

// ===== ŰRLAP BEKÜLDÉSE =====
function urlapKezeles() {
    const form = document.getElementById("ideaForm");

    form.addEventListener("submit", (e) => {
        e.preventDefault();

        const ujOtlet = {
            id: Date.now(),
            kategoria: document.getElementById("category").value,
            problema:  document.getElementById("problem").value.trim(),
            megoldas:  document.getElementById("solution").value.trim(),
            email:     document.getElementById("email").value.trim(),
            datum:     new Date().toISOString(),
            kesz:      false
        };

        const lista = otletekBetoltese();
        lista.unshift(ujOtlet);
        otletekMentese(lista);

        otletekMegjelenitese();
        statisztikaFrissitese();
        form.reset();

        toast("✅ Az ötleted sikeresen közzé lett téve!");

        emailKuldes(ujOtlet);
    });
}

// ===== E-MAIL KÜLDÉS (FormSubmit) =====
async function emailKuldes(otlet) {
    if (!KULDETO_EMAIL) {
        console.warn("❌ E-mail nincs beállítva!");
        return;
    }

    try {
        const valasz = await fetch(`https://formsubmit.co/ajax/${KULDETO_EMAIL}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({
                _captcha: "false",
                _subject: "💡 Új ötlet érkezett az iboxba!",
                _template: "table",
                "Kategória": KATEGORIAK[otlet.kategoria].nev,
                "Probléma": otlet.problema,
                "Megoldási ötlet": otlet.megoldas,
                "Beküldő e-mail címe": otlet.email,
                "Dátum": datumFormazas(otlet.datum)
            })
        });

        const adat = await valasz.json();
        console.log("📩 FormSubmit válasz:", adat);

        if (valasz.ok) {
            toast("📧 Az ötlet elmentve és elküldve e-mailben is!");
        } else {
            throw new Error(adat.message || "Ismeretlen hiba");
        }
    } catch (hiba) {
        console.error("❌ E-mail küldési hiba:", hiba);
        toast("⚠️ Az ötlet közzé lett téve, de az e-mail nem ment el.");
    }
}

// ===== MEGJELENÍTÉS =====
function otletekMegjelenitese() {
    const grid = document.getElementById("ideasGrid");
    let lista = otletekBetoltese();

    if (aktivSzuro !== "all") {
        lista = lista.filter(o => o.kategoria === aktivSzuro);
    }

    if (lista.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-emoji">📭</div>
                <h3>Még nincs itt ötlet</h3>
                <p>Légy te az első! Küldj be egy ötletet a fenti űrlappal, és itt fog megjelenni.</p>
            </div>`;
        return;
    }

    grid.innerHTML = lista.map(kartyaLetrehozas).join("");
}

function kartyaLetrehozas(o) {
    const k = KATEGORIAK[o.kategoria] || KATEGORIAK.egyeb;
    return `
    <div class="idea-card ${o.kesz ? "completed" : ""}" data-category="${o.kategoria}" data-id="${o.id}">
        ${o.kesz ? '<span class="completed-badge">✅ Megvalósítva</span>' : ""}
        <div class="idea-header">
            <span class="category-badge">${k.ikon} ${k.nev}</span>
            <span class="email-badge">📧 ${biztonsagosSzoveg(o.email)}</span>
        </div>
        <div class="problem-section">
            <div class="problem-label">⚠️ Probléma / Kihívás</div>
            <div class="problem-text">${biztonsagosSzoveg(o.problema)}</div>
        </div>
        <div class="solution-section">
            <div class="solution-label">💡 Megoldási ötlet</div>
            <div class="solution-text">${biztonsagosSzoveg(o.megoldas)}</div>
        </div>
        <div class="idea-footer">
            <span class="idea-date">🕒 ${datumFormazas(o.datum)}</span>
            <div class="idea-actions">
                <button class="complete-btn ${o.kesz ? "completed" : ""}" title="Megvalósítottnak jelölés">✓</button>
                <button class="delete-btn" title="Törlés">✕</button>
            </div>
        </div>
    </div>`;
}

// ===== SZŰRŐ GOMBOK =====
function szuroGombokBeallitasa() {
    document.querySelectorAll(".filter-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelector(".filter-btn.active").classList.remove("active");
            btn.classList.add("active");
            aktivSzuro = btn.dataset.filter;
            otletekMegjelenitese();
        });
    });
}

// ===== KÁRTYA GOMBOK =====
document.getElementById("ideasGrid").addEventListener("click", (e) => {
    const kartya = e.target.closest(".idea-card");
    if (!kartya) return;

    const id = Number(kartya.dataset.id);

    if (e.target.closest(".delete-btn")) {
        if (confirm("Biztosan törlöd ezt az ötletet?")) {
            otletekMentese(otletekBetoltese().filter(o => o.id !== id));
            otletekMegjelenitese();
            statisztikaFrissitese();
            toast("🗑️ Az ötlet törölve.");
        }
    } else if (e.target.closest(".complete-btn")) {
        const lista = otletekBetoltese();
        const otlet = lista.find(o => o.id === id);
        if (otlet) {
            otlet.kesz = !otlet.kesz;
            otletekMentese(lista);
            otletekMegjelenitese();
            statisztikaFrissitese();
        }
    }
});

// ===== STISZTIKA =====
function statisztikaFrissitese() {
    const lista = otletekBetoltese();
    document.getElementById("totalIdeas").textContent = lista.length;
    document.getElementById("completedIdeas").textContent = lista.filter(o => o.kesz).length;
}

// ===== SEGÉDFÜGGVÉNYEK =====
function biztonsagosSzoveg(szoveg) {
    const div = document.createElement("div");
    div.textContent = szoveg;
    return div.innerHTML;
}

function datumFormazas(iso) {
    return new Date(iso).toLocaleString("hu-HU", {
        year: "numeric", month: "long", day: "numeric",
        hour: "2-digit", minute: "2-digit"
    });
}

let toastIdo;
function toast(uzenet) {
    const t = document.getElementById("toast");
    t.textContent = uzenet;
    t.classList.add("show");
    clearTimeout(toastIdo);
    toastIdo = setTimeout(() => t.classList.remove("show"), 3500);
}
