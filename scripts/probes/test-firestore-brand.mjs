import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';
import fs from 'fs';
const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json'));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

getDocs(collection(db, 'projects')).then(snapshot => {
  snapshot.forEach(doc => {
    if (doc.id.startsWith('brand_')) {
      console.log('Brand Doc ID:', doc.id);
      console.log('Brand Data:', JSON.stringify(doc.data(), null, 2));
    }
  });
  process.exit(0);
}).catch(e => { console.error(e); process.exit(1); });
