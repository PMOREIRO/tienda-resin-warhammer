// --- ADMIN JS ---

function initAdminSelects() {
    const eraSelect = document.getElementById('new-era');
    if (!eraSelect) return;
    
    // Verificación de seguridad: ¿Existe ARMY_DATA?
    if (typeof ARMY_DATA === 'undefined') {
        console.error("ARMY_DATA no cargado. Reintentando...");
        setTimeout(initAdminSelects, 500); // Reintentar en 0.5 seg
        return;
    }

    eraSelect.innerHTML = '<option value="">-- SELECCIONAR ERA --</option>';
    for (const era in ARMY_DATA) {
        eraSelect.innerHTML += `<option value="${era}">${era}</option>`;
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
        Object.keys(ARMY_DATA[era]).forEach(f => {
            fs.innerHTML += `<option value="${f}">${f}</option>`;
        });
    } else {
        fs.disabled = true;
    }
}

function updateSubFactionSelect() {
    const era = document.getElementById('new-era').value;
    const fac = document.getElementById('new-faction').value;
    const ss = document.getElementById('new-subfaction');
    
    ss.innerHTML = '<option value="">-- SELECCIONAR --</option>';

    if (era && fac && ARMY_DATA[era][fac]) {
        ss.disabled = false;
        // Comprobar si es un array (tiene subfacciones)
        if (Array.isArray(ARMY_DATA[era][fac])) {
            ARMY_DATA[era][fac].forEach(a => {
                ss.innerHTML += `<option value="${a}">${a}</option>`;
            });
        } else {
            // Si no tiene subfacciones, deshabilitar
            ss.innerHTML = '<option value="">N/A</option>';
            ss.disabled = true;
        }
    } else {
        ss.disabled = true;
    }
}

// SUBIDA DE PRODUCTO (MULTIPLES FOTOS)
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

    if (!name || !price || !era) return alert("❌ Faltan datos (Nombre, Precio, Era).");
    if (files.length === 0) return alert("❌ Falta seleccionar imagen.");

    const btn = document.querySelector("button[onclick='adminUpload()']");
    const txtOrig = btn.innerText;
    btn.innerText = "SUBIENDO... ☁️";
    btn.disabled = true;

    try {
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
        
        await db.collection("products").add({ 
            name, price, stock, description: desc,
            era, faction, subfaction, 
            img: imageUrls, 
            createdAt: Date.now()
        });

        alert("✅ PRODUCTO CREADO.");
        document.getElementById('new-name').value = "";
        document.getElementById('new-price').value = "";
        document.getElementById('new-stock').value = "";
        document.getElementById('new-desc').value = "";
        fileInput.value = "";
        document.getElementById('label-new-img').innerText = "SELECCIONAR FOTOS";

    } catch (e) {
        alert("Error: " + e.message);
    } finally {
        btn.innerText = txtOrig; btn.disabled = false;
    }
}

// PESTAÑAS ADMIN
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
        loadAllOrders();
    }
}

// ELIMINAR (LISTA ACORDEÓN)
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
                    const img = Array.isArray(p.img) ? p.img[0] : p.img;
                    return `<div class="delete-item"><div style="display:flex;align-items:center;"><img src="${img}" style="width:40px;height:40px;object-fit:cover;margin-right:10px;"><div><b>${p.name}</b><br><span style="font-size:0.8rem;color:#666;">Stock: ${p.stock}</span></div></div><button onclick="deleteProduct('${p.id}')" class="text-red btn-text"><i class="fa-solid fa-trash"></i></button></div>`;
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

// PEDIDOS (NUEVO)
async function loadAllOrders() {
    const container = document.getElementById('admin-orders-list');
    container.innerHTML = "<p>Buscando pedidos...</p>";
    try {
        const snapshot = await db.collection("users").get();
        let allOrders = [];
        snapshot.forEach(doc => {
            const d = doc.data();
            if(d.orders && d.orders.length > 0) {
                d.orders.forEach((o, idx) => allOrders.push({...o, uid: doc.id, email: d.email, idx: idx}));
            }
        });
        allOrders.reverse(); // Nuevos primero
        
        if(allOrders.length === 0) { container.innerHTML="<p>No hay pedidos.</p>"; return; }
        
        container.innerHTML = allOrders.map(o => `
            <div class="admin-order-card">
                <div class="order-header"><span class="text-gold">#${o.code}</span><span>${o.date}</span><span style="color:#888">${o.email}</span></div>
                <div class="order-items">${o.items.map(i => `<div>${i.qty}x ${i.name}</div>`).join('')}</div>
                <div class="order-footer">
                    <span class="text-gold">${o.total}€</span>
                    <select class="status-select" onchange="updateOrderStatus('${o.uid}', ${o.idx}, this.value)">
                        <option value="PENDING" ${o.status.includes('PENDING')?'selected':''}>PENDIENTE</option>
                        <option value="PAGADO" ${o.status.includes('PAGADO')?'selected':''}>PAGADO</option>
                        <option value="ENVIADO" ${o.status.includes('ENVIADO')?'selected':''}>ENVIADO</option>
                    </select>
                </div>
            </div>
        `).join('');
    } catch(e) { container.innerHTML="Error: "+e.message; }
}

async function updateOrderStatus(uid, idx, status) {
    try {
        const ref = db.collection("users").doc(uid);
        await db.runTransaction(async (t) => {
            const doc = await t.get(ref);
            const data = doc.data();
            data.orders[idx].status = status;
            t.update(ref, {orders: data.orders});
        });
        alert("Estado actualizado.");
    } catch(e) { alert("Error: "+e.message); }
}
