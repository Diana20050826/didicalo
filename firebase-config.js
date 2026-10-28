
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import {
  getAuth
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";
import {
  getDatabase
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDZYCBG5jzZcx7cr0rVEd2lpDkDbgO0GRo",
  authDomain: "didicalo.firebaseapp.com",
  databaseURL: "https://didicalo-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "didicalo",
  storageBucket: "didicalo.firebasestorage.app",
  messagingSenderId: "1095657432511",
  appId: "1:1095657432511:web:eecf1552fd3c88f2bf6d0a",
  measurementId: "G-D0BR3HTEZ4"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getDatabase(app);
