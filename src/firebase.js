import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
const firebaseConfig = {
    apiKey: "AIzaSyCAnN2vVgjlxdPeSvlcgkYquQqDc-H5jgI",
    authDomain: "inventory-management-app-4f245.firebaseapp.com",
    databaseURL: "https://inventory-management-app-4f245-default-rtdb.firebaseio.com",
    projectId: "inventory-management-app-4f245",
    storageBucket: "inventory-management-app-4f245.appspot.com",
    messagingSenderId: "1017695913144",
    appId: "1:1017695913144:web:35a9a720a75153097ba04d",
    measurementId: "G-YHK9C5XJS4"
  };
// Initialize Firebase
const app = initializeApp(firebaseConfig);
// Initialize Firestore
const firestore = getFirestore(app);
// Initialize Firebase Storage
const storage = getStorage(app);
export { firestore, storage };