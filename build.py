#!/usr/bin/env python3
"""Inline src/engine.js and src/levels.js into src/template.html -> index.html"""
import pathlib
root = pathlib.Path(__file__).parent
strip = lambda t: t.split("if(typeof module")[0]
engine = strip((root / "src/engine.js").read_text())
levels = strip((root / "src/levels.js").read_text())
html = (root / "src/template.html").read_text()
html = html.replace("/*ENGINE*/", engine).replace("/*LEVELS*/", levels)
(root / "index.html").write_text(html)
print("wrote index.html", len(html), "bytes")
