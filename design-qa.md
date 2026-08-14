# Design QA

## Evidence

- Source visual truth: `.design-qa/source/desktop-00-top.png`, `.design-qa/source/desktop-04-b-projects.png`, `.design-qa/source/mobile-00-top.png`
- Implementation screenshots: `.design-qa/implementation/desktop-final-top.png`, `.design-qa/implementation/desktop-final-projects.png`, `.design-qa/implementation/mobile-final-top.png`
- Combined comparison inputs: `.design-qa/compare-desktop-top.png`, `.design-qa/compare-desktop-projects.png`, `.design-qa/compare-mobile-top.png`
- Desktop viewport/state: 1280 × 720 CSS px, DPR 1, `/` at top and `#projects` scroll target
- Mobile viewport/state: 390 × 844 CSS px, DPR 1, `/` at top
- Source pixels and implementation pixels match their CSS viewport sizes; no density normalization or scaling was required.
- Browser-rendered implementation: `http://127.0.0.1:3001/`
- Interactions tested: About anchor, Works/project anchor, hero preview open, preview close, Escape close behavior wiring, responsive scrolling.
- Console warnings/errors: none.

## Findings

- No actionable P0, P1, or P2 findings remain.
- Typography: the implementation intentionally uses the user-selected Alimama FangYuanTi VF for display type instead of the reference site's commercial display face. The font size, line height, alignment, wrapping rhythm, and condensed A/B/C proportions were calibrated to preserve the reference composition. Editorial copy uses Times New Roman as the closest safe local serif replacement.
- Spacing and layout rhythm: the 12-column desktop and 6-column mobile grids, margins, gaps, image positions, chapter rules, project index, and long vertical pauses align with the captured source states.
- Colors and visual tokens: background `#dfe0d7`, near-black foreground, and `#babbb4` divider rules match the sampled source palette. The reference contains no radii, gradients, or elevation effects in these states.
- Image quality and asset fidelity: all three source-proportioned AVIF images are bundled locally, retain their intended crop, and render sharply at the measured desktop/mobile sizes.
- Copy and content: placeholder portfolio copy is intentionally original rather than copied from the reference. Its regions and hierarchy follow the same structure, while line endings vary with the replacement content.
- P3: final line breaks will naturally shift after the user replaces the placeholder name and biography; no structural change is required.

## Focused Region Comparison

- The project/index state was compared separately in `.design-qa/compare-desktop-projects.png`; at 1280 × 720 the caption, image crop, monospace list, divider, and C-section transition are readable without an additional crop.
- The mobile hero/A transition was compared in `.design-qa/compare-mobile-top.png`, confirming the image top, blank-space cadence, 6-column boundary, and chapter marker placement.

## Comparison History

1. Initial desktop/mobile comparison found P2 drift in the mobile hero/A transition: the hero image and A marker landed too high, and the visible scrollbar reduced the effective grid width. Fixed by calibrating the Alimama title to 55px, setting mobile hero padding to 76px and content lead-in to 277px, and hiding the document scrollbar. Post-fix evidence: `.design-qa/compare-mobile-top.png`.
2. Initial project-state comparison found P2 drift in the Works anchor landing: the project image aligned to the viewport top and pulled the C transition too high. Fixed with a 280px desktop project scroll margin, 140px mobile scroll margin, and a seven-item project index. Post-fix evidence: `.design-qa/compare-desktop-projects.png`.
3. Second comparison found P2 width drift in the desktop A/B/C markers because Alimama is wider than the reference condensed face. Fixed by applying a 0.65 desktop and 0.60 mobile horizontal optical scale. Post-fix evidence: `.design-qa/compare-desktop-projects.png` and `.design-qa/compare-mobile-top.png`.

## Implementation Checklist

- [x] Desktop reference structure matched
- [x] Mobile reference structure matched
- [x] User-selected font embedded and loaded locally
- [x] Source imagery bundled locally with correct crops
- [x] Navigation and preview interactions verified
- [x] Production build verified
- [x] Browser console checked

## Follow-up Polish

- Replace the placeholder name, biography, project titles, contact details, and portraits with final portfolio content while keeping the existing grid and type scale.

final result: passed
