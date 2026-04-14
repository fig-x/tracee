"""Command line interface for tracee."""

import argparse
import importlib.util
import shutil
import subprocess
import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parent.parent
_UI_DIR = _ROOT / "playground-ui"
_DIST_DIR = _UI_DIR / "dist"


def _build_frontend():
    """build the frontend if dist/ is missing and npm is available."""
    if _DIST_DIR.exists():
        return

    if not _UI_DIR.exists():
        return

    npm = shutil.which("npm")
    if npm is None:
        print(
            "warning: playground-ui/dist/ not found and npm is not installed. "
            "the server will start without the UI. "
            "install Node.js (v18+) and re-run to get the web interface.",
            file=sys.stderr,
        )
        return

    print("playground-ui/dist/ not found — building frontend...")
    subprocess.run([npm, "install"], cwd=_UI_DIR, check=True)
    subprocess.run([npm, "run", "build"], cwd=_UI_DIR, check=True)
    print("frontend build complete.")


def main():
    parser = argparse.ArgumentParser(
        prog="tracee",
        description="tracee - MAS tracing and visualization toolkit",
    )
    subcommands = parser.add_subparsers(dest="command")

    serve = subcommands.add_parser("serve", help="start the tracee server and UI")
    serve.add_argument("--port", type=int, default=8000)
    serve.add_argument("--host", default="0.0.0.0")
    serve.add_argument("--skip-build", action="store_true", help="skip automatic frontend build")

    args = parser.parse_args()
    if args.command == "serve":
        if importlib.util.find_spec("fastapi") is None or importlib.util.find_spec("uvicorn") is None:
            parser.error("`tracee serve` requires server extras. Install with `pip install 'tracee[server]'`.")

        if not args.skip_build:
            _build_frontend()

        import uvicorn

        uvicorn.run("server.app:app", host=args.host, port=args.port)
        return

    parser.print_help()
