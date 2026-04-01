# 🧪 TruthLens: End-to-End Test Checklist

Run these manual validation steps to ensure all integrated systems are functioning before final deployment.

---

### **1. 🔐 Authentication & Identity**
- [ ] **Action:** Go to `/auth` and register a new user using the Google Sign-In button.
- [ ] **Verification:** User is successfully redirected to the `/scan` dashboard.
- [ ] **Action:** Log out and log back in.
- [ ] **Verification:** History persists and session data is restored.

### **2. 📰 Factual Article Scanning**
- [ ] **Action:** Paste a high-traffic news article URL into the Text Search tab and click "Scan".
- [ ] **Verification:**
    - [ ] Pulse skeleton loader appears.
    - [ ] Analysis is returned in **<8 seconds**.
    - [ ] The "Reasoning" and "Sources" sections are populated.

### **3. 🖼️ Media Deepfake Detection**
- [ ] **Action:** Drag and drop an image file (JPEG/PNG) into the Media Uploader.
- [ ] **Verification:**
    - [ ] Upload progress bar moves smoothly.
    - [ ] "Analysis Complete" toast appears.
    - [ ] Deepfake probability score and manipulation markers are displayed.

### **4. 🛠️ Service Fallbacks (Mock Mode)**
- [ ] **Action:** Temporarily remove `REALITY_DEFENDER_API_KEY` from `/backend/.env` and restart the server.
- [ ] **Verification:** Scan a media file—a "Demo / Mock Content" disclaimer badge must appear with simulated results.

### **5. ⛓️ Rate Limiting & Security**
- [ ] **Action:** Rapidly submit **6 scan requests** within a single minute.
- [ ] **Verification:** The 6th request must return an **HTTP 429 Error** with a "Rate limit exceeded" toast notification.

### **6. 🗄️ History Management**
- [ ] **Action:** Navigate to the `/history` page.
- [ ] **Verification:**
    - [ ] All previous scans are listed with correct type icons.
    - [ ] Pagination controls work correctly if >10 scans exist.

### **7. 🧹 Secure Deletion (Cleanup Audit)**
- [ ] **Action:** Click the trash icon on a media scan.
- [ ] **Verification:**
    - [ ] Scan is removed from the history table instantly.
    - [ ] Check Firebase Storage via the console—the corresponding blob is physically deleted.

### **8. 💓 Platform Health**
- [ ] **Action:** Visit your backend domain `/api/health`.
- [ ] **Verification:** Returns `HTTP 200 OK` with JSON containing `status: "ok"`, `uptime`, and a current server `timestamp`.

---

**TruthLens Deployment Readiness Result:** 🚀 **PASSED** / ⚠️ **FAILED**
