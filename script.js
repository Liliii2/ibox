/* ============================================
   ibox – Iskolai Ötletdoboz
   Minden funkcióval 🔥
   ============================================ */

const KULDETO_EMAIL = "school.ibox.office@gmail.com";

// 👑 ADMIN JELSZÓ – írd át, mielőtt kiosztod!
const ADMIN_JELSZO = "ibox2025";

// 🔥 Firebase kapcsolat
const firebaseConfig = {
    apiKey: "AIzaSyAmPRB7bhK1YZiRIqCrSbGsQ79glscIDhA",
    authDomain: "ibox-73955.firebaseapp.com",
    databaseURL: "https://ibox-73955-default-rtdb.firebaseio.com",
    projectId: "ibox-73955",
    storageBucket: "ibox-73955.firebasestorage.app",
    messagingSenderId: "441138699068",
    appId: "1:441138699068:web:4e1b0ec477e1a2d7ef1c39"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const OTLETEK_REF = db.ref("otletek");

let otletek = [];
let aktivSzuro = "all";
let nyitottKommentek = new Set();  // mely kártyáknál van nyitva a komment-szekció

const KATEGORIAK = {
    oktatas:       { ikon: "📚", nev: "Oktatás & Tanulás" },
    kornyezet:     { ikon: "🏫", nev: "Iskolai környezet" },
    programok:     { ikon: "🎪", nev: "Programok & Rendezvények" },
    felszereltseg: { ikon: "🖥️", nev: "Felszereltség & Eszközök" },
    kozosseg:      { ikon: "👥", nev: "Közösség & Diákélet" },
    biztonsag:     { ikon: "🛡️", nev: "Biztonság & Egészség" },
    egyeb:         { ikon: "💡", nev: "Egyéb" }
};

/* ===== 🚫 KÁROMKODÁS-SZŰRŐ ===== */
const KAROMKODASOK = [
    "basszmeg","bazmeg","basszus","bassza","kibasz","elbasz","felbasz","megbasz",
    "buzi","fasz","geci","kurva","pina","picsa","segg","szar","fos",
    "hulye","retkes","pocsok","gany",
    "fuck","shit","bitch","asshole","bastard","cunt","dick","pussy","wtf","nigger","faggot",
    "scheisse","arschloch",
    "pula","curva","kokot","kurac"
];

/* Más ábécéből "álcázott" betűk átváltása (kurvα, curvа stb.) */
const ATEIRASI_TABLA = {
    "α":"a","ο":"o","ε":"e","ι":"i","κ":"k","ρ":"p","τ":"t","υ":"u","χ":"x","ν":"v","μ":"m","σ":"s","β":"b",
    "а":"a","е":"e","о":"o","р":"p","с":"c","у":"y","х":"x","і":"i","ѕ":"s","к":"k","м":"m","т":"t","в":"b","н":"h","д":"d"
};

/* Csak magyar betűk, számok, normál írásjelek engedélyezettek */
const ENGEDELYEZETT_MINTA = /^[a-zA-Z0-9áéíóöőúüűÁÉÍÓÖŐÚÜŰ\s.,!?;:%()'"„”+\-*=@#&_\/–—]+$/;

function karakterEllenorzes(szoveg) {
    // emojikat kiszedjük (azok oké), aztán nézzük, maradt-e tiltott karakter
    const emojiNelkul = szoveg.replace(
        /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}\u{2B00}-\u{2BFF}]/gu,
        ""
    );
    return ENGEDELYEZETT_MINTA.test(emojiNelkul);
}

function szovegNormalizalas(szoveg) {
    let s = szoveg.toLowerCase()
        .split("")
        .map(ch => ATEIRASI_TABLA[ch] || ch)
        .join("");
    s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    s = s.replace(/4/g,"a").replace(/3/g,"e").replace(/1/g,"i")
         .replace(/0/g,"o").replace(/5/g,"s").replace(/7/g,"t")
         .replace(/@/g,"a").replace(/\$/g,"s");
    s = s.replace(/[^a-z]/g, "");
    return s;
}

function vanKaromkodas(szoveg) {
    const t = szovegNormalizalas(szoveg);
    return KAROMKODASOK.some(k => t.includes(k));
}

