// FIREBASE MODULE IMPORTS (CDN Link for raw HTML setup)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// FIREBASE CONFIGURATION (Provided by you)
const firebaseConfig = {
  apiKey: "AIzaSyA4pTWtUMbZFhrMORZibUhV7gpPRy6DreY",
  authDomain: "youth-earners-d34ca.firebaseapp.com",
  projectId: "youth-earners-d34ca",
  storageBucket: "youth-earners-d34ca.firebasestorage.app",
  messagingSenderId: "568087034965",
  appId: "1:568087034965:web:b4f79488d22db53af128dc"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM ELEMENTS
const intro = document.getElementById("logoIntro");
const authContainer = document.getElementById("authContainer");
const gameWebsite = document.getElementById("website");

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const showRegisterBtn = document.getElementById("showRegister");
const showLoginBtn = document.getElementById("showLogin");

// 1. INTRO ANIMATION LOGIC (Closes after 4.5 seconds and shows Login)
setTimeout(() => {
    intro.classList.add("hidden");
    document.body.classList.remove("intro-running");
    authContainer.classList.remove("hidden");
}, 4500);

// 2. TOGGLE BETWEEN LOGIN AND REGISTER
showRegisterBtn.addEventListener('click', () => {
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
});

showLoginBtn.addEventListener('click', () => {
    registerForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
});

// 3. REGISTER FUNCTION (New User)
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('regName').value;
    const number = document.getElementById('regNumber').value;
    const password = document.getElementById('regPassword').value;
    const regBtn = document.getElementById('regBtn');

    // Trick: Connecting User number with a dummy email for Firebase Auth
    const dummyEmail = number + "@youthearners.com"; 

    try {
        regBtn.innerText = "Registering...";
        regBtn.disabled = true;

        // Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, dummyEmail, password);
        const user = userCredential.user;

        // Create Database Entry in Firestore
        const userData = {
            uid: user.uid,
            name: name,
            number: number,
            wallet: 50 // Signup Bonus!
        };
        await setDoc(doc(db, "users", user.uid), userData);

        alert("Registration Successful! Bonus ₹50 added.");
        launchGame(userData);

    } catch (error) {
        alert("Error: " + error.message);
        regBtn.innerText = "Register";
        regBtn.disabled = false;
    }
});

// 4. LOGIN FUNCTION
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const number = document.getElementById('loginNumber').value;
    const password = document.getElementById('loginPassword').value;
    const loginBtn = document.getElementById('loginBtn');

    // Same trick for login
    const dummyEmail = number + "@youthearners.com";

    try {
        loginBtn.innerText = "Logging in...";
        loginBtn.disabled = true;

        // Firebase Auth
        const userCredential = await signInWithEmailAndPassword(auth, dummyEmail, password);
        const user = userCredential.user;

        // Fetch User Wallet Data from Firestore
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        
        let userData = { wallet: 0 };
        if (docSnap.exists()) {
            userData = docSnap.data();
        }

        launchGame(userData);

    } catch (error) {
        alert("Login failed! Check your number and password.");
        loginBtn.innerText = "Log In";
        loginBtn.disabled = false;
    }
});

// 5. LAUNCH GAME AFTER SUCCESSFUL LOGIN/REGISTER
function launchGame(userData) {
    authContainer.classList.add("hidden");
    gameWebsite.classList.remove("hidden");
    
    // Send data to React script in HTML
    const event = new CustomEvent('gameStart', { detail: userData });
    window.dispatchEvent(event);
}
