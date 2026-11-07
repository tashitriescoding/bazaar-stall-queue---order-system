// Loads Firebase and hands it to app.js through window.FB.
// If anything fails (offline, blocked), app.js falls back to demo mode.
const B='https://www.gstatic.com/firebasejs/13.2.0/';
const firebaseConfig={
  apiKey:"AIzaSyBcNT7OHOW7-5iZ06bZJp31_BWazW-av4g",
  authDomain:"bazaar-stall-order-queue.firebaseapp.com",
  projectId:"bazaar-stall-order-queue",
  storageBucket:"bazaar-stall-order-queue.firebasestorage.app",
  messagingSenderId:"464599452909",
  appId:"1:464599452909:web:45416c3354ec1a79f250e4"
};
try{
  const [{initializeApp},fs,au]=await Promise.all([
    import(B+'firebase-app.js'),import(B+'firebase-firestore.js'),import(B+'firebase-auth.js')]);
  const app=initializeApp(firebaseConfig);
  // auto-switch to a more tolerant connection mode on networks that block live streaming
  let db;try{db=fs.initializeFirestore(app,{experimentalAutoDetectLongPolling:true})}catch(e){db=fs.getFirestore(app)}
  window.FB={
    db,auth:au.getAuth(app),
    collection:fs.collection,doc:fs.doc,getDoc:fs.getDoc,setDoc:fs.setDoc,updateDoc:fs.updateDoc,onSnapshot:fs.onSnapshot,
    runTransaction:fs.runTransaction,writeBatch:fs.writeBatch,query:fs.query,where:fs.where,
    signInAnonymously:au.signInAnonymously,signInWithEmailAndPassword:au.signInWithEmailAndPassword,
    signOut:au.signOut,onAuthStateChanged:au.onAuthStateChanged};
  window.__fbResolve(true);
}catch(e){
  console.error('Firebase failed to load',e);
  window.__fbResolve(false);
}
