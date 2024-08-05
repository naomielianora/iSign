//untuk mengdownload file
function downloadFile(filename) {
    //buat sebuah link untuk mengirimkan singal untuk mengdownload file
    let link = document.createElement('a');

    //tentukan path dari file yang akan didownload
    link.href = '/uploads/' + filename;

    //tentukan nama file yang akan terdownload (menggunakan nama file asli)
    link.download = filename;

    //masukan link ke dalam ejs
    document.body.appendChild(link);

    //trigger link untuk start download dengan menggunakan event click
    link.click();

    //hapus link
    document.body.removeChild(link);
}