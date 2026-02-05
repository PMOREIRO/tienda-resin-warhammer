/* --- ADMIN JS --- */

// 1. ARRANCAR AL INICIO (IMPORTANTE: Esto arregla que salgan vacíos)
document.addEventListener("DOMContentLoaded", () => {
    // Intentar cargar selectores inmediatamente
    setTimeout(initAdminSelects, 500); 
    // Por si acaso, volver a intentar a los 2 segundos (seguridad)
    setTimeout(initAdminSelects, 2000);
});

// 2. INICIALIZAR SELECTOR DE ERA
function initAdminSelects() {
    const eraSelect = document.getElementById('new-era');
    
    // Si no existe el elemento o ya tiene datos, paramos
    if (!eraSelect || eraSelect.options.length > 1) return;
    
    console.log("Iniciando selectores de Admin...");
    eraSelect.innerHTML = '<option value="">-- SELECCIONAR ERA --</option>';
    
    // Verificar si ARMY_DATA (de config.js) está cargado
    if (typeof ARMY_DATA !== 'undefined') {
        for (const era in ARMY_DATA) {
            eraSelect.innerHTML += `<option value="${era}">${era}</option>`;
        }
    } else {
        console.error("ERROR: ARMY_DATA no cargado. Revisa config.js");
        eraSelect.innerHTML = '<option value="">Error de Configuración</option>';
    }
}

// 3. CASCADA: AL ELEGIR ERA -> CARGAR FACCIONES
function updateFactionSelect() {
    const era = document.getElementById('new-era').value;
    const fs = document.getElementById('new-faction');
    const ss = document.getElementById('new-subfaction');
    
    fs.innerHTML = '<option value="">-- SELECCIONAR --</option>';
    ss.innerHTML = ''; 
    ss.disabled = true;

    if (era && ARMY_DATA[era]) {
        fs.disabled = false;
        Object.keys(ARMY_DATA[era]).forEach(f => {
            fs.innerHTML += `<option value="${f}">${f}</option>`;
        });
    } else {
        fs.disabled = true;
    }
}

// 4. CASCADA: AL ELEGIR FACCIÓN -> CARGAR EJÉRCITOS
function updateSubFactionSelect() {
    const era = document.getElementById('new-era').value;
    const fac = document.getElementById('new-faction').value;
    const ss = document.getElementById('new-subfaction');
    
    ss.innerHTML = '<option value="">-- SELECCIONAR --</option>';

    if (era && fac && ARMY_DATA[era][fac]) {
        ss.disabled = false;
        if (Array.isArray(ARMY_DATA[era][fac])) {
            ARMY_DATA[era][fac].forEach(a => {
                ss.innerHTML += `<option value="${a}">${a}</option>`;
            });
        } else {
            ss.innerHTML = '<option value="">N/A</option>';
            ss.disabled = true; // No hay subfacciones
        }
    } else {
        ss.disabled = true;
    }
}

// 5. SUBIDA DE PRODUCTO (CON VALIDACIÓN MEJORADA)
async function adminUpload() {
    const name = document.getElementById('new-name').value;
    const price = parseFloat(document.getElementById('new-price').value);
    const stock = parseInt(document.getElementById('new-stock').value) || 0;
    
    // Recogemos valores, si están vacíos ponemos null
    const era = document.getElementById('new-era').value || "Otros";
    const faction = document.getElementById('new-faction').value || "General";
    const subfaction = document.getElementById('new-subfaction').value || "";
    
    const desc = document.getElementById('new-desc').value;
    const fileInput = document.getElementById('new-img-file');
    const files = fileInput.files;

    // Validaciones básicas
    if (!name || !price) return alert("❌ Faltan datos: Nombre y Precio son obligatorios.");
    if (files.length === 0) return alert("❌ Debes subir al menos una imagen.");

    const btn = document.querySelector("button[onclick='adminUpload()']");
    const txtOrig = btn.innerText;
    btn.innerText = "SUBIENDO... ☁️";
    btn.disabled = true;

    try {
        // Subir fotos a Cloudinary
        const uploadPromises = Array.from(files).map(file => {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("upload_preset", "warhamerchop");
            return fetch(`https://api.cloudinary.com/v1_1/disfeeqe8/image/upload`, {
                method: "POST", body: formData
            }).then(r => r.json());
        });

        const results = await Promise.all(uploadPromises);
        const imageUrls = results.map(data => data.secure_url);

        btn.innerText = "GUARDANDO... 💾";
        
        // Guardar en Firestore
        await db.collection("products").add({ 
            name, price, stock, description: desc,
            era, faction, subfaction, 
            img: imageUrls, 
            createdAt: Date.now()
        });

        alert("✅ PRODUCTO REGISTRADO CORRECTAMENTE");
        
        // Limpiar formulario
        document.getElementById('new-name').value = "";
        document.getElementById('new-price').value = "";
        document.getElementById('new-stock').value = "";
        document.getElementById('new-desc').value = "";
        fileInput.value = "";
        document.getElementById('label-new-img').innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> SELECCIONAR FOTOS';

    } catch (e) {
        console.error(e);
        alert("Error: " + e.message);
    } finally {
        btn.innerText = txtOrig; btn.disabled = false;
    }
}

