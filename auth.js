// --- AUTENTICACIÓN ---

function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(f => f.classList.add('hidden'));
    document.getElementById(`tab-${tab}`).classList.add('active');
    document.getElementById(`form-${tab}`).classList.remove('hidden');
    document.getElementById('login-error').innerText = "";
}

function openLogin(tab = 'login') { 
    document.getElementById('login-screen').classList.remove('hidden');
    switchTab(tab);
}

function closeLogin() { document.getElementById('login-screen').classList.add('hidden'); }

function authLogin() {
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-pass').value;
    auth.signInWithEmailAndPassword(email, pass)
        .then(() => closeLogin())
        .catch(err => document.getElementById('login-error').innerText = err.message);
}

function authRegister() {
    const email = document.getElementById('reg-email').value.trim();
    const pass = document.getElementById('reg-pass').value;
    const userRole = (email === "pablomoreirocollado@gmail.com") ? "admin" : "user";
    const defaultAvatar = "https://ui-avatars.com/api/?name=" + email + "&background=c5a059&color=000";

    auth.createUserWithEmailAndPassword(email, pass)
        .then((cred) => {
            cred.user.sendEmailVerification();
            db.collection("users").doc(cred.user.uid).set({
                email: email, role: userRole, avatar: defaultAvatar, orders: []
            });
            alert("CUENTA CREADA. Rol: " + userRole.toUpperCase());
            closeLogin();
        })
        .catch(err => document.getElementById('login-error').innerText = err.message);
}

function logout() { auth.signOut().then(() => window.location.reload()); }

// --- GUARDAR PERFIL (CON TU CLOUDINARY) ---
function saveProfile() {
    if(!currentUser) return;
    
    const name = document.getElementById('prof-name').value;
    const surname = document.getElementById('prof-surname').value;
    const address = document.getElementById('prof-address').value;
    const nick = document.getElementById('prof-nick').value;
    const file = document.getElementById('profile-img-upload').files[0];

    const btn = document.querySelector("button[onclick='saveProfile()']");
    const txtOrig = btn.innerText;
    btn.innerText = "PROCESANDO...";
    btn.disabled = true;

    const updateDB = (avatarUrl) => {
        db.collection("users").doc(currentUser.uid).update({ 
            avatar: avatarUrl, name, surname, address, nick
        }).then(() => {
            alert("✅ FICHA ACTUALIZADA");
            currentUser.name = name; currentUser.surname = surname;
            currentUser.address = address; currentUser.nick = nick;
            currentUser.avatar = avatarUrl;
            updateUIProfile();
        }).finally(() => {
            btn.innerText = txtOrig; btn.disabled = false;
        });
    };

    if (file) {
        btn.innerText = "SUBIENDO FOTO...";
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", "warhamerchop"); // TU PRESET

        fetch(`https://api.cloudinary.com/v1_1/disfeeqe8/image/upload`, { // TU CLOUD ID
            method: "POST", body: formData
        })
        .then(r => r.json())
        .then(data => {
            if(data.secure_url) updateDB(data.secure_url);
            else throw new Error("Error foto Cloudinary");
        })
        .catch(e => { alert("Error subida: " + e.message); btn.disabled = false; });
    } else {
        updateDB(currentUser.avatar);
    }
}