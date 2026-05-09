# Museum Model Metadata

- File: `museum-model-guigong-flagship-main-v1.0.glb`
- Version: `v1.0`
- Type: flagship nested guigong ball demo asset
- Usage: `Atelier` primary 3D object, `Museum` close-up / archive / teaching showcase reuse
- Generation date: `2026-05-09`
- Source: procedurally generated in local Blender 5.1.1 via `tools/blender/generate_guigong_flagship.py`
- Rights status: local original demo asset for this project workspace

## Structure

- Root node: `guigong_flagship_root`
- Layer nodes: `shell_01` to `shell_05`
- Core node: `core`

## Material Direction

- Neutral museum-display ivory / carved bone tone
- Uses exported glTF material parameters only; no external texture dependencies
- Intended web-side approximation: `MeshPhysicalMaterial`-class lighting response

## Modeling Notes

- Fixed 5-layer composition aligned to current web prototype, not template-specific
- Parametric bmesh face-carving on solidified UV spheres -- no boolean operations
- Pattern functions in spherical coordinates (theta, phi) define smooth openwork boundaries
- Outer shell: polar-rose petal windows + crown trefoils; middle shells: hex/diamond lattice; inner shells: fine dense lattice
- Pole dead zones (8 deg) prevent UV sphere convergence artifacts
- Bevel + weighted normals for clean carved-edge appearance
- Favors export stability and real-time web display

## Reproduction

Run from repo root:

```powershell
blender -b -P tools/blender/generate_guigong_flagship.py
```

Outputs:

- `src/assets/materials/models/museum-model-guigong-flagship-main-v1.0.blend`
- `src/assets/materials/models/museum-model-guigong-flagship-main-v1.0.glb`