// 6. CONTROL DE PESTAÑAS (SWITCHER)
function switchAdminTab(tab) {
    // Resetear botones
    document.querySelectorAll('.admin-tab').forEach(b => b.classList.remove('active'));
    const activeBtn = document.getElementById('btn-adm-' + tab);
    if(activeBtn) activeBtn.classList.add('active');
    
    // Ocultar todas las vistas
    document.getElementById('admin-view-add').classList.add('hidden');
    document.getElementById('admin-view-delete').classList.add('hidden');
    document.getElementById('admin-view-orders').classList.add('hidden');
    
    // Mostrar la elegida
    if(tab === 'add') {
        document.getElementById('admin-view-add').classList.remove('hidden');
        initAdminSelects(); // Asegurar que los desplegables carguen
    } else if (tab === 'delete') {
        document.getElementById('admin-view-delete').classList.remove('hidden');
        renderDeleteList(); // Cargar la lista de gestión
    } else if (tab === 'orders') {
        document.getElementById('admin-view-orders').classList.remove('hidden');
        loadAllOrders(); // Cargar pedidos
    }
}

// 7. RENDERIZAR LISTA DE GESTIÓN (ORGANIZADA POR ERA > FACCIÓN)
function renderDeleteList() {
    const container = document.getElementById('admin-delete-list');
    container.innerHTML = "<p style='color:#gold;'>Cargando base de datos...</p>";

    db.collection("products").get().then(snap => {
        const items = [];
        snap.forEach(doc => items.push({id: doc.id, ...doc.data()}));
        
        if(items.length === 0) { 
            container.innerHTML = "<p>El inventario está vacío.</p>"; 
            return; 
        }

        // Agrupar productos
        const tree = {};
        items.forEach(p => {
            const e = p.era || "Sin Clasificar";
            const f = p.faction || "Varios";
            if(!tree[e]) tree[e] = {};
            if(!tree[e][f]) tree[e][f] = [];
            tree[e][f].push(p);
        });

        let html = "";
        
        // Construir HTML del Acordeón
        for (const [eraName, factions] of Object.entries(tree)) {
            // Cabecera de ERA (Click para abrir)
            html += `
            <div class="manage-era-block" style="border:1px solid #333; margin-bottom:10px;">
                <div class="manage-era-header" 
                     onclick="this.nextElementSibling.classList.toggle('hidden')"
                     style="background:#000; padding:15px; cursor:pointer; display:flex; justify-content:space-between; align-items:center; color:var(--gold-main); font-weight:bold;">
                    <span>${eraName}</span> 
                    <i class="fa-solid fa-chevron-down"></i>
                </div>
                
                <div class="manage-content hidden" style="background:#111; padding:10px;">
            `;
            
            for (const [factionName, prodList] of Object.entries(factions)) {
                // Cabecera de FACCIÓN
                html += `
                    <div style="margin-bottom:5px;">
                        <div style="background:#222; padding:8px; color:#ccc; font-weight:bold; border-left:3px solid var(--gold-main); margin-bottom:5px;">
                            ${factionName} (${prodList.length})
                        </div>
                        <div style="padding-left:10px;">
                `;
                
                // Lista de PRODUCTOS
                html += prodList.map(p => {
                    const img = Array.isArray(p.img) ? p.img[0] : (p.img || "https://via.placeholder.com/40");
                    return `
                        <div class="delete-item" style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #333; padding:8px 0;">
                            <div style="display:flex; align-items:center;">
                                <img src="${img}" style="width:40px; height:40px; object-fit:cover; margin-right:10px; border:1px solid #444;">
                                <div>
                                    <div style="color:#fff; font-weight:bold;">${p.name}</div>
                                    <div style="font-size:0.8rem; color:#666;">Stock: ${p.stock} | ${p.subfaction || ''}</div>
                                </div>
                            </div>
                            <button onclick="deleteProduct('${p.id}')" class="text-red btn-text" style="font-size:1.2rem;">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    `;
                }).join('');
                
                html += `</div></div>`; // Cerrar Facción
            }
            html += `</div></div>`; // Cerrar Era
        }
        
        container.innerHTML = html;
    });
}

