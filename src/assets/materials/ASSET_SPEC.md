# Materials Asset Spec

本目录用于统一管理博物馆与相关页面的多种素材，避免散落在不同位置导致命名混乱、版本冲突或来源不可追溯。

## 1) Directory Structure

- `images/`：图片素材（封面图、插图、纹样图、截图）
- `videos/`：视频素材（导览、预告、章节剪辑）
- `audio/`：音频素材（旁白、环境音、提示音）
- `models/`：3D 模型或工程导出物（glb/gltf/fbx/obj 等）
- `documents/`：素材说明、授权文件、来源记录、脚本

## 2) Naming Format

统一使用小写英文与短横线，不使用空格、中文、括号。

`{module}-{category}-{subject}-{variant}-v{major}.{minor}.{ext}`

示例：

- `museum-cover-dragon-openwork-main-v1.0.webp`
- `museum-video-curator-tour-chapter01-v1.2.mp4`
- `museum-audio-voiceover-knowledge-intro-v1.0.wav`
- `museum-model-concentric-ball-shell05-v2.0.glb`

字段建议：

- `module`：`museum` / `workshop` / `social`
- `category`：`cover` / `video` / `audio` / `model` / `doc`
- `subject`：核心主题名（`dragon-openwork`）
- `variant`：视角或用途（`main` / `thumb` / `chapter01` / `mobile`）
- `v{major}.{minor}`：版本号（破坏性改动升 `major`，微调升 `minor`）

## 3) Format & Quality Baseline

- 图片：优先 `webp`（需要透明用 `png`），封面建议 16:9。
- 视频：优先 `mp4 (H.264)`，演示预览建议 6-12 秒。
- 音频：优先 `wav`（母版）+ `mp3`（发布版）。
- 模型：发布优先 `glb`，源文件另存并保留导出参数说明。

## 4) Required Metadata (documents/)

每个可发布素材都需在 `documents/` 对应记录一条元信息（可用 `*.md` 或 `*.json`）：

- 文件名与版本
- 来源（作者/机构/链接）
- 版权状态与使用范围
- 生成或采集日期
- 处理流程（裁剪、压缩、降噪、转码）

## 5) Versioning & Replacement Rules

- 不直接覆盖已发布版本；新增文件并提升版本号。
- 引用路径默认指向最新稳定版本（如 `v1.3`）。
- 废弃文件添加 `deprecated` 标记，不立即删除，至少保留一个迭代周期。

## 6) Commit Suggestions

- 一次提交只包含同类素材变更（例如只改 `videos/`）。
- 提交信息建议格式：
  - `assets(museum): add curator tour clips v1.0`
  - `assets(museum): update cover set to v1.2`

## 7) Existing Assets Renamed

本次已将原有素材完成重命名与分组，旧路径不再使用：

- `src/assets/guigong-logo.png` -> `src/assets/materials/images/branding/brand-logo-primary-v1.0.png`
- `src/assets/guigong-logo-old.png` -> `src/assets/materials/images/branding/brand-logo-legacy-v1.0.png`
- `src/assets/picture/top/屏幕截图 2026-04-12 113044.png` -> `src/assets/materials/images/museum/hero/museum-hero-01-v1.0.png`
- `src/assets/picture/top/屏幕截图 2026-04-12 113103.png` -> `src/assets/materials/images/museum/hero/museum-hero-02-v1.0.png`
- `src/assets/picture/top/屏幕截图 2026-04-12 113335.png` -> `src/assets/materials/images/museum/hero/museum-hero-03-v1.0.png`
- `src/assets/picture/mid/屏幕截图 2026-04-12 112817.png` -> `src/assets/materials/images/museum/gallery/museum-gallery-01-v1.0.png`
- `src/assets/picture/mid/屏幕截图 2026-04-12 112832.png` -> `src/assets/materials/images/museum/gallery/museum-gallery-02-v1.0.png`
- `src/assets/picture/mid/屏幕截图 2026-04-12 112851.png` -> `src/assets/materials/images/museum/gallery/museum-gallery-03-v1.0.png`
- `public/covers/video1.webp` -> `public/materials/museum/videos/covers/museum-video-cover-01-v1.0.webp`
- `public/covers/video2.webp` -> `public/materials/museum/videos/covers/museum-video-cover-02-v1.0.webp`
- `public/covers/video3.webp` -> `public/materials/museum/videos/covers/museum-video-cover-03-v1.0.webp`
- `public/covers/video4.webp` -> `public/materials/museum/videos/covers/museum-video-cover-04-v1.0.webp`
- `public/previews/video1.mp4` -> `public/materials/museum/videos/previews/museum-video-preview-01-v1.0.mp4`
- `public/previews/video2.mp4` -> `public/materials/museum/videos/previews/museum-video-preview-02-v1.0.mp4`
- `public/previews/video3.mp4` -> `public/materials/museum/videos/previews/museum-video-preview-03-v1.0.mp4`
- `public/previews/video4.mp4` -> `public/materials/museum/videos/previews/museum-video-preview-04-v1.0.mp4`