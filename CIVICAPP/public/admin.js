import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyA2EcjDus0vbJD-Zs8Je9JQJnYwCyd8KpA",
  authDomain: "civic-reporter-2007.firebaseapp.com",
  projectId: "civic-reporter-2007",
  storageBucket: "civic-reporter-2007.appspot.com",
  messagingSenderId: "663896917066",
  appId: "1:663896917066:web:1f5c381ea68dd5173512b3"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth();
const ADMIN_EMAIL = "civicreporterapp@gmail.com";

const adminReportList = document.getElementById("adminReportList");

// Logout
document.getElementById("adminLogoutBtn").addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "index.html";
});

// Auth check
onAuthStateChanged(auth, async (user) => {
  if (!user || user.email !== ADMIN_EMAIL) {
    alert("Access denied. Redirecting...");
    window.location.href = "index.html";
    return;
  }

  loadAllReports();
});

// Load all reports
async function loadAllReports() {
  adminReportList.innerHTML = "Loading all reports...";

  try {
    const querySnapshot = await getDocs(collection(db, "issues"));
    if (querySnapshot.empty) {
      adminReportList.innerHTML = "<p>No reports found.</p>";
      return;
    }

    adminReportList.innerHTML = "";

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const div = document.createElement("div");
      div.classList.add("report-card");

      const resolved = data.status === "Resolved";

      div.innerHTML = `
        <p><strong>Type:</strong> ${data.type}</p>
        <p><strong>Description:</strong> ${data.description}</p>
        <p><strong>Location:</strong> ${data.location}</p>
        <p><strong>Status:</strong> ${resolved ? "✅ Resolved" : "❌ Pending"}</p>
        <p><strong>Submitted:</strong> ${new Date(data.timestamp).toLocaleString()}</p>
        ${data.imageUrl ? `<img src="${data.imageUrl}" alt="Issue Image" />` : ""}
      `;

      const markBtn = document.createElement("button");
      markBtn.textContent = resolved ? "✅ Resolved" : "Mark as Resolved";
      markBtn.disabled = resolved;
      markBtn.className = "solve-button";
      markBtn.style.marginTop = "10px";

      // ✅ On Click, update Firestore document
      markBtn.addEventListener("click", async () => {
        try {
          const docRef = doc(db, "issues", docSnap.id);
          await updateDoc(docRef, {
            status: "Resolved"
          });
          markBtn.textContent = "✅ Resolved";
          markBtn.disabled = true;
          alert("✅ Marked as Resolved");
        } catch (err) {
          console.error("❌ Error marking as resolved:", err);
          alert("❌ Failed to mark as resolved.");
        }
      });

      div.appendChild(markBtn);
      adminReportList.appendChild(div);
    });
  } catch (err) {
    adminReportList.innerHTML = `<p style="color:red;">Failed to load reports: ${err.message}</p>`;
  }
}
