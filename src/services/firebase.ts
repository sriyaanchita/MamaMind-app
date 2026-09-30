import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  // your Firebase values
    apiKey: "AIzaSyCpzIRDUuq1_FBU6hGakgPtHTK7oi7xV7I",
  authDomain: "mamamind-b8bd5.firebaseapp.com",
  projectId: "mamamind-b8bd5",
  storageBucket: "mamamind-b8bd5.firebasestorage.app",
  messagingSenderId: "1044919823982",
  appId: "1:1044919823982:web:e881b80500df20567b007f",
  measurementId: "G-VZNLTE3XWJ"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);