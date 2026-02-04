// 1. KONFIGURASI FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyDlucMVwMUbw7Ab3t2AVzI13EOHUrqDNZw",
    authDomain: "web-kelas-5b83a.firebaseapp.com",
    databaseURL: "https://web-kelas-5b83a-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "web-kelas-5b83a",
    storageBucket: "web-kelas-5b83a.firebasestorage.app",
    messagingSenderId: "711947014423",
    appId: "1:711947014423:web:d8cb787c503d7d7538e752",
    measurementId: "G-RYNNLZCGY5"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// 2. DATABASE USER (LENGKAP 25 USER + OWNER)
const dataUsers = [
    { user: "9¹", pass: "91" },
    { user: "admin", pass: "admin123" }
];

// Loop otomatis buat bikin user1 sampe user25 biar kodenya gak kepanjangan
for (let i = 1; i <= 25; i++) {
    dataUsers.push({ user: "user" + i, pass: "pass" + i });
}

// 3. LOGIKA LOGIN (FIX NAMA & ANTI-NYANGKUT)
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const uInput = document.getElementById('username').value;
    const pInput = document.getElementById('password').value;
    
    // Cari user di database lokal
    const valid = dataUsers.find(u => u.user === uInput && u.pass === pInput);

    if (valid) {
        // Cek apakah di-ban
        const snapBan = await database.ref('status_user/' + uInput).once('value');
        if (snapBan.val() === "banned") return alert("AKSES DIBLOKIR ADMIN!");

        // Cek apakah sedang aktif (Anti-Nyangkut)
        const cekOnline = await database.ref('log_online/' + uInput).once('value');
        if (uInput !== "admin" && cekOnline.exists()) {
            const selisih = Date.now() - cekOnline.val().last_seen;
            if (selisih < 20000) return alert("Akun '" + uInput + "' sedang aktif!");
        }

        // Simpan ke Session & Firebase
        localStorage.setItem('savedUser', uInput);
        const userLogRef = database.ref('log_online/' + uInput);
        
        userLogRef.set({
            username: uInput, // Ini yang fix biar gak muncul "Unified"
            last_seen: firebase.database.ServerValue.TIMESTAMP,
            jam: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
        });

        userLogRef.onDisconnect().remove();

        if (uInput === "admin") {
            alert('Mode Owner Aktif!');
            tampilkanLogAdmin(); 
            mulaiPembersihOtomatis(); 
        } else {
            alert('Login Berhasil!');
            window.location.href = "page91.html";
        }
    } else {
        alert('Username atau Password salah!');
    }
});

// 4. ADMIN: UPDATE PESAN & JADWAL
window.updateWebSekarang = function() {
    const t = document.getElementById('inputTeks').value;
    const d = parseInt(document.getElementById('timerUpdate').value);
    const exp = d > 0 ? Date.now() + (d * 3600000) : null;
    
    database.ref('konten_web').set({
        pesan: t,
        waktu: new Date().toLocaleString('id-ID'),
        exp: exp
    }).then(() => { alert("Pesan Berhasil Diupdate!"); document.getElementById('inputTeks').value = ""; });
};

window.updateJadwalSistem = function() {
    const jenis = document.getElementById('pilihJenisJadwal').value;
    const hari = document.getElementById('pilihHari').value;
    const isi = document.getElementById('isiJadwalBaru').value;
    
    database.ref('data_kelas/' + jenis + '/' + hari).set(isi).then(() => {
        alert("Jadwal " + hari + " Berhasil!");
        document.getElementById('isiJadwalBaru').value = "";
    });
};

// 5. MONITORING PANEL
function tampilkanLogAdmin() {
    const panel = document.getElementById('adminPanel');
    if (panel) panel.style.display = 'block';

    database.ref('log_online').on('value', (snapshot) => {
        const list = document.getElementById('onlineList');
        if (list) {
            list.innerHTML = "";
            snapshot.forEach((child) => {
                const data = child.val();
                list.innerHTML += `<li style="display:flex; justify-content:space-between; padding:5px 0; border-bottom:1px solid #222;">
                    <span>🟢 <b>${data.username}</b></span>
                    <button type="button" onclick="banUser('${data.username}')" style="background:red; color:white; border:none; font-size:9px; border-radius:3px; padding:2px 5px; cursor:pointer;">BAN</button>
                </li>`;
            });
        }
    });
}

window.banUser = function(target) {
    if (target === "admin" || target === "9¹") return alert("Bos tidak bisa diban!");
    if (confirm("Ban " + target + "?")) {
        database.ref('status_user/' + target).set("banned");
        database.ref('log_online/' + target).remove();
    }
};

window.hapusLogServer = function() {
    if(confirm("Hapus semua log online?")) database.ref('log_online').remove();
};

function mulaiPembersihOtomatis() {
    setInterval(() => {
        const skrg = Date.now();
        database.ref('log_online').once('value', (s) => {
            s.forEach((c) => { if (skrg - c.val().last_seen > 20000) c.ref.remove(); });
        });
        database.ref('konten_web').once('value', (s) => {
            if (s.val()?.exp && skrg > s.val().exp) database.ref('konten_web').remove();
        });
    }, 10000);
}
