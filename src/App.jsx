import { useState, useRef } from "react";

export default function IsoAnalyzer() {
  const [image, setImage] = useState(null);
  const [imageData, setImageData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("tuberias");
  const [fileName, setFileName] = useState(null);
  const fileRef = useRef();

  const handleFile = (file) => {
    if (!file) return;
    setResult(null);
    setError(null);
    setFileName(file.name);

    if (file.type === "application/pdf") {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target.result.split(",")[1];
        setImageData({ base64, type: "application/pdf" });
        setImage("pdf");
      };
      reader.readAsDataURL(file);
      return;
    }

    if (!file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
          const MAX = 1200;
          const scale = Math.min(1, MAX / Math.max(img.width, img.height));
          const canvas = document.createElement("canvas");
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const jpeg = canvas.toDataURL("image/jpeg", 0.80);
        setImage(jpeg);
        setImageData({ base64: jpeg.split(",")[1], type: "image/jpeg" });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  const analyze = async () => {
    if (!imageData) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageData.base64, type: imageData.type }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch (e) {
      setError(e.message || "Error al analizar.");
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    if (!result) return;
    const rows = ["ANÁLISIS ISOMÉTRICO\n"];
    rows.push("TUBERÍAS");
    rows.push("Tramo,Diámetro,Longitud,Material,Schedule");
    (result.tuberias || []).forEach(t =>
      rows.push(`${t.tramo},${t.diametro},${t.longitud},${t.material},${t.schedule}`)
    );
    rows.push("\nACCESORIOS");
    rows.push("Tipo,Diámetro,Rating,Extremos,Material,Cantidad");
    (result.accesorios || []).forEach(a =>
      rows.push(`${a.tipo},${a.diametro},${a.rating || ""},${a.extremos || ""},${a.material || ""},${a.cantidad}`)
    );
    rows.push("\nSOLDADURAS");
    rows.push(`BW,${result.soldaduras?.bw || 0}`);
    rows.push(`SW,${result.soldaduras?.sw || 0}`);
    rows.push(`Roscadas,${result.soldaduras?.roscadas || 0}`);
    rows.push("\nVÁLVULAS");
    rows.push("Tipo,Tag,Diámetro,Rating,Cantidad");
    (result.valvulas || []).forEach(v =>
      rows.push(`${v.tipo},${v.tag || ""},${v.diametro},${v.rating || ""},${v.cantidad}`)
    );
    rows.push("\nSOPORTES");
    rows.push("Tipo,Tag,Cantidad");
    (result.soportes || []).forEach(s =>
      rows.push(`${s.tipo},${s.tag || ""},${s.cantidad}`)
    );
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "isometrico.csv";
    a.click();
  };

  const tabs = [
    { id: "tuberias", label: "🔵 Tuberías" },
    { id: "accesorios", label: "🔩 Accesorios" },
    { id: "soldaduras", label: "🔥 Soldaduras" },
    { id: "valvulas", label: "🚦 Válvulas" },
    { id: "soportes", label: "🏗️ Soportes" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#0B1120", color: "#F1F5F9", fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ background: "#111827", borderBottom: "1px solid #1F2D45", padding: "14px 24px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 34, height: 34, background: "#F97316", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🔧</div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 16 }}>ISO<span style={{ color: "#F97316" }}>Analyzer</span></div>
          <div style={{ color: "#64748B", fontSize: 11 }}>Análisis automático de isométricos de tuberías</div>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px" }}>
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
          style={{ border: "2px dashed #1F2D45", borderRadius: 12, padding: image ? 12 : "36px 20px", textAlign: "center", cursor: "pointer", background: "#111827", marginBottom: 16 }}>
          <input ref={fileRef} type="file" accept="image/*,application/pdf" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />
          {image === "pdf" ? (
            <div style={{ padding: "20px 0" }}>
              <div style={{ fontSize: 48, marginBottom: 10 }}>📄</div>
              <div style={{ fontWeight: 700, color: "#F97316" }}>{fileName}</div>
              <div style={{ color: "#64748B", fontSize: 12, marginTop: 4 }}>PDF cargado — haz clic para cambiar</div>
            </div>
          ) : image ? (
            <img src={image} alt="iso" style={{ maxHeight: 260, maxWidth: "100%", borderRadius: 8, objectFit: "contain" }} />
          ) : (
            <>
              <div style={{ fontSize: 36, marginBottom: 10 }}>📐</div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Sube el isométrico</div>
              <div style={{ color: "#64748B", fontSize: 12 }}>Arrastra o haz clic — JPG, PNG, WEBP, PDF</div>
            </>
          )}
        </div>

        {image && !loading && (
          <button onClick={analyze} style={{ width: "100%", padding: 14, background: "#F97316", color: "#fff", border: "none", borderRadius: 8, fontWeight: 800, fontSize: 15, cursor: "pointer", marginBottom: 24 }}>
            ⚡ ANALIZAR ISOMÉTRICO
          </button>
        )}

        {loading && (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>⚙️</div>
            <div style={{ fontWeight: 700, color: "#F97316" }}>Analizando isométrico...</div>
            <div style={{ color: "#64748B", fontSize: 13, marginTop: 4 }}>Extrayendo tuberías, accesorios y soldaduras</div>
          </div>
        )}

        {error && (
          <div style={{ background: "#7f1d1d33", border: "1px solid #ef4444", borderRadius: 8, padding: "12px 16px", color: "#fca5a5", marginBottom: 16 }}>
            ⚠️ {error}
          </div>
        )}

        {result && (
          <div>
            <div style={{ background: "#111827", border: "1px solid #1F2D45", borderRadius: 10, padding: "14px 16px", marginBottom: 16 }}>
              <div style={{ color: "#F97316", fontWeight: 700, fontSize: 12, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>📋 Datos Generales</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
                {[
                  ["Línea", result.resumen?.lineaNumero],
                  ["Fluido", result.resumen?.fluido],
                  ["Especificación", result.resumen?.especificacion],
                  ["Material", result.resumen?.material],
                  ["Presión", result.resumen?.presion],
                  ["Temperatura", result.resumen?.temperatura],
                ].map(([label, val]) => (
                  <div key={label} style={{ background: "#0B1120", borderRadius: 6, padding: "8px 12px" }}>
                    <div style={{ color: "#64748B", fontSize: 10, textTransform: "uppercase", marginBottom: 3 }}>{label}</div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: val ? "#F1F5F9" : "#64748B" }}>{val || "N/D"}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
              {[
                ["Tramos", result.tuberias?.length || 0, "#F97316"],
                ["Accesorios", result.accesorios?.reduce((s, a) => s + (a.cantidad || 0), 0) || 0, "#3B82F6"],
                ["Soldaduras", (result.soldaduras?.bw || 0) + (result.soldaduras?.sw || 0) + (result.soldaduras?.roscadas || 0), "#EF4444"],
                ["Válvulas", result.valvulas?.reduce((s, v) => s + (v.cantidad || 0), 0) || 0, "#10B981"],
              ].map(([label, val, color]) => (
                <div key={label} style={{ background: "#111827", border: "1px solid #1F2D45", borderRadius: 10, padding: "12px 14px", textAlign: "center" }}>
                  <div style={{ fontSize: 26, fontWeight: 900, color }}>{val}</div>
                  <div style={{ color: "#64748B", fontSize: 11, marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 4, marginBottom: 14, flexWrap: "wrap" }}>
              {tabs.map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
                  padding: "7px 14px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700,
                  background: activeTab === t.id ? "#F97316" : "#111827",
                  color: activeTab === t.id ? "#fff" : "#64748B"
                }}>{t.label}</button>
              ))}
            </div>

            <div style={{ background: "#111827", border: "1px solid #1F2D45", borderRadius: 10, overflow: "hidden", marginBottom: 16 }}>
              {activeTab === "tuberias" && (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: "#0B1120" }}>
                      {["Tramo", "Diámetro", "Longitud", "Material", "Schedule"].map(h => (
                        <th key={h} style={{ padding: "8px 14px", textAlign: "left", color: "#64748B", fontSize: 10, textTransform: "uppercase", borderBottom: "1px solid #1F2D45" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(result.tuberias || []).map((t, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #1F2D4522" }}>
                        <td style={{ padding: "9px 14px", color: "#F97316", fontWeight: 700 }}>{t.tramo}</td>
                        <td style={{ padding: "9px 14px" }}>{t.diametro}</td>
                        <td style={{ padding: "9px 14px", fontFamily: "monospace" }}>{t.longitud}</td>
                        <td style={{ padding: "9px 14px", color: "#94A3B8" }}>{t.material}</td>
                        <td style={{ padding: "9px 14px", color: "#94A3B8" }}>{t.schedule}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {activeTab === "accesorios" && (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: "#0B1120" }}>
                      {["Tipo", "Diámetro", "Rating", "Extremos", "Material", "Cant."].map(h => (
                        <th key={h} style={{ padding: "8px 14px", textAlign: "left", color: "#64748B", fontSize: 10, textTransform: "uppercase", borderBottom: "1px solid #1F2D45" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(result.accesorios || []).map((a, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #1F2D4522" }}>
                        <td style={{ padding: "9px 14px", fontWeight: 600 }}>{a.tipo}</td>
                        <td style={{ padding: "9px 14px" }}>{a.diametro}</td>
                        <td style={{ padding: "9px 14px", color: "#94A3B8" }}>{a.rating || "—"}</td>
                        <td style={{ padding: "9px 14px", color: "#94A3B8" }}>{a.extremos || "—"}</td>
                        <td style={{ padding: "9px 14px", color: "#94A3B8" }}>{a.material || "—"}</td>
                        <td style={{ padding: "9px 14px", color: "#F97316", fontWeight: 800, textAlign: "center" }}>{a.cantidad}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {activeTab === "soldaduras" && (
                <div style={{ padding: 20 }}>
                  <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                    {[
                      ["Butt Weld (BW)", result.soldaduras?.bw || 0, "#F97316"],
                      ["Socket Weld (SW)", result.soldaduras?.sw || 0, "#3B82F6"],
                      ["Roscadas", result.soldaduras?.roscadas || 0, "#10B981"],
                    ].map(([label, val, color]) => (
                      <div key={label} style={{ flex: 1, background: "#0B1120", border: "1px solid #1F2D45", borderRadius: 8, padding: "16px", textAlign: "center" }}>
                        <div style={{ fontSize: 32, fontWeight: 900, color }}>{val}</div>
                        <div style={{ color: "#64748B", fontSize: 11, marginTop: 4 }}>{label}</div>
                      </div>
                    ))}
                  </div>
                  {result.soldaduras?.nota && (
                    <div style={{ color: "#94A3B8", fontSize: 12 }}>ℹ️ {result.soldaduras.nota}</div>
                  )}
                </div>
              )}

              {activeTab === "valvulas" && (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: "#0B1120" }}>
                      {["Tipo", "Tag", "Diámetro", "Rating", "Cant."].map(h => (
                        <th key={h} style={{ padding: "8px 14px", textAlign: "left", color: "#64748B", fontSize: 10, textTransform: "uppercase", borderBottom: "1px solid #1F2D45" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(result.valvulas || []).map((v, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #1F2D4522" }}>
                        <td style={{ padding: "9px 14px", fontWeight: 600 }}>{v.tipo}</td>
                        <td style={{ padding: "9px 14px", color: "#F97316" }}>{v.tag || "—"}</td>
                        <td style={{ padding: "9px 14px" }}>{v.diametro}</td>
                        <td style={{ padding: "9px 14px", color: "#94A3B8" }}>{v.rating || "—"}</td>
                        <td style={{ padding: "9px 14px", color: "#F97316", fontWeight: 800, textAlign: "center" }}>{v.cantidad}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {activeTab === "soportes" && (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: "#0B1120" }}>
                      {["Tipo", "Tag", "Cantidad"].map(h => (
                        <th key={h} style={{ padding: "8px 14px", textAlign: "left", color: "#64748B", fontSize: 10, textTransform: "uppercase", borderBottom: "1px solid #1F2D45" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(result.soportes || []).map((s, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #1F2D4522" }}>
                        <td style={{ padding: "9px 14px", fontWeight: 600 }}>{s.tipo}</td>
                        <td style={{ padding: "9px 14px", color: "#F97316" }}>{s.tag || "—"}</td>
                        <td style={{ padding: "9px 14px", textAlign: "center" }}>{s.cantidad}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {result.alertas?.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                {result.alertas.map((a, i) => (
                  <div key={i} style={{ background: "#78350f22", border: "1px solid #f59e0b55", borderRadius: 6, padding: "8px 12px", fontSize: 12, color: "#fcd34d", marginBottom: 6 }}>
                    ⚠️ {a}
                  </div>
                ))}
              </div>
            )}

            <button onClick={exportCSV} style={{ padding: "10px 20px", background: "transparent", color: "#F97316", border: "1px solid #F97316", borderRadius: 7, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
              ⬇ Exportar CSV
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
