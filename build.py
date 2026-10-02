#!/usr/bin/env python3
"""Inline engine, levels, generated levels and the level generator into src/template.html -> index.html"""
import pathlib
root = pathlib.Path(__file__).parent
strip = lambda t: t.split("if(typeof module")[0]
engine = strip((root / "src/engine.js").read_text())
levels = strip((root / "src/levels.js").read_text())
gl = strip((root / "src/levels_gen.js").read_text())
gen = strip((root / "src/gen.js").read_text())
html = (root / "src/template.html").read_text()
html = html.replace("/*ENGINE*/", engine).replace("/*LEVELS*/", levels).replace("/*GENLEVELS*/", gl).replace("/*GEN*/", gen)
(root / "index.html").write_text(html)
print("wrote index.html", len(html), "bytes")
