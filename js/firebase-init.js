// js/firebase-init.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";  //Firebaseアプリを初期化するため
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";  //Firestore データベースを使うため

const firebaseConfig = {
    apiKey: "AIzaSyA7mMuw4XNVir5AEwBOVJ-C4a2HuBbhTNM",
    authDomain: "cosmetics-and-beauty-c49ea.firebaseapp.com",
    projectId: "cosmetics-and-beauty-c49ea",
    storageBucket: "cosmetics-and-beauty-c49ea.firebasestorage.app",  //Firebase Storage（画像やファイル保存）
    messagingSenderId: "743347553336",
    appId: "1:743347553336:web:aa72f3f49fc5d51f9ed2cd"
};

// Firebaseを初期化
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);  //data add  ,data read , data update , data delete

export { db };  //他の JavaScript ファイルから db を使えるように 外に出しています。
