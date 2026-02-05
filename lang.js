const translations = {
    en: {
        brand_subtitle: "WARHAMMER<br>SUPPLY",
        btn_store: '<i class="fa-solid fa-store"></i> STOREFRONT',
        btn_profile: '<i class="fa-solid fa-id-card"></i> SERVICE RECORD',
        btn_admin: '<i class="fa-solid fa-screwdriver-wrench"></i> ADMIN PANEL',
        btn_access: '<i class="fa-solid fa-key"></i> ACCESS TERMINAL',
        user_auth: "Authenticated",
        login_title: "IDENTIFICATION",
        login_subtitle: "/// IMPERIAL MUNITORUM ACCESS ///",
        login_btn: "ACCESS TERMINAL",
        register_btn: "NEW RECRUIT REGISTRATION",
        cancel_btn: "X CANCEL",
        placeholder_email: "Operative Email",
        placeholder_pass: "Access Code",
        page_title: "MUNITORUM CATALOGUE",
        filter_all: "ALL ERAS",
        btn_generate: "GENERATE ARMOR (AI)",
        btn_save: "SAVE IDENTITY",
        history_title: "REQUISITION LOG",
        col_code: "CODE",
        col_total: "TOTAL",
        col_status: "STATUS",
        upload_title: "/// UPLOAD ASSET ///",
        btn_upload: "UPLOAD TO DATABASE",
        placeholder_name: "Asset Name",
        placeholder_price: "Cost",
        placeholder_img: "Image URL",
        cart_title: "MANIFEST",
        pay_text: "PAYMENT: <strong>BIZUM</strong> to +34 600 000 000",
        btn_confirm: "CONFIRM ORDER",
        btn_cancel_cart: "CANCEL",
        alert_access: "ACCESS DENIED. PLEASE IDENTIFY YOURSELF.",
        alert_login_req: "LOGIN REQUIRED FOR REQUISITION.",
        alert_order_confirm: "ORDER CONFIRMED. PROCEED WITH PAYMENT.",
        alert_saved: "BIO-DATA SAVED",
        alert_upload: "ASSET UPLOADED"
    },
    es: {
        brand_subtitle: "SUMINISTROS<br>WARHAMMER",
        btn_store: '<i class="fa-solid fa-store"></i> TIENDA',
        btn_profile: '<i class="fa-solid fa-id-card"></i> HOJA DE SERVICIO',
        btn_admin: '<i class="fa-solid fa-screwdriver-wrench"></i> PANEL ADMIN',
        btn_access: '<i class="fa-solid fa-key"></i> ACCESO',
        user_auth: "Autenticado",
        login_title: "IDENTIFICACIÓN",
        login_subtitle: "/// ACCESO MUNITORUM IMPERIAL ///",
        login_btn: "ACCEDER TERMINAL",
        register_btn: "REGISTRO DE RECLUTA",
        cancel_btn: "X CANCELAR",
        placeholder_email: "Email Operativo",
        placeholder_pass: "Código de Acceso",
        page_title: "CATÁLOGO DEL MUNITORUM",
        filter_all: "TODAS LAS ERAS",
        btn_generate: "GENERAR ARMADURA (IA)",
        btn_save: "GUARDAR IDENTIDAD",
        history_title: "HISTORIAL DE PEDIDOS",
        col_code: "CÓDIGO",
        col_total: "TOTAL",
        col_status: "ESTADO",
        upload_title: "/// SUBIR ACTIVO ///",
        btn_upload: "SUBIR A BASE DE DATOS",
        placeholder_name: "Nombre del Activo",
        placeholder_price: "Coste",
        placeholder_img: "URL Imagen",
        cart_title: "MANIFIESTO DE CARGA",
        pay_text: "PAGO: <strong>BIZUM</strong> al +34 600 000 000",
        btn_confirm: "CONFIRMAR PEDIDO",
        btn_cancel_cart: "CANCELAR",
        alert_access: "ACCESO DENEGADO. IDENTIFÍQUESE.",
        alert_login_req: "INICIE SESIÓN PARA COMPRAR.",
        alert_order_confirm: "PEDIDO CONFIRMADO. PROCEDA AL PAGO.",
        alert_saved: "BIO-DATOS GUARDADOS",
        alert_upload: "ACTIVO SUBIDO"
    }
};

let currentLang = localStorage.getItem('wh_lang') || 'en';

function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('wh_lang', lang);
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[lang][key]) {
            if(translations[lang][key].includes('<')) {
                el.innerHTML = translations[lang][key];
            } else {
                el.innerText = translations[lang][key];
            }
        }
    });
    const inputs = document.querySelectorAll('[data-i18n-ph]');
    inputs.forEach(el => {
        const key = el.getAttribute('data-i18n-ph');
        if (translations[lang][key]) el.placeholder = translations[lang][key];
    });
    document.querySelectorAll('.lang-btn').forEach(btn => btn.classList.remove('active-lang'));
    document.getElementById(`btn-${lang}`).classList.add('active-lang');
}

function getText(key) {
    return translations[currentLang][key] || key;
}

document.addEventListener("DOMContentLoaded", () => {
    setLanguage(currentLang);
});