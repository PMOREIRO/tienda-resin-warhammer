// Variable global para el usuario actual
let currentUser = null;

document.addEventListener("DOMContentLoaded", () => {
    // 1. Construir menú y cargar productos
    buildNavMenu();
    if (typeof loadProducts === "function") loadProducts();
    
    // 2. Cerrar menús al hacer clic fuera
    window.onclick = function(event) {
        if (!event.target.matches('.avatar-circle')) {
            const dropdown = document.getElementById("user-dropdown");
            if (dropdown && !dropdown.classList.contains('hidden')) {
                dropdown.classList.add('hidden');
            }
        }
    }

    // 3. DETECTOR DE SESIÓN (AQUÍ ESTÁ LA CORRECCIÓN)
    if (auth) {
        auth.onAuthStateChanged((user) => {
            if (user) {
                console.log("Conectado como: " + user.email);
                
                db.collection("users").doc(user.uid).onSnapshot((doc) => {
                    if (doc.exists) {
                        currentUser = doc.data();
                        currentUser.uid = user.uid;
                        currentUser.email = user.email; // Aseguramos que el email viene del Auth
                        
                        // --- LLAVE MAESTRA (ADMIN SUPREMO) ---
                        // Verificamos directamente el email de la sesión (user.email)
                        // NO SOLO el de la base de datos
                        if(user.email === "pablomoreirocollado@gmail.com") {
                            console.log("/// ACCESO ADMIN CONCEDIDO ///");
                            currentUser.role = "admin";
                        }
                        // -------------------------------------

                        updateUIProfile();
                    } else {
                        // Si el usuario existe en Auth pero no en DB (caso raro), lo creamos
                        db.collection("users").doc(user.uid).set({
                            email: user.email,
                            role: (user.email === "pablomoreirocollado@gmail.com") ? "admin" : "user",
                            orders: []
                        });
                    }
                });
            } else {
                console.log("Modo Invitado");
                renderGuestMode();
            }
        });
    }
});

// --- UI Y PERFIL ---

function renderGuestMode() {
    currentUser = null;
    document.getElementById('guest-buttons').classList.remove('hidden');
    document.getElementById('user-display').classList.add('hidden');
}

function updateUIProfile() {
    // 1. Ocultar botones de invitado
    document.getElementById('guest-buttons').classList.add('hidden');
    document.getElementById('user-display').classList.remove('hidden');
    
    // 2. Cargar Avatar
    const avatarSrc = currentUser.avatar || "https://via.placeholder.com/150/000000/FFFFFF?text=USER";
    document.getElementById('header-avatar').src = avatarSrc;
    const bigAvatar = document.getElementById('profile-avatar-big');
    if(bigAvatar) bigAvatar.src = avatarSrc;
    
    // 3. Nombre
    const displayName = currentUser.nick || currentUser.name || currentUser.email.split('@')[0];
    document.getElementById('dropdown-username').textContent = displayName.toUpperCase();

    // 4. RELLENAR FORMULARIO PERFIL
    if (document.getElementById('prof-nick')) {
        document.getElementById('prof-nick').value = currentUser.nick || "";
        document.getElementById('prof-name').value = currentUser.name || "";
        document.getElementById('prof-surname').value = currentUser.surname || "";
        document.getElementById('prof-phone').value = currentUser.phone || "";
        
        // Dirección nueva
        const addr = currentUser.fullAddress || {};
        document.getElementById('prof-street').value = addr.street || "";
        document.getElementById('prof-city').value = addr.city || "";
        document.getElementById('prof-zip').value = addr.zip || "";
        document.getElementById('prof-province').value = addr.province || "";
        
        // Compatibilidad vieja
        if (!addr.street && currentUser.address) {
            document.getElementById('prof-street').value = currentUser.address;
        }
    }

    // 5. MOSTRAR BOTÓN DE ADMIN (CRÍTICO)
    const adminLink = document.getElementById('admin-link');
    if (currentUser.role === 'admin') {
        adminLink.classList.remove('hidden');
    } else {
        adminLink.classList.add('hidden');
    }
    
    renderHistory();
}

// GUARDAR PERFIL
function saveProfile() {
    if(!currentUser) return;
    
    const nick = document.getElementById('prof-nick').value;
    const name = document.getElementById('prof-name').value;
    const surname = document.getElementById('prof-surname').value;
    const phone = document.getElementById('prof-phone').value;
    
    // Objeto dirección completo
    const fullAddress = {
        street: document.getElementById('prof-street').value,
        city: document.getElementById('prof-city').value,
        zip: document.getElementById('prof-zip').value,
        province: document.getElementById('prof-province').value
    };
    const formattedAddress = `${fullAddress.street}, ${fullAddress.zip} ${fullAddress.city}`;

    const file = document.getElementById('profile-img-upload').files[0];
    const btn = document.querySelector("button[onclick='saveProfile()']");
    const txtOrig = btn.innerText;
    btn.innerText = "PROCESANDO..."; btn.disabled = true;

    const updateDB = (avatarUrl) => {
        db.collection("users").doc(currentUser.uid).update({ 
            avatar: avatarUrl, name, surname, phone, nick,
            fullAddress: fullAddress,
            address: formattedAddress
        }).then(() => {
            alert("✅ DATOS GUARDADOS");
        }).catch(e => alert("Error: "+e.message))
        .finally(() => { btn.innerText = txtOrig; btn.disabled = false; });
    };

    if (file) {
        btn.innerText = "SUBIENDO FOTO...";
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", "warhamerchop");
        fetch(`https://api.cloudinary.com/v1_1/disfeeqe8/image/upload`, { method: "POST", body: formData })
        .then(r => r.json())
        .then(data => { if(data.secure_url) updateDB(data.secure_url); else throw new Error("Error foto"); })
        .catch(e => { alert("Error: " + e.message); btn.disabled = false; btn.innerText = txtOrig; });
    } else {
        updateDB(currentUser.avatar);
    }
}

