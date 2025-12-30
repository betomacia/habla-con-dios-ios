export async function speak(text: string, lang: string = "es") {
  try {
    const res = await fetch("https://jesus-backend-production-0dd8.up.railway.app/api/tts-stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, lang }),
    });

    if (!res.ok) {
      console.error("❌ Error al obtener audio:", await res.text());
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.play();
  } catch (err) {
    console.error("❌ Error en speak:", err);
  }
}
