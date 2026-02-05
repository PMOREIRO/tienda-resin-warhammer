/* --- VARIABLES --- */
let products = [];
let cart = [];
let activeFilters = { era: 'all', faction: null, subfaction: null };

/* --- 1. CARGA --- */
function loadProducts() {
    if (!db) return;
    db.collection("products").onSnapshot((snapshot) => {
        products = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            products.push({ 
                id: doc.id, 
                ...data,
                stock: parseInt(data.stock) || 0,
                createdAt: data.createdAt || 0
            });
        });
        renderStore();
    });
}

/* --- 2. FILTRADO --- */
function setFilter(type, value) {
    if (type === 'era') {
        activeFilters.era = value;
        activeFilters.faction = null;
        activeFilters.subfaction = null;
    } else if (type === 'faction') {
        activeFilters.faction = value;
        activeFilters.subfaction = null;
    } else if (type === 'subfaction') {
        activeFilters.subfaction = value;
    } else if (type === 'new') {
        activeFilters = { era: 'new', faction: null, subfaction: null };
    }
    
    if (typeof setView === 'function') setView('store');
    renderStore();
}

function filterEra(era) {
    if (era === 'new') setFilter('new');
    else setFilter('era', era);
}

/* --- 3. RENDERIZADO TIENDA --- */
function renderStore() {
    const grid = document.getElementById('product-grid');
    const breadcrumb = document.getElementById('store-breadcrumb');
    if(!grid) return;
    grid.innerHTML = "";

    // Breadcrumb text
    if (breadcrumb) {
        let txt = "TODO EL CATÁLOGO";
        if (activeFilters.era === 'new') txt = "NOVEDADES";
        else if (activeFilters.era !== 'all') {
            txt = activeFilters.era;
            if (activeFilters.faction) txt += " > " + activeFilters.faction;
            if (activeFilters.subfaction) txt += " > " + activeFilters.subfaction;
        }
        breadcrumb.innerText = "/// RASTREANDO: " + txt;
    }

    // Filtrar
    let filtered = [...products];
    if (activeFilters.era === 'new') {
        filtered.sort((a, b) => b.createdAt - a.createdAt);
    } else if (activeFilters.era !== 'all') {
        filtered = filtered.filter(p => p.era === activeFilters.era);
        if (activeFilters.faction) filtered = filtered.filter(p => p.faction === activeFilters.faction);
        if (activeFilters.subfaction) filtered = filtered.filter(p => p.subfaction === activeFilters.subfaction);
    }

    if (filtered.length === 0) {
        grid.innerHTML = "<div style='color:white; text-align:center; grid-column:1/-1; padding:50px;'>SIN SUMINISTROS.</div>";
        return;
    }

    // Ordenar stock
    if (activeFilters.era !== 'new') filtered.sort((a, b) => (b.stock > 0) - (a.stock > 0));

    filtered.forEach(p => {
        const isOut = p.stock <= 0;
        const imgSrc = p.img || "https://via.placeholder.com/400x400/111/c5a059?text=NO+IMG";
        const btnState = isOut ? "disabled style='background:#333; cursor:not-allowed;'" : `onclick="addToCart('${p.id}')"`;
        const btnText = isOut ? "AGOTADO" : "AÑADIR";

        grid.innerHTML += `
            <div class="card ${isOut ? 'out-of-stock-card' : ''}">
                <div class="card-img-container" onclick="openProductModal('${p.id}')">
                    <img src="${imgSrc}" class="product-img" loading="lazy">
                </div>
                <div class="card-body">
                    <div class="text-small" style="color:#666">/// ${p.subfaction || p.faction || p.era}</div>
                    <h3 class="gothic-title" style="font-size:1rem;">${p.name}</h3>
                    <div style="font-size:0.75rem; color:${isOut?'red':'var(--tech-green)'}; margin-bottom:5px;">
                        ${isOut ? 'SIN STOCK' : 'STOCK: '+p.stock}
                    </div>
                    <div class="price">${p.price.toFixed(2)} €</div>
                    <button ${btnState} class="btn-action full-width btn-gold">${btnText}</button>
                    ${currentUser && currentUser.role === 'admin' ? 
                        `<button onclick="deleteProduct('${p.id}')" class="text-red btn-text" style="font-size:0.7rem; margin-top:5px;">ELIMINAR</button>` : ''}
                </div>
            </div>
        `;
    });
}

/* --- 4. MODAL DETALLE (ARREGLADO) --- */
// Definimos globalmente para que el HTML lo encuentre seguro
window.openProductModal = function(id) {
    const p = products.find(prod => prod.id === id);
    if(!p) return;

    document.getElementById('detail-img').src = p.img || "https://via.placeholder.com/400";
    document.getElementById('detail-name').innerText = p.name;
    document.getElementById('detail-breadcrumbs').innerText = `${p.era} > ${p.faction || ''}`;
    
    // Descripción con saltos de línea
    document.getElementById('detail-desc').innerHTML = p.description ? p.description.replace(/\n/g, "<br>") : "Sin datos.";
    
    document.getElementById('detail-price').innerText = p.price.toFixed(2) + " €";
    
    const stock = p.stock || 0;
    const btn = document.getElementById('detail-btn');
    const stockDiv = document.getElementById('detail-stock');

    if(stock <= 0) {
        stockDiv.innerHTML = "<span style='color:red'>AGOTADO</span>";
        btn.innerText = "NO DISPONIBLE";
        btn.disabled = true;
        btn.style.background = "#333";
        btn.onclick = null;
    } else {
        stockDiv.innerText = "DISPONIBLES: " + stock;
        btn.innerText = "AÑADIR A LA CAJA";
        btn.disabled = false;
        btn.style.background = "var(--gold-main)";
        btn.onclick = function() { addToCart(p.id); closeProductModal(); };
    }
    
    document.getElementById('product-detail-modal').classList.remove('hidden');
}

