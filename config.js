// Daftar target streak + template pesan cadangan (dipakai kalau LLM gagal).
module.exports = {
  TARGETS: [
    { username: 'syaa115275', label: 'pacar Aditya', react: true },
    { username: 'hhwzz', label: 'Nashway (teman)' },
    { username: 'nblwm', label: 'Nabila/Bila (teman)' },
    { username: 'hill._', label: 'Aslan (teman)' },
  ],
  FALLBACK_MESSAGES: [
    'halo halo, joko mampir nih, streak kita jangan sampai putus yaa',
    'hai, joko absen dulu, streak hari ini aman yaa',
    'yoo, joko hadir nih, streak lanjut terus jangan kasih kendor',
    'heyy, joko numpang lewat nih, semoga harimu seru, streak aman yaa',
    'pagi/malam, joko nitip salam nih, streak kita aman kan hari ini',
  ],
};
