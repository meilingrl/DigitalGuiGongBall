# Asset Image Prompts (GPT-image-2)

本文件用于给 `GPT-image-2` 直接投喂英文生图 prompt，覆盖当前代码中三大模块的素材空位：

- 博物馆藏（Museum）
- 非遗探访（Explore）
- 文创商城（Mall）

## Global Generation Rules (apply to all prompts)

Use these constraints together with each slot prompt:

`High-fidelity, realistic photography style, museum-grade lighting, clean composition, culturally respectful, no text, no logos, no watermark, no UI elements, no frame border, no copyrighted characters, no modern plastic-looking props unless explicitly requested, 8k detail, natural color grading, editorial quality.`

## 1) 博物馆藏 / Museum

### MUSEUM-EXH-01

- **Code slot**: latest exhibition card (`镂月裁云：鬼工球与岭南牙雕`)
- **Suggested output**: 16:10 horizontal
- **Prompt**:

`A curated museum exhibition scene centered on a multi-layer Chinese guigong puzzle ball and Lingnan ivory carving heritage, macro-level craftsmanship details, concentric openwork shells displayed in a dark matte glass showcase, warm spotlight from top-left, subtle crowd blur in the far background, premium museum atmosphere, historical elegance, high texture fidelity, cinematic but realistic, no text, no logo, no watermark`

### MUSEUM-EXH-02

- **Code slot**: latest exhibition card (`纹样与秩序：从开窗到几何网格`)
- **Suggested output**: 16:10 horizontal
- **Prompt**:

`A museum visual study of traditional Chinese motifs transitioning into geometric fenestration grids, layered carved spherical shells arranged from organic cloud-ruyi patterns to strict geometric lattice, neutral gallery wall, directional side lighting emphasizing carving rhythm and negative space, scholarly and minimal composition, realistic photography, no text, no logo, no watermark`

### MUSEUM-EXH-03

- **Code slot**: latest exhibition card (`数字孪生：馆藏三维档案公开周`)
- **Suggested output**: 16:10 horizontal
- **Prompt**:

`A contemporary museum digital twin exhibition setup for guigong ball archives, real carved artifact beside holographic-style 3D scan projection and transparent layered model visualization, cool cyan accent light mixed with warm artifact spotlight, professional institutional environment, educational and technological tone, realistic photo style, no text overlays, no logo, no watermark`

### MUSEUM-EXH-04

- **Code slot**: latest exhibition card (`技艺活化：非遗工艺数字互动展`)
- **Suggested output**: 16:10 horizontal
- **Prompt**:

`An interactive intangible cultural heritage exhibition scene, visitors using gesture-based AR interface to explore traditional guigong carving process beside physical craft replicas, balanced warm-cool lighting, immersive but elegant museum interior, focus on human-craft interaction and cultural continuity, photorealistic editorial style, no text, no logo, no watermark`

## 2) 非遗探访 / Explore

### EXPLORE-VENUE-01

- **Code slot**: venue detail header (`中国非物质文化遗产馆`)
- **Suggested output**: 3:1 horizontal banner
- **Prompt**:

`Exterior and entrance plaza of a national intangible cultural heritage museum in Beijing style, modern institutional architecture with Chinese cultural motifs, clear daylight, visitors entering calmly, documentary photography look, authoritative and welcoming, no text signage legible, no logo, no watermark`

### EXPLORE-VENUE-02

- **Code slot**: venue detail header (`苏州博物馆`)
- **Suggested output**: 3:1 horizontal banner
- **Prompt**:

`A Suzhou museum courtyard scene with white walls, dark tiled rooflines, refined Jiangnan aesthetics, shallow reflecting water and minimalist landscaping, soft daylight and elegant shadows, tranquil high-end cultural atmosphere, realistic architectural photography, no text, no logo, no watermark`

### EXPLORE-VENUE-03

- **Code slot**: venue detail header (`成都博物馆`)
- **Suggested output**: 3:1 horizontal banner
- **Prompt**:

`A Chengdu museum digital heritage gallery interior, immersive large-scale screens showing exploded 3D craft structures, visitors interacting with touch tables, contemporary exhibition design, warm ambient lighting with subtle tech accents, realistic documentary style, no text, no logo, no watermark`

### EXPLORE-VENUE-04

- **Code slot**: venue detail header (`广东省非物质文化遗产馆`)
- **Suggested output**: 3:1 horizontal banner
- **Prompt**:

`A Guangdong intangible heritage museum cultural hall with Lingnan craft displays, festive but refined color accents, curated objects and storytelling installations, family-friendly yet professional environment, natural human presence, photorealistic museum photography, no text, no logo, no watermark`

### EXPLORE-ACT-01

- **Code slot**: activity detail header (`鬼工球入门：同心层怎么镂出来`)
- **Suggested output**: 3:1 horizontal banner
- **Prompt**:

