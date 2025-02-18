import express from 'express';
import session from 'express-session';
import crypto from 'crypto';
import bodyParser from 'body-parser';
import forge from 'node-forge';
import multer from 'multer';
import QRCode from 'qrcode';
import { PdfReader } from 'pdfreader';
import { PDFDocument, PDFRawStream } from 'pdf-lib';
import Jimp from 'jimp';
import jsQR from 'jsqr';


const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const PORT = 8080;
const app = express();

import { nameChecker, emailChecker, signUpUser } from "./query/querySignUp.js";
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
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

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

// Fungsi untuk membuat sebuah key dari password user. Key ini kemudian akan digunakan untuk mengenkripsi private key user
function deriveKeyFromPassword(password, salt) {
    //Menggunakan algoritma PBKDF2 (Password-Based Key Derivation Function 2) untuk mengubah password pengguna menjadi kunci enkripsi.
    //Salt dan password digunakan untuk menghasilkan kunci derivasi yang unik.
    //Proses ini dilakukan dengan 100,000 iterasi untuk menambah keamanan terhadap serangan brute-force.
    //Kunci yang dihasilkan memiliki panjang 32 byte (256 bit)
    return crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
}

//Page yang pertama kali muncul (home)
app.get('/', async(req, res)=>{
    res.render('home', {
        id_user: req.session.id_user || 0,
        nama_lengkap: req.session.nama_lengkap || "",
    })
})

//Routing untuk masuk ke halaman sign up
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

    //GENERATE RSA KEY PAIR FOR NEW USER
    const keyPair = forge.pki.rsa.generateKeyPair({ bits: 2048 });
    const publicKey = forge.pki.publicKeyToPem(keyPair.publicKey);
    const privateKey = forge.pki.privateKeyToPem(keyPair.privateKey);

    //ENKRIPSI PRIVATE KEY
    //Pembuatan Salt (untuk memastikan bahwa proses derivasi key dari password menghasilkan key yang unik, meskipun pengguna memiliki password yang sama)
    //ukuran 16 bytes (129 bits)
    const salt = crypto.randomBytes(16);

    //Membuat kunci untuk enkripsi menggunakan password user dan salt 
    //Menggunakan algoritma PBKDF2 (Password-Based Key Derivation Function 2) untuk mengubah password pengguna menjadi kunci enkripsi.
    //Salt dan password digunakan untuk menghasilkan kunci derivasi yang unik.
    //Proses ini dilakukan dengan 100,000 iterasi untuk menambah keamanan terhadap serangan brute-force.
    //Kunci yang dihasilkan memiliki panjang 32 byte (256 bit)
    const key = crypto.pbkdf2Sync(pass_input, salt, 100000, 32, 'sha256');

    //menggunakan IV (Initialization Vector) untuk memastikan setiap enkripsi menghasilkan ciphertext yang berbeda meskipun plaintext yang dienkripsi sama. Length: 16 bytes (128 bits)
    const iv = crypto.randomBytes(16);

    //enkripsi private key mengguankan Algoritma AES-256-CBC (Advanced Encryption Standard with 256-bit key size and Cipher Block Chaining mode)
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encryptedPrivateKey = cipher.update(privateKey, 'utf-8', 'base64');
    // utf-8: The encoding of the input data.
    // base64: The encoding of the output data.
    encryptedPrivateKey += cipher.final('base64');

    //masukan ke database lalu apabila berhasil maka alihkan ke page konfirmasi
    signUpUser(nama_lengkap_sign_up, email_sign_up, password_sign_up, encryptedPrivateKey, publicKey, salt.toString('base64'), iv.toString('base64'))
        .then(() => res.redirect('/sign_up_conf'));
})

//SIGN UP CONFIRMATION
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

