#!/usr/bin/env python3
"""
Convert skedence-icon-orbit.svg to favicon.png and favicon.ico
"""

from PIL import Image
import cairosvg
import io
import os

# Paths
svg_path = '/Users/matthewsprague/Documents/GitHub/Skedence Apps/skedence-unified/public/brand/skedence-icon-orbit.svg'
output_dir = '/Users/matthewsprague/Documents/GitHub/Skedence Apps/skedence-unified/public'

print("🎨 Converting Skedence icon to favicon formats...")

# Convert SVG to PNG at high resolution
png_data = cairosvg.svg2png(
    url=svg_path,
    output_width=512,
    output_height=512
)

# Load as PIL Image
img = Image.open(io.BytesIO(png_data))

# Save as favicon.png (512x512)
favicon_png_path = os.path.join(output_dir, 'favicon.png')
img.save(favicon_png_path, 'PNG')
print(f"✅ Created: {favicon_png_path}")

# Save as apple-touch-icon.png (180x180 recommended for iOS)
apple_icon = img.resize((180, 180), Image.Resampling.LANCZOS)
apple_icon_path = os.path.join(output_dir, 'apple-touch-icon.png')
apple_icon.save(apple_icon_path, 'PNG')
print(f"✅ Created: {apple_icon_path}")

# Save as favicon.ico (multiple sizes for compatibility)
favicon_ico_path = os.path.join(output_dir, 'favicon.ico')
img_16 = img.resize((16, 16), Image.Resampling.LANCZOS)
img_32 = img.resize((32, 32), Image.Resampling.LANCZOS)
img_48 = img.resize((48, 48), Image.Resampling.LANCZOS)

img_16.save(
    favicon_ico_path,
    format='ICO',
    sizes=[(16, 16), (32, 32), (48, 48)]
)
print(f"✅ Created: {favicon_ico_path}")

print()
print("🎉 Favicon conversion complete!")
print("   Next step: npm run build && firebase deploy --only hosting")
