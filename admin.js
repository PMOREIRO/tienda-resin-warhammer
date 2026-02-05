// --- ADMIN JS ---

function initAdminSelects() {
    const eraSelect = document.getElementById('new-era');
    if (!eraSelect) return;
    eraSelect.innerHTML = '<option value="">-- SELECCIONAR ERA --</option>';
    if (typeof ARMY_DATA !== 'undefined') {
        for (const era in ARMY_DATA) eraSelect.innerHTML += `<option value="${era}">${era}</option>`;
    }
}

function updateFactionSelect() {
    const era = document.getElementById('new-era').value;
    const fs = document.getElementById('new-faction');
    const ss = document.getElementById('new-subfaction');
    fs.innerHTML = '<option value="">-- SELECCIONAR --</option>';
    ss.innerHTML = ''; ss.disabled = true;
    if (era && ARMY_DATA[era]) {
        fs.disabled = false;
        Object.keys(ARMY_DATA[era]).forEach(f => fs.innerHTML += `<option value="${f}">${f}</option>`);
    } else fs.disabled = true;
}

function updateSubFactionSelect() {
    const era = document.getElementById('new-era').value;
    const fac = document.getElementById('new-faction').value;
    const ss = document.getElementById('new-subfaction');
    ss.innerHTML = '<option value="">-- SELECCIONAR --</option>';
    if (era && fac && ARMY_DATA[era][fac]) {
        ss.disabled = false;
        ARMY_DATA[era][fac].forEach(a => ss.innerHTML += `<option value="${a}">${a}</option>`);
    } else ss.disabled = true;
}

// SUBIDA MÚLTIPLE DE IMÁGENES
async function adminUpload() {
    const name = document.getElementById('new-name').value;
    const price = parseFloat(document.getElementById('new-price').value);
    const stock = parseInt(document.getElementById('new-stock').value) || 0;
    const era = document.getElementById('new-era').value;
    const faction = document.getElementById('new-faction').value;
    const subfaction = document.getElementById('new-subfaction').value;
    const desc = document.getElementById('new-desc').value;
    const fileInput = document.getElementById('new-img-file');
    const files = fileInput.files;

    if (!name || !price || !era) return alert("❌ Faltan datos.");
    if (files.length === 0) return alert("❌ Falta imagen.");

    const btn = document.querySelector("button[onclick='adminUpload()']");
    const txtOrig = btn.innerText;
    btn.innerText = "SUBIENDO IMÁGENES... ☁️";
    btn.disabled = true;

    try {
        // Subir todas las fotos a Cloudinary una por una
        const uploadPromises = Array.from(files).map(file => {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("upload_preset", "warhamerchop");
            return fetch(`https://api.cloudinary.com/v1_1/disfeeqe8/image/upload`, {
                method: "POST", body: formData
            }).then(r => r.json());
        });

        const results = await Promise.all(uploadPromises);
        const imageUrls = results.map(data => data.secure_url); // Array de links

        btn.innerText = "GUARDANDO... 💾";
        
        // Guardar en Firebase (img ahora puede ser un array)
        await db.collection("products").add({ 
            name, price, stock, description: desc,
            era, faction, subfaction, 
            img: imageUrls, // Guardamos todas
            createdAt: Date.now()
        });

        alert("✅ PRODUCTO REGISTRADO.");
        document.getElementById('new-name').value = "";
        document.getElementById('new-price').value = "";
        document.getElementById('new-stock').value = "";
        document.getElementById('new-desc').value = "";
        fileInput.value = "";
        document.getElementById('label-new-img').innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> SELECCIONAR FOTOS';

    } catch (e) {
        alert("Error: " + e.message);
    } finally {
        btn.innerText = txtOrig; btn.disabled = false;
    }
}

// CONTROL PESTAÑAS
function switchAdminTab(tab) {
    document.querySelectorAll('.admin-tab').forEach(b => b.classList.remove('active'));
    document.getElementById('btn-adm-' + tab).classList.add('active');
    
    document.getElementById('admin-view-add').classList.add('hidden');
    document.getElementById('admin-view-delete').classList.add('hidden');
    document.getElementById('admin-view-orders').classList.add('hidden');
    
    if(tab === 'add') {
        document.getElementById('admin-view-add').classList.remove('hidden');
        initAdminSelects();
    } else if (tab === 'delete') {
        document.getElementById('admin-view-delete').classList.remove('hidden');
        renderDeleteList();
    } else if (tab === 'orders') {
        document.getElementById('admin-view-orders').classList.remove('hidden');
        loadAllOrders(); // Cargar pedidos
    }
}