//untuk mengecek apakah nama yg diinput user sudah ada di database
app.get('/check_name', (req, res) => {
    const inputed_name = req.query.inputed_name;
    let nameTaken = true;
    nameChecker(inputed_name).then((data) => {
        nameTaken = (JSON.parse(JSON.stringify(data))[0]) !== undefined;
        const response = {
            taken: nameTaken
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

//USER LOG OUT
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

//SIGN A DOCUMENT FORM
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
app.post('/sign_doc', auth,  upload.single('surat'),async(req, res) => {
    try {
        //ambil nilai" yang diinput oleh user
        let no_surat = req.body.no_surat;
        let password_input = req.body.password;
        let password = crypto.createHash('sha256').update(password_input).digest('base64');
        //ambil email dari user
        let email = req.session.email;

        //mengecek apakah user sudah pernah ttd document tsb
        const signatureCount = await checkSignature(req.session.id_user, no_surat);
        if (signatureCount.length >= 1) {
            hasSigned = true;
            return res.redirect('/form_sign');
        }

        //cek apakah password yang diinput benar
        const userData = await getUserData(email, password);
        let res_data = JSON.parse(JSON.stringify(userData))[0];

        //jika password salah
        if (res_data === undefined) {
            passwordWrong = true;
            return res.redirect('/form_sign');
        }

        //jika benar, jangan tampilkan warning dan lanjut ke proses selanjutnya
        passwordWrong = false;

        //NEED: decrypted private key
        //ambil salt dan iv dari db, convert base64-encoded balik ke bentuk binary
        const saltBuffer = Buffer.from(res_data.salt, 'base64');
        const ivBuffer = Buffer.from(res_data.iv, 'base64');
        //dapatkan kembali key dari password user
        const key = deriveKeyFromPassword(password_input, saltBuffer);
        //dekripsi private key
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, ivBuffer);
        let decryptedPrivateKey = decipher.update(res_data.private_key, 'base64', 'utf-8');
        decryptedPrivateKey += decipher.final('utf-8');

        //CREATE DIGITAL SIGNATURE (menggunakan nomor surat)
        const privateKey = forge.pki.privateKeyFromPem(decryptedPrivateKey);

        //NO SURAT DI HASHED
        //nomor surat dihash (menjadi message digest)
        const md = forge.md.sha256.create();
        md.update(no_surat, 'utf8'); 
        //sign menggunakan private key
        const signature = forge.util.encode64(privateKey.sign(md));

        //HASH ISI SURAT 

        //ambil file pdf dari buffer
        const pdfBuffer = req.file.buffer;
        let extractedText = '';
        
        //membaca isi dari pdf dan return textnya
        const parseBuffer = () => new Promise((resolve, reject) => {
            new PdfReader().parseBuffer(pdfBuffer, (err, item) => {
                if (err) {
                    reject(err);
                } else if (!item) {
                    resolve(extractedText);
                } else if (item.text) {
                    extractedText += item.text;
                }
            });
        });
        extractedText = await parseBuffer();
        //hash isi dari pdf
        const hash = crypto.createHash('sha256');
        hash.update(extractedText);
        const hashedText = hash.digest('base64');

        //kosongkan buffer
        req.file.buffer = null;

        //buat template signature
        const final_signature = 'SIGNED BY: ' + req.session.nama_lengkap + ' SIGNATURE: ' + signature + ' DOCUMENT: ' + hashedText;


        //Generate QR Code
        const qrCodePngData = await QRCode.toDataURL(final_signature, {
            errorCorrectionLevel: 'L', 
            margin: 1,
            width: 256,
            color: {
                //warna QR Code = hitam
                dark: '#000000', 
                //warna background = putih
                light: '#FFFFFF' 
            }
        });

        //ubah format png ke jpg
        const qrCodeImage = await Jimp.read(Buffer.from(qrCodePngData.split(',')[1], 'base64'));
        //memastikan warna background putih
        qrCodeImage.background(0xFFFFFFFF);
        //mengonversi gambar QR Code dengan kualitas tertentu agar mudah dideteksi
        const jpgBuffer = await qrCodeImage.quality(80).getBufferAsync(Jimp.MIME_JPEG);
        //convert data gambar ke base64 string
        const qrCodeData = `data:image/jpg;base64,${jpgBuffer.toString('base64')}`;

        //insert hasil dari signature ke database
        await insertSigLog(no_surat, final_signature, qrCodeData, current_date, req.session.id_user);

        res.render('hasil_sign', {
            nama_lengkap: req.session.nama_lengkap || "",
            digitalSignature: final_signature,
            qrCodeData,
            no_surat
        });

    } catch (error) {
        console.error('An error occurred while processing the document:', error);
        res.status(500).send('An error occurred while processing the document');
    }
});


//CHECK A SIGNATURE FORM
app.get('/check_sign', (req, res)=>{
    res.render('check_sign', {
        id_user: req.session.id_user || 0,
        nama_lengkap: req.session.nama_lengkap || ""
    })
})

//CHECK SIGNATURE AND DOCUMENT
app.post('/check_sign', upload.single('surat'), async(req, res)=>{
    
    let pdfBuffer = req.file.buffer;

    //load file pdf dari buffer
    const pdfDoc = await PDFDocument.load(pdfBuffer);

    let sig_qr_counter = 0;
    const indirectObjects = pdfDoc.context.indirectObjects;

    let qr_name;
    let qr_signatureHash;
    let qr_documentHash;

    //looping untuk akses tiap objek yang ada di pdf
    for (const [ref, object] of indirectObjects) {
        if (object instanceof PDFRawStream) {
            const rawStreamContents = object.contents;
            try {

                //cek apakah format file adalah JPG atau PNG
                let isImage = false;
                if (rawStreamContents.slice(0, 3).equals(Buffer.from([0xFF, 0xD8, 0xFF]))) {
                    isImage = true;
                } else if (rawStreamContents.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))) {
                    isImage = true;
                }

                if(isImage){
                    //membaca gambar menggunakan jimp
                    let image = await Jimp.read(rawStreamContents);

                    //pre process gambar sehingga mudah dibaca 
                    image = image
                        .resize(600, 600)  //mengubah ukuran gambar
                        .greyscale()        //memastikan gambar qr hitam putih
                        .normalize();       //menyesuaikan kontras dan brightness

                    //konversi gambar ke format yang diminta library jsQR
                    const imageData = {
                        data: new Uint8ClampedArray(image.bitmap.data),
                        width: image.bitmap.width,
                        height: image.bitmap.height,
                    };

                    //decode isi qr code
                    const qrCodeResult = jsQR(imageData.data, imageData.width, imageData.height);

                    if(qrCodeResult){
                        //mengecek apakah isi qr code sesuai dengan template ttd
                        const match = qrCodeResult.data.match(
                            /^SIGNED BY:\s*(.+?)\s*SIGNATURE:\s*([\s\S]+?)\s*DOCUMENT:\s*([\s\S]+)$/
                        );

                        if (match) {
                            qr_name = match[1];
                            qr_signatureHash = match[2];
                            qr_documentHash = match[3];
                            sig_qr_counter++;
                        } else {
                            //jika qr code bukanlah qr code ttd
                            return res.json({ noQRCode: true });
                        }
                    }
                }
                

            } catch (err) {
                console.error('Error processing image:', err);
            }
        }
    }

    //jika tidak ditemukan qr code sama sekali di pdf
    if (sig_qr_counter === 0) {
        req.file.buffer = null;
        return res.json({ noQRCode: true });
    }

    //JIKA ADA DIGITAL SIGNATURE, LANJUTKAN PROSES SELANJUTNYA:
        //VERIFICATION ISI SURAT:
        //membaca isi dari pdf dan return textnya
        const parseBuffer = () => new Promise((resolve, reject) => {
            new PdfReader().parseBuffer(pdfBuffer, (err, item) => {
                if (err) {
                    reject(err);
                } else if (!item) {
                    resolve(extractedText);
                } else if (item.text) {
                    extractedText += item.text;
                }
            });
        });
        let extractedText = '';
        extractedText = await parseBuffer();

        //hash isi dari pdf
        const hash = crypto.createHash('sha256');
        hash.update(extractedText);
        const hashedText = hash.digest('base64');

        let DocumentValid = false;
        if(hashedText === qr_documentHash){
            DocumentValid = true;
        }

        //VERIFICATION DIGITAL SIGNATURE

        //ambil no surat yang diinput
        let no_surat = req.body.no_surat;
        //ambil public key dari nama lengkap yang tertera di QR
        let public_key = await getSignerPublicKey(qr_name);

        function verifyDigitalSignature(no_surat, signature, publicKeyPem) {
            try{
                //public key user yang username nya terdapat di QR
                const publicKey = forge.pki.publicKeyFromPem(publicKeyPem);
            
                //hash no surat dengan sha256
                const md = forge.md.sha256.create();
                md.update(no_surat, 'utf-8');
            
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

        let SignatureValid;
        // jika QR is corrupted by username that does not exist in db
        if(public_key[0] == undefined){
            SignatureValid = false
        }else{
            // Verify the digital signature
            SignatureValid = verifyDigitalSignature(
                no_surat,
                qr_signatureHash,
                public_key[0].public_key
            );
        }

        //kirim data ke client apakah signature dan/atau doc valid atau tidak dan tampilkan pop up yang sesuai
        res.json({ SignatureValid, DocumentValid });

    //kosongkan buffer  
    req.file.buffer = null;
})

//SIGNATURE LOG
app.get('/signature_log', auth, async(req, res)=> {
    let sigLog = await getSigLog(req.session.id_user);
    res.render('signature_log', {
        nama_lengkap: req.session.nama_lengkap || "",
        username: req.session.username,
        sigLog: sigLog
    })
})