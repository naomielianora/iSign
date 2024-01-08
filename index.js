import express from 'express';
import session from 'express-session';
import crypto from 'crypto';
import bodyParser from 'body-parser';
import forge from 'node-forge';

const PORT = 8080;
const app = express();

import { usernameChecker, signUpUser } from "./query/querySignUp.js";
import { getUserData } from "./query/queryLogin.js";
import { getSignerPublicKey, insertSigLog, getSigLog } from "./query/queryUser.js";

app.listen(PORT, () => {
    console.log(`Server is ready, listening on port ${PORT}`);
});

app.set('view engine', 'ejs');
//dipakai untuk routing path file css, assets
app.use(express.static('public'));
//untuk mendapatkan input dari sisi user
app.use(bodyParser.urlencoded({ extended: true }));

//untuk membuat session
app.use(
    session({
      cookie: { maxAge: 86400000 }, //usia maksimal cookie di set 1 hari
      resave: true, //apabila session tidak dimodifikasi, maka jangan disave kembali
      saveUninitialized: true, //jangan save session baru yang tidak dimodifikasi
      secret: 'iSign secret key', //untuk mengamankan session ID cookie yang dikirimkan ke browser pengguna
    })
);

//FOR EACH USER AUTHENTICATION (has login or not)
const auth = (req, res, next) => {
    if (req.session.id_user) {
      next();
    } else {
      //session akan didestroy
      req.session.destroy((err) => {
        if (err) {
            console.log(err);
        } else {
            //ditampilkan halaman bahwa user tidak diperbolehkan mengakses halaman tsb
            res.render('access_denied')
        }
      });
    }
};

//page yang pertama kali muncul (home)
app.get('/', async(req, res)=>{
    res.render('home', {
        id_user: req.session.id_user || 0,
        nama_lengkap: req.session.nama_lengkap || "",
    })
})

//routing untuk masuk ke halaman sign up
app.get('/sign_up', function(req, res) {
    res.render('sign_up');
  });

app.post('/sign_up', function(req, res) {
    //mengambil nama lengkap, email, dan password yang diinput user
    let nama_lengkap_sign_up = req.body.fullname_public;
    let username_sign_up = req.body.username_public;
    //password yang diinput user akan dihash menggunakan sha256
    let pass_input = req.body.pass_public;
    let password_sign_up = crypto.createHash('sha256').update(pass_input).digest('base64');
    // Generate an RSA key pair
    const keyPair = forge.pki.rsa.generateKeyPair({ bits: 2048 });
    const publicKey = forge.pki.publicKeyToPem(keyPair.publicKey);
    const privateKey = forge.pki.privateKeyToPem(keyPair.privateKey);
    // // masukan ke database lalu apabila berhasil maka alihkan ke page konfirmasi
    signUpUser(nama_lengkap_sign_up, username_sign_up, password_sign_up, privateKey, publicKey).then(() => 
        res.redirect('/sign_up_conf')
    )
})

app.get('/sign_up_conf', (req, res)=>{
    res.render('sign_up_conf')
})

//AJAX (mengecek apakah username yg diinput user sudah ada di database)
app.get('/check_username', (req, res) => {
    const inputed_username = req.query.inputed_username;
    let usernameTaken = true;
    usernameChecker(inputed_username).then((data) => {
        usernameTaken = (JSON.parse(JSON.stringify(data))[0]) !== undefined;
        const response = {
            taken: usernameTaken
          };
          
          res.json(response);
    });
  })

  let showAlert = false;
  app.get('/log_in', function(req, res) {
    res.render('log_in', {
      showAlert,
    });
    showAlert = false;
  });

//jika tombol "Login" diklik
app.post('/log_in', (req, res) => {
    //mengambil email dan password yg diinput user
    let username = req.body.username_public;
    //password akan segera dihash dan dicocockan dengan password yang sudah dalam bentuk hash juga di database
    let password = crypto.createHash('sha256').update(req.body.pass_public).digest('base64');
    //cek email dan password ke db, apabila benar, maka akan dikembalikan data user terkait

    getUserData(username, password).then((data) => {
        let res_data = JSON.parse(JSON.stringify(data))[0];
        //jika username&pass benar (ada data yang dikembalikan)
        if (res_data !== undefined) {
          //jangan tampilkan warning
          showAlert = false;
          //tambahkan session
          let session = req.session;
          //tambahkan id_user ke session
          session.id_user = res_data.id_user;
          //tambahkan nama lengkap ke session
          session.nama_lengkap = res_data.nama_lengkap;
          //tambahkan username ke session
          session.username = res_data.username;
          res.redirect('/');
        }
        //jika email dan/atau password salah
        else {
          showAlert = true;
          res.redirect('/log_in');
        }
    });
  });

