import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadString } from 'firebase/storage';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json'));
const app = initializeApp(config);
const storage = getStorage(app);
const testRef = ref(storage, 'test.txt');
uploadString(testRef, 'hello world').then(() => {
  console.log('Upload success');
}).catch(e => {
  console.error('Upload failed:', e.message);
});
