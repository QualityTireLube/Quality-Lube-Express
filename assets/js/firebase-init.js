// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyA2DI7LRK4kR7DZtGRridtmCZYl8F32cLg",
  authDomain: "qualityexpress-c19f2.firebaseapp.com",
  projectId: "qualityexpress-c19f2",
  storageBucket: "qualityexpress-c19f2.firebasestorage.app",
  messagingSenderId: "201962327491",
  appId: "1:201962327491:web:342d771b9013d901cc8176",
  measurementId: "G-HJDBXM5CLX"
};

// Initialize Firebase
document.addEventListener('DOMContentLoaded', function() {
  if (typeof firebase !== 'undefined') {
    try {
      const app = firebase.initializeApp(firebaseConfig);
      const auth = firebase.auth();
      console.log("Firebase Auth Initialized");
      
      // Setup login form listener if it exists
      const loginForm = document.getElementById('admin-login-form');
      if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
          e.preventDefault();
          const email = document.getElementById('admin-email').value;
          const password = document.getElementById('admin-password').value;
          
          auth.signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
              // Signed in
              const user = userCredential.user;
              console.log("Logged in:", user);
              window.location.href = 'admin/dashboard.html'; 
            })
            .catch((error) => {
              const errorCode = error.code;
              const errorMessage = error.message;
              console.error("Login error:", errorCode, errorMessage);
              alert("Login failed: " + errorMessage);
            });
        });
      }
      
      // Handle Admin Button State
       auth.onAuthStateChanged((user) => {
        const loginButtons = document.querySelectorAll('.admin-login-btn');
        loginButtons.forEach(btn => {
            const icon = btn.querySelector('i');
            if (user) {
                if (icon) {
                    icon.className = "fas fa-sign-out-alt"; // Logout icon
                }
                btn.title = "Logout";
                btn.href = "#";
                btn.classList.add('admin-logged-in');
                
                // Remove old listeners to avoid duplicates if re-attached
                const newBtn = btn.cloneNode(true);
                btn.parentNode.replaceChild(newBtn, btn);
                
                newBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    auth.signOut().then(() => {
                        window.location.reload();
                    });
                });
            } else {
                 if (icon) {
                     icon.className = "fas fa-lock"; // Lock icon for Admin
                 }
                 btn.title = "Admin Login";
                 // Do not overwrite href; it is set correctly relative to root by the setup script
            }
        });
      });

    } catch (e) {
      console.error("Firebase initialization failed", e);
    }
  } else {
    // console.error("Firebase SDK not loaded");
  }
});
