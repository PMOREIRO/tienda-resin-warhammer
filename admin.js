// --- ADMIN JS ---

// CARGAR SELECTORES AL INICIAR
function initAdminSelects() {
    const eraSelect = document.getElementById('new-era');
    if (!eraSelect) return;
    
    eraSelect.innerHTML = '<option value="">-- SELECCIONAR ERA --</option>';
    
    // Rellenar Eras desde config.js
    if (typeof ARMY_DATA !== 'undefined') {
        for (const era in ARMY_DATA) {
            eraSelect.innerHTML += `<option value="${era}">${era}</option>`;
        }
    }
}

// CASCADA: AL CAMBIAR ERA
function updateFactionSelect() {
    const era = document.getElementById('new-era').value;
    const factionSelect = document.getElementById('new-faction');
    const subSelect = document.getElementById('new-subfaction');
    
    factionSelect.innerHTML = '<option value="">-- SELECCIONAR --</option>';
    subSelect.innerHTML = '';
    subSelect.disabled = true;

    if (era && ARMY_DATA[era]) {
        factionSelect.disabled = false;
        const factions = Object.keys(ARMY_DATA[era]);
        factions.forEach(f => {
            factionSelect.innerHTML += `<option value="${f}">${f}</option>`;
        });
    } else {
        factionSelect.disabled = true;
    }
}

// CASCADA: AL CAMBIAR FACCION
function updateSubFactionSelect() {
    const era = document.getElementById('new-era').value;
    const faction = document.getElementById('new-faction').value;
    const subSelect = document.getElementById('new-subfaction');
    
    subSelect.innerHTML = '<option value="">-- SELECCIONAR --</option>';

    if (era && faction && ARMY_DATA[era][faction]) {
        subSelect.disabled = false;
        const armies = ARMY_DATA[era][faction];
        armies.forEach(a => {
            subSelect.innerHTML += `<option value="${a}">${a}</option>`;
        });
    } else {
        subSelect.disabled = true;
    }
}

// SUBIR PRODUCTO
function adminUpload() {
    const name = document.getElementById('new-name').value;
    const price = parseFloat(document.getElementById('new-price').value);
    const stock = parseInt(document.getElementById('new-stock').value) || 0;
    
    const era = document.getElementById('new-era').value;
    const faction = document.getElementById('new-faction').value;
    const subfaction = document.getElementById('new-subfaction').value;
    
    const desc = document.getElementById('new-desc').value;
    const file = document.getElementById('new-img-file').files[0];

    if (!name || !price || !era) return alert("❌ Faltan datos obligatorios.");
    if (!file) return alert("❌ Falta la imagen.");

    const btn = document.querySelector("button[onclick='adminUpload()']");
    const txtOrig = btn.innerText;
    btn.innerText = "SUBIENDO... ☁️";
    btn.disabled = true;

    // CLOUDINARY
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "warhamerchop");

    fetch(`https://api.cloudinary.com/v1_1/disfeeqe8/image/upload`, {
        method: "POST", body: formData
    })
    .then(r => r.json())
    .then(data => {
        if (data.secure_url) {
            btn.innerText = "GUARDANDO... 💾";
            return db.collection("products").add({ 
                name, price, stock, desc,
                era, faction, subfaction, 
                img: data.secure_url,
                createdAt: Date.now()
            });
        } else throw new Error("Error Cloudinary");
    })
    .then(() => {
        alert("✅ REGISTRADO.");
        // Limpiar
        document.getElementById('new-name').value = "";
        document.getElementById('new-price').value = "";
        document.getElementById('new-stock').value = "";
        document.getElementById('new-desc').value = "";
        document.getElementById('new-img-file').value = "";
        document.getElementById('label-new-img').innerHTML = '<i class="fa-solid fa-image"></i> Seleccionar Imagen';
    })
    .catch(e => alert("Error: " + e.message))
    .finally(() => { btn.innerText = txtOrig; btn.disabled = false; });
}

// CONTROL DE PESTAÑAS
function switchAdminTab(tab) {
    document.getElementById('btn-adm-add').classList.remove('active');
    document.getElementById('btn-adm-del').classList.remove('active');
    document.getElementById('admin-view-add').classList.add('hidden');
    document.getElementById('admin-view-delete').classList.add('hidden');
    
    if(tab === 'add') {
        document.getElementById('btn-adm-add').classList.add('active');
        document.getElementById('admin-view-add').classList.remove('hidden');
        initAdminSelects(); // Inicializar dropdowns
    } else {
        document.getElementById('btn-adm-del').classList.add('active');
        document.getElementById('admin-view-delete').classList.remove('hidden');
        renderDeleteList(); // Cargar lista
    }
}

// RENDERIZAR LISTA DE ELIMINAR (ACORDEÓN JERÁRQUICO)
function renderDeleteList() {
    const container = document.getElementById('admin-delete-list');
    container.innerHTML = "<p>Cargando datos...</p>";

    db.collection("products").get().then(snap => {
        const items = [];
        snap.forEach(doc => items.push({id: doc.id, ...doc.data()}));
        
        if(items.length === 0) {
            container.innerHTML = "<p>No hay activos registrados.</p>";
            return;
        }

        // Agrupar por Era -> Facción
        const tree = {};
        items.forEach(p => {
            const e = p.era || "Otros";
            const f = p.faction || "General";
            if(!tree[e]) tree[e] = {};
            if(!tree[e][f]) tree[e][f] = [];
            tree[e][f].push(p);
        });

        let html = "";
        // Bucle Eras
        for (const [eraName, factions] of Object.entries(tree)) {
            html += `
                <div class="manage-era-block">
                    <div class="manage-era-header" onclick="this.nextElementSibling.classList.toggle('open')">
                        <span>${eraName}</span> <i class="fa-solid fa-chevron-down"></i>
                    </div>
                    <div class="manage-content">
            `;
            
            // Bucle Facciones
            for (const [factionName, prodList] of Object.entries(factions)) {
                html += `
                    <div class="manage-faction-header" onclick="this.nextElementSibling.classList.toggle('open')">
                        ${factionName} (${prodList.length})
                    </div>
                    <div class="manage-faction-content">
                        ${prodList.map(p => `
                            <div class="delete-item">
                                <div style="display:flex; align-items:center;">
                                    <img src="${p.img}" style="width:40px; height:40px; margin-right:10px; border-radius:4px;">
                                    <div>
                                        <div style="font-weight:bold; color:#fff;">${p.name}</div>
                                        <div style="font-size:0.8rem; color:#666;">Stock: ${p.stock} | ${p.subfaction || '-'}</div>
                                    </div>
                                </div>
                                <button onclick="deleteProduct('${p.id}')" class="text-red btn-text"><i class="fa-solid fa-trash"></i></button>
                            </div>
                        `).join('')}
                    </div>
                `;
            }
            html += `</div></div>`; // Cierre Era
        }
        
        container.innerHTML = html;
    });
}

function deleteProduct(id) {
    if(confirm("¿Estás seguro de eliminar este activo?")) {
        db.collection("products").doc(id).delete().then(() => renderDeleteList());
    }
}