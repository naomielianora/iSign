import express from 'express';
import session from 'express-session';
import crypto from 'crypto';
import bodyParser from 'body-parser';
import forge from 'node-forge';

const PORT = 8080;
const app = express();

import { emailChecker, signUpUser } from "./query/querySignUp.js";
import { getUserData } from "./query/queryLogin.js";
import { getSignerPublicKey, insertSigLog, getSigLog, checkSignature } from "./query/queryUser.js";

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

//USER SIGN UP
app.post('/sign_up', function(req, res) {
    //mengambil nama lengkap, email, dan password yang diinput user
    let nama_lengkap_sign_up = req.body.fullname_public;
    let email_sign_up = req.body.email_public;
    //password yang diinput user akan dihash menggunakan sha256
    let pass_input = req.body.pass_public;
    let password_sign_up = crypto.createHash('sha256').update(pass_input).digest('base64');

    //GENERATE RSA KEY PAR FOR NEW USER
    const keyPair = forge.pki.rsa.generateKeyPair({ bits: 2048 });
    const publicKey = forge.pki.publicKeyToPem(keyPair.publicKey);
    const privateKey = forge.pki.privateKeyToPem(keyPair.privateKey);

    // Function to derive a key from the user's password. The derived key is used to encrypt the private key securely.
    function deriveKeyFromPassword(password, salt) {
        //Fungsi deriveKeyFromPassword menggunakan algoritma PBKDF2 (Password-Based Key Derivation Function 2) untuk mengubah password pengguna menjadi kunci enkripsi.
        //Salt (nilai acak) dan password digunakan untuk menghasilkan kunci derivasi yang unik.
        //Proses ini dilakukan dengan 100,000 iterasi untuk menambah keamanan terhadap serangan brute-force.
        return crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
    }

    // Function to encrypt the private key using the user's password
    function encryptPrivateKey(privateKey, password) {
        //IV (Initialization Vector) digunakan untuk memastikan setiap enkripsi menghasilkan ciphertext yang berbeda meskipun plaintext yang dienkripsi sama. Length: 16 bytes (128 bits)
        const iv = crypto.randomBytes(16);
        
        //Salt digunakan untuk memastikan bahwa password yg sama bisa menghasilkan hasil yg berbeda. Harus unik untuk tiap user
        const salt = crypto.randomBytes(16);

        //Generate key dari password dan salt
        const key = deriveKeyFromPassword(password, salt);

        const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
        //Kunci yang dihasilkan dari password dan salt digunakan untuk mengenkripsi private key menggunakan algoritma AES-256-CBC.
        //Algorithm: AES-256-CBC (Advanced Encryption Standard with 256-bit key size and Cipher Block Chaining mode).
        
        let encryptedPrivateKey = cipher.update(privateKey, 'utf-8', 'base64');
        // cipher.update: Encrypts the data (private key).
        // privateKey: The plaintext private key.
        // utf-8: The encoding of the input data.
        // base64: The encoding of the output data.

        encryptedPrivateKey += cipher.final('base64');

        return {
            encryptedPrivateKey,
            salt: salt.toString('base64'),
            iv: iv.toString('base64')
        };
    }

    const { encryptedPrivateKey, salt, iv } = encryptPrivateKey(privateKey, pass_input);

    //masukan ke database lalu apabila berhasil maka alihkan ke page konfirmasi
    signUpUser(nama_lengkap_sign_up, email_sign_up, password_sign_up, encryptedPrivateKey, publicKey, salt, iv)
        .then(() => res.redirect('/sign_up_conf'));
})

app.get('/sign_up_conf', (req, res)=>{
    res.render('sign_up_conf')
})

