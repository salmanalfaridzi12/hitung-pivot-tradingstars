export default function AccessDeniedPage() {
  return (
    <div style={{ backgroundColor: "#080e1a", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "white", padding: "20px" }}>
      <div style={{ backgroundColor: "#111827", border: "1px solid #1e2d42", borderRadius: "16px", padding: "30px", maxWidth: "400px", textAlign: "center", boxShadow: "0 10px 40px rgba(0,0,0,0.5)" }}>
        <h1 style={{ fontSize: "24px", color: "#ef4444", marginBottom: "10px" }}>Akses Ditolak</h1>
        <p style={{ fontSize: "14px", color: "#94a3b8", marginBottom: "24px" }}>
          Anda belum login atau sesi telah berakhir. Untuk menjaga privasi, Pivot Analyzer versi Pro ini hanya bisa diakses oleh member eksklusif kami.
        </p>
        <div style={{ backgroundColor: "#1e293b", padding: "16px", borderRadius: "10px", marginBottom: "20px" }}>
          <p style={{ margin: "0", fontSize: "14px", fontWeight: "bold", color: "#f8fafc" }}>
            Silakan login via Bot di Grup Telegram kami.
          </p>
          <p style={{ margin: "10px 0 0 0", fontSize: "12px", color: "#64748b" }}>
            Ketik <b>/login</b> di grup untuk mendapatkan tautan akses otomatis.
          </p>
        </div>
        <button disabled style={{ width: "100%", padding: "12px", backgroundColor: "#334155", color: "#94a3b8", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "not-allowed" }}>
          Menunggu Verifikasi...
        </button>
      </div>
    </div>
  );
}