window.closeProductModal = function() {
    document.getElementById('product-detail-modal').classList.add('hidden');
}

/* --- 5. CARRITO --- */
window.addToCart = function(id) {
    if (!currentUser) { openLogin(); return; }
    const p = products.find(i => i.id === id);
    const ex = cart.find(i => i.id === id);
    if (ex && ex.qty + 1 > p.stock) return alert("⛔ Stock insuficiente.");
    if (ex) ex.qty++; else cart.push({ ...p, qty: 1 });
    updateMiniCartUI();
}

function updateMiniCartUI() {
    const count = cart.reduce((a, b) => a + b.qty, 0);
    const total = cart.reduce((a, b) => a + (b.price * b.qty), 0);
    document.getElementById('cart-count').innerText = count;
    document.getElementById('mini-cart-total').innerText = total.toFixed(2) + "€";
    
    const list = document.getElementById('mini-cart-items');
    if(cart.length === 0) list.innerHTML = '<p style="padding:10px; color:#666;">Vacío...</p>';
    else list.innerHTML = cart.map(i => `<div class="mini-item"><span>${i.name}</span><span>x${i.qty}</span></div>`).join('');
}

window.toggleMiniCart = function() { document.getElementById('mini-cart-dropdown').classList.toggle('hidden'); }
window.goToFullCart = function() { document.getElementById('mini-cart-dropdown').classList.add('hidden'); setView('cart'); }

/* --- 6. CARRITO FULL --- */
function renderFullCart() {
    const tbody = document.getElementById('full-cart-body');
    const msg = document.getElementById('empty-cart-msg');
    if (cart.length === 0) { 
        tbody.innerHTML = ""; msg.classList.remove('hidden'); 
        document.getElementById('final-total').innerText="0.00€"; return; 
    }
    msg.classList.add('hidden');
    tbody.innerHTML = cart.map(i => `
        <tr>
            <td><div style="display:flex; align-items:center; gap:10px;"><img src="${i.img}" style="width:50px;"> ${i.name}</div></td>
            <td>${i.price.toFixed(2)}€</td>
            <td>
                <div class="qty-control">
                    <button class="qty-btn" onclick="changeQty('${i.id}', -1)">-</button>
                    <div class="qty-val">${i.qty}</div>
                    <button class="qty-btn" onclick="changeQty('${i.id}', 1)">+</button>
                </div>
            </td>
            <td class="text-gold">${(i.price*i.qty).toFixed(2)}€</td>
            <td><button onclick="removeFromCart('${i.id}')" class="text-red btn-text">X</button></td>
        </tr>
    `).join('');
    document.getElementById('final-total').innerText = cart.reduce((a,b)=>a+(b.price*b.qty),0).toFixed(2) + "€";
}

window.changeQty = function(id, chg) {
    const item = cart.find(i => i.id === id);
    const prod = products.find(p => p.id === id);
    if(item) {
        if(chg > 0 && item.qty + 1 > prod.stock) return alert("Tope de stock.");
        item.qty += chg;
        if(item.qty <= 0) removeFromCart(id); else { renderFullCart(); updateMiniCartUI(); }
    }
}

window.removeFromCart = function(id) { cart = cart.filter(i => i.id !== id); renderFullCart(); updateMiniCartUI(); }

/* --- 7. CHECKOUT Y CIERRE (SOLUCIONADO EL STUCK) --- */
window.prepareCheckout = function() {
    if(cart.length === 0) return alert("Vacío");
    document.getElementById('payment-modal').classList.remove('hidden');
}

// ESTA ES LA FUNCIÓN QUE TE FALLABA. AHORA ESTÁ EN WINDOW PARA QUE EL HTML LA VEA SIEMPRE
window.closePaymentModal = function() {
    document.getElementById('payment-modal').classList.add('hidden');
    
    const code = "WH-" + Math.floor(Math.random() * 99999);
    const total = cart.reduce((a, b) => a + (b.price * b.qty), 0).toFixed(2);
    
    // Restar Stock
    const batch = db.batch();
    cart.forEach(item => {
        const ref = db.collection("products").doc(item.id);
        batch.update(ref, { stock: item.stock - item.qty });
    });

    batch.commit().then(() => {
        const newOrder = { code, date: new Date().toLocaleString(), total, status: "PENDING", items: cart };
        return db.collection("users").doc(currentUser.uid).update({ 
            orders: firebase.firestore.FieldValue.arrayUnion(newOrder) 
        });
    }).then(() => {
        cart = []; updateMiniCartUI(); renderFullCart(); setView('profile');
        alert("PEDIDO REGISTRADO CORRECTAMENTE.");
    }).catch(e => {
        console.error(e);
        alert("Error procesando pedido: " + e.message);
    });
}