/* ===== 🔐 SZERZŐ-AZONOSÍTÁS ÉS ADMIN ===== */
function sajatSzerzoId() {
    let id = localStorage.getItem("ibox_szerzo_id");
    if (!id) {
        id = "szerzo_" + Math.random().toString(36).slice(2) + Date.now();
        localStorage.setItem("ibox_szerzo_id", id);
    }
    return id;
}

function isAdmin() {
    return sessionStorage.getItem("ibox_admin") === "igen";
}

function frissitsAdminGombot() {
    const gomb = document.getElementById("adminBtn");
    gomb.textContent = isAdmin() ? "👑" : "🔒";
    gomb.classList.toggle("aktiv", isAdmin());
    gomb.title = isAdmin() ? "Admin mód KI" : "Admin belépés";
}

document.getElementById("adminBtn").addEventListener("click", () => {
    if (isAdmin()) {
        if (confirm("Kilépsz az admin módból?")) {
            sessionStorage.removeItem("ibox_admin");
            frissitsAdminGombot();
            otletekMegjelenitese();
            toast("Admin mód kikapcsolva.");
        }
    } else {
        const jelszo = prompt("👑 Admin jelszó:");
        if (jelszo === null) return;
        if (jelszo === ADMIN_JELSZO) {
            sessionStorage.setItem("ibox_admin", "igen");
            frissitsAdminGombot();
            otletekMegjelenitese();
            toast("👑 Admin mód bekapcsolva!");
        } else {
            toast("❌ Helytelen jelszó!");
        }
    }
});

/* ===== INDULÁS ===== */
document.addEventListener("DOMContentLoaded", () => {
    sajatSzerzoId();
    adatbazisFigyelese();
    szuroGombokBeallitasa();
    urlapKezeles();
    frissitsAdminGombot();
});

/* ===== ÉLŐ ADATBÁZIS-FIGYELÉS ===== */
function adatbazisFigyelese() {
    OTLETEK_REF.on("value", (snapshot) => {
        const adat = snapshot.val() || {};
        otletek = Object.entries(adat).map(([kulcs, ertek]) => ({
            firebaseKey: kulcs,
            ...ertek
        }));
        otletek.sort((a, b) => new Date(b.datum) - new Date(a.datum));

        otletekMegjelenitese();
        statisztikaFrissitese();
    }, (hiba) => {
        console.error("❌ Adatbázis hiba:", hiba);
        toast("⚠️ Nem sikerült az adatbázishoz csatlakozni.");
    });
}

