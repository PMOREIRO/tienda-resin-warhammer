const firebaseConfig = {
    apiKey: "AIzaSyDC4RQqkV-L4gGrtHh59Yvj3ueuA7q6Noo",
    authDomain: "warhammershop-b0770.firebaseapp.com",
    projectId: "warhammershop-b0770",
    storageBucket: "warhammershop-b0770.firebasestorage.app",
    messagingSenderId: "972067897492",
    appId: "1:972067897492:web:fdb25c24f41d464c44f481",
    measurementId: "G-3NRXL4K96V"
};

// LISTA MAESTRA DE EJÉRCITOS
const ARMY_DATA = {
    "WH40K": {
        "Marines Espaciales": [
            "Templarios Negros", "Ángeles Sangrientos", "Ángeles Oscuros", "Deathwatch", 
            "Grey Knights", "Imperial Fists", "Iron Hands", "Raven Guard", 
            "Salamanders", "Lobos Espaciales", "Ultramarines", "White Scars"
        ],
        "Ejércitos del Imperium": [
            "Adepta Sororitas", "Adeptus Custodes", "Adeptus Mechanicus", 
            "Astra Militarum", "Imperial Agents", "Cavalieri Imperiali"
        ],
        "Ejércitos del Caos": [
            "Daemons del Caos", "Chaos Knights", "Marines Espaciales del Caos", 
            "Death Guard", "Emperor's Children", "Thousand Sons", "World Eaters"
        ],
        "Ejércitos Xenos": [
            "Aeldari", "Drukhari", "Genestealer Cults", "Leagues of Votann", 
            "Necrons", "Orks", "T'au Empire", "Tyranids"
        ]
    },
    "HEREJIA HORUS": {
        "Loyalist Legiones Astartes": [
            "Ángeles Sangrientos", "Dark Angels", "Imperial Fists", "Knights Errant", 
            "Iron Hands", "Raven Guard", "Salamanders", "Space Wolves", "Ultramarines", "White Scars"
        ],
        "Traitor Legiones Astartes": [
            "Alpha Legion", "Death Guard", "Emperor's Children", "Iron Warriors", 
            "Night Lords", "Sons of Horus", "Thousand Sons", "Word Bearers", "World Eaters"
        ],
        "Mechanicum": ["Mechanicum", "Questoris Knights", "Titan Legions"],
        "Forces of the Emperor": [
            "Assassins", "Imperialis Militia and Warp Cults", "Legio Custodes", 
            "Sisters of Silence", "Solar Auxilia", "Talons of the Emperor"
        ]
    },
    "AOS": {
        "Ejércitos del Orden": [
            "Ciudades de Sigmar", "Hijas de Khaine", "Matafuegos", "Profundos Idoneth", 
            "Altos Señores Kharadron", "Lumineth Soberanos", "Serafón", "Forjados en la Tormenta", "Sylvaneth"
        ],
        "Ejércitos de la Muerte": [
            "Cortes Comecarne", "Noctánimas", "Osiarcas Cosechahuesos", "Soulblight Gravelords"
        ],
        "Ejércitos del Caos": [
            "Filos de Khorne", "Discípulos de Tzeentch", "Hedonites of Slaanesh", 
            "Herreros Infernales de Hashut", "Agusanados de Nurgle", "Skaven", "Esclavos de la Oscuridad"
        ],
        "Ejércitos de la Destrucción": [
            "Gloomspite Gitz", "Ogor Mawtribes", "Klanes Orruks", "Sons of Behemat"
        ]
    },
    "OLD WORLD": {
        "Ejércitos": [ // Grupo único para mantener estructura
            "Beastmen Brayherds", "Dwarfen Mountain Holds", "Empire of Man", "Grand Cathay", 
            "High Elf Realms", "Kingdom of Bretonnia", "Orc and Goblin Tribes", 
            "Tomb Kings of Khemri", "Warriors of Chaos", "Wood Elf Realms"
        ]
    },
    "BLOOD BOWL": { "Equipos": ["Todos los Equipos"] },
    "MIDDLE EARTH": { "Facciones": ["Bien", "Mal"] }
};

// INICIALIZACIÓN
let db, auth;
if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    auth = firebase.auth();
    console.log("/// SYSTEM ONLINE ///");
} else {
    console.error("FIREBASE ERROR: SDK no cargado.");
}