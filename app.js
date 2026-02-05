// Variable global para el usuario actual
let currentUser = null;

document.addEventListener("DOMContentLoaded", () => {
    buildNavMenu();
    if (typeof loadProducts === "function") loadProducts();
    
    window.onclick = function(event) {
        if (!event.target.matches('.avatar-circle')) {
            const dropdown = document.getElementById("user-dropdown");
            if (dropdown && !dropdown.classList.contains('hidden')) {
                dropdown.classList.add('hidden');
            }
        }
    }

    if (auth) {
        auth.onAuthStateChanged((user) => {
            if (user) {
                console.log("Usuario conectado: " + user.email);
                db.collection("users").doc(user.uid).onSnapshot((doc) => {
                    if (doc.exists) {
                        currentUser = doc.data();
                        currentUser.uid = user.uid;
                        if(currentUser.email === "pablomoreirocollado@gmail.com") currentUser.role = "admin";
                        updateUIProfile();
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
    document.getElementById('guest-buttons').classList.add('hidden');
    document.getElementById('user-display').classList.remove('hidden');
    
    const avatarSrc = currentUser.avatar || "https://via.placeholder.com/150/000000/FFFFFF?text=USER";
    document.getElementById('header-avatar').src = avatarSrc;
    const bigAvatar = document.getElementById('profile-avatar-big');
    if(bigAvatar) bigAvatar.src = avatarSrc;
    
    const displayName = currentUser.nick || currentUser.name || currentUser.email.split('@')[0];
    document.getElementById('dropdown-username').textContent = displayName.toUpperCase();

    // RELLENAR CAMPOS DEL PERFIL (NUEVOS CAMPOS)
    if (document.getElementById('prof-nick')) {
        document.getElementById('prof-nick').value = currentUser.nick || "";
        document.getElementById('prof-name').value = currentUser.name || "";
        document.getElementById('prof-surname').value = currentUser.surname || "";
        document.getElementById('prof-phone').value = currentUser.phone || "";
        
        // Dirección Desglosada
        const addr = currentUser.fullAddress || {};
        document.getElementById('prof-street').value = addr.street || "";
        document.getElementById('prof-city').value = addr.city || "";
        document.getElementById('prof-zip').value = addr.zip || "";
        document.getElementById('prof-province').value = addr.province || "";
        
        // Compatibilidad hacia atrás (si solo tenía el campo antiguo)
        if (!addr.street && currentUser.address) {
            document.getElementById('prof-street').value = currentUser.address;
        }
    }

    if (currentUser.role === 'admin') document.getElementById('admin-link').classList.remove('hidden');
    else document.getElementById('admin-link').classList.add('hidden');
    
    renderHistory();
}

// GUARDAR PERFIL (ACTUALIZADO)
function saveProfile() {
    if(!currentUser) return;
    
    const nick = document.getElementById('prof-nick').value;
    const name = document.getElementById('prof-name').value;
    const surname = document.getElementById('prof-surname').value;
    const phone = document.getElementById('prof-phone').value;
    
    // Objeto Dirección Completa
    const fullAddress = {
        street: document.getElementById('prof-street').value,
        city: document.getElementById('prof-city').value,
        zip: document.getElementById('prof-zip').value,
        province: document.getElementById('prof-province').value
    };

    // Dirección formateada para envíos rápidos
    const formattedAddress = `${fullAddress.street}, ${fullAddress.zip} ${fullAddress.city} (${fullAddress.province})`;

    const file = document.getElementById('profile-img-upload').files[0];
    const btn = document.querySelector("button[onclick='saveProfile()']");
    const txtOrig = btn.innerText;
    btn.innerText = "PROCESANDO..."; btn.disabled = true;

    const updateDB = (avatarUrl) => {
        db.collection("users").doc(currentUser.uid).update({ 
            avatar: avatarUrl, name, surname, phone, nick,
            fullAddress: fullAddress, // Guardamos objeto
            address: formattedAddress // Guardamos string para compatibilidad
        }).then(() => {
            alert("✅ FICHA ACTUALIZADA");
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
        .catch(e => { alert("Error subida: " + e.message); btn.disabled = false; btn.innerText = txtOrig; });
    } else {
        updateDB(currentUser.avatar);
    }
}

// CAMBIAR CONTRASEÑA
function changeUserPassword() {
    const newPass = document.getElementById('prof-new-pass').value;
    if (newPass.length < 6) return alert("❌ La contraseña debe tener al menos 6 caracteres.");
    
    const user = auth.currentUser;
    user.updatePassword(newPass).then(() => {
        alert("✅ Contraseña actualizada. Por favor, vuelve a iniciar sesión.");
        logout();
    }).catch((error) => {
        alert("❌ Error: " + error.message + "\n(Es posible que debas salir y volver a entrar para hacer esto).");
    });
}

// BORRAR CUENTA (DARSE DE BAJA)
function deleteUserAccount() {
    if (!confirm("⚠️ ¿ESTÁS SEGURO?\n\nEsta acción borrará tu cuenta, tu historial y tus datos permanentemente.\n\nNo se puede deshacer.")) return;
    
    const user = auth.currentUser;
    const uid = user.uid;

    // 1. Borrar datos de Firestore
    db.collection("users").doc(uid).delete().then(() => {
        // 2. Borrar usuario de autenticación
        user.delete().then(() => {
            alert("Cuenta eliminada. Hasta siempre, soldado.");
            window.location.reload();
        }).catch((error) => {
            alert("Error al borrar usuario: " + error.message + "\n(Intenta cerrar sesión y volver a entrar).");
        });
    }).catch((error) => {
        alert("Error al borrar datos: " + error.message);
    });
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

// Menú Nav (Copia del anterior)
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
