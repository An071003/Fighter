# 09 — VISUAL DESIGN SYSTEM / AWWWARDS CANDIDATE

## Định hướng
**Cinematic industrial editorial:** dark laboratory, raw titanium geometry, sleek engineered typography, lighting như high-end product film. Hero aircraft occupies >=60% perceptual attention. Tránh UI xanh neon khắp nơi hoặc dashboard SaaS điển hình.

## Semantic tokens
| Token | Hex | Vai trò |
|---|---|---|
| `--bg-0` | `#070A0F` | backdrop sâu |
| `--bg-1` | `#0E141D` | panel |
| `--surface-glass` | `#17222ECC` | translucent overlay |
| `--border` | `#2D3B49` | thin separators |
| `--text-primary` | `#E9F0F5` | H1/body quan trọng |
| `--text-muted` | `#95A5B3` | metadata |
| `--accent-ice` | `#67E5DF` | active state/part focus |
| `--accent-amber` | `#FFBF81` | cinematic transition |
| `--danger` | `#FA8E91` | error |
| `--success` | `#9EE4BE` | completed state |

70% near-black, 22% gray/metals, 6% offwhite text, 2% accent color. Accent không xuất hiện dày đặc trong mọi thẻ.

## Typography
- Display: `Sora` hoặc `Outfit` self-host if license permits; anti-template choice đề xuất `Manrope` for controls hoặc `IBM Plex Mono` for telemetry. Dùng tối đa 2 families; license kiểm tra và bundle local.
- H1 desktop 72–112px clamp based available, line-height .94, tracking -0.05em; mobile 42–56px.
- UI Title 15–18px / uppercase small 10–12px with 0.14em tracking; body 13–15px, line-height 1.45–1.65; detailed sidebar readable.
- Numeral monospaced for time values; avoid fake numbers.

## Grid & spacing
4px base; 8/12/16/24/32/48/64 scale. Header safe 32px desktop / 18px mobile. Sidebar panels radius 16–20px, border 1px neutral, backdrops blur 14–20px selectively (avoid WebGL+blur overload).

## Material / geometry aesthetic
- Aircraft base: #A5B7C5 metallic roughness .28–.46; recesses dark; cyan emissive strips extremely sparse; graphite panels; tinted clear canopy.
- Platform: circular brushed metal, 2 emission arcs, service detail, no floating UI grid plastered on ground.
- Atmosphere: soft smoke haze/air shafts, minimal; subtle speckle grain post only on high.

## Motion language
**One guiding principle:** machine transforms are measured and substantial; overlay UI moves quick and light.
- Showroom turntable steady 9°/sec.
- camera presets 0.8–1.4s ease-in-out.
- explode overall ~2s with phase staggering; not teleportation.
- hovering vertical bob amplitude <=.035, 0.7 Hz; small pitch and roll.
- CTA hover border/label shift 120–180ms; use 1 highlight accent.
- Reduced-motion mode: no indefinite animation; all navigation still works instantly.

## Responsive & contrast
Fullscreen 3D canvas always has visible `aria-label` alternate DOM explanation; all controls semantic. Avoid text below 12px; use color contrast >=4.5:1 for regular UI labels, >=3:1 for larger text where applicable. Desktop line lengths 45–65 characters.

## Visual review rubric / 100 pts
Composition & model silhouette 25; material/lighting 25; motion direction 20; UI hierarchy 15; responsive 10; microinteraction/reduced motion 5. Pass target >=85, no failed critical accessibility states.
