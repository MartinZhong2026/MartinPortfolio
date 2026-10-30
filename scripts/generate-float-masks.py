"""Optional authoring utility. Requires Pillow, NumPy and SciPy; no runtime use.
The shipped masks are already generated. Re-run after changing float PNG assets.
"""
from pathlib import Path
from PIL import Image
import numpy as np
from scipy.ndimage import distance_transform_edt
root = Path(__file__).resolve().parent.parent / 'public/assets/floats'
for path in root.glob('*.png'):
    if path.stem.endswith('-sdf'):
        continue
    image = Image.open(path).convert('RGBA')
    inside = np.array(image)[:, :, 3] > 40
    distance = distance_transform_edt(inside) / (min(image.size) * 0.17)
    Image.fromarray(np.uint8(np.clip(distance, 0, 1) * 255)).save(path.with_stem(path.stem + '-sdf'))
