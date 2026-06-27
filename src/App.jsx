import { useState, useRef } from "react";

export default function IsoAnalyzer() {
  const [image, setImage] = useState(null);
  const [imageData, setImageData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("geometria");
  const [fileName, setFileName] = useState(null);
  const fileRef = useRef();

  const handleFile = (file) => {
    if (!file) return;
    setResult(null);
    setError(null);
    setFileName(file.name);

    if (file.type === "application/pdf") {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = ev.target.result.split(",")[1];
        setImageData({ base64, type: "application/pdf" });
        setImage("pdf");
      };
      reader.readAsDataURL(file);
      return;
    }

    if (!file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
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
      img.src = ev.target.result;
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
    } catch (err) {
      setError(err.message || "Error al analizar.");
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    if (!result) return;
    const rows = [];

    rows.push("════════════════════════════════════════");
    rows.push("1. DATOS GEOMÉTRICOS Y DE RUTEO");
    rows.push("════════════════════════════════════════");
    rows.push(`Orientación Norte,${result.geometria?.orientacionNorte || "N/D"}`);
    rows.push(`Elevación BOP,${result.geometria?.elevacionBOP || "N/D"}`);
    rows.push(`Coord. Inicio Norte,${result.geometria?.coordenadasInicio?.norte || "N/D"}`);
    rows.push(`Coord. Inicio Este,${result.geometria?.coordenadasInicio?.este || "N/D"}`);
    rows.push(`Coord. Inicio Elevación,${result.geometria?.coordenadasInicio?.elevacion || "N/D"}`);
    rows.push(`Coord. Fin Norte,${result.geometria?.coordenadasFin?.norte || "N/D"}`);
    rows.push(`Coord. Fin Este,${result.geometria?.coordenadasFin?.este || "N/D"}`);
    rows.push(`Coord. Fin Elevación,${result.geometria?.coordenadasFin?.elevacion || "N/D"}`);
    if (result.geometria?.angulos?.length > 0) {
      rows.push("Ángulos," + result.geometria.angulos.join(" | "));
    }

    rows.push("");
    rows.push("════════════════════════════════════════");
    rows.push("2. DATOS DE MATERIALES (MTO)");
    rows.push("════════════════════════════════════════");

    rows.push("");
    rows.push("── TUBERÍAS ──");
    rows.push("Tramo,Diámetro Nominal,Longitud,Schedule,Material");
    (result.materiales?.tuberias || []).forEach(t =>
      rows.push(`${t.tramo},${t.diametroNominal},${t.longitud},${t.schedule},${t.material}`)
    );

    rows.push("");
    rows.push("── ACCESORIOS ──");
    rows.push("Tipo,Diámetro,Cantidad,Rating,Extremos,Material");
    (result.materiales?.accesorios || []).forEach(a =>
      rows.push(`${a.tipo},${a.diametro},${a.cantidad},${a.rating || ""},${a.extremos || ""},${a.material || ""}`)
    );

    rows.push("");
    rows.push("── BRIDAS ──");
    rows.push("Tipo,Diámetro,Rating,Cara,Cantidad");
    (result.materiales?.bridas || []).forEach(b =>
      rows.push(`${b.tipo},${b.diametro},${b.rating},${b.cara || ""},${b.cantidad}`)
    );

    rows.push("");
    rows.push("── VÁLVULAS ──");
    rows.push("Tipo,Tag,Diámetro,Rating,Operación,Cantidad");
    (result.materiales?.valvulas || []).forEach(v =>
      rows.push(`${v.tipo},${v.tag || ""},${v.diametro},${v.rating || ""},${v.operacion || ""},${v.cantidad}`)
    );

    rows.push("");
    rows.push("── PERNOS ──");
    rows.push("Diámetro,Longitud,Cantidad");
    (result.materiales?.pernos || []).forEach(p =>
      rows.push(`${p.diametro || ""},${p.longitud || ""},${p.cantidad}`)
    );

    rows.push("");
    rows.push("── EMPAQUETADURAS ──");
    rows.push("Tipo,Diámetro,Cantidad");
    (result.materiales?.empaquetaduras || []).forEach(emp =>
      rows.push(`${emp.tipo || ""},${emp.diametro || ""},${emp.cantidad}`)
    );

    rows.push("");
    rows.push("════════════════════════════════════════");
    rows.push("3. DATOS TÉCNICOS Y OPERATIVOS");
    rows.push("════════════════════════════════════════");
    rows.push(`Número de Línea,${result.tecnicos?.lineaNumero || "N/D"}`);
    rows.push(`Especificación,${result.tecnicos?.especificacion || "N/D"}`);
    rows.push(`Fluido,${result.tecnicos?.fluido || "N/D"}`);
    rows.push(`Presión de Diseño,${result.tecnicos?.presionDiseno || "N/D"}`);
    rows.push(`Temperatura de Diseño,${result.tecnicos?.temperaturaDiseno || "N/D"}`);
    rows.push(`Aislamiento Tipo,${result.tecnicos?.aislamiento?.tipo || "N/D"}`);
    rows.push(`Aislamiento Espesor,${result.tecnicos?.aislamiento?.espesor || "N/D"}`);
    rows.push(`Prueba Tipo,${result.tecnicos?.prueba?.tipo || "N/D"}`);
    rows.push(`Prueba Presión,${result.tecnicos?.prueba?.presion || "N/D"}`);
    rows.push("");
    rows.push("── SOPORTES ──");
    rows.push("Tag,Tipo,Ubicación");
    (result.tecnicos?.soportes || []).forEach(s =>
      rows.push(`${s.tag || ""},${s.tipo},${s.ubicacion || ""}`)
    );

    rows.push("");
    rows.push("════════════════════════════════════════");
    rows.push("4. DATOS DE CONSTRUCCIÓN Y CONTROL");
    rows.push("════════════════════════════════════════");
    rows.push(`Revisión del Plano,${result.construccion?.revisionPlano || "N/D"}`);
    rows.push(`NDT Tipo,${result.construccion?.ndt?.tipo || "N/D"}`);
    rows.push(`NDT Porcentaje,${result.construccion?.ndt?.porcentaje || "N/D"}`);
    rows.push("");
    rows.push("── SOLDADURAS DE TALLER ──");
    rows.push(`BW Taller,${result.construccion?.soldaduras?.taller?.bw || 0}`);
    rows.push(`SW Taller,${result.construccion?.soldaduras?.taller?.sw || 0}`);
    rows.push(`Roscadas Taller,${result.construccion?.soldaduras?.taller?.roscadas || 0}`);
    rows.push("");
    rows.push("── SOLDADURAS DE CAMPO ──");
    rows.push(`BW Campo,${result.construccion?.soldaduras?.campo?.bw || 0}`);
    rows.push(`SW Campo,${result.construccion?.soldaduras?.campo?.sw || 0}`);
    rows.push(`Roscadas Campo,${result.construccion?.soldaduras?.campo?.roscadas || 0}`);
    rows.push("");
    if (result.construccion?.alertas?.length > 0) {
      rows.push("── ALERTAS ──");
      result.construccion.alertas.forEach(alerta => rows.push(`ALERTA,${alerta}`));
    }

    const BOM = "\uFEFF";
    const blob = new Blob([BOM + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "isometrico_completo.csv";
    a.click();
  };

  const tabs = [
    { id: "geometria", label: "📐 Geometría" },
    { id: "materiales", label: "🔩 Materiales" },
    { id: "tecnicos", label: "⚙️ Técnicos" },
    { id: "construccion", label: "🔥 Construcción" },
  ];

  const S = {
    page: { minHeight: "100vh", background: "#0B1120", color: "#F1F5F9", fontFamily: "Inter, system-ui, sans-serif" },
    header: { background: "#111827", borderBottom: "1px solid #1F2D45", padding: "14px 24px", display: "flex", alignItems: "center", gap: 12 },
    logo: { width: 34, height: 34, background: "#F97316", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 },
    main: { maxWidth: 900, margin: "0 auto", padding: "24px 16px" },
    card: { background: "#111827", border: "1px solid #1F2D45", borderRadius: 10, padding: "14px 16px", marginBottom: 16 },
    sectionTitle: { color: "#F97316", fontWeight: 700, fontSize: 12, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 },
    infoGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 },
    infoBox: { background: "#0B1120", borderRadius: 6, padding: "8px 12px" },
    infoLabel: { color: "#64748B", fontSize: 10, textTransform: "uppercase", marginBottom: 3 },
    table: { width: "100%", borderCollapse: "collapse", fontSize: 12 },
    th: { padding: "8px 14px", textAlign: "left", color: "#64748B", fontSize: 10, textTransform: "uppercase", borderBottom: "1px solid #1F2D45", background: "#0B1120" },
    td: { padding: "9px 14px", borderBottom: "1px solid #1F2D4522" },
  };

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div style={S.logo}>🔧</div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 16 }}>ISO<span style={{ color: "#F97316" }}>Analyzer</span></div>
          <div style={{ color: "#64748B", fontSize: 11 }}>Análisis automático de isométricos de tuberías</div>
        </div>
      </div>

      <div style={S.main}>
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={ev => ev.preventDefault()}
          onDrop={ev => { ev.preventDefault(); handleFile(ev.dataTransfer.files[0]); }}
          style={{ border: "2px dashed #1F2D45", borderRadius: 12, padding: image ? 12 : "36px 20px", textAlign: "center", cursor: "pointer", background: "#111827", marginBottom: 16 }}>
          <input ref={fileRef} type="file" accept="image/*,application/pdf" style={{ display: "none" }} onChange={ev => handleFile(ev.target.files[0])} />
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
            <div style={{ color: "#64748B", fontSize: 13, marginTop: 4 }}>Extrayendo datos completos del isométrico</div>
          </div>
        )}

        {error && (
          <div style={{ background: "#7f1d1d33", border: "1px solid #ef4444", borderRadius: 8, padding: "12px 16px", color: "#fca5a5", marginBottom: 16 }}>
            ⚠️ {error}
          </div>
        )}

        {result && (
          <div>
            <div style={{ display: "flex", gap: 4, marginBottom: 14, flexWrap: "wrap" }}>
              {tabs.map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
                  padding: "7px 14px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700,
                  background: activeTab === t.id ? "#F97316" : "#111827",
                  color: activeTab === t.id ? "#fff" : "#64748B"
                }}>{t.label}</button>
              ))}
            </div>

            {activeTab === "geometria" && (
              <div style={S.card}>
                <div style={S.sectionTitle}>📐 1. Datos Geométricos y de Ruteo</div>
                <div style={S.infoGrid}>
                  {[
                    ["Orientación Norte", result.geometria?.orientacionNorte],
                    ["Elevación BOP", result.geometria?.elevacionBOP],
                    ["Coord. Inicio Norte", result.geometria?.coordenadasInicio?.norte],
                    ["Coord. Inicio Este", result.geometria?.coordenadasInicio?.este],
                    ["Coord. Inicio Elev.", result.geometria?.coordenadasInicio?.elevacion],
                    ["Coord. Fin Norte", result.geometria?.coordenadasFin?.norte],
                    ["Coord. Fin Este", result.geometria?.coordenadasFin?.este],
                    ["Coord. Fin Elev.", result.geometria?.coordenadasFin?.elevacion],
                  ].map(([label, val]) => (
                    <div key={label} style={S.infoBox}>
                      <div style={S.infoLabel}>{label}</div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: val ? "#F1F5F9" : "#64748B" }}>{val || "N/D"}</div>
                    </div>
                  ))}
                </div>
                {result.geometria?.angulos?.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <div style={S.infoLabel}>Ángulos</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
                      {result.geometria.angulos.map((ang, i) => (
                        <div key={i} style={{ background: "#0B1120", border: "1px solid #1F2D45", borderRadius: 6, padding: "4px 10px", fontSize: 12, color: "#F97316", fontWeight: 700 }}>{ang}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "materiales" && (
              <div>
                <div style={S.card}>
                  <div style={S.sectionTitle}>🔵 Tuberías</div>
                  <table style={S.table}>
                    <thead><tr>{["Tramo", "Ø Nominal", "Longitud", "Schedule", "Material"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
                    <tbody>
                      {(result.materiales?.tuberias || []).map((t, i) => (
                        <tr key={i}>
                          <td style={{ ...S.td, color: "#F97316", fontWeight: 700 }}>{t.tramo}</td>
                          <td style={S.td}>{t.diametroNominal}</td>
                          <td style={S.td}>{t.longitud}</td>
                          <td style={S.td}>{t.schedule}</td>
                          <td style={S.td}>{t.material}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={S.card}>
                  <div style={S.sectionTitle}>🔩 Accesorios</div>
                  <table style={S.table}>
                    <thead><tr>{["Tipo", "Ø", "Cant.", "Rating", "Extremos", "Material"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
                    <tbody>
                      {(result.materiales?.accesorios || []).map((acc, i) => (
                        <tr key={i}>
                          <td style={S.td}>{acc.tipo}</td>
                          <td style={S.td}>{acc.diametro}</td>
                          <td style={{ ...S.td, color: "#F97316", fontWeight: 800, textAlign: "center" }}>{acc.cantidad}</td>
                          <td style={S.td}>{acc.rating || "—"}</td>
                          <td style={S.td}>{acc.extremos || "—"}</td>
                          <td style={S.td}>{acc.material || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {result.materiales?.bridas?.length > 0 && (
                  <div style={S.card}>
                    <div style={S.sectionTitle}>🔘 Bridas</div>
                    <table style={S.table}>
                      <thead><tr>{["Tipo", "Ø", "Rating", "Cara", "Cant."].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
                      <tbody>
                        {result.materiales.bridas.map((bri, i) => (
                          <tr key={i}>
                            <td style={S.td}>{bri.tipo}</td>
                            <td style={S.td}>{bri.diametro}</td>
                            <td style={S.td}>{bri.rating}</td>
                            <td style={S.td}>{bri.cara || "—"}</td>
                            <td style={{ ...S.td, color: "#F97316", fontWeight: 800, textAlign: "center" }}>{bri.cantidad}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div style={S.card}>
                  <div style={S.sectionTitle}>🚦 Válvulas</div>
                  <table style={S.table}>
                    <thead><tr>{["Tipo", "Tag", "Ø", "Rating", "Operación", "Cant."].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
                    <tbody>
                      {(result.materiales?.valvulas || []).map((val, i) => (
                        <tr key={i}>
                          <td style={S.td}>{val.tipo}</td>
                          <td style={{ ...S.td, color: "#F97316" }}>{val.tag || "—"}</td>
                          <td style={S.td}>{val.diametro}</td>
                          <td style={S.td}>{val.rating || "—"}</td>
                          <td style={S.td}>{val.operacion || "—"}</td>
                          <td style={{ ...S.td, fontWeight: 800, textAlign: "center" }}>{val.cantidad}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={S.card}>
                    <div style={S.sectionTitle}>🔩 Pernos</div>
                    <table style={S.table}>
                      <thead><tr>{["Ø", "Long.", "Cant."].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
                      <tbody>
                        {(result.materiales?.pernos || []).map((per, i) => (
                          <tr key={i}>
                            <td style={S.td}>{per.diametro || "—"}</td>
                            <td style={S.td}>{per.longitud || "—"}</td>
                            <td style={{ ...S.td, color: "#F97316", fontWeight: 800 }}>{per.cantidad}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div style={S.card}>
                    <div style={S.sectionTitle}>⭕ Empaquetaduras</div>
                    <table style={S.table}>
                      <thead><tr>{["Tipo", "Ø", "Cant."].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
                      <tbody>
                        {(result.materiales?.empaquetaduras || []).map((emp, i) => (
                          <tr key={i}>
                            <td style={S.td}>{emp.tipo || "—"}</td>
                            <td style={S.td}>{emp.diametro || "—"}</td>
                            <td style={{ ...S.td, color: "#F97316", fontWeight: 800 }}>{emp.cantidad}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "tecnicos" && (
              <div style={S.card}>
                <div style={S.sectionTitle}>⚙️ 3. Datos Técnicos y Operativos</div>
                <div style={S.infoGrid}>
                  {[
                    ["Número de Línea", result.tecnicos?.lineaNumero],
                    ["Especificación", result.tecnicos?.especificacion],
                    ["Fluido", result.tecnicos?.fluido],
                    ["Presión de Diseño", result.tecnicos?.presionDiseno],
                    ["Temperatura de Diseño", result.tecnicos?.temperaturaDiseno],
                    ["Aislamiento Tipo", result.tecnicos?.aislamiento?.tipo],
                    ["Aislamiento Espesor", result.tecnicos?.aislamiento?.espesor],
                    ["Prueba Tipo", result.tecnicos?.prueba?.tipo],
                    ["Presión de Prueba", result.tecnicos?.prueba?.presion],
                  ].map(([label, val]) => (
                    <div key={label} style={S.infoBox}>
                      <div style={S.infoLabel}>{label}</div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: val ? "#F1F5F9" : "#64748B" }}>{val || "N/D"}</div>
                    </div>
                  ))}
                </div>
                {result.tecnicos?.soportes?.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <div style={S.sectionTitle}>🏗️ Soportes</div>
                    <table style={S.table}>
                      <thead><tr>{["Tag", "Tipo", "Ubicación"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
                      <tbody>
                        {result.tecnicos.soportes.map((sop, i) => (
                          <tr key={i}>
                            <td style={{ ...S.td, color: "#F97316" }}>{sop.tag || "—"}</td>
                            <td style={S.td}>{sop.tipo}</td>
                            <td style={S.td}>{sop.ubicacion || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === "construccion" && (
              <div>
                <div style={S.card}>
                  <div style={S.sectionTitle}>📋 4. Datos de Construcción y Control</div>
                  <div style={S.infoGrid}>
                    {[
                      ["Revisión del Plano", result.construccion?.revisionPlano],
                      ["NDT Tipo", result.construccion?.ndt?.tipo],
                      ["NDT Porcentaje", result.construccion?.ndt?.porcentaje],
                    ].map(([label, val]) => (
                      <div key={label} style={S.infoBox}>
                        <div style={S.infoLabel}>{label}</div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: val ? "#F1F5F9" : "#64748B" }}>{val || "N/D"}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={S.card}>
                    <div style={S.sectionTitle}>🔥 Soldaduras de Taller</div>
                    {[
                      ["Butt Weld (BW)", result.construccion?.soldaduras?.taller?.bw || 0, "#F97316"],
                      ["Socket Weld (SW)", result.construccion?.soldaduras?.taller?.sw || 0, "#3B82F6"],
                      ["Roscadas", result.construccion?.soldaduras?.taller?.roscadas || 0, "#10B981"],
                    ].map(([label, val, color]) => (
                      <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #1F2D4522" }}>
                        <span style={{ color: "#94A3B8", fontSize: 12 }}>{label}</span>
                        <span style={{ color, fontWeight: 900, fontSize: 18 }}>{val}</span>
                      </div>
                    ))}
                  </div>
                  <div style={S.card}>
                    <div style={S.sectionTitle}>🏗️ Soldaduras de Campo</div>
                    {[
                      ["Butt Weld (BW)", result.construccion?.soldaduras?.campo?.bw || 0, "#F97316"],
                      ["Socket Weld (SW)", result.construccion?.soldaduras?.campo?.sw || 0, "#3B82F6"],
                      ["Roscadas", result.construccion?.soldaduras?.campo?.roscadas || 0, "#10B981"],
                    ].map(([label, val, color]) => (
                      <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #1F2D4522" }}>
                        <span style={{ color: "#94A3B8", fontSize: 12 }}>{label}</span>
                        <span style={{ color, fontWeight: 900, fontSize: 18 }}>{val}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {result.construccion?.alertas?.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    {result.construccion.alertas.map((alerta, i) => (
                      <div key={i} style={{ background: "#78350f22", border: "1px solid #f59e0b55", borderRadius: 6, padding: "8px 12px", fontSize: 12, color: "#fcd34d", marginBottom: 6 }}>
                        ⚠️ {alerta}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div style={{ marginTop: 16 }}>
              <button onClick={exportCSV} style={{ padding: "10px 20px", background: "transparent", color: "#F97316", border: "1px solid #F97316", borderRadius: 7, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                ⬇ Exportar CSV completo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