//untuk mengecek apakah email yg diinput user sudah ada di database
app.get('/check_email', (req, res) => {
    const inputed_email = req.query.inputed_email;
    let emailTaken = true;
    emailChecker(inputed_email).then((data) => {
        emailTaken = (JSON.parse(JSON.stringify(data))[0]) !== undefined;
        const response = {
            taken: emailTaken
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

//LOG IN USER
app.post('/log_in', (req, res) => {
    //mengambil email dan password yg diinput user
    let email = req.body.email_public;
    //password akan segera dihash dan dicocockan dengan password yang sudah dalam bentuk hash juga di database
    let password = crypto.createHash('sha256').update(req.body.pass_public).digest('base64');
    //cek email dan password ke db, apabila benar, maka akan dikembalikan data user terkait

    getUserData(email, password).then((data) => {
        let res_data = JSON.parse(JSON.stringify(data))[0];
        //jika email&pass benar (ada data yang dikembalikan)
        if (res_data !== undefined) {
          //jangan tampilkan warning
          showAlert = false;
          //tambahkan session
          let session = req.session;
          //tambahkan id_user ke session
          session.id_user = res_data.id_user;
          //tambahkan nama lengkap ke session
          session.nama_lengkap = res_data.nama_lengkap;
          //tambahkan email ke session
          session.email = res_data.email;
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
let hasSigned = false;
app.get('/form_sign', auth, (req, res)=>{
    res.render('form_sign', {
        nama_lengkap: req.session.nama_lengkap || "",
        passwordWrong: passwordWrong,
        hasSigned: hasSigned
    })
    passwordWrong = false;
    hasSigned = false;
})

//untuk mengambil tanggal saat ini
const current_date = new Date().toISOString().slice(0, 10);

//SIGN DOCUMENT
app.post('/sign_doc', auth, async(req,res) =>{
    //ambil nilai" yang diinput oleh user
    let no_surat = req.body.no_surat;
    let signedby = req.body.signedby;
    let password_input = req.body.password
    let password = crypto.createHash('sha256').update(password_input).digest('base64');

    //cek apakah user sudah pernah sign document yang sama
    checkSignature(req.session.id_user, no_surat).then((signature) => {
        if(signature.length >= 1){
            //tampilkan warning
            hasSigned = true;
            res.redirect('/form_sign');
        }
        else{
            //cek apakah password yang diinput benar
            getUserData(signedby, password).then((data) => {
            let res_data = JSON.parse(JSON.stringify(data))[0];
            //jika email&pass benar (ada data yang dikembalikan)
            if (res_data !== undefined) {
                //jangan tampilkan warning
                passwordWrong = false;

                // Function to derive a key from the user's password
                function deriveKeyFromPassword(password, salt) {
                    return crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
                }

                // Function to decrypt the private key using the user's password
                function decryptPrivateKey(encryptedPrivateKey, password, salt, iv) {
                    const saltBuffer = Buffer.from(salt, 'base64');
                    const ivBuffer = Buffer.from(iv, 'base64');
                    //Convert the base64-encoded salt and IV from the database back into their original binary forms.

                    const key = deriveKeyFromPassword(password, saltBuffer);

                    const decipher = crypto.createDecipheriv('aes-256-cbc', key, ivBuffer);
                    let decryptedPrivateKey = decipher.update(encryptedPrivateKey, 'base64', 'utf-8');
                    //Input Encoding: base64 is the encoding of the encrypted private key.
                    //Output Encoding: utf-8 is the encoding of the decrypted private key.
                    decryptedPrivateKey += decipher.final('utf-8');

                    return decryptedPrivateKey;
                }

                const decryptedPrivateKey = decryptPrivateKey(res_data.private_key, password_input, res_data.salt, res_data.iv);

                //CREATE DIGITAL SIGNATURE
                function createDigitalSignature(data, privateKeyPem) {
                    //private key user
                    const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
                
                    //hash data berupa no surat dengan sha 256
                    const md = forge.md.sha256.create();
                    md.update(data, 'utf-8');
                    const hash = md.digest();

                    //buat signature dari hasil hash tsb dan dienkripsi dengan private key user
                    const signature = privateKey.sign(md);
                    
                    //kembalikan data(no surat) dan digital signaturenya
                    return {
                        data,
                        signature: forge.util.encode64(signature),
                    };
                }

                //masukan data ke method
                const digitalSignature = createDigitalSignature(no_surat, decryptedPrivateKey);

                //ambil digital signature dari hasil method
                const signature = digitalSignature.signature;
                //ambil data yaitu no surat dari hasil method
                const data = digitalSignature.data;

                //masukan data ke signature log
                insertSigLog(data, signature, current_date, req.session.id_user)

                //tampilkan hasil ke user
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
        }
        
    })
})

app.get('/check_sign', (req, res)=>{
    res.render('check_sign', {
        id_user: req.session.id_user || 0,
        nama_lengkap: req.session.nama_lengkap || "",
    })
})

app.post('/check_sign', async(req, res)=>{
    //ambil isi QR yang diinput
    let isiQR = req.body.isiQR;
    //ambil username yang ada di QR (siapa yang ttd)
    let signed_by = isiQR.substring(10,14);
    //ambil digital signature yang ada di QR
    let digital_sig = isiQR.substring(18);

    //ambil no surat yang diinput
    let no_surat = req.body.no_surat;

    //ambil public key dari username yang tertera di QR
    let public_key = await getSignerPublicKey(signed_by);

    //VERIFY DIGITAL SIGNATURE
    function verifyDigitalSignature(data, signature, publicKeyPem) {
        try{
            //public key user yang username nya terdapat di QR
            const publicKey = forge.pki.publicKeyFromPem(publicKeyPem);
        
            //hash no surat dengan sha256
            const md = forge.md.sha256.create();
            md.update(data, 'utf-8');
            const hash = md.digest();
        
            //decode signature
            const decodedSignature = forge.util.decode64(signature);

            //Verify signature menggunakan public key (akan return true jika valid dan false jika tidak valid)
            const isValid = publicKey.verify(md.digest().getBytes(), decodedSignature);
            return isValid;
        }
        catch (error) {
            // jika QR is corrupted by other username that exist in db (the public key is not match)
            return false; 
        }
    }
    let isValidSignature;

    // jika QR is corrupted by username that does not exist in db
    if(public_key[0] == undefined){
        isValidSignature = false
    }else{
        // Verify the digital signature
        isValidSignature = verifyDigitalSignature(
            no_surat,
            digital_sig,
            public_key[0].public_key
        );
    }
    
    //kirim data ke client apakah signature valid atau tidak dan tampilkan pop up yang sesuai
    res.json({ PopUpValid: isValidSignature });
})

app.get('/check_doc', (req, res)=>{
    res.render('check_doc', {
        id_user: req.session.id_user || 0,
        nama_lengkap: req.session.nama_lengkap || "",
    })
})

app.post('/check_doc', async(req, res)=>{
    //ambil isi QR yang diinput
    let isiQR = req.body.isiQR;
    //ambil username yang ada di QR (siapa yang ttd)
    let signed_by = isiQR.substring(10,14);
    //ambil digital signature yang ada di QR
    let digital_sig = isiQR.substring(18);

    //ambil no surat yang diinput
    let no_surat = req.body.no_surat;
    
})

app.get('/signature_log', auth, async(req, res)=> {
    let sigLog = await getSigLog(req.session.id_user);
    res.render('signature_log', {
        nama_lengkap: req.session.nama_lengkap || "",
        username: req.session.username,
        sigLog: sigLog
    })
})