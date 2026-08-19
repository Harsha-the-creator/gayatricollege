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
import { loadFirebaseConfig } from './firebase-config.js';

let db = null;

try {
  const firebaseConfig = await loadFirebaseConfig();
  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  db = getFirestore(app);
} catch (error) {
  console.error('Firebase Firestore initialization failed for student records:', error);
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

async function addStudent(studentData) {
  const payload = normalizeStudent({
    ...studentData,
    createdAt: new Date().toISOString()
  });

  if (!db) {
    throw new Error('Student records are unavailable because Firebase is not connected.');
  }

  try {
    const studentsRef = collection(db, 'students');
    const docRef = doc(studentsRef);
    payload.id = docRef.id;
    
    await setDoc(docRef, payload);
    return payload;
  } catch (error) {
    console.error('Firestore addStudent failed:', error);
    throw error;
  }
}

function listenStudents(callback) {
  if (!db) {
    console.error('Student records are unavailable because Firebase is not connected.');
    callback([]);
    return () => {};
  }

  const studentsRef = collection(db, 'students');
  const q = query(studentsRef, orderBy('createdAt', 'desc'));

  return onSnapshot(q, (snapshot) => {
    const firestoreStudents = [];
    snapshot.forEach((doc) => {
      firestoreStudents.push(normalizeStudent(doc.data(), doc.id));
    });

    callback(firestoreStudents);
  }, (error) => {
    console.error('Firestore student listener failed:', error);
    callback([]);
  });
}

async function removeStudent(id) {
  if (!id) return;

  if (!db) {
    throw new Error('Student records are unavailable because Firebase is not connected.');
  }

  try {
    const docRef = doc(db, 'students', id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Firestore removeStudent failed:', error);
  }
}

async function updateStudent(id, updates) {
  if (!id) return null;

  if (!db) {
    throw new Error('Student records are unavailable because Firebase is not connected.');
  }

  try {
    const docRef = doc(db, 'students', id);
    await updateDoc(docRef, updates);
    return { id, ...updates };
  } catch (error) {
    console.error('Firestore updateStudent failed:', error);
    throw error;
  }
}

async function clearAllStudents() {
  if (!db) {
    throw new Error('Student records are unavailable because Firebase is not connected.');
  }

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
