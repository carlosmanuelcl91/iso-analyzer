import { useState, useRef } from "react";

const str = (val) => {
  if (val === null || val === undefined) return "N/D";
  if (typeof val === "object") return `"${JSON.stringify(val)}"`;
  const s = String(val);
  return s.includes(",") ? `"${s}"` : s;
};

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
    rows.push("1. DATOS GEOMETRICOS Y DE RUTEO");
    rows.push(`Orientacion Norte,${str(result.geometria?.orientacionNorte)}`);
    rows.push(`Elevacion BOP,${str(result.geometria?.elevacionBOP)}`);
    rows.push(`Coord. Inicio Norte,${str(result.geometria?.coordenadasInicio?.norte)}`);
    rows.push(`Coord. Inicio Este,${str(result.geometria?.coordenadasInicio?.este)}`);
    rows.push(`Coord. Inicio Elevacion,${str(result.geometria?.coordenadasInicio?.elevacion)}`);
    rows.push(`Coord. Fin Norte,${str(result.geometria?.coordenadasFin?.norte)}`);
    rows.push(`Coord. Fin Este,${str(result.geometria?.coordenadasFin?.este)}`);
    rows.push(`Coord. Fin Elevacion,${str(result.geometria?.coordenadasFin?.elevacion)}`);
    if (result.geometria?.angulos?.length > 0) {
      rows.push("Angulos," + result.geometria.angulos.map(str).join(" | "));
    }
    rows.push("");
    rows.push("2. DATOS DE MATERIALES (MTO)");
    rows.push("TUBERIAS");
    rows.push("Tramo,Diametro Nominal,Longitud,Schedule,Material");
    (result.materiales?.tuberias || []).forEach(t =>
      rows.push(`${str(t.tramo)},${str(t.diametroNominal)},${str(t.longitud)},${str(t.schedule)},${str(t.material)}`)
    );
    rows.push("");
    rows.push("ACCESORIOS");
    rows.push("Tipo,Diametro,Cantidad,Rating,Extremos,Material");
    (result.materiales?.accesorios || []).forEach(a =>
      rows.push(`${str(a.tipo)},${str(a.diametro)},${str(a.cantidad)},${str(a.rating)},${str(a.extremos)},${str(a.material)}`)
    );
    rows.push("");
    rows.push("BRIDAS");
    rows.push("Tipo,Diametro,Rating,Cara,Cantidad");
    (result.materiales?.bridas || []).forEach(b =>
      rows.push(`${str(b.tipo)},${str(b.diametro)},${str(b.rating)},${str(b.cara)},${str(b.cantidad)}`)
    );
    rows.push("");
    rows.push("VALVULAS");
    rows.push("Tipo,Tag,Diametro,Rating,Operacion,Cantidad");
    (result.materiales?.valvulas || []).forEach(v =>
      rows.push(`${str(v.tipo)},${str(v.tag)},${str(v.diametro)},${str(v.rating)},${str(v.operacion)},${str(v.cantidad)}`)
    );
    rows.push("");
    rows.push("PERNOS");
    rows.push("Diametro,Longitud,Cantidad");
    (result.materiales?.pernos || []).forEach(p =>
      rows.push(`${str(p.diametro)},${str(p.longitud)},${str(p.cantidad)}`)
    );
    rows.push("");
    rows.push("EMPAQUETADURAS");
    rows.push("Tipo,Diametro,Cantidad");
    (result.materiales?.empaquetaduras || []).forEach(emp =>
      rows.push(`${str(emp.tipo)},${str(emp.diametro)},${str(emp.cantidad)}`)
    );
    rows.push("");
    rows.push("3. DATOS TECNICOS Y OPERATIVOS");
    rows.push(`Numero de Linea,${str(result.tecnicos?.lineaNumero)}`);
    rows.push(`Especificacion,${str(result.tecnicos?.especificacion)}`);
    rows.push(`Fluido,${str(result.tecnicos?.fluido)}`);
    rows.push(`Presion de Diseno,${str(result.tecnicos?.presionDiseno)}`);
    rows.push(`Temperatura de Diseno,${str(result.tecnicos?.temperaturaDiseno)}`);
    rows.push(`Aislamiento Tipo,${str(result.tecnicos?.aislamiento?.tipo)}`);
    rows.push(`Aislamiento Espesor,${str(result.tecnicos?.aislamiento?.espesor)}`);
    rows.push(`Prueba Tipo,${str(result.tecnicos?.prueba?.tipo)}`);
    rows.push(`Prueba Presion,${str(result.tecnicos?.prueba?.presion)}`);
    rows.push("");
    rows.push("SOPORTES");
    rows.push("Tag,Tipo,Ubicacion");
    (result.tecnicos?.soportes || []).forEach(s =>
      rows.push(`${str(s.tag)},${str(s.tipo)},${str(s.ubicacion)}`)
    );
    rows.push("");
    rows.push("4. DATOS DE CONSTRUCCION Y CONTROL");
    rows.push(`Revision del Plano,${str(result.construccion?.revisionPlano)}`);
    rows.push(`NDT Tipo,${str(result.construccion?.ndt?.tipo)}`);
    rows.push(`NDT Porcentaje,${str(result.construccion?.ndt?.porcentaje)}`);
    rows.push("");
    rows.push("SOLDADURAS DE TALLER");
    rows.push(`BW Taller,${str(result.construccion?.soldaduras?.taller?.bw)}`);
    rows.push(`SW Taller,${str(result.construccion?.soldaduras?.taller?.sw)}`);
    rows.push(`Roscadas Taller,${str(result.construccion?.soldaduras?.taller?.roscadas)}`);
    rows.push("");
    rows.push("SOLDADURAS DE CAMPO");
    rows.push(`BW Campo,${str(result.construccion?.soldaduras?.campo?.bw)}`);
    rows.push(`SW Campo,${str(result.construccion?.soldaduras?.campo?.sw)}`);
    rows.push(`Roscadas Campo,${str(result.construccion?.soldaduras?.campo?.roscadas)}`);
    rows.push("");
    if (result.construccion?.alertas?.length > 0) {
      rows.push("ALERTAS");
      result.construccion.alertas.forEach(alerta => rows.push(`ALERTA,${str(alerta)}`));
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
    { id: "geometria", label: "Geometria" },
    { id: "materiales", label: "Materiales" },
    { id: "tecnicos", label: "Tecnicos" },
    { id: "construccion", label: "Construccion" },
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
          <div style={{ color: "#64748B", fontSize: 11 }}>Analisis automatico de isometricos de tuberias</div>
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
              <div style={{ color: "#64748B", fontSize: 12, marginTop: 4 }}>PDF cargado</div>
            </div>
          ) : image ? (
            <img src={image} alt="iso" style={{ maxHeight: 260, maxWidth: "100%", borderRadius: 8, objectFit: "contain" }} />
          ) : (
            <>
              <div style={{ fontSize: 36, marginBottom: 10 }}>📐</div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Sube el isometrico</div>
              <div style={{ color: "#64748B", fontSize: 12 }}>JPG, PNG, WEBP, PDF</div>
            </>
          )}
        </div>

        {image && !loading && (
          <button onClick={analyze} style={{ width: "100%", padding: 14, background: "#F97316", color: "#fff", border: "none", borderRadius: 8, fontWeight: 800, fontSize: 15, cursor: "pointer", marginBottom: 24 }}>
            ANALIZAR ISOMETRICO
          </button>
        )}

        {loading && (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>⚙️</div>
            <div style={{ fontWeight: 700, color: "#F97316" }}>Analizando...</div>
            <div style={{ color: "#64748B", fontSize: 13, marginTop: 4 }}>Extrayendo datos del isometrico</div>
          </div>
        )}

        {error && (
          <div style={{ background: "#7f1d1d33", border: "1px solid #ef4444", borderRadius: 8, padding: "12px 16px", color: "#fca5a5", marginBottom: 16 }}>
            Error: {error}
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
                <div style={S.sectionTitle}>1. Datos Geometricos y de Ruteo</div>
                <div style={S.infoGrid}>
                  {[
                    ["Orientacion Norte", result.geometria?.orientacionNorte],
                    ["Elevacion BOP", result.geometria?.elevacionBOP],
                    ["Coord. Inicio Norte", result.geometria?.coordenadasInicio?.norte],
                    ["Coord. Inicio Este", result.geometria?.coordenadasInicio?.este],
                    ["Coord. Inicio Elev.", result.geometria?.coordenadasInicio?.elevacion],
                    ["Coord. Fin Norte", result.geometria?.coordenadasFin?.norte],
                    ["Coord. Fin Este", result.geometria?.coordenadasFin?.este],
                    ["Coord. Fin Elev.", result.geometria?.coordenadasFin?.elevacion],
                  ].map(([label, val]) => (
                    <div key={label} style={S.infoBox}>
                      <div style={S.infoLabel}>{label}</div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: val ? "#F1F5F9" : "#64748B" }}>{str(val)}</div>
                    </div>
                  ))}
                </div>
                {result.geometria?.angulos?.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <div style={S.infoLabel}>Angulos</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
                      {result.geometria.angulos.map((ang, i) => (
                        <div key={i} style={{ background: "#0B1120", border: "1px solid #1F2D45", borderRadius: 6, padding: "4px 10px", fontSize: 12, color: "#F97316", fontWeight: 700 }}>{str(ang)}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "materiales" && (
              <div>
                <div style={S.card}>
                  <div style={S.sectionTitle}>Tuberias</div>
                  <table style={S.table}>
                    <thead><tr>{["Tramo", "Diametro", "Longitud", "Schedule", "Material"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
                    <tbody>
                      {(result.materiales?.tuberias || []).map((t, i) => (
                        <tr key={i}>
                          <td style={{ ...S.td, color: "#F97316", fontWeight: 700 }}>{str(t.tramo)}</td>
                          <td style={S.td}>{str(t.diametroNominal)}</td>
                          <td style={S.td}>{str(t.longitud)}</td>
                          <td style={S.td}>{str(t.schedule)}</td>
                          <td style={S.td}>{str(t.material)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={S.card}>
                  <div style={S.sectionTitle}>Accesorios</div>
                  <table style={S.table}>
                    <thead><tr>{["Tipo", "Diametro", "Cant.", "Rating", "Extremos", "Material"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
                    <tbody>
                      {(result.materiales?.accesorios || []).map((acc, i) => (
                        <tr key={i}>
                          <td style={S.td}>{str(acc.tipo)}</td>
                          <td style={S.td}>{str(acc.diametro)}</td>
                          <td style={{ ...S.td, color: "#F97316", fontWeight: 800, textAlign: "center" }}>{str(acc.cantidad)}</td>
                          <td style={S.td}>{str(acc.rating)}</td>
                          <td style={S.td}>{str(acc.extremos)}</td>
                          <td style={S.td}>{str(acc.material)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {result.materiales?.bridas?.length > 0 && (
                  <div style={S.card}>
                    <div style={S.sectionTitle}>Bridas</div>
                    <table style={S.table}>
                      <thead><tr>{["Tipo", "Diametro", "Rating", "Cara", "Cant."].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
                      <tbody>
                        {result.materiales.bridas.map((bri, i) => (
                          <tr key={i}>
                            <td style={S.td}>{str(bri.tipo)}</td>
                            <td style={S.td}>{str(bri.diametro)}</td>
                            <td style={S.td}>{str(bri.rating)}</td>
                            <td style={S.td}>{str(bri.cara)}</td>
                            <td style={{ ...S.td, color: "#F97316", fontWeight: 800, textAlign: "center" }}>{str(bri.cantidad)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div style={S.card}>
                  <div style={S.sectionTitle}>Valvulas</div>
                  <table style={S.table}>
                    <thead><tr>{["Tipo", "Tag", "Diametro", "Rating", "Operacion", "Cant."].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
                    <tbody>
                      {(result.materiales?.valvulas || []).map((valv, i) => (
                        <tr key={i}>
                          <td style={S.td}>{str(valv.tipo)}</td>
                          <td style={{ ...S.td, color: "#F97316" }}>{str(valv.tag)}</td>
                          <td style={S.td}>{str(valv.diametro)}</td>
                          <td style={S.td}>{str(valv.rating)}</td>
                          <td style={S.td}>{str(valv.operacion)}</td>
                          <td style={{ ...S.td, fontWeight: 800, textAlign: "center" }}>{str(valv.cantidad)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={S.card}>
                    <div style={S.sectionTitle}>Pernos</div>
                    <table style={S.table}>
                      <thead><tr>{["Diametro", "Longitud", "Cant."].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
                      <tbody>
                        {(result.materiales?.pernos || []).map((per, i) => (
                          <tr key={i}>
                            <td style={S.td}>{str(per.diametro)}</td>
                            <td style={S.td}>{str(per.longitud)}</td>
                            <td style={{ ...S.td, color: "#F97316", fontWeight: 800 }}>{str(per.cantidad)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div style={S.card}>
                    <div style={S.sectionTitle}>Empaquetaduras</div>
                    <table style={S.table}>
                      <thead><tr>{["Tipo", "Diametro", "Cant."].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
                      <tbody>
                        {(result.materiales?.empaquetaduras || []).map((emp, i) => (
                          <tr key={i}>
                            <td style={S.td}>{str(emp.tipo)}</td>
                            <td style={S.td}>{str(emp.diametro)}</td>
                            <td style={{ ...S.td, color: "#F97316", fontWeight: 800 }}>{str(emp.cantidad)}</td>
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
                <div style={S.sectionTitle}>3. Datos Tecnicos y Operativos</div>
                <div style={S.infoGrid}>
                  {[
                    ["Numero de Linea", result.tecnicos?.lineaNumero],
                    ["Especificacion", result.tecnicos?.especificacion],
                    ["Fluido", result.tecnicos?.fluido],
                    ["Presion de Diseno", result.tecnicos?.presionDiseno],
                    ["Temperatura de Diseno", result.tecnicos?.temperaturaDiseno],
                    ["Aislamiento Tipo", result.tecnicos?.aislamiento?.tipo],
                    ["Aislamiento Espesor", result.tecnicos?.aislamiento?.espesor],
                    ["Prueba Tipo", result.tecnicos?.prueba?.tipo],
                    ["Presion de Prueba", result.tecnicos?.prueba?.presion],
                  ].map(([label, val]) => (
                    <div key={label} style={S.infoBox}>
                      <div style={S.infoLabel}>{label}</div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: val ? "#F1F5F9" : "#64748B" }}>{str(val)}</div>
                    </div>
                  ))}
                </div>
                {result.tecnicos?.soportes?.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <div style={S.sectionTitle}>Soportes</div>
                    <table style={S.table}>
                      <thead><tr>{["Tag", "Tipo", "Ubicacion"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
                      <tbody>
                        {result.tecnicos.soportes.map((sop, i) => (
                          <tr key={i}>
                            <td style={{ ...S.td, color: "#F97316" }}>{str(sop.tag)}</td>
                            <td style={S.td}>{str(sop.tipo)}</td>
                            <td style={S.td}>{str(sop.ubicacion)}</td>
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
                  <div style={S.sectionTitle}>4. Datos de Construccion y Control</div>
                  <div style={S.infoGrid}>
                    {[
                      ["Revision del Plano", result.construccion?.revisionPlano],
                      ["NDT Tipo", result.construccion?.ndt?.tipo],
                      ["NDT Porcentaje", result.construccion?.ndt?.porcentaje],
                    ].map(([label, val]) => (
                      <div key={label} style={S.infoBox}>
                        <div style={S.infoLabel}>{label}</div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: val ? "#F1F5F9" : "#64748B" }}>{str(val)}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={S.card}>
                    <div style={S.sectionTitle}>Soldaduras de Taller</div>
                    {[
                      ["Butt Weld (BW)", result.construccion?.soldaduras?.taller?.bw || 0, "#F97316"],
                      ["Socket Weld (SW)", result.construccion?.soldaduras?.taller?.sw || 0, "#3B82F6"],
                      ["Roscadas", result.construccion?.soldaduras?.taller?.roscadas || 0, "#10B981"],
                    ].map(([label, val, color]) => (
                      <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #1F2D4522" }}>
                        <span style={{ color: "#94A3B8", fontSize: 12 }}>{label}</span>
                        <span style={{ color, fontWeight: 900, fontSize: 18 }}>{str(val)}</span>
                      </div>
                    ))}
                  </div>
                  <div style={S.card}>
                    <div style={S.sectionTitle}>Soldaduras de Campo</div>
                    {[
                      ["Butt Weld (BW)", result.construccion?.soldaduras?.campo?.bw || 0, "#F97316"],
                      ["Socket Weld (SW)", result.construccion?.soldaduras?.campo?.sw || 0, "#3B82F6"],
                      ["Roscadas", result.construccion?.soldaduras?.campo?.roscadas || 0, "#10B981"],
                    ].map(([label, val, color]) => (
                      <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #1F2D4522" }}>
                        <span style={{ color: "#94A3B8", fontSize: 12 }}>{label}</span>
                        <span style={{ color, fontWeight: 900, fontSize: 18 }}>{str(val)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {result.construccion?.alertas?.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    {result.construccion.alertas.map((alerta, i) => (
                      <div key={i} style={{ background: "#78350f22", border: "1px solid #f59e0b55", borderRadius: 6, padding: "8px 12px", fontSize: 12, color: "#fcd34d", marginBottom: 6 }}>
                        {str(alerta)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div style={{ marginTop: 16 }}>
              <button onClick={exportCSV} style={{ padding: "10px 20px", background: "transparent", color: "#F97316", border: "1px solid #F97316", borderRadius: 7, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                Exportar CSV completo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
