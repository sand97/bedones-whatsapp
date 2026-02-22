import io
import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any, Dict, List

import numpy as np
from PIL import Image
from paddleocr import PPStructure

_show_log = os.getenv("PADDLEOCR_SHOW_LOG", "false").lower() in ("1", "true", "yes")
_engine = PPStructure(show_log=_show_log, table=False, ocr=False)


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, format: str, *args: Any) -> None:
        if os.getenv("PADDLEOCR_HTTP_LOG", "false").lower() in (
            "1",
            "true",
            "yes",
        ):
            super().log_message(format, *args)

    def _send_json(self, status_code: int, payload: Dict[str, Any]) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:  # noqa: N802
        if self.path == "/health":
            self._send_json(200, {"status": "ok"})
            return
        self._send_json(404, {"error": "not_found"})

    def do_POST(self) -> None:  # noqa: N802
        if self.path != "/layout":
            self._send_json(404, {"error": "not_found"})
            return

        content_length = int(self.headers.get("Content-Length", "0"))
        if content_length <= 0:
            self._send_json(400, {"error": "empty_body"})
            return

        image_bytes = self.rfile.read(content_length)
        try:
            image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        except Exception:
            self._send_json(400, {"error": "invalid_image"})
            return

        width, height = image.size
        image_np = np.array(image)[:, :, ::-1]

        results = _engine(image_np)
        items: List[Dict[str, Any]] = []
        for item in results:
            if not isinstance(item, dict):
                continue
            bbox = item.get("bbox")
            if not bbox or len(bbox) != 4:
                continue
            items.append(
                {
                    "type": item.get("type"),
                    "bbox": bbox,
                    "score": item.get("score") or item.get("confidence"),
                }
            )

        self._send_json(200, {"width": width, "height": height, "items": items})


def main() -> None:
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8010"))
    server = ThreadingHTTPServer((host, port), Handler)
    server.serve_forever()


if __name__ == "__main__":
    main()