function renderDeleteList() {
    const container = document.getElementById('admin-delete-list');
    container.innerHTML = "<p>Cargando...</p>";
    db.collection("products").get().then(snap => {
        const items = [];
        snap.forEach(doc => items.push({id: doc.id, ...doc.data()}));
        
        if(items.length===0) { container.innerHTML="<p>Vacío.</p>"; return; }

        const tree = {};
        items.forEach(p => {
            const e = p.era||"Otros"; const f = p.faction||"General";
            if(!tree[e]) tree[e]={}; if(!tree[e][f]) tree[e][f]=[];
            tree[e][f].push(p);
        });

        let html = "";
        for (const [eName, facs] of Object.entries(tree)) {
            html += `<div class="manage-era-block"><div class="manage-era-header" onclick="this.nextElementSibling.classList.toggle('open')"><span>${eName}</span> <i class="fa-solid fa-chevron-down"></i></div><div class="manage-content">`;
            for (const [fName, prods] of Object.entries(facs)) {
                html += `<div class="manage-faction-header" onclick="this.nextElementSibling.classList.toggle('open')">${fName} (${prods.length})</div><div class="manage-faction-content">`;
                html += prods.map(p => {
                    // Mostrar primera imagen si hay array
                    const img = Array.isArray(p.img) ? p.img[0] : p.img; 
                    return `<div class="delete-item"><div style="display:flex;align-items:center;"><img src="${img}" style="width:40px;height:40px;margin-right:10px;"><div><b>${p.name}</b><br><span style="font-size:0.8rem;color:#666;">Stock: ${p.stock}</span></div></div><button onclick="deleteProduct('${p.id}')" class="text-red btn-text"><i class="fa-solid fa-trash"></i></button></div>`;
                }).join('');
                html += `</div>`;
            }
            html += `</div></div>`;
        }
        container.innerHTML = html;
    });
}

function deleteProduct(id) {
    if(confirm("¿Eliminar?")) db.collection("products").doc(id).delete().then(()=>renderDeleteList());
}

// --- GESTIÓN DE PEDIDOS GLOBAL ---
async function loadAllOrders() {
    const container = document.getElementById('admin-orders-list');
    container.innerHTML = "<p>Rastreando pedidos en la galaxia...</p>";

    try {
        const snapshot = await db.collection("users").get();
        let allOrders = [];

        snapshot.forEach(doc => {
            const userData = doc.data();
            if (userData.orders && userData.orders.length > 0) {
                userData.orders.forEach((order, index) => {
                    // Añadimos datos extra para poder localizarlo luego
                    allOrders.push({
                        ...order,
                        userId: doc.id,
                        userEmail: userData.email,
                        orderIndex: index // Posición en el array del usuario
                    });
                });
            }
        });

        // Ordenar: Más nuevos primero (la fecha suele ser string, cuidado, idealmente usar timestamps)
        allOrders.reverse();

        if (allOrders.length === 0) {
            container.innerHTML = "<p>No hay pedidos pendientes.</p>";
            return;
        }

        container.innerHTML = allOrders.map(o => `
            <div class="admin-order-card">
                <div class="order-header">
                    <span class="text-gold">#${o.code}</span>
                    <span>${o.date}</span>
                    <span style="color:#888;">${o.userEmail}</span>
                </div>
                <div class="order-items">
                    ${o.items.map(i => `<div>${i.qty}x ${i.name} (${i.price}€)</div>`).join('')}
                </div>
                <div class="order-footer">
                    <span class="text-gold" style="font-size:1.2rem;">TOTAL: ${o.total}€</span>
                    <select class="status-select" onchange="updateOrderStatus('${o.userId}', ${o.orderIndex}, this.value)">
                        <option value="PENDING (BIZUM)" ${o.status.includes('PENDING')?'selected':''}>PENDIENTE PAGO</option>
                        <option value="PAGO RECIBIDO / EN COLA" ${o.status.includes('RECIBIDO')?'selected':''}>PAGO RECIBIDO</option>
                        <option value="EN PROCESO DE IMPRESIÓN" ${o.status.includes('IMPRESIÓN')?'selected':''}>IMPRIMIENDO</option>
                        <option value="ENVIADO" ${o.status.includes('ENVIADO')?'selected':''}>ENVIADO</option>
                        <option value="CANCELADO" ${o.status.includes('CANCELADO')?'selected':''}>CANCELADO</option>
                    </select>
                </div>
            </div>
        `).join('');

    } catch (e) {
        container.innerHTML = "<p style='color:red'>Error cargando pedidos: " + e.message + "</p>";
    }
}

// ACTUALIZAR ESTADO DE PEDIDO
async function updateOrderStatus(userId, orderIndex, newStatus) {
    try {
        const userRef = db.collection("users").doc(userId);
        
        // Necesitamos leer el usuario, modificar el array y volver a guardar
        await db.runTransaction(async (transaction) => {
            const doc = await transaction.get(userRef);
            if (!doc.exists) throw "Usuario no existe";
            
            const userData = doc.data();
            const orders = userData.orders;
            
            // Actualizar el estado
            if (orders[orderIndex]) {
                orders[orderIndex].status = newStatus;
                transaction.update(userRef, { orders: orders });
            }
        });
        
        alert("✅ ESTADO ACTUALIZADO A: " + newStatus);
    } catch (e) {
        alert("❌ Error al actualizar: " + e.message);
    }
}
