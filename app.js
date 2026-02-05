// Variable global para el usuario actual
let currentUser = null;

document.addEventListener("DOMContentLoaded", () => {
    // 1. Construir el menú desplegable dinámico (Usando los datos de config.js)
    buildNavMenu();

    // 2. Cargar productos
    if (typeof loadProducts === "function") {
        loadProducts();
    }
    
    // 3. Cerrar el menú desplegable de usuario si haces clic fuera
    window.onclick = function(event) {
        if (!event.target.matches('.avatar-circle')) {
            const dropdown = document.getElementById("user-dropdown");
            if (dropdown && !dropdown.classList.contains('hidden')) {
                dropdown.classList.add('hidden');
            }
        }
    }

    // 4. Escuchar cambios de sesión (Login/Logout)
    if (auth) {
        auth.onAuthStateChanged((user) => {
            if (user) {
                console.log("Usuario conectado: " + user.email);
                
                // Conectar con la base de datos de usuarios
                db.collection("users").doc(user.uid).onSnapshot((doc) => {
                    if (doc.exists) {
                        currentUser = doc.data();
                        currentUser.uid = user.uid;
                        
                        // --- LLAVE MAESTRA (ADMIN SUPREMO) ---
                        // Forzamos que tu email siempre sea admin
                        if(currentUser.email === "pablomoreirocollado@gmail.com") {
                            currentUser.role = "admin";
                        }
                        // -------------------------------------

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

// --- GENERADOR DE MENÚ DINÁMICO ---
function buildNavMenu() {
    const nav = document.getElementById('main-nav');
    if (!nav) return;

    // Botones fijos iniciales
    let html = `
        <button class="nav-link text-gold" onclick="filterEra('new')">
            <i class="fa-solid fa-star"></i> NOVEDADES
        </button>
        <button class="nav-link" onclick="setFilter('era', 'all')">TODO</button>
    `;

    // Generar botones dinámicos basados en ARMY_DATA (de config.js)
    // Recorremos cada ERA (WH40K, AOS, etc.)
    for (const [era, content] of Object.entries(ARMY_DATA)) {
        html += `
            <div class="nav-item-wrapper">
                <button class="nav-link" onclick="setFilter('era', '${era}')">${era}</button>
                
                <div class="nav-dropdown">
                    ${Object.keys(content).map(faction => `
                        <div class="nav-drop-item" onclick="setFilter('faction', '${faction}')">
                            ${faction}
                            
                            <div class="nav-sub-dropdown">
                                ${Array.isArray(content[faction]) ? content[faction].map(sub => `
                                    <div class="nav-drop-item" onclick="event.stopPropagation(); setFilter('subfaction', '${sub}')">
                                        ${sub}
                                    </div>
                                `).join('') : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // Botón fijo final (Soporte)
    html += `<button class="nav-link support-btn" onclick="setView('support')"><i class="fa-solid fa-headset"></i> SOPORTE</button>`;
    
    nav.innerHTML = html;
}

// --- MENÚ DE USUARIO ---
function toggleUserMenu() {
    const dropdown = document.getElementById("user-dropdown");
    dropdown.classList.toggle("hidden");
}

// --- NAVEGACIÓN (VISTAS) ---
function setView(view) {
    // 1. Ocultar todas las secciones
    document.querySelectorAll('.view-section').forEach(e => e.classList.add('hidden'));
    
    // 2. Limpiar botones activos del menú
    document.querySelectorAll('.nav-link').forEach(btn => btn.classList.remove('active'));
    
    // 3. Mostrar la sección deseada
    const target = document.getElementById('view-' + view);
    if(target) target.classList.remove('hidden');

    // 4. Scroll arriba
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // 5. Lógicas específicas
    if (view === 'cart' && typeof renderFullCart === 'function') renderFullCart();
    if (view === 'support') {
        const supBtn = document.querySelector('.support-btn');
        if(supBtn) supBtn.classList.add('active');
    }
}

// --- GESTIÓN VISUAL DE PERFIL ---

function renderGuestMode() {
    currentUser = null;
    document.getElementById('guest-buttons').classList.remove('hidden');
    document.getElementById('user-display').classList.add('hidden');
}

function updateUIProfile() {
    // Interfaz de usuario logueado
    document.getElementById('guest-buttons').classList.add('hidden');
    document.getElementById('user-display').classList.remove('hidden');
    
    // Cargar Avatar
    const avatarSrc = currentUser.avatar || "https://via.placeholder.com/150/000000/FFFFFF?text=USER";
    document.getElementById('header-avatar').src = avatarSrc;
    // Si estamos en la vista de perfil, actualizar esa imagen también
    const bigAvatar = document.getElementById('profile-avatar-big');
    if(bigAvatar) bigAvatar.src = avatarSrc;
    
    // Mostrar Nombre
    const displayName = currentUser.nick || currentUser.name || currentUser.email.split('@')[0];
    document.getElementById('dropdown-username').textContent = displayName.toUpperCase();

    // Rellenar campos del formulario de perfil automáticamente
    if (document.getElementById('prof-nick')) {
        document.getElementById('prof-nick').value = currentUser.nick || "";
        document.getElementById('prof-name').value = currentUser.name || "";
        document.getElementById('prof-surname').value = currentUser.surname || "";
        document.getElementById('prof-address').value = currentUser.address || "";
    }

    // Mostrar enlace de Admin si corresponde
    if (currentUser.role === 'admin') {
        document.getElementById('admin-link').classList.remove('hidden');
    } else {
        document.getElementById('admin-link').classList.add('hidden');
    }
    
    renderHistory();
}

// Renderizar historial de pedidos
function renderHistory() {
    const tbody = document.getElementById('history-body');
    if(!tbody) return;

    if(!currentUser || !currentUser.orders || currentUser.orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:10px;">Sin historial de combate.</td></tr>';
        return;
    }
    
    // Ordenar pedidos (el más reciente primero)
    const orders = [...currentUser.orders].reverse();

    tbody.innerHTML = orders.map(o => `
        <tr>
            <td class="text-gold font-bold">${o.code}</td>
            <td>${o.total}€</td>
            <td><span style="color:${o.status.includes('PENDING') ? 'orange' : 'var(--tech-green)'}">${o.status}</span></td>
        </tr>
    `).join('');
}

// --- SEGURIDAD DE NAVEGACIÓN ---
function checkAuthAndRedirect(view) {
    if (!currentUser) {
        alert("🔒 ACCESO DENEGADO. Debes iniciar sesión.");
        openLogin('login');
    } else {
        // Cerrar menú antes de ir
        document.getElementById("user-dropdown").classList.add("hidden");
        setView(view);
    }
}

// --- SISTEMA DE SOPORTE (EMAIL JS) ---
function sendSupportEmail() {
    const name = document.getElementById('sup-name').value;
    const email = document.getElementById('sup-email').value;
    const msg = document.getElementById('sup-msg').value;

    if (!name || !email || !msg) return alert("❌ Por favor, rellena todos los campos.");

    // TUS IDs ACTUALIZADOS
    const serviceID = "SERVICIO TIENDA"; 
    const templateID = "template_24sqhrl";

    const templateParams = {
        from_name: name,
        user_email: email,
        message: msg
    };

    emailjs.send(serviceID, templateID, templateParams)
        .then(() => {
            alert("✅ MENSAJE ENVIADO AL ADMINISTRATUM.\nContactaremos contigo pronto.");
            document.getElementById('sup-msg').value = "";
        })
        .catch((err) => {
            console.error("Error EmailJS:", err);
            alert("❌ Error al enviar. Por favor, contacta por WhatsApp.");
        });
}

function resendVerification() {
    if(auth.currentUser) {
        auth.currentUser.sendEmailVerification()
        .then(() => alert("✅ Correo de verificación reenviado."))
        .catch((e) => alert("Error: " + e.message));
    }
}