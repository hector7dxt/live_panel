// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBkpcGEZ31B59cS_2HmVPWwBFNGrTq8EdY",
  authDomain: "pruebacards-aa8b8.firebaseapp.com",
  projectId: "pruebacards-aa8b8",
  storageBucket: "pruebacards-aa8b8.appspot.com",
  messagingSenderId: "919397052566",
  appId: "1:919397052566:web:3e8722f2256bc365c6d2b7",
  measurementId: "G-YYRL2WEE67"
};

// Inicialización
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