// 8. BORRAR PRODUCTO
function deleteProduct(id) {
    if(confirm("⚠️ ¿CONFIRMAR ELIMINACIÓN?\nEsta acción es irreversible.")) {
        db.collection("products").doc(id).delete()
            .then(() => {
                alert("Activo eliminado.");
                renderDeleteList(); // Refrescar lista
            })
            .catch(err => alert("Error: " + err.message));
    }
}

// 9. GESTIÓN DE PEDIDOS GLOBAL
async function loadAllOrders() {
    const container = document.getElementById('admin-orders-list');
    container.innerHTML = "<p>Buscando transmisiones de pedidos...</p>";

    try {
        const snapshot = await db.collection("users").get();
        let allOrders = [];

        snapshot.forEach(doc => {
            const userData = doc.data();
            if (userData.orders && userData.orders.length > 0) {
                userData.orders.forEach((order, index) => {
                    allOrders.push({ 
                        ...order, 
                        userId: doc.id, 
                        userEmail: userData.email, 
                        orderIndex: index 
                    });
                });
            }
        });

        // Más nuevos primero
        allOrders.reverse();

        if (allOrders.length === 0) { 
            container.innerHTML = "<p>No hay pedidos pendientes en el sistema.</p>"; 
            return; 
        }

        container.innerHTML = allOrders.map(o => `
            <div class="admin-order-card" style="background:#111; border:1px solid var(--gold-dim); padding:15px; margin-bottom:15px;">
                <div style="display:flex; justify-content:space-between; border-bottom:1px solid #333; padding-bottom:10px; margin-bottom:10px;">
                    <span class="text-gold" style="font-weight:bold;">PEDIDO #${o.code}</span>
                    <span style="color:#888;">${o.date}</span>
                </div>
                <div style="color:#ccc; font-size:0.9rem; margin-bottom:10px;">
                    <div>Cliente: ${o.userEmail}</div>
                    <div style="margin-top:5px; padding-left:10px; border-left:2px solid #333;">
                        ${o.items.map(i => `<div>• ${i.qty}x ${i.name}</div>`).join('')}
                    </div>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px; padding-top:10px; border-top:1px solid #333;">
                    <span class="text-gold" style="font-size:1.2rem; font-weight:bold;">${o.total}€</span>
                    <select onchange="updateOrderStatus('${o.userId}', ${o.orderIndex}, this.value)" 
                            style="background:#000; color:#fff; border:1px solid #666; padding:5px;">
                        <option value="PENDING (BIZUM)" ${o.status.includes('PENDING')?'selected':''}>PENDIENTE PAGO</option>
                        <option value="PAGO RECIBIDO" ${o.status.includes('RECIBIDO')?'selected':''}>PAGADO</option>
                        <option value="EN PROCESO" ${o.status.includes('PROCESO')?'selected':''}>EN PROCESO</option>
                        <option value="ENVIADO" ${o.status.includes('ENVIADO')?'selected':''}>ENVIADO 🚚</option>
                        <option value="CANCELADO" ${o.status.includes('CANCELADO')?'selected':''}>CANCELADO ❌</option>
                    </select>
                </div>
            </div>
        `).join('');

    } catch (e) { 
        container.innerHTML = "<p style='color:red'>Error cargando pedidos: " + e.message + "</p>"; 
    }
}

async function updateOrderStatus(userId, orderIndex, newStatus) {
    try {
        const userRef = db.collection("users").doc(userId);
        await db.runTransaction(async (transaction) => {
            const doc = await transaction.get(userRef);
            if (!doc.exists) throw "Usuario no existe";
            
            const userData = doc.data();
            const orders = userData.orders;
            
            if (orders[orderIndex]) {
                orders[orderIndex].status = newStatus;
                transaction.update(userRef, { orders: orders });
            }
        });
        alert("✅ ESTADO ACTUALIZADO");
    } catch (e) { 
        alert("❌ Error: " + e.message); 
    }
}
