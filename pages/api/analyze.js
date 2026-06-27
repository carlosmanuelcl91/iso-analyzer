export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const { image, type } = req.body;

  if (!image) {
    return res.status(400).json({ error: "No se ha recibido ninguna imagen" });
  }

  try {
    const isPdf = type === "application/pdf";

    const messageContent = isPdf ? [
      {
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: image },
      },
      { type: "text", text: "Analiza este isométrico y devuelve el JSON con todos los datos." },
    ] : [
      {
        type: "image",
        source: { type: "base64", media_type: "image/jpeg", data: image },
      },
      { type: "text", text: "Analiza este isométrico y devuelve el JSON con todos los datos." },
    ];

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 3000,
        system: `Eres un experto en ingeniería de tuberías e isométricos de piping. Analiza la imagen y extrae TODOS los datos posibles organizados en 4 categorías. Responde SOLO con JSON puro, sin markdown ni backticks:
{
  "geometria": {
    "orientacionNorte": null,
    "coordenadasInicio": { "norte": null, "este": null, "elevacion": null },
    "coordenadasFin": { "norte": null, "este": null, "elevacion": null },
    "elevacionBOP": null,
    "angulos": []
  },
  "materiales": {
    "tuberias": [
      { "tramo": "", "diametroNominal": "", "longitud": "", "schedule": "", "material": "" }
    ],
    "accesorios": [
      { "tipo": "", "diametro": "", "cantidad": 0, "rating": null, "extremos": null, "material": null }
    ],
    "bridas": [
      { "tipo": "", "diametro": "", "rating": "", "cara": null, "cantidad": 0 }
    ],
    "valvulas": [
      { "tipo": "", "tag": null, "diametro": "", "rating": null, "operacion": null, "cantidad": 0 }
    ],
    "pernos": [
      { "diametro": null, "longitud": null, "cantidad": 0 }
    ],
    "empaquetaduras": [
      { "tipo": null, "diametro": null, "cantidad": 0 }
    ]
  },
  "tecnicos": {
    "lineaNumero": null,
    "especificacion": null,
    "fluido": null,
    "presionDiseno": null,
    "temperaturaDiseno": null,
    "aislamiento": { "tipo": null, "espesor": null },
    "soportes": [
      { "tag": null, "tipo": "", "ubicacion": null }
    ],
    "prueba": { "tipo": null, "presion": null }
  },
  "construccion": {
    "revisionPlano": null,
    "soldaduras": {
      "taller": { "bw": 0, "sw": 0, "roscadas": 0 },
      "campo": { "bw": 0, "sw": 0, "roscadas": 0 }
    },
    "ndt": { "tipo": null, "porcentaje": null },
    "alertas": []
  }
}`,
        messages: [{ role: "user", content: messageContent }],
      }),
    });

    const data = await response.json();

    if (data.error) {
      return res.status(500).json({ error: data.error.message || "Error de API" });
    }

    const text = data.content?.map((b) => b.text || "").join("") || "";

    if (!text) {
      return res.status(500).json({ error: "La IA no devolvió respuesta" });
    }

    const clean = text.replace(/```json|```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch (e) {
      return res.status(500).json({ error: "Error procesando respuesta: " + clean.substring(0, 200) });
    }

    return res.status(200).json(parsed);

  } catch (err) {
    return res.status(500).json({ error: "Error al analizar la imagen: " + err.message });
  }
}
