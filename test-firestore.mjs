import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json'));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

const bigData = 'a'.repeat(500 * 1024); // 500KB
setDoc(doc(db, 'test', 'big'), { data: bigData }).then(() => {
  console.log('Firestore save success');
}).catch(e => {
  console.error('Firestore save failed:', e.message);
});
