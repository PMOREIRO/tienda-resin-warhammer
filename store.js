/* --- VARIABLES --- */
let products = [];
let cart = [];
let activeFilters = { era: 'all', faction: null, subfaction: null };

function loadProducts() {
    if (!db) return;
    db.collection("products").onSnapshot((snapshot) => {
        products = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            products.push({ id: doc.id, ...data, stock: parseInt(data.stock)||0, createdAt: data.createdAt||0 });
        });
        renderStore();
    });
}

function setFilter(type, value) {
    if(type==='era'){ activeFilters={era:value, faction:null, subfaction:null}; }
    else if(type==='faction'){ activeFilters.faction=value; activeFilters.subfaction=null; }
    else if(type==='subfaction'){ activeFilters.subfaction=value; }
    else if(type==='new'){ activeFilters={era:'new', faction:null, subfaction:null}; }
    if(typeof setView==='function') setView('store');
    renderStore();
}
function filterEra(e){ if(e==='new') setFilter('new'); else setFilter('era',e); }

function renderStore() {
    const grid = document.getElementById('product-grid');
    const bread = document.getElementById('store-breadcrumb');
    if(!grid) return; grid.innerHTML = "";

    if(bread) {
        let txt = activeFilters.era==='new' ? "NOVEDADES" : (activeFilters.era==='all'?"CATÁLOGO":activeFilters.era);
        if(activeFilters.faction) txt += " > " + activeFilters.faction;
        if(activeFilters.subfaction) txt += " > " + activeFilters.subfaction;
        bread.innerText = "/// RASTREANDO: " + txt;
    }

    let filtered = [...products];
    if(activeFilters.era==='new') filtered.sort((a,b)=>b.createdAt-a.createdAt);
    else if(activeFilters.era!=='all') {
        filtered = filtered.filter(p=>p.era===activeFilters.era);
        if(activeFilters.faction) filtered = filtered.filter(p=>p.faction===activeFilters.faction);
        if(activeFilters.subfaction) filtered = filtered.filter(p=>p.subfaction===activeFilters.subfaction);
    }

    if(filtered.length===0) { grid.innerHTML="<div style='color:#666;text-align:center;grid-column:1/-1;padding:50px;'>SIN SUMINISTROS.</div>"; return; }
    if(activeFilters.era!=='new') filtered.sort((a,b)=>(b.stock>0)-(a.stock>0));

    filtered.forEach(p => {
        const isOut = p.stock<=0;
        const mainImg = Array.isArray(p.img) ? p.img[0] : (p.img || "https://via.placeholder.com/400?text=NO+IMG");
        
        grid.innerHTML += `
            <div class="card ${isOut?'out-of-stock-card':''}">
                <div class="card-img-container" onclick="openProductModal('${p.id}')">
                    <img src="${mainImg}" class="product-img" loading="lazy">
                </div>
                <div class="card-body">
                    <div class="text-small" style="color:#666">/// ${p.subfaction||p.faction||p.era}</div>
                    <h3 class="gothic-title" style="font-size:1rem;">${p.name}</h3>
                    <div style="font-size:0.75rem;color:${isOut?'red':'var(--tech-green)'};">${isOut?'SIN STOCK':'STOCK: '+p.stock}</div>
                    <div class="price">${p.price.toFixed(2)} €</div>
                    <button ${isOut?'disabled style="background:#333"':`onclick="addToCart('${p.id}')"`} class="btn-action full-width btn-gold">${isOut?'AGOTADO':'AÑADIR'}</button>
                    ${currentUser&&currentUser.role==='admin' ? `<button onclick="deleteProduct('${p.id}')" class="text-red btn-text" style="font-size:0.7rem;">ELIMINAR</button>`:''}
                </div>
            </div>`;
    });
}

// --- MODAL CON GALERÍA ---
window.openProductModal = function(id) {
    const p = products.find(prod => prod.id === id);
    if(!p) return;

    const imgMain = document.getElementById('detail-img');
    const thumbContainer = document.getElementById('detail-thumbnails');
    
    // Preparar imágenes (Array o String)
    const images = Array.isArray(p.img) ? p.img : [p.img || "https://via.placeholder.com/400"];
    
    // Poner la primera
    imgMain.src = images[0];
    
    // Generar miniaturas
    thumbContainer.innerHTML = "";
    if (images.length > 1) {
        images.forEach(src => {
            const thumb = document.createElement('img');
            thumb.src = src;
            thumb.className = "thumbnail";
            thumb.onclick = function() {
                imgMain.src = src; // Cambiar principal
                // Quitar clase active de otros y poner en este
                document.querySelectorAll('.thumbnail').forEach(t => t.classList.remove('active'));
                thumb.classList.add('active');
            };
            thumbContainer.appendChild(thumb);
        });
    }

    document.getElementById('detail-name').innerText = p.name;
    document.getElementById('detail-breadcrumbs').innerText = `${p.era} > ${p.faction||''} > ${p.subfaction||''}`;
    document.getElementById('detail-desc').innerHTML = p.description ? p.description.replace(/\n/g, "<br>") : "";
    document.getElementById('detail-price').innerText = p.price.toFixed(2) + " €";
    
    const btn = document.getElementById('detail-btn');
    const st = document.getElementById('detail-stock');
    if(p.stock<=0){ st.innerHTML="<span style='color:red'>AGOTADO</span>"; btn.innerText="NO DISPONIBLE"; btn.disabled=true; btn.style.background="#333"; btn.onclick=null; }
    else { st.innerText="DISPONIBLES: "+p.stock; btn.innerText="AÑADIR A LA CAJA"; btn.disabled=false; btn.style.background="var(--gold-main)"; btn.onclick=function(){addToCart(p.id);closeProductModal();}; }
    
    document.getElementById('product-detail-modal').classList.remove('hidden');
}

