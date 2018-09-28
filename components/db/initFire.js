// Realiza e exporta conexão com banco de dados Firebase

var firebase = require("firebase-admin");

var serviceAccount = require("./temperature-manager-setic-firebase-adminsdk-2etzq-d4f484c71b.json");

firebase.initializeApp({
  credential: firebase.credential.cert(serviceAccount),
  databaseURL: "https://temperature-manager-setic.firebaseio.com"
});

exports.firebase = firebase;