// CAMBIAR CONTRASEÑA
function changeUserPassword() {
    const newPass = document.getElementById('prof-new-pass').value;
    if (newPass.length < 6) return alert("❌ Mínimo 6 caracteres.");
    
    const user = auth.currentUser;
    user.updatePassword(newPass).then(() => {
        alert("✅ Contraseña cambiada. Inicia sesión de nuevo.");
        logout();
    }).catch((error) => {
        alert("❌ Error: " + error.message + "\n(Prueba a salir y volver a entrar).");
    });
}

// BORRAR CUENTA
function deleteUserAccount() {
    if (!confirm("⚠️ ¿ESTÁS SEGURO?\nSe borrarán todos tus datos y pedidos.")) return;
    
    const user = auth.currentUser;
    db.collection("users").doc(user.uid).delete().then(() => {
        user.delete().then(() => {
            alert("Cuenta eliminada.");
            window.location.reload();
        }).catch((e) => alert("Error al borrar usuario: " + e.message));
    }).catch((e) => alert("Error DB: " + e.message));
}

// --- UTILIDADES ---
function toggleUserMenu() { document.getElementById("user-dropdown").classList.toggle("hidden"); }

function setView(view) {
    document.querySelectorAll('.view-section').forEach(e => e.classList.add('hidden'));
    document.querySelectorAll('.nav-link').forEach(btn => btn.classList.remove('active'));
    const target = document.getElementById('view-' + view);
    if(target) target.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (view === 'cart' && typeof renderFullCart === 'function') renderFullCart();
}

function renderHistory() {
    const tbody = document.getElementById('history-body');
    if(!tbody) return;
    if(!currentUser || !currentUser.orders || currentUser.orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:10px;">Sin historial.</td></tr>';
        return;
    }
    const orders = [...currentUser.orders].reverse();
    tbody.innerHTML = orders.map(o => `
        <tr>
            <td class="text-gold font-bold">${o.code}</td>
            <td>${o.total}€</td>
            <td><span style="color:${o.status.includes('PENDING') ? 'orange' : o.status.includes('CANCELADO') ? 'red' : 'var(--tech-green)'}">${o.status}</span></td>
        </tr>
    `).join('');
}

function checkAuthAndRedirect(view) {
    if (!currentUser) { alert("🔒 ACCESO DENEGADO."); openLogin('login'); }
    else { document.getElementById("user-dropdown").classList.add("hidden"); setView(view); }
}

function sendSupportEmail() {
    const n = document.getElementById('sup-name').value, e = document.getElementById('sup-email').value, m = document.getElementById('sup-msg').value;
    if (!n || !e || !m) return alert("❌ Rellena todo.");
    emailjs.send("SERVICIO TIENDA", "template_24sqhrl", { from_name: n, user_email: e, message: m })
        .then(() => { alert("✅ MENSAJE ENVIADO."); document.getElementById('sup-msg').value = ""; })
        .catch(() => alert("❌ Error al enviar."));
}

function buildNavMenu() {
    const nav = document.getElementById('main-nav');
    if (!nav) return;
    let html = `<button class="nav-link text-gold" onclick="filterEra('new')"><i class="fa-solid fa-star"></i> NOVEDADES</button><button class="nav-link" onclick="setFilter('era', 'all')">TODO</button>`;
    if (typeof ARMY_DATA !== 'undefined') {
        for (const [era, content] of Object.entries(ARMY_DATA)) {
            html += `<div class="nav-item-wrapper"><button class="nav-link" onclick="setFilter('era', '${era}')">${era}</button><div class="nav-dropdown">`;
            html += Object.keys(content).map(f => `<div class="nav-drop-item" onclick="setFilter('faction', '${f}')">${f}<div class="nav-sub-dropdown">${Array.isArray(content[f]) ? content[f].map(s => `<div class="nav-drop-item" onclick="event.stopPropagation(); setFilter('subfaction', '${s}')">${s}</div>`).join('') : ''}</div></div>`).join('');
            html += `</div></div>`;
        }
    }
    html += `<button class="nav-link support-btn" onclick="setView('support')"><i class="fa-solid fa-headset"></i> SOPORTE</button>`;
    nav.innerHTML = html;
}
