import { dbConnect } from "./connectionDB.js";

//cek ke database apakah email yang diisi sudah ada di database
export const emailChecker = async(email) => {
    const conn = await dbConnect();
    return new Promise((resolve, reject) => {
        conn.query('SELECT id_user FROM user WHERE email = ?', [email], (err, result) => {
            if(err){
                reject (err);
            }
            else{
                resolve(result);
            }
        });
        conn.release();
    });
};

//untuk memasukan data asdos yang sign up/buat akun ke database
export const signUpUser = async(nama_lengkap_sign_up, email_sign_up, password_sign_up, encryptedPrivateKey, publicKey, salt, iv) => {
    const conn = await dbConnect();
    return new Promise((resolve, reject) => {
        conn.query('INSERT INTO User (nama_lengkap, email, password, private_key, public_key, salt, iv) VALUES (?,?,?,?,?,?,?)', 
        [nama_lengkap_sign_up, email_sign_up, password_sign_up, encryptedPrivateKey, publicKey, salt, iv], (err, result) => {
            if(err){
                reject (err);
            }
            else{
                resolve(result);
            }
        })
    })
  };