/* ===== ŰRLAP BEKÜLDÉSE ===== */
function urlapKezeles() {
    const form = document.getElementById("ideaForm");

    form.addEventListener("submit", (e) => {
        e.preventDefault();

        const problema = document.getElementById("problem").value.trim();
        const megoldas = document.getElementById("solution").value.trim();

        if (!karakterEllenorzes(problema) || !karakterEllenorzes(megoldas)) {
            toast("🚫 Csak magyar betűket, számokat, normál írásjeleket és emojikat használhatsz!");
            return;
        }
        if (vanKaromkodas(problema) || vanKaromkodas(megoldas)) {
            toast("🚫 A szöveg sértő kifejezést tartalmaz – kérlek, írd át udvariasan! 🙏");
            return;
        }

        const ujOtlet = {
            kategoria: document.getElementById("category").value,
            problema:  problema,
            megoldas:  megoldas,
            email:     document.getElementById("email").value.trim(),
            datum:     new Date().toISOString(),
            kesz:      false,
            szerzoId:  sajatSzerzoId()
        };

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

/* ===== E-MAIL KÜLDÉS (FormSubmit) ===== */
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

/* ===== 👍👎 REAKCIÓK ===== */
function reakcioSzamolas(o) {
    const r = o.reakciok || {};
    let like = 0, dislike = 0;
    Object.values(r).forEach(v => {
        if (v === "like") like++;
        else if (v === "dislike") dislike++;
    });
    return { like, dislike };
}

function sajatReakcio(o) {
    if (!o || !o.reakciok) return null;
    return o.reakciok[sajatSzerzoId()] || null;
}

/* ===== MEGJELENÍTÉS ===== */
function otletekMegjelenitese() {
    const grid = document.getElementById("ideasGrid");
    let lista = otletek;

    if (aktivSzuro !== "all") {
        lista = lista.filter(o => o.kategoria === aktivSzuro);
    }

    // félbehagyott hozzászólások megőrzése újrarajzoláskor
    const mentettSzovegek = {};
    grid.querySelectorAll(".komment-input").forEach(inp => {
        const kartya = inp.closest(".idea-card");
        if (kartya && inp.value.trim()) {
            mentettSzovegek[kartya.dataset.id] = inp.value;
        }
    });

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

    Object.entries(mentettSzovegek).forEach(([id, szoveg]) => {
        const inp = grid.querySelector(`.idea-card[data-id="${id}"] .komment-input`);
        if (inp) inp.value = szoveg;
    });
}

function kommentListaKeszites(o) {
    const k = o.kommentek || {};
    return Object.entries(k).sort((a, b) => new Date(a[1].datum) - new Date(b[1].datum));
}

function kommentHtml(kommentId, k) {
    const torolhet = isAdmin() || (k.szerzoId && k.szerzoId === sajatSzerzoId());
    return `
    <div class="komment">
        <div class="komment-fejlec">
            <span>🕒 ${datumFormazas(k.datum)}</span>
            ${torolhet ? `<button class="komment-torles" data-komment="${kommentId}">🗑️ Törlés</button>` : ""}
        </div>
        <div class="komment-szoveg">${biztonsagosSzoveg(k.szoveg)}</div>
    </div>`;
}

function kommentSzekcioHtml(o, kommentLista) {
    return `
    <div class="komment-szekcio">
        ${kommentLista.length === 0
            ? '<div class="komment-ures">Még nincs hozzászólás – írd te az elsőt! 💬</div>'
            : `<div class="komment-lista">${kommentLista.map(([id, k]) => kommentHtml(id, k)).join("")}</div>`}
        <form class="komment-form" data-id="${o.firebaseKey}">
            <input class="komment-input" placeholder="Írd meg a véleményed..." maxlength="300" autocomplete="off">
            <button type="submit" class="komment-kuldes">Küldés</button>
        </form>
    </div>`;
}

function kartyaLetrehozas(o) {
    const k = KATEGORIAK[o.kategoria] || KATEGORIAK.egyeb;
    const sajatE  = o.szerzoId && o.szerzoId === sajatSzerzoId();
    const torolhet = isAdmin() || sajatE;
    const jelolhet = isAdmin();

    const { like, dislike } = reakcioSzamolas(o);
    const sajat = sajatReakcio(o);

    const kommentLista = kommentListaKeszites(o);
    const kommentDb = kommentLista.length;
    const nyitva = nyitottKommentek.has(o.firebaseKey);

    let gombok = '<div class="idea-actions">';
    if (jelolhet) gombok += `<button class="complete-btn ${o.kesz ? "completed" : ""}" title="Megvalósítottnak jelölés">✓</button>`;
    if (torolhet) gombok += `<button class="delete-btn" title="Törlés">✕</button>`;
    gombok += '</div>';

    return `
    <div class="idea-card ${o.kesz ? "completed" : ""}" data-category="${o.kategoria}" data-id="${o.firebaseKey}">
        ${o.kesz ? '<span class="completed-badge">✅ Megvalósítva</span>' : ""}
        <div class="idea-header">
            <span class="category-badge">${k.ikon} ${k.nev}</span>
            ${sajatE ? '<span class="own-badge">🌟 Az ötleted</span>' : ""}
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
            <div class="reakcio-sor">
                <button class="reakcio-btn like-btn ${sajat === "like" ? "like-aktiv" : ""}" title="Tetszik!">👍 <span>${like}</span></button>
                <button class="reakcio-btn dislike-btn ${sajat === "dislike" ? "dislike-aktiv" : ""}" title="Nem tetszik">👎 <span>${dislike}</span></button>
                <button class="reakcio-btn komment-toggle-btn" title="Hozzászólások">💬 <span>${kommentDb}</span></button>
            </div>
            ${gombok}
        </div>
        ${nyitva ? kommentSzekcioHtml(o, kommentLista) : ""}
    </div>`;
}

/* ===== SZŰRŐ GOMBOK ===== */
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

/* ===== KÁRTYA KATTINTÁSOK ===== */
document.getElementById("ideasGrid").addEventListener("click", (e) => {
    const kartya = e.target.closest(".idea-card");
    if (!kartya) return;

    const id = kartya.dataset.id;
    const otlet = otletek.find(o => o.firebaseKey === id);
    const sajatE = otlet && otlet.szerzoId && otlet.szerzoId === sajatSzerzoId();

    // 👍 LIKE
    if (e.target.closest(".like-btn")) {
        const ref = OTLETEK_REF.child(id).child("reakciok").child(sajatSzerzoId());
        if (sajatReakcio(otlet) === "like") {
            ref.remove();
        } else {
            ref.set("like");
        }
        return;
    }

    // 👎 DISLIKE
    if (e.target.closest(".dislike-btn")) {
        const ref = OTLETEK_REF.child(id).child("reakciok").child(sajatSzerzoId());
        if (sajatReakcio(otlet) === "dislike") {
            ref.remove();
        } else {
            ref.set("dislike");
        }
        return;
    }

    // 💬 KOMMENT NYITÁS/ZÁRÁS
    if (e.target.closest(".komment-toggle-btn")) {
        if (nyitottKommentek.has(id)) {
            nyitottKommentek.delete(id);
        } else {
            nyitottKommentek.add(id);
        }
        otletekMegjelenitese();
        if (nyitottKommentek.has(id)) {
            const input = document.querySelector(`.idea-card[data-id="${id}"] .komment-input`);
            if (input) input.focus();
        }
        return;
    }

    // 💬 KOMMENT TÖRLÉSE
    const kommentTorles = e.target.closest(".komment-torles");
    if (kommentTorles) {
        const kommentId = kommentTorles.dataset.komment;
        if (confirm("Törlöd ezt a hozzászólást?")) {
            OTLETEK_REF.child(id).child("kommentek").child(kommentId).remove();
            toast("🗑️ Hozzászólás törölve.");
        }
        return;
    }

    // 🗑️ ÖTLET TÖRLÉSE
    if (e.target.closest(".delete-btn")) {
        if (!isAdmin() && !sajatE) {
            toast("🚫 Csak a saját ötletedet törölheted!");
            return;
        }
        if (confirm("Biztosan törlöd ezt az ötletet?")) {
            OTLETEK_REF.child(id).remove();
            toast("🗑️ Az ötlet törölve.");
        }
        return;
    }

    // ✅ MEGVALÓSÍTVA
    if (e.target.closest(".complete-btn")) {
        if (!isAdmin()) {
            toast("🚫 Csak az admin jelölheti megvalósítottnak!");
            return;
        }
        if (otlet) {
            OTLETEK_REF.child(id).update({ kesz: !otlet.kesz });
        }
    }
});

/* ===== 💬 HOZZÁSZÓLÁS KÜLDÉSE ===== */
document.getElementById("ideasGrid").addEventListener("submit", (e) => {
    const form = e.target.closest(".komment-form");
    if (!form) return;
    e.preventDefault();

    const id = form.dataset.id;
    const input = form.querySelector(".komment-input");
    const szoveg = input.value.trim();

    if (!szoveg) return;

    if (!karakterEllenorzes(szoveg)) {
        toast("🚫 Csak magyar betűket, számokat, normál írásjeleket és emojikat használhatsz!");
        return;
    }
    if (vanKaromkodas(szoveg)) {
        toast("🚫 A hozzászólás sértő kifejezést tartalmaz – írd át udvariasan! 🙏");
        return;
    }

    input.value = "";

    OTLETEK_REF.child(id).child("kommentek").push({
        szoveg:   szoveg,
        datum:    new Date().toISOString(),
        szerzoId: sajatSzerzoId()
    });

    nyitottKommentek.add(id);
});

/* ===== STISZTIKA ===== */
function statisztikaFrissitese() {
    document.getElementById("totalIdeas").textContent = otletek.length;
    document.getElementById("completedIdeas").textContent = otletek.filter(o => o.kesz).length;
}

/* ===== SEGÉDFÜGGVÉNYEK ===== */
function biztonsagosSzoveg(szoveg) {
    const div = document.createElement("div");
    div.textContent = szoveg || "";
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
