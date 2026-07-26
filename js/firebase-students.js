import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  setDoc,
  onSnapshot,
  deleteDoc,
  updateDoc,
  query,
  orderBy,
  getDocs,
  writeBatch
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

const FALLBACK_KEY = 'student_records_fallback';
let db = null;

try {
  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  db = getFirestore(app);
} catch (error) {
  console.warn('Firebase Firestore initialization failed, using fallback storage:', error);
}

function readFallbackStudents() {
  try {
    return JSON.parse(window.localStorage.getItem(FALLBACK_KEY) || '[]');
  } catch (error) {
    return [];
  }
}

function writeFallbackStudents(students) {
  try {
    window.localStorage.setItem(FALLBACK_KEY, JSON.stringify(students));
  } catch (error) {
    console.warn('Unable to persist fallback student records:', error);
  }
}

function normalizeStudent(student, id) {
  const feesValue = Number(student.fees || 0);
  const feesPaidValue = Number(student.feesPaid || 0);

  return {
    id: student.id || id || '',
    studentName: student.studentName || '',
    className: student.className || student.class || '',
    fees: Number.isNaN(feesValue) ? 0 : feesValue,
    feesPaid: Number.isNaN(feesPaidValue) ? 0 : feesPaidValue,
    photo: student.photo || '',
    parentName: student.parentName || '',
    parentPhone: student.parentPhone || '',
    admissionDate: student.admissionDate || '',
    notes: student.notes || '',
    createdAt: student.createdAt || new Date().toISOString()
  };
}

let activeListenerCallback = null;

function notifyListener() {
  if (activeListenerCallback) {
    const fallbackStudents = readFallbackStudents();
    activeListenerCallback(fallbackStudents.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
  }
}

async function addStudent(studentData) {
  const payload = normalizeStudent({
    ...studentData,
    createdAt: new Date().toISOString()
  });

  if (!db) {
    payload.id = 'local-' + Date.now();
    const fallbackStudents = readFallbackStudents();
    fallbackStudents.unshift(payload);
    writeFallbackStudents(fallbackStudents);
    notifyListener();
    return payload;
  }

  try {
    const studentsRef = collection(db, 'students');
    const docRef = doc(studentsRef);
    payload.id = docRef.id;
    
    await setDoc(docRef, payload);
    return payload;
  } catch (error) {
    console.error('Firestore addStudent failed. This is likely due to Firestore Security Rules blocking writes. Error:', error);
    payload.id = 'local-' + Date.now();
    const fallbackStudents = readFallbackStudents();
    fallbackStudents.unshift(payload);
    writeFallbackStudents(fallbackStudents);
    notifyListener();
    return payload;
  }
}

function listenStudents(callback) {
  activeListenerCallback = callback;
  if (!db) {
    const fallbackStudents = readFallbackStudents();
    callback(fallbackStudents.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    return () => {};
  }

  const studentsRef = collection(db, 'students');
  const q = query(studentsRef, orderBy('createdAt', 'desc'));

  return onSnapshot(q, (snapshot) => {
    const firestoreStudents = [];
    snapshot.forEach((doc) => {
      firestoreStudents.push(normalizeStudent(doc.data(), doc.id));
    });

    const fallbackStudents = readFallbackStudents();
    const localOnly = fallbackStudents.filter(s => s && String(s.id).startsWith('local-'));
    const combined = [...localOnly, ...firestoreStudents];
    combined.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    writeFallbackStudents(combined);
    callback(combined);
  }, (error) => {
    console.warn('Firestore student listener failed, using local fallback:', error);
    const fallbackStudents = readFallbackStudents();
    callback(fallbackStudents.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
  });
}

async function removeStudent(id) {
  if (!id) return;
  
  // Always remove from local fallback storage
  const fallbackStudents = readFallbackStudents().filter(student => student.id !== id);
  writeFallbackStudents(fallbackStudents);
  notifyListener();

  if (!db) return;

  try {
    const docRef = doc(db, 'students', id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Firestore removeStudent failed:', error);
  }
}

async function updateStudent(id, updates) {
  if (!id) return null;

  // Always update local fallback storage
  const fallbackStudents = readFallbackStudents().map(student => student.id === id ? { ...student, ...updates } : student);
  writeFallbackStudents(fallbackStudents);
  notifyListener();

  if (!db) {
    return { id, ...updates };
  }

  try {
    const docRef = doc(db, 'students', id);
    await updateDoc(docRef, updates);
    return { id, ...updates };
  } catch (error) {
    console.error('Firestore updateStudent failed:', error);
    return { id, ...updates };
  }
}

async function clearAllStudents() {
  writeFallbackStudents([]);
  notifyListener();

  if (!db) return;

  try {
    const studentsRef = collection(db, 'students');
    const snapshot = await getDocs(studentsRef);
    const batch = writeBatch(db);
    snapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();
  } catch (error) {
    console.error('Firestore clearAllStudents failed:', error);
  }
}

window.StudentDB = {
  addStudent,
  listenStudents,
  removeStudent,
  updateStudent,
  clearAllStudents
};