`Hands-on craft workshop scene teaching guigong puzzle ball basics, instructor demonstrating layered hollow carving on practice material, close-up tools and concentric shell model on table, learners observing, educational and approachable mood, realistic photography, no text, no logo, no watermark`

### EXPLORE-ACT-02

- **Code slot**: activity detail header (`数字鬼工球论坛：扫描、建模与展示伦理`)
- **Suggested output**: 3:1 horizontal banner
- **Prompt**:

`Academic forum on digital preservation of guigong craft, panel discussion setting with projection of 3D scans and ethical case studies, professional conference atmosphere, mixed warm stage light and neutral ambient light, culturally serious and modern, photorealistic documentary style, no text, no logo, no watermark`

### EXPLORE-ACT-03

- **Code slot**: activity detail header (`特展：一球多壳——鬼工球与微雕球体对话`)
- **Suggested output**: 3:1 horizontal banner
- **Prompt**:

`Special exhibition juxtaposing guigong nested spheres and micro-carved spherical artifacts, side-by-side display cases with comparative visual narrative, controlled museum spotlights revealing depth and carving precision, curatorial sophistication, realistic museum photo style, no text, no logo, no watermark`

### EXPLORE-ACT-04

- **Code slot**: activity detail header (`手作体验：迷你层次球刻线练习`)
- **Suggested output**: 3:1 horizontal banner
- **Prompt**:

`Small-group practical class for mini layered sphere line-marking, participants sketching and scoring shell guides on practice blanks, close focus on hand movements and fine craft tools, calm workshop lighting, intimate educational atmosphere, photorealistic style, no text, no logo, no watermark`

### EXPLORE-ACT-05

- **Code slot**: activity detail header (`公开课：用三维拆解讲清鬼工球结构`)
- **Suggested output**: 3:1 horizontal banner
- **Prompt**:

`Public lecture scene explaining guigong structure through 3D exploded visualization, presenter beside large display with layered spherical model animations, audience in museum classroom seating, clear instructional atmosphere, modern cultural education context, realistic photography, no text, no logo, no watermark`

### EXPLORE-ACT-06

- **Code slot**: activity detail header (`一球一故事广作鬼工球导览`)
- **Suggested output**: 3:1 horizontal banner
- **Prompt**:

`Docent-led storytelling tour around Guangzhou-style guigong artifacts, guide speaking to a small group near illuminated display cases, emotional narrative tone, warm museum lighting, culturally rich and engaging composition, photorealistic editorial image, no text, no logo, no watermark`

## 3) 文创商城 / Mall

### MALL-P001

- **Code slot**: product cover (`鬼工球纹样帆布袋`)
- **Suggested output**: master 3:1 plus safe-center crop for 2:1
- **Prompt**:

`Premium product photography of a natural canvas tote bag featuring refined guigong openwork pattern print, placed on warm neutral studio surface with soft directional light, visible fabric texture and craftsmanship detail, modern cultural merchandise aesthetic, clean commercial composition, no text, no logo, no watermark`

### MALL-P002

- **Code slot**: product cover (`非遗纹样书签套装（6枚）`)
- **Suggested output**: master 3:1 plus safe-center crop for 2:1
- **Prompt**:

`Commercial still life of a six-piece intangible heritage motif bookmark set, elegant arrangement with layered card textures and fine pattern details, subtle cord accessories, soft top lighting, minimalist premium retail style, realistic product photography, no text, no logo, no watermark`

### MALL-P003

- **Code slot**: product cover (`鬼工球铜制摆件（微缩版）`)
- **Suggested output**: master 3:1 plus safe-center crop for 2:1
- **Prompt**:

`High-end product shot of a miniature brass guigong ball ornament with nested openwork structure, metallic highlights and micro-carved details, dark-to-warm gradient studio backdrop, luxury collectible tone, sharp realistic reflections, commercial catalog quality, no text, no logo, no watermark`

### MALL-P004

- **Code slot**: product cover (`非遗印象丝巾`)
- **Suggested output**: master 3:1 plus safe-center crop for 2:1
- **Prompt**:

`Elegant fashion product photo of a square silk scarf inspired by traditional Chinese embroidery palettes, flowing drape on neutral pedestal, rich but tasteful color transitions, soft premium lighting revealing fabric sheen, boutique cultural design language, realistic commercial style, no text, no logo, no watermark`

### MALL-P005

- **Code slot**: product cover (`数字鬼工球纪念徽章`)
- **Suggested output**: master 3:1 plus safe-center crop for 2:1
- **Prompt**:

`Macro product photography of a limited-edition hard enamel commemorative badge featuring guigong-inspired openwork motif, metal rim and enamel finish in crisp detail, dramatic but clean studio light, collectible pin presentation on matte surface, premium e-commerce style, no text, no logo, no watermark`

## Optional Unified Style Booster

If you want stronger cross-page consistency, append this phrase to each slot prompt:

`consistent visual language across a cultural heritage app asset pack, coherent tone, realistic museum-and-design editorial style`