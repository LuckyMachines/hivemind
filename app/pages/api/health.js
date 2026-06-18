export default function handler(_request, response) {
  response.setHeader("Cache-Control", "no-store, max-age=0");
  response.status(200).json({ ok: true, service: "hjivemind-game" });
}
