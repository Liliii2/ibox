/* ============================================
   ibox – Iskolai Ötletdoboz
   Közös adatbázis: Firebase Realtime Database
   ============================================ */

// ✅ BEÁLLÍTOTT E-MAIL CÍM:
const KULDETO_EMAIL = "school.ibox.office@gmail.com";

// 🔥 IDE MÁSOLD BE A SAJÁT firebaseConfig-odat (a Firebase konzolból):
const firebaseConfig = {
    apiKey: "IDEBETENNI",
    authDomain: "IDEBETENNI",
    databaseURL: "IDEBETENNI",
    projectId: "IDEBETENNI",
    storageBucket: "IDEBETENNI",
    messagingSenderId: "IDEBETENNI",
    appId: "IDEBETENNI"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const OTLETEK_REF = db.ref("otletek");

let otletek = [];          // aktuális ötletlista (az adatbázisból)
let aktivSzuro = "all";    // szűrő állapota

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

// ===== INDULÁS =====
document.addEventListener("DOMContentLoaded", () => {
    adatbazisFigyelese();      // élő figyelés: ha bárki beküld, mindenkinek frissül!
    szuroGombokBeallitasa();
    urlapKezeles();
});

// ===== ÉLŐ ADATBÁZIS-FIGYELÉS =====
// Ez a függvény mindig lefut, ha bárki hozzáad / módosít / töröl ötletet.
function adatbazisFigyelese() {
    OTLETEK_REF.on("value", (snapshot) => {
        const adat = snapshot.val() || {};
        otletek = Object.entries(adat).map(([kulcs, ertek]) => ({
            firebaseKey: kulcs,
            ...ertek
        }));
        // Legújabb felülre
        otletek.sort((a, b) => new Date(b.datum) - new Date(a.datum));

        otletekMegjelenitese();
        statisztikaFrissitese();
    }, (hiba) => {
        console.error("❌ Adatbázis hiba:", hiba);
        toast("⚠️ Nem sikerült az adatbázishoz csatlakozni.");
    });
}

// ===== ŰRLAP BEKÜLDÉSE =====
function urlapKezeles() {
    const form = document.getElementById("ideaForm");

    form.addEventListener("submit", (e) => {
        e.preventDefault();

        const ujOtlet = {
            kategoria: document.getElementById("category").value,
            problema:  document.getElementById("problem").value.trim(),
            megoldas:  document.getElementById("solution").value.trim(),
            email:     document.getElementById("email").value.trim(),
            datum:     new Date().toISOString(),
            kesz:      false
        };

        // Beküldés a KÖZÖS adatbázisba → mindenkinél megjelenik!
        OTLETEK_REF.push(ujOtlet)
            .then(() => {
                form.reset();
                toast("✅ Az ötleted közzé lett téve!");
            })
            .catch((hiba) => {
                console.error("❌ Mentési hiba:", hiba);
                toast("⚠️ Nem sikerült beküldeni az ötletet.");
            });

        emailKuldes(ujOtlet);
    });
}

// ===== E-MAIL KÜLDÉS (FormSubmit) =====
async function emailKuldes(otlet) {
    if (!KULDETO_EMAIL) return;

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
    } catch (hiba) {
        console.error("❌ E-mail küldési hiba:", hiba);
    }
}

// ===== MEGJELENÍTÉS =====
function otletekMegjelenitese() {
    const grid = document.getElementById("ideasGrid");
    let lista = otletek;

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
    <div class="idea-card ${o.kesz ? "completed" : ""}" data-category="${o.kategoria}" data-id="${o.firebaseKey}">
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

// ===== KÁRTYA GOMBOK (kész / törlés) =====
document.getElementById("ideasGrid").addEventListener("click", (e) => {
    const kartya = e.target.closest(".idea-card");
    if (!kartya) return;

    const id = kartya.dataset.id; // Firebase kulcs (szöveg)

    if (e.target.closest(".delete-btn")) {
        if (confirm("Biztosan törlöd ezt az ötletet?")) {
            OTLETEK_REF.child(id).remove();
            toast("🗑️ Az ötlet törölve.");
        }
    } else if (e.target.closest(".complete-btn")) {
        const otlet = otletek.find(o => o.firebaseKey === id);
        if (otlet) {
            OTLETEK_REF.child(id).update({ kesz: !otlet.kesz });
        }
    }
});

// ===== STISZTIKA =====
function statisztikaFrissitese() {
    document.getElementById("totalIdeas").textContent = otletek.length;
    document.getElementById("completedIdeas").textContent = otletek.filter(o => o.kesz).length;
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
