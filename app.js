import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA4pTWtUMbZFhrMORZibUhV7gpPRy6DreY",
  authDomain: "youth-earners-d34ca.firebaseapp.com",
  projectId: "youth-earners-d34ca",
  storageBucket: "youth-earners-d34ca.firebasestorage.app",
  messagingSenderId: "568087034965",
  appId: "1:568087034965:web:b4f79488d22db53af128dc"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const intro = document.getElementById("logoIntro");
const authContainer = document.getElementById("authContainer");
const gameWebsite = document.getElementById("website");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const showRegisterBtn = document.getElementById("showRegister");
const showLoginBtn = document.getElementById("showLogin");

// AUTO-LOGIN CHECKER LOGIC
let isIntroFinished = false;
let isUserLoggedIn = false;
let fetchedUserData = null;

// Firebase ka auto-login check function
onAuthStateChanged(auth, async (user) => {
    if (user) {
        isUserLoggedIn = true;
        // User logged in hai, Database se wallet aur naam uthao
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            fetchedUserData = docSnap.data();
        } else {
            fetchedUserData = { name: "Player", number: user.email.replace("@youthearners.com", ""), wallet: 0 };
        }
    } else {
        isUserLoggedIn = false;
    }
    checkAndLoad();
});

// Intro Animation Timer
setTimeout(() => {
    isIntroFinished = true;
    checkAndLoad();
}, 4500);

// Screen display logic (jab intro aur auth dono check ho jayein)
function checkAndLoad() {
    if (!isIntroFinished) return; // Intro khatam hone ka wait karo

    intro.classList.add("hidden");
    document.body.classList.remove("intro-running");

    if (isUserLoggedIn && fetchedUserData) {
        // Bina login page dikhaye seedha game launch karo
        launchGame(fetchedUserData);
    } else {
        // User naya hai ya log out ho gaya hai
        authContainer.classList.remove("hidden");
    }
}

// TOGGLE BETWEEN LOGIN AND REGISTER
showRegisterBtn.addEventListener('click', () => {
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
});

showLoginBtn.addEventListener('click', () => {
    registerForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
});

// REGISTER FUNCTION
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('regName').value;
    const number = document.getElementById('regNumber').value;
    const password = document.getElementById('regPassword').value;
    const regBtn = document.getElementById('regBtn');
    const dummyEmail = number + "@youthearners.com"; 

    try {
        regBtn.innerText = "Registering...";
        regBtn.disabled = true;
        const userCredential = await createUserWithEmailAndPassword(auth, dummyEmail, password);
        const user = userCredential.user;
        const userData = { uid: user.uid, name: name, number: number, wallet: 50 }; // ₹50 Bonus
        await setDoc(doc(db, "users", user.uid), userData);
        alert("Registration Successful! Bonus ₹50 added.");
        launchGame(userData);
    } catch (error) {
        alert("Error: " + error.message);
        regBtn.innerText = "Register";
        regBtn.disabled = false;
    }
});

// LOGIN FUNCTION
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const number = document.getElementById('loginNumber').value;
    const password = document.getElementById('loginPassword').value;
    const loginBtn = document.getElementById('loginBtn');
    const dummyEmail = number + "@youthearners.com";

    try {
        loginBtn.innerText = "Logging in...";
        loginBtn.disabled = true;
        const userCredential = await signInWithEmailAndPassword(auth, dummyEmail, password);
        const user = userCredential.user;
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        
        let userData = { name: "Player", number: number, wallet: 0 };
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

// LAUNCH GAME EVENT
function launchGame(userData) {
    authContainer.classList.add("hidden");
    gameWebsite.classList.remove("hidden");
    const event = new CustomEvent('gameStart', { detail: userData });
    window.dispatchEvent(event);
}
