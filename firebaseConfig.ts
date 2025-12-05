// src/firebaseConfig.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBH--1LKAUn0oBTbVX6W_YOkrXhkBjNork",
  authDomain: "mapainternos.firebaseapp.com",
  projectId: "mapainternos",
  storageBucket: "mapainternos.firebasestorage.app",
  messagingSenderId: "433575120554",
  appId: "1:433575120554:web:309328a519284a9f818ad3",
  measurementId: "G-FW611VFQGL"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Exportar la base de datos para usarla en el mapa
export const db = getFirestore(app);