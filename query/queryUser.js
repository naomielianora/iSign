import { dbConnect } from "./connectionDB.js";

//untuk mengambil public key dari user yang ingin dicek ttdnya
export const getSignerPublicKey = async(nama_lengkap) => {
    const conn = await dbConnect();
    return new Promise((resolve, reject) => {
        conn.query('SELECT public_key FROM user WHERE nama_lengkap = ?', [nama_lengkap], (err, result) => {
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
export const insertSigLog = async(data, signature, qrcode, current_date, id_user) => {
    const conn = await dbConnect();
    return new Promise((resolve, reject) => {
        conn.query('INSERT INTO digital_signature (no_surat, signature, qr_code, tanggal_ttd, id_user) VALUES (?,?,?,?,?)', [data, signature, qrcode, current_date, id_user], (err, result) => {
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

//untuk mengecek apakah user tsb sudah pernah sign document yg sama
export const checkSignature = async(id_user, no_surat) => {
    const conn = await dbConnect();
    return new Promise((resolve, reject) => {
        conn.query('SELECT * FROM digital_signature WHERE id_user = ? AND no_surat = ?', [id_user, no_surat], (err, result) => {
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
