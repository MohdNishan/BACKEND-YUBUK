// const { getDatabase, ref, onValue } = require("firebase/database");
// const { App } = require("firebase-admin/app");


// const Image = ()=>{

//     const db = App.database()
//     const startCountRef = db.ref(db)
//     onValue(startCountRef, ()=>{

//         const data =  snapshot.val()
//         console.log(data)

//     }
//     )

// }
const { initializeApp } = require("firebase/app");
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB3NYjghgVwPWMJhlQcl14B2HYS5fomqtQ",
  authDomain: "yubuk-b1075.firebaseapp.com",
  projectId: "yubuk-b1075",
  storageBucket: "yubuk-b1075.appspot.com",
  messagingSenderId: "852724056379",
  appId: "1:852724056379:web:d3aa07fb07201d27a2771e",
  measurementId: "G-BQBJBN8GMY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Image()
// const {Product} = require('../models/productModel.js');
const {
    getFirestore,
    collection,
    doc,
    addDoc,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
} = require('firebase/firestore');

const data =  () => { 
   const db = getFirestore(app);
    // console.log(db)
}

data()


const getProducts = async (req, res, next) => {
   const db = getFirestore(app);
    try {
      const products = await getDocs(collection(db, 'YUBUK'));
      console.log(products)
      const productArray = [];
  
      if (products.empty) {
        res.status(400).send('No Products found');
      } else {
        products.forEach((doc) => {
          const product = new Product(
            doc.id,
            doc.data().name,    
          );
          productArray.push(product);
        });

        res.status(200).send(productArray);
        // console.log(productArray)
      }
    }
     catch (error) {
    //   res.status(400).send(error.message);
    console.log(error)
    }
  };


getProducts()