# nds-refraction

Refract: a browser puzzle game about steering light. Bring the right light into every target using mirrors, lenses, prisms, polarizers, dichroics and interferometers.

Single static page, no dependencies, no build tools needed to play. Open `index.html`.

## Play

Enable GitHub Pages on the `main` branch (root) and the game is served at
`https://nate-the-ace.github.io/nds-refraction/`.

## Controls

- Drag a piece with a blue ring to move it. Bolted pieces are fixed.
- Drag the blue dot at the end of a piece to turn it. `Q` / `E` or the arrow keys turn it too.
- Polarizers, waveplates, polarizing splitters and phase plates have an amber knob. Drag it around the ring to set the axis or delay.
- `Hint` reveals where one piece could go. `Reset` restarts the level. `R` also resets.
- `Waves` toggles the wave animation. `Guides` toggles surface normals, angle arcs and lens focal marks.

## Levels

25 levels in 5 chapters. Each chapter adds one new kind of optics.

| Chapter | New item | Levels |
|---|---|---|
| 1. Basics | Mirrors, wall, splitter, prism, filter | 1 to 5 |
| 2. Lenses | Convex and concave lenses, wide beams | 6 to 10 |
| 3. Polarization | Polarizer, waveplate, polarizing splitter | 11 to 15 |
| 4. Dichroics | Color-selective mirror | 16 to 20 |
| 5. Interference | Phase plates, mirrors on rails | 21 to 25 |

Progress is saved in the browser's local storage.

## How the light works

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
- `src/levels.js`: chapters and levels, each with a known solution
- `src/template.html`: UI, rendering and input

```
python3 build.py        # writes index.html
node test/verify.js     # every level must have a working solution
```

`index.html` is committed so the repo works on GitHub Pages with no build step. Rebuild it after editing anything in `src/`.

### Adding a level

Add an entry to `LEVELS` in `src/levels.js` with `name`, `hint`, `pieces` and `sol`. `sol` maps a piece index to `[x, y, angleDegrees]` (plus a fourth value for the dial on polarizers and phase plates). Run `node test/verify.js` to confirm it solves.

## Credit

Inspired by the idea behind [Prism Rules](https://www.prismrules.com/). This is an independent project with its own code and levels, and is not affiliated with it.

## License

MIT
