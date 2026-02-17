#!/usr/bin/env python3
"""
Create favicons from SkedenceAppIcon.png
"""

from PIL import Image
import os

# Paths
icon_path = '/Users/matthewsprague/Documents/GitHub/Skedence Apps/AppLogos/SkedenceAppIcon.png'
output_dir = '/Users/matthewsprague/Documents/GitHub/Skedence Apps/skedence-unified/public'

print("🎨 Creating favicons from SkedenceAppIcon.png...")

# Open the original icon
img = Image.open(icon_path)
print(f"   Original size: {img.size}")

# Create square version (crop/resize to square)
size = min(img.size)
left = (img.width - size) // 2
top = (img.height - size) // 2
right = left + size
bottom = top + size
img_square = img.crop((left, top, right, bottom))

# Save as favicon.png (512x512)
favicon_png = img_square.resize((512, 512), Image.Resampling.LANCZOS)
favicon_png_path = os.path.join(output_dir, 'favicon.png')
favicon_png.save(favicon_png_path, 'PNG')
print(f"✅ Created: favicon.png (512x512)")

# Save as apple-touch-icon.png (180x180 recommended for iOS)
apple_icon = img_square.resize((180, 180), Image.Resampling.LANCZOS)
apple_icon_path = os.path.join(output_dir, 'apple-touch-icon.png')
apple_icon.save(apple_icon_path, 'PNG')
print(f"✅ Created: apple-touch-icon.png (180x180)")

# Save as favicon.ico (multiple sizes)
favicon_ico_path = os.path.join(output_dir, 'favicon.ico')
img_16 = img_square.resize((16, 16), Image.Resampling.LANCZOS)
img_32 = img_square.resize((32, 32), Image.Resampling.LANCZOS)
img_48 = img_square.resize((48, 48), Image.Resampling.LANCZOS)

# Save as ICO with multiple sizes
img_32.save(
    favicon_ico_path,
    format='ICO',
    sizes=[(16, 16), (32, 32), (48, 48)]
)
print(f"✅ Created: favicon.ico (16x16, 32x32, 48x48)")

print()
print("🎉 Favicon generation complete!")
print("   Files created in: skedence-unified/public/")
