#!/usr/bin/env python3
"""
Generate all required app icon sizes for SkedenceAdmin from AppIcon2.png
"""

from PIL import Image
import os

# Paths
source_image = os.path.expanduser("~/Desktop/AppIcon2.png")
output_dir = "/Users/matthewsprague/Documents/GitHub/Skedence Apps/SkedenceAdmin/SkedenceAdmin/Assets.xcassets/AppIcon.appiconset"

# Icon sizes required (based on Contents.json)
icon_sizes = {
    "20.png": 20,
    "29.png": 29,
    "40.png": 40,
    "50.png": 50,
    "57.png": 57,
    "58.png": 58,
    "60.png": 60,
    "72.png": 72,
    "76.png": 76,
    "80.png": 80,
    "87.png": 87,
    "100.png": 100,
    "114.png": 114,
    "120.png": 120,
    "144.png": 144,
    "152.png": 152,
    "167.png": 167,
    "180.png": 180,
    "1024.png": 1024,
}

def generate_icons():
    """Generate all required icon sizes from source image"""
    print(f"Loading source image: {source_image}")
    
    # Open source image
    img = Image.open(source_image)
    
    # Convert to RGBA if needed
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    
    print(f"Source image size: {img.size}")
    print(f"Generating {len(icon_sizes)} icon sizes...")
    
    # Generate each size
    for filename, size in icon_sizes.items():
        output_path = os.path.join(output_dir, filename)
        
        # Resize with high-quality antialiasing
        resized = img.resize((size, size), Image.Resampling.LANCZOS)
        
        # Save as PNG
        resized.save(output_path, "PNG")
        print(f"✅ Generated {filename} ({size}x{size})")
    
    print(f"\n🎉 Successfully generated all {len(icon_sizes)} icon sizes!")
    print(f"📁 Output directory: {output_dir}")

if __name__ == "__main__":
    generate_icons()
