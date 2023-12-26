import express from 'express';

const PORT = 8080;
const app = express();

app.listen(PORT, () => {
    console.log(`Server is ready, listening on port ${PORT}`);
});

app.set('view engine', 'ejs');
//dipakai untuk routing path file css, assets
app.use(express.static('public'));

app.get('/sign_up', (req, res)=>{
    res.render('sign_up')
})

app.get('/log_in', (req, res)=>{
    res.render('log_in')
})

app.get('/log_out', (req, res)=>{
    res.render('log_out')
})

//page yang pertama kali muncul (home)
app.get('/', (req, res)=>{
    res.render('home')
})

app.get('/check_sign', (req, res)=>{
    res.render('check_sign')
})

app.get('/form_sign', (req, res)=>{
    res.render('form_sign')
})

app.get('/hasil_sign', (req, res)=>{
    res.render('hasil_sign')
})

app.get('/signature_log', (req, res)=>{
    res.render('signature_log')
})
