# nds-refraction

Refract: a browser puzzle game about steering light. Bring the right light into every target using mirrors, lenses, prisms, polarizers, dichroics and interferometers.

Single static page, no dependencies, no build tools needed to play. Open `index.html`.

## Play

Enable GitHub Pages on the `main` branch (root) and the game is served at
`https://nate-the-ace.github.io/nds-refraction/`.

## Controls

- The shelf at the bottom holds the level's movable pieces in drawers by kind (Mirrors, Glass, Lenses, Color, Polarization, Waves), with the quantity left on each. Click a piece or drag it onto the board. Drag it back onto the shelf, or press Put back, to return it.
- Drag a piece with a blue ring to move it. Bolted pieces are fixed.
- Drag the blue dot at the end of a piece to turn it. `Q` / `E` or the arrow keys turn it too.
- Polarizers, waveplates, polarizing splitters and phase plates have an amber knob. Drag it around the ring to set the axis or delay.
- Zoom with pinch (touch), Ctrl/Cmd + wheel or trackpad pinch, `+` / `-`, or the on-screen + / - / Fit buttons. Drag empty space to pan when zoomed. `0` fits the board. A plain wheel turns the selected piece, or zooms if nothing is selected.
- `Tab` / `Shift+Tab` steps through the movable pieces.
- On a phone held sideways the shelf and buttons move to a rail on the right; tap the level title to read its hint.
- `Hint` reveals where one piece could go. `Reset` restarts the level. `R` also resets.
- `Waves` toggles the wave animation. `Guides` toggles surface normals, angle arcs and lens focal marks.

## Levels

25 hand-built levels in 5 chapters, each adding one kind of optics. Then 100 more in five mixed chapters that use everything together.

| Chapter | New item | Levels |
|---|---|---|
| 1. Basics | Mirrors, wall, splitter, prism, filter | 1 to 5 |
| 2. Lenses | Convex and concave lenses, wide beams | 6 to 10 |
| 3. Polarization | Polarizer, waveplate, polarizing splitter | 11 to 15 |
| 4. Dichroics | Color-selective mirror | 16 to 20 |
| 5. Interference | Phase plates, mirrors on rails | 21 to 25 |
| 6 to 10. Workshop, Studio, Laboratory, Observatory, Grand Optics | Glass ball, zoom lens, everything mixed | 26 to 125 |

Pieces added after the first 25 levels:

- **Glass ball**: a round prism. Where the beam strikes it sets the angle and the color. It has nothing to turn.
- **Zoom lens**: a variable lens. Select it and drag the amber knob to squeeze it from a strong concave lens, through flat, to a strong convex lens (16 settings).
- Fixed lenses come in many focal lengths, convex and concave.
- **Black hole**: an obstacle that bends light with real Schwarzschild geometry. Beams that pass close curve a long way, wide beams are lensed into crossing caustics, and anything that reaches the black disc is swallowed. A board can hold any number of black holes: each hole's exact bend is computed separately and the bends are added, so one dominates up close and they combine where their pulls are comparable. In the sandbox you can resize one with the amber handle on its edge, the Smaller/Larger buttons, or `[` and `]`.

**Endless** (menu): the game builds a new puzzle on the spot at one of five difficulties. The seed is shown in the title.

**Sandbox** (menu): every piece in unlimited supply, no goals. Take pieces from the drawers, change colors, beam width, polarization and focal length, delete or clear. The layout is saved in the browser.

Progress is saved in the browser's local storage.

## How the light works

- Black holes: the pull depends on wavelength (a game rule, not real relativity), so blue bends more than red and white light disperses around a hole. Rays are integrated along null geodesics, `u'' = -u + 1.5 rs u^2` with `u = 1/r`, in short chords. That reproduces the weak-field bend of `2 rs / b`, the photon sphere at `1.5 rs`, and capture for impact parameters below about `2.6 rs`.

- Light is traced as 40 wavelengths from 400 to 700 nm.
- Glass uses Snell's law with a Cauchy-style refractive index, so prisms disperse white light. Total internal reflection is handled.
- Lenses are ideal thin lenses (`slope' = slope - h / f`).
- Polarization follows Malus's law. Waveplates reflect the polarization angle about their axis. Polarizing splitters send `cos^2` straight and `sin^2` aside.
- Dichroic mirrors reflect a band of wavelengths and pass the rest.
- Each ray carries a phase. Splitters add a quarter-wave on reflection, mirrors add a half-wave, and path length adds `2*pi*n*L/lambda`. Goals marked coherent sum the complex amplitudes, so beams interfere.
- Goals light up when enough of the required wavelengths arrive. Some are exclusive and fail if other colors arrive too.

## Develop

Source lives in `src/`:

- `src/engine.js`: the light tracer (also runs in Node)
- `src/levels.js`: chapters and the 25 hand-built levels, each with a known solution
- `src/levels_gen.js`: the 100 baked generated levels (written by `tools/gen_levels.js`, do not edit)
- `src/gen.js`: the level generator behind the baked levels and Endless mode
- `src/template.html`: UI, rendering and input

```
python3 build.py             # writes index.html
node test/verify.js          # every level must have a working solution
node tools/gen_levels.js     # re-bake the 100 generated levels
node tools/check.js 20       # re-verify freshly generated levels
node tools/probe.js orb 1,3  # generator success rate per family and tier
```

`index.html` is committed so the repo works on GitHub Pages with no build step. Rebuild it after editing anything in `src/`.

### How levels are generated

The generator builds each level backwards from a solution. It lays out a beam path (or a tree of paths), places the pieces that solve it, places walls and decoys, then scrambles the movable pieces. It then checks the result with the real engine: the solution lights every target, the start does not, every moved piece matters, and the solution survives a 5 px nudge of any single piece. Target sizes and thresholds are tuned from the simulation. The same seed always gives the same level.

Families: relay, fan, sorter, combine, focus, zoom, spread, pinhole, prism, glass ball, polarizer chain, polarizing splitter, Mach-Zehnder and Michelson interferometers.

### Adding a level by hand

Add an entry to `LEVELS` in `src/levels.js` with `name`, `hint`, `pieces` and `sol`. `sol` maps a piece index to `[x, y, angleDegrees]` (plus a fourth value for the dial on polarizers, phase plates and zoom lenses). Run `node test/verify.js` to confirm it solves.

## Credit

Inspired by the idea behind [Prism Rules](https://www.prismrules.com/). This is an independent project with its own code and levels, and is not affiliated with it.

## License

MIT
