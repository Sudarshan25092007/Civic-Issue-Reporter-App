import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA2EcjDus0vbJD-Zs8Je9JQJnYwCyd8KpA",
  authDomain: "civic-reporter-2007.firebaseapp.com",
  projectId: "civic-reporter-2007",
  storageBucket: "civic-reporter-2007.appspot.com",
  messagingSenderId: "663896917066",
  appId: "1:663896917066:web:1f5c381ea68dd5173512b3"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore(app);

let showErrorToast;

window.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const logoutBtn = document.getElementById("logoutBtn");
  const loginBtn = document.getElementById("loginBtn");
  const showSignup = document.getElementById("showSignup");
  const issueForm = document.getElementById("issueForm");
  const reportList = document.getElementById("reportList");
  const previewImage = document.getElementById("previewImage");
  const successBox = document.getElementById("successBox");
  const toast = document.getElementById("toast");
  const loader = document.getElementById("loader");
  const navbar = document.getElementById("navbar");
  const sectionReports = document.getElementById("reportList");
  const sectionProfile = document.getElementById("profileSection");
  const allTabs = document.querySelectorAll(".tab");
  const themeToggle = document.getElementById("themeToggle");

  if (localStorage.getItem("theme") === "light") {
    document.body.classList.add("light-mode");
    themeToggle.checked = true;
  }

  themeToggle.addEventListener("change", () => {
    if (themeToggle.checked) {
      document.body.classList.add("light-mode");
      localStorage.setItem("theme", "light");
    } else {
      document.body.classList.remove("light-mode");
      localStorage.setItem("theme", "dark");
    }
  });

  function showToast(message = "✅ Success!", bgColor = "#4caf50") {
    toast.textContent = message;
    toast.style.backgroundColor = bgColor;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 3000);
  }

  showErrorToast = function (message = "❌ Something went wrong") {
    showToast(message, "#e53935");
  };

  function showTab(id) {
    allTabs.forEach(tab => {
      tab.style.display = tab.dataset.tab === id ? "block" : "none";
    });
    if (id === "profileTab") {
      const user = auth.currentUser;
      if (user) {
        document.getElementById("profileUID").textContent = user.uid;
        document.getElementById("profileEmail").textContent = user.email;
      }
    }
  }
  window.showTab = showTab;

  onAuthStateChanged(auth, (user) => {
    if (user) {
      const welcome = document.getElementById("welcomeHeading");
      if (welcome) welcome.style.display = "none";
      loginForm.style.display = "none";
      issueForm.style.display = "block";
      successBox.style.display = "none";
      logoutBtn.style.display = "inline-block";
      navbar.style.display = "flex";
      sectionReports.style.display = "none";
      sectionProfile.style.display = "none";
      fetchReports();
    } else {
      loginForm.style.display = "block";
      issueForm.style.display = "none";
      successBox.style.display = "none";
      logoutBtn.style.display = "none";
      navbar.style.display = "none";
      reportList.innerHTML = "";
    }
  });

  loginBtn.addEventListener("click", async () => {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    const isAdmin = document.getElementById("adminCheckbox").checked;
    const ADMIN_EMAIL = "civicreporterapp@gmail.com";
    try {
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      if (isAdmin && email !== ADMIN_EMAIL) {
        showErrorToast("❌ Access denied: You are not the admin.");
        await signOut(auth);
        return;
      }
      if (isAdmin) {
        window.location.href = "admin.html";
      }
    } catch (err) {
      showErrorToast("❌ Login failed: " + err.message);
    }
  });

  showSignup.addEventListener("click", async () => {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    if (!email || !password) return showErrorToast("Enter email & password to signup.");
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      showToast("✅ Signup successful!");
    } catch (err) {
      showErrorToast("❌ Signup failed: " + err.message);
    }
  });

  logoutBtn.addEventListener("click", async () => {
    await signOut(auth);
  });

  function showLoader() {
    loader.style.display = "flex";
  }
  function hideLoader() {
    loader.style.display = "none";
  }

  document.getElementById("image").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      previewImage.src = URL.createObjectURL(file);
      previewImage.style.display = "block";
    }
  });

  async function uploadImageToCloudinary(file) {
    const url = `https://api.cloudinary.com/v1_1/dd9tcqfqp/image/upload`;
    const data = new FormData();
    data.append("file", file);
    data.append("upload_preset", "unsigned_preset");
    const res = await fetch(url, { method: "POST", body: data });
    const result = await res.json();
    return result.secure_url;
  }

  issueForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const type = document.getElementById("issueType").value;
    const description = document.getElementById("description").value.trim();
    const location = document.getElementById("location").value.trim();
    const imageFile = document.getElementById("image").files[0];
    const lat = document.getElementById("latitude").value;
    const lng = document.getElementById("longitude").value;

    if (!type || !description || !location || !imageFile || !lat || !lng) {
      return showErrorToast("❗ Please fill in all fields.");
    }

    try {
      showLoader();
      const imageUrl = await uploadImageToCloudinary(imageFile);
      const user = auth.currentUser;
      if (!user) return showErrorToast("❌ Not logged in");
      await addDoc(collection(db, "issues"), {
        type,
        description,
        location,
        imageUrl,
        timestamp: new Date().toISOString(),
        userId: user.uid,
        status: "Pending",
        latitude: lat,
        longitude: lng
      });
      hideLoader();
      issueForm.reset();
      previewImage.style.display = "none";
      showTab("submittedTab");
      showToast("✅ Issue submitted!");
      fetchReports();
    } catch (err) {
      hideLoader();
      showErrorToast("❌ Failed: " + err.message);
    }
  });

  window.showFormAgain = function () {
    showTab("reportTab");
  };

  async function fetchReports() {
    const user = auth.currentUser;
    if (!user) return;

    reportList.innerHTML = "<h2>📋 Submitted Civic Reports</h2>";
    const q = query(collection(db, "issues"), where("userId", "==", user.uid));
    const snap = await getDocs(q);

    if (snap.empty) {
      reportList.innerHTML += "<p>No reports submitted yet.</p>";
      return;
    }

    snap.forEach((docSnap) => {
      const d = docSnap.data();
      const mapId = `map-${docSnap.id}`;
      const div = document.createElement("div");
      div.className = "report-card";
      div.innerHTML = `
        <p><strong>Type:</strong> ${d.type}</p>
        <p><strong>Description:</strong> ${d.description}</p>
        <p><strong>Location:</strong> ${d.location}</p>
        <img src="${d.imageUrl}" />
        <div class="mini-map" id="${mapId}"></div>
        <p><strong>Status:</strong> <span style="color:${d.status === "Resolved" ? "#4caf50" : "#ff9800"}">${d.status}</span></p>
        <button class="deleteBtn" data-id="${docSnap.id}" style="background:#d32f2f;color:#fff;margin-top:10px">🗑 Delete</button>
      `;
      reportList.appendChild(div);

      if (d.latitude && d.longitude) {
        setTimeout(() => {
          const miniMap = L.map(mapId).setView([parseFloat(d.latitude), parseFloat(d.longitude)], 14);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
          }).addTo(miniMap);
          L.marker([parseFloat(d.latitude), parseFloat(d.longitude)]).addTo(miniMap);
        }, 300);
      }
    });

    setTimeout(() => {
      document.querySelectorAll(".deleteBtn").forEach(btn => {
        btn.addEventListener("click", () => {
          const id = btn.dataset.id;
          confirmDelete(() => handleDelete(id));
        });
      });
    }, 400);
  }

  async function handleDelete(id) {
    try {
      await deleteDoc(doc(db, "issues", id));
      showToast("✅ Report deleted");
      fetchReports();
    } catch (err) {
      showErrorToast("❌ Delete failed: " + err.message);
    }
  }

  let marker;
  let map = L.map('map').setView([12.9716, 77.5946], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
  }).addTo(map);

  map.on('click', function(e) {
    const { lat, lng } = e.latlng;
    if (marker) marker.setLatLng(e.latlng);
    else marker = L.marker(e.latlng).addTo(map);
    document.getElementById("latitude").value = lat.toFixed(6);
    document.getElementById("longitude").value = lng.toFixed(6);
  });
});

function confirmDelete(onConfirm) {
  const confirmBox = document.getElementById("confirmToast");
  confirmBox.style.display = "block";

  const yesBtn = document.getElementById("confirmYes");
  const noBtn = document.getElementById("confirmNo");

  const close = () => {
    confirmBox.style.display = "none";
    yesBtn.onclick = null;
    noBtn.onclick = null;
  };

  yesBtn.onclick = () => {
    close();
    onConfirm();
  };

  noBtn.onclick = () => close();
}