window.closeProductModal = function() { document.getElementById('product-detail-modal').classList.add('hidden'); }

// --- CARRITO ---
window.addToCart=function(id){ if(!currentUser){openLogin();return;} const p=products.find(i=>i.id===id),ex=cart.find(i=>i.id===id); if(ex&&ex.qty+1>p.stock)return alert("Stock tope"); if(ex)ex.qty++;else cart.push({...p,qty:1}); updateMiniCartUI(); }
function updateMiniCartUI(){ document.getElementById('cart-count').innerText=cart.reduce((a,b)=>a+b.qty,0); document.getElementById('mini-cart-total').innerText=cart.reduce((a,b)=>a+(b.price*b.qty),0).toFixed(2)+"€"; const l=document.getElementById('mini-cart-items'); if(cart.length===0)l.innerHTML='<p style="padding:10px">Vacío</p>'; else l.innerHTML=cart.map(i=>`<div class="mini-item"><span>${i.name}</span><span>x${i.qty}</span></div>`).join(''); }
window.toggleMiniCart=function(){document.getElementById('mini-cart-dropdown').classList.toggle('hidden');}
window.goToFullCart=function(){document.getElementById('mini-cart-dropdown').classList.add('hidden');if(typeof setView==='function')setView('cart');}
function renderFullCart(){ const t=document.getElementById('full-cart-body'),m=document.getElementById('empty-cart-msg'); if(cart.length===0){t.innerHTML="";m.classList.remove('hidden');document.getElementById('final-total').innerText="0.00€";return;} m.classList.add('hidden'); t.innerHTML=cart.map(i=>`<tr><td><div style="display:flex;align-items:center;gap:10px;"><img src="${Array.isArray(i.img)?i.img[0]:i.img}" style="width:50px;">${i.name}</div></td><td>${i.price.toFixed(2)}€</td><td><div class="qty-control"><button class="qty-btn" onclick="changeQty('${i.id}',-1)">-</button><div class="qty-val">${i.qty}</div><button class="qty-btn" onclick="changeQty('${i.id}',1)">+</button></div></td><td class="text-gold">${(i.price*i.qty).toFixed(2)}€</td><td><button onclick="removeFromCart('${i.id}')" class="text-red btn-text">X</button></td></tr>`).join(''); document.getElementById('final-total').innerText=cart.reduce((a,b)=>a+(b.price*b.qty),0).toFixed(2)+"€"; }
window.changeQty=function(id,c){const i=cart.find(x=>x.id===id),p=products.find(x=>x.id===id); if(i){if(c>0&&i.qty+1>p.stock)return alert("Tope"); i.qty+=c; if(i.qty<=0)removeFromCart(id); else{renderFullCart();updateMiniCartUI();}}}
window.removeFromCart=function(id){cart=cart.filter(i=>i.id!==id);renderFullCart();updateMiniCartUI();}
window.prepareCheckout=function(){if(cart.length===0)return alert("Vacío");document.getElementById('payment-modal').classList.remove('hidden');}
window.closePaymentModal=function(){ document.getElementById('payment-modal').classList.add('hidden'); const code="WH-"+Math.floor(Math.random()*99999), total=cart.reduce((a,b)=>a+(b.price*b.qty),0).toFixed(2); const batch=db.batch(); cart.forEach(i=>{ batch.update(db.collection("products").doc(i.id),{stock:i.stock-i.qty}); }); batch.commit().then(()=>{ return db.collection("users").doc(currentUser.uid).update({orders:firebase.firestore.FieldValue.arrayUnion({code,date:new Date().toLocaleString(),total,status:"PENDING (BIZUM)",items:cart})}); }).then(()=>{ cart=[];updateMiniCartUI();renderFullCart();setView('profile');alert("REGISTRADO."); }).catch(e=>alert(e.message)); }