//apabila tombol "Log Out" di klik
app.get('/log_out', (req, res) => {
    //session akan didestroy
    req.session.destroy((err) => {
        if (err) {
            console.log(err);
        } else {
            res.render('log_out')
        }
    });
  })




let passwordWrong = false;
app.get('/form_sign', auth, (req, res)=>{
    res.render('form_sign', {
        nama_lengkap: req.session.nama_lengkap || "",
        username : req.session.username,
        passwordWrong: passwordWrong
    })
    passwordWrong = false;
})

const current_date = new Date().toISOString().slice(0, 10); //contoh output: 2023-12-25

app.post('/sign_doc', auth, async(req,res) =>{
    let no_surat = req.body.no_surat;
    let signedby = req.body.signedby;
    let password_input = req.body.password
    let password = crypto.createHash('sha256').update(password_input).digest('base64');
    getUserData(signedby, password).then((data) => {
        let res_data = JSON.parse(JSON.stringify(data))[0];
        //jika username&pass benar (ada data yang dikembalikan)
        if (res_data !== undefined) {
            //jangan tampilkan warning
            passwordWrong = false;

            // Function to create a digital signature
            function createDigitalSignature(data, privateKeyPem) {
                const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
            
                // Hash the data
                const md = forge.md.sha256.create();
                md.update(data, 'utf-8');
                const hash = md.digest();
                console.log(hash);
                console.log(md);
            
                // Sign the hash with the private key
                const signature = privateKey.sign(md);
            
                return {
                data,
                signature: forge.util.encode64(signature),
                };
            }

            // Create a digital signature
            const digitalSignature = createDigitalSignature(no_surat, res_data.private_key);
            console.log(res_data.private_key);

            //hasil enkripsi
            const signature = digitalSignature.signature;
            //nomor surat
            const data = digitalSignature.data;
            console.log(signature);
            console.log(data);

            // Masukan log signature ke database
            insertSigLog(data, signature, current_date, req.session.id_user)

            res.render('hasil_sign', {
                nama_lengkap: req.session.nama_lengkap || "",
                digitalSignature: digitalSignature.signature,
                username: req.session.username
            })
        }
        //jika email dan/atau password salah
        else {
            passwordWrong = true;
          res.redirect('/form_sign');
        }
    });
    

})

app.get('/check_sign', (req, res)=>{
    res.render('check_sign', {
        id_user: req.session.id_user || 0,
        nama_lengkap: req.session.nama_lengkap || "",
    })
})

app.post('/check_sign', async(req, res)=>{
    let isiQR = req.body.isiQR;
    let signed_by = isiQR.substring(10,14);
    let digital_sig = isiQR.substring(18);

    let no_surat = req.body.no_surat;

    let public_key = await getSignerPublicKey(signed_by);

    console.log(signed_by);
    console.log(digital_sig);
    console.log(no_surat);
    console.log(public_key[0].public_key);


    // Function to verify a digital signature
    function verifyDigitalSignature(data, signature, publicKeyPem) {
        const publicKey = forge.pki.publicKeyFromPem(publicKeyPem);
    
        // Hash the data
        const md = forge.md.sha256.create();
        md.update(data, 'utf-8');
        const hash = md.digest();
        console.log(hash);
        console.log(md);
    
        // Decode the signature
        const decodedSignature = forge.util.decode64(signature);
    
        // Verify the signature using the public key
        const isValid = publicKey.verify(hash, decodedSignature);
    
        return isValid;
    }

    // Verify the digital signature
    const isValidSignature = verifyDigitalSignature(
        no_surat,
        digital_sig,
        public_key[0].public_key
    );
    
    console.log('Is Signature Valid?', isValidSignature);



})

app.get('/hasil_sign', auth, (req, res)=>{
    
})

app.get('/signature_log', auth, async(req, res)=> {
    let sigLog = await getSigLog(req.session.id_user);
    res.render('signature_log', {
        nama_lengkap: req.session.nama_lengkap || "",
        username: req.session.username,
        sigLog: sigLog
    })
})




// console.log('Encrypted Data:', forge.util.encode64(encryptedData));

// // Decrypt using the private key
// const decryptedData = forge.pki.privateKeyFromPem(privateKey).decrypt(encryptedData, 'RSA-OAEP');
// console.log('Decrypted Data:', decryptedData);

//   // Example usage
//   const userPassword = 'user-password';
  
  
//   // Store encryptedPrivateKey, salt, and publicKey in the database
  
  
  
//   console.log('Decrypted Private Key:', decryptedPrivateKey);
//   console.log('Public Key:', publicKey);
