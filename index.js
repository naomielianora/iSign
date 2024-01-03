import express from 'express';
import session from 'express-session';
import crypto from 'crypto';
import bodyParser from 'body-parser';
import forge from 'node-forge';

const PORT = 8080;
const app = express();

import { usernameChecker, signUpUser } from "./query/querySignUp.js";
import { getUserData } from "./query/queryLogin.js";

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

    // Function to derive a key from the user's password
    function deriveKeyFromPassword(password, salt) {
        return crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
    }

    // Function to encrypt the private key using the user's password
    function encryptPrivateKey(privateKey, password) {
        const salt = crypto.randomBytes(16);
        const key = deriveKeyFromPassword(password, salt);
        console.log('Derived Key before:', key.toString('base64'));
        console.log("Salt before " +salt.toString('base64'))

        const cipher = crypto.createCipheriv('aes-256-cbc', key, salt);
        console.log("cipher before " +cipher)
        let encryptedPrivateKey = cipher.update(privateKey, 'utf-8', 'base64');
        encryptedPrivateKey += cipher.final('base64');
        console.log("encryptedPrivateKey before " +encryptedPrivateKey)

        return {
            encryptedPrivateKey,
            salt: salt.toString('base64'),
        };
    }

    const { encryptedPrivateKey, salt } = encryptPrivateKey(privateKey, pass_input);
    // masukan ke database lalu apabila berhasil maka alihkan ke page konfirmasi
    signUpUser(nama_lengkap_sign_up, username_sign_up, password_sign_up, encryptedPrivateKey, publicKey, salt).then(() => 
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


app.get('/check_sign', (req, res)=>{
    res.render('check_sign', {
        nama_lengkap: req.session.nama_lengkap || "",
    })
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

app.post('/sign_doc', auth, (req,res) =>{
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

            // Function to derive a key from the user's password
            function deriveKeyFromPassword(password, salt) {
                return crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
            }

            function decryptPrivateKey(encryptedPrivateKey, password, salt) {
                try {
                    // Convert the salt from a Buffer to a string
                    const saltBuffer = Buffer.from(salt, 'base64');
                    console.log("Salt buffer " + saltBuffer.toString());
                    
                    const key = deriveKeyFromPassword(password, saltBuffer);
                    console.log('Derived Key:', key.toString('base64'));
                    
                    // Debugging: Log intermediate values
                    console.log('Encrypted Private Key:', encryptedPrivateKey);
                
                    const decipher = crypto.createDecipheriv('aes-256-cbc', key, saltBuffer, Buffer.alloc(16, 0));

                    let decryptedPrivateKey = decipher.update(encryptedPrivateKey, 'base64', 'utf-8');
                    decryptedPrivateKey += decipher.final('utf-8');
                
                    return decryptedPrivateKey;
                } catch (error) {
                    console.error('Decryption Error:', error.message);
                    throw error;
                }
            }
            
            

            // Later, when you need to use the private key
            const decryptedPrivateKey = decryptPrivateKey(res_data.private_key, password_input, res_data.salt);

            // Function to create a digital signature
            function createDigitalSignature(data, privateKeyPem) {
                const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
            
                // Hash the data
                const md = forge.md.sha256.create();
                md.update(data, 'utf-8');
                const hash = md.digest();
            
                // Sign the hash with the private key
                const signature = privateKey.sign(md);
            
                return {
                data,
                signature: forge.util.encode64(signature),
                };
            }

            // Create a digital signature
            const digitalSignature = createDigitalSignature(no_surat, decryptedPrivateKey);

            res.render('hasil_sign', {
                nama_lengkap: req.session.nama_lengkap || "",
                digitalSignature: digitalSignature.signature
            })
        }
        //jika email dan/atau password salah
        else {
            passwordWrong = true;
          res.redirect('/form_sign');
        }
    });
    

})

app.get('/hasil_sign', auth, (req, res)=>{
    
})

app.get('/signature_log', (req, res)=>{
    res.render('signature_log', {
        nama_lengkap: req.session.nama_lengkap || "",
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
