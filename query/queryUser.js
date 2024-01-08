import { dbConnect } from "./connectionDB.js";

//untuk mengambil public key dari user yang ingin dicek ttdnya
export const getSignerPublicKey = async(username) => {
    const conn = await dbConnect();
    return new Promise((resolve, reject) => {
        conn.query('SELECT public_key FROM user WHERE username = ?', [username], (err, result) => {
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

//untuk mengambil data user yang memiliki email dan password yang sama dengan yang diinput user
export const insertSigLog = async(data, signature, current_date, id_user) => {
    const conn = await dbConnect();
    return new Promise((resolve, reject) => {
        conn.query('INSERT INTO digital_signature (no_surat, hash_value, tanggal_ttd, id_user) VALUES (?,?,?,?)', [data, signature, current_date, id_user], (err, result) => {
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

//untuk mengambil semua history signature dari user
export const getSigLog = async(id_user) => {
    const conn = await dbConnect();
    return new Promise((resolve, reject) => {
        conn.query('SELECT * FROM digital_signature WHERE id_user = ?', [id_user], (err, result) => {
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

