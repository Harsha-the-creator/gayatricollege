import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  onSnapshot,
  deleteDoc,
  updateDoc,
  query,
  orderBy,
  getDocs,
  writeBatch,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAexN8Tq8w-IWNFm8P-QmRiYctPgV0HH70",
  authDomain: "gayatri-junior-college.firebaseapp.com",
  projectId: "gayatri-junior-college",
  storageBucket: "gayatri-junior-college.firebasestorage.app",
  messagingSenderId: "348258857161",
  appId: "1:348258857161:web:b02b30d59cc300cec65d18",
  measurementId: "G-TJS886E4DW"
};

const APPLICATIONS_COLLECTION = 'applications';
const FALLBACK_KEY = 'admissions_applications';

let db = null;

try {
  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  db = getFirestore(app);
} catch (error) {
  console.warn('Firebase Firestore initialization failed for applications, using fallback storage:', error);
  db = null;
}

function readFallbackApplications() {
  try {
    return JSON.parse(window.localStorage.getItem(FALLBACK_KEY) || '[]');
  } catch (error) {
    return [];
  }
}

function writeFallbackApplications(apps) {
  try {
    window.localStorage.setItem(FALLBACK_KEY, JSON.stringify(apps));
  } catch (error) {
    console.warn('Unable to persist fallback applications:', error);
  }
}

function normalizeApplication(app = {}, id = '') {
  return {
    id: app.id || id || app.id || '',
    studentName: app.studentName || '',
    dob: app.dob || '',
    gender: app.gender || '',
    parentName: app.parentName || '',
    parentPhone: app.parentPhone || '',
    email: app.email || '',
    address: app.address || '',
    classApplying: app.classApplying || app.class || '',
    prevSchool: app.prevSchool || 'N/A',
    docName: app.docName || app.documentName || 'not_uploaded.pdf',
    docType: app.docType || 'application/pdf',
    docSize: Number(app.docSize || 0),
    status: app.status || 'pending',
    createdAt: app.createdAt || new Date().toISOString(),
    updatedAt: app.updatedAt || new Date().toISOString()
  };
}

async function addApplication(appData) {
  const payload = normalizeApplication({ ...appData, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });

  if (!db) {
    payload.id = 'local-' + Date.now();
    const fallback = readFallbackApplications();
    fallback.unshift(payload);
    writeFallbackApplications(fallback);
    return payload;
  }

  try {
    const appsRef = collection(db, APPLICATIONS_COLLECTION);
    const docRef = doc(appsRef);
    payload.id = docRef.id;
    await setDoc(docRef, payload);
    return payload;
  } catch (error) {
    console.error('Firestore addApplication failed. Falling back to local storage. Error:', error);
    payload.id = 'local-' + Date.now();
    const fallback = readFallbackApplications();
    fallback.unshift(payload);
    writeFallbackApplications(fallback);
    return payload;
  }
}

async function getApplications() {
  const fallback = readFallbackApplications();
  if (!db) return fallback;

  try {
    const appsRef = collection(db, APPLICATIONS_COLLECTION);
    const q = query(appsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const firestoreApps = [];
    snapshot.forEach((docSnap) => {
      firestoreApps.push(normalizeApplication(docSnap.data(), docSnap.id));
    });

    // keep local-only entries (ids starting with local-)
    const localOnly = fallback.filter(a => String(a.id).startsWith('local-'));
    const combined = [...localOnly, ...firestoreApps];
    combined.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    writeFallbackApplications(combined);
    return combined;
  } catch (error) {
    console.warn('Unable to load applications from Firestore, using local fallback:', error);
    return fallback;
  }
}

async function getApplicationById(id) {
  if (!id) return null;
  const fallback = readFallbackApplications();
  const foundLocal = fallback.find(a => String(a.id).toUpperCase() === String(id).trim().toUpperCase());
  if (foundLocal) return foundLocal;

  if (!db) return null;

  try {
    const docRef = doc(db, APPLICATIONS_COLLECTION, id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    const data = normalizeApplication(snap.data(), snap.id);
    return data;
  } catch (error) {
    console.warn('Firestore getApplicationById failed:', error);
    return null;
  }
}

async function updateApplicationStatus(id, newStatus) {
  if (!id) return null;

  // Update local fallback first
  const fallback = readFallbackApplications().map(a => {
    if (a.id === id) {
      return { ...a, status: newStatus, updatedAt: new Date().toISOString() };
    }
    return a;
  });
  writeFallbackApplications(fallback);

  if (!db) return fallback.find(a => a.id === id) || null;

  try {
    const docRef = doc(db, APPLICATIONS_COLLECTION, id);
    await updateDoc(docRef, { status: newStatus, updatedAt: new Date().toISOString() });
    return fallback.find(a => a.id === id) || null;
  } catch (error) {
    console.warn('Firestore updateApplicationStatus failed:', error);
    return fallback.find(a => a.id === id) || null;
  }
}

async function clearApplications() {
  writeFallbackApplications([]);
  if (!db) return [];

  try {
    const appsRef = collection(db, APPLICATIONS_COLLECTION);
    const snapshot = await getDocs(appsRef);
    const batch = writeBatch(db);
    snapshot.forEach((docSnap) => batch.delete(docSnap.ref));
    await batch.commit();
    return [];
  } catch (error) {
    console.warn('Firestore clearApplications failed:', error);
    return [];
  }
}

// Expose ApplicationDB and patch global DB if present
window.ApplicationDB = {
  addApplication,
  getApplications,
  getApplicationById,
  updateApplicationStatus,
  clearApplications
};

function patchGlobalDB() {
  if (!window.DB) return;

  // Only patch methods that exist on the global DB
  if (typeof window.ApplicationDB.addApplication === 'function') {
    window.DB.createApplication = window.ApplicationDB.addApplication;
  }
  if (typeof window.ApplicationDB.getApplications === 'function') {
    window.DB.getApplications = window.ApplicationDB.getApplications;
  }
  if (typeof window.ApplicationDB.getApplicationById === 'function') {
    window.DB.getApplicationById = window.ApplicationDB.getApplicationById;
  }
  if (typeof window.ApplicationDB.updateApplicationStatus === 'function') {
    window.DB.updateApplicationStatus = window.ApplicationDB.updateApplicationStatus;
  }
  if (typeof window.ApplicationDB.clearApplications === 'function') {
    window.DB.clearApplications = window.ApplicationDB.clearApplications;
  }
}

// Attempt patching after a short delay so that pages which load DB first get patched
setTimeout(patchGlobalDB, 150);
