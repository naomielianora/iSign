-- HOW TO USE THIS TABLE STRUCTURE:
-- 1. Buka phpmyadmin 
-- 2. Buat database baru dengan nama 'penelitian' (akan digunakan oleh index.js)
-- 3. Masuk ke halaman 'Import'
-- 4. Import file ini lalu submit

-- TABLE STRUCTURE

-- Table structure for table `User`
CREATE TABLE `User` (
  `id_user` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `nama_lengkap` varchar(50) NOT NULL,
  `email` varchar(50) NOT NULL,
  `password` varchar(500) NOT NULL,
  `private_key` TEXT,
  `public_key` TEXT,
  `salt` varchar(32) NOT NULL,
  `iv` varchar(32) NOT NULL,
  CONSTRAINT `UK_user` UNIQUE (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- Table structure for table `Digital_Signature`
CREATE TABLE `Digital_Signature` (
  `id_signature` int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `no_surat` varchar(100) NOT NULL,
  `hash_value` varchar(500) NOT NULL,
  `tanggal_ttd` DATE NOT NULL,
  `id_user` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;   

-- Indexes for table `Digital_Signature`
ALTER TABLE `Digital_Signature`
  ADD CONSTRAINT `fk_sig_user` FOREIGN KEY (`id_user`) REFERENCES `User` (`id_user`);   