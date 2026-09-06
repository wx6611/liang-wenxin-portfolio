from pathlib import Path

from PIL import Image


root = Path(__file__).parent
pairs = [
    (
        "compare-desktop-top.png",
        "source/desktop-00-top.png",
        "implementation/desktop-final-top.png",
    ),
    (
        "compare-desktop-projects.png",
        "source/desktop-04-b-projects.png",
        "implementation/desktop-final-projects.png",
    ),
    (
        "compare-mobile-top.png",
        "source/mobile-00-top.png",
        "implementation/mobile-final-top.png",
    ),
]

for output, reference, implementation in pairs:
    left = Image.open(root / reference).convert("RGB")
    right = Image.open(root / implementation).convert("RGB")
    canvas = Image.new(
        "RGB", (left.width + right.width + 20, max(left.height, right.height)), (32, 32, 32)
    )
    canvas.paste(left, (0, 0))
    canvas.paste(right, (left.width + 20, 0))
    canvas.save(root / output, quality=95)

print(f"created {len(pairs)} comparison images")
