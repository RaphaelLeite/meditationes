import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, deleteDoc, collection, getDocs, query, where, writeBatch } from 'firebase/firestore';

// =====================================================
// PASTE YOUR FIREBASE CONFIG BELOW (from Step 2 of the guide)
// =====================================================
const firebaseConfig = {
  apiKey: "PASTE_YOUR_API_KEY_HERE",
  authDomain: "PASTE_YOUR_AUTH_DOMAIN_HERE",
  projectId: "PASTE_YOUR_PROJECT_ID_HERE",
  storageBucket: "PASTE_YOUR_STORAGE_BUCKET_HERE",
  messagingSenderId: "PASTE_YOUR_SENDER_ID_HERE",
  appId: "PASTE_YOUR_APP_ID_HERE"
};
// =====================================================

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// All data lives in one Firestore collection called "store"
// Each document has an id (the key) and a "value" field (the JSON data)
const COLLECTION = 'store';

export const cloudStorage = {
  get: async (key) => {
    try {
      const snap = await getDoc(doc(db, COLLECTION, encodeKey(key)));
      if (snap.exists()) return snap.data().value;
      return null;
    } catch (e) { console.error('DB get error:', e); return null; }
  },

  set: async (key, value) => {
    try {
      await setDoc(doc(db, COLLECTION, encodeKey(key)), { value, updatedAt: new Date().toISOString() });
    } catch (e) { console.error('DB set error:', e); }
  },

  delete: async (key) => {
    try {
      await deleteDoc(doc(db, COLLECTION, encodeKey(key)));
    } catch (e) { console.error('DB delete error:', e); }
  },

  // Get all documents (for export)
  getAll: async () => {
    try {
      const snap = await getDocs(collection(db, COLLECTION));
      const data = {};
      snap.forEach(d => { data[decodeKey(d.id)] = d.data().value; });
      return data;
    } catch (e) { console.error('DB getAll error:', e); return {}; }
  },

  // List keys that start with a prefix
  listKeys: async (prefix) => {
    try {
      const snap = await getDocs(collection(db, COLLECTION));
      const keys = [];
      snap.forEach(d => {
        const k = decodeKey(d.id);
        if (k.startsWith(prefix)) keys.push(k);
      });
      return keys;
    } catch (e) { console.error('DB listKeys error:', e); return []; }
  },

  // Bulk write (for import)
  setAll: async (data) => {
    try {
      const batch = writeBatch(db);
      Object.entries(data).forEach(([key, value]) => {
        batch.set(doc(db, COLLECTION, encodeKey(key)), { value, updatedAt: new Date().toISOString() });
      });
      await batch.commit();
    } catch (e) { console.error('DB setAll error:', e); }
  },

  // Clear everything
  clearAll: async () => {
    try {
      const snap = await getDocs(collection(db, COLLECTION));
      const batch = writeBatch(db);
      snap.forEach(d => batch.delete(d.ref));
      await batch.commit();
    } catch (e) { console.error('DB clearAll error:', e); }
  }
};

// Firestore doc IDs can't contain "/" so we encode colons to be safe
function encodeKey(k) { return k.replace(/\//g, '__slash__'); }
function decodeKey(k) { return k.replace(/__slash__/g, '/'); }

export { db };
