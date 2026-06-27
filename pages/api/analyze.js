export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const { image, type } = req.body;

  if (!image) {
    return res.status(400).json({ error: "No se ha recibido ninguna imagen" });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 2000,
        system: `Eres un experto en ingeniería de tuberías e isométricos de piping. Analiza la imagen y extrae TODOS los datos. Responde SOLO con JSON puro, sin markdown ni backticks:
{
  "resumen": {
    "lineaNumero": null,
    "fluido": null,
    "especificacion": null,
    "material": null,
    "presion": null,
    "temperatura": null
  },
  "tuberias": [
    { "tramo": "", "diametro": "", "longitud": "", "material": "", "schedule": "" }
  ],
  "accesorios": [
    { "tipo": "", "diametro": "", "rating": null, "extremos": null, "material": null, "cantidad": 0 }
  ],
  "soldaduras": {
    "bw": 0,
    "sw": 0,
    "roscadas": 0,
    "nota": null
  },
  "valvulas": [
    { "tipo": "", "tag": null, "diametro": "", "rating": null, "cantidad": 0 }
  ],
  "soportes": [
    { "tipo": "", "tag": null, "cantidad": 0 }
  ],
  "alertas": []
}`,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: type,
                  data: image,
                },
              },
              {
                type: "text",
                text: "Analiza este isométrico y devuelve el JSON con todos los datos.",
              },
            ],
          },
        ],
      }),
    });

    const data = await response.json();
    const text = data.content?.map((b) => b.text || "").join("") || "";
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(500).json({ error: "Error al analizar la imagen: " + err.message });
  }
}
