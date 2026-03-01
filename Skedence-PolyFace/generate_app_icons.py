#!/usr/bin/env python3
"""
Generate all required iOS app icon sizes from a single master image.
Usage: python3 generate_app_icons.py
"""

from PIL import Image
import os

# Master icon path
master_icon_path = "./Skedence/Assets.xcassets/AppIcon.png"
output_dir = "./Skedence/Assets.xcassets/AppIcon.appiconset"

# All required iOS icon sizes
icon_sizes = [
    ("20.png", 20),
    ("29.png", 29),
    ("40.png", 40),
    ("50.png", 50),
    ("57.png", 57),
    ("58.png", 58),
    ("60.png", 60),
    ("72.png", 72),
    ("76.png", 76),
    ("80.png", 80),
    ("87.png", 87),
    ("100.png", 100),
    ("114.png", 114),
    ("120.png", 120),
    ("144.png", 144),
    ("152.png", 152),
    ("167.png", 167),
    ("180.png", 180),
    ("1024.png", 1024),
]

def generate_icons():
    """Generate all icon sizes from master image."""
    
    # Check if master icon exists
    if not os.path.exists(master_icon_path):
        print(f"❌ Error: Master icon not found at {master_icon_path}")
        return False
    
    # Open master icon
    try:
        master_image = Image.open(master_icon_path)
        print(f"✅ Loaded master icon: {master_image.size[0]}x{master_image.size[1]}px")
    except Exception as e:
        print(f"❌ Error loading master icon: {e}")
        return False
    
    # Ensure output directory exists
    os.makedirs(output_dir, exist_ok=True)
    
    # Generate each size
    print(f"\n🎨 Generating {len(icon_sizes)} icon sizes...")
    success_count = 0
    
    for filename, size in icon_sizes:
        try:
            # Resize image with high-quality Lanczos filter
            resized = master_image.resize((size, size), Image.Resampling.LANCZOS)
            
            # Save to output directory
            output_path = os.path.join(output_dir, filename)
            resized.save(output_path, "PNG", optimize=True)
            
            print(f"  ✓ {filename} ({size}x{size}px)")
            success_count += 1
            
        except Exception as e:
            print(f"  ✗ {filename} - Error: {e}")
    
    print(f"\n✅ Successfully generated {success_count}/{len(icon_sizes)} icons")
    print(f"📁 Output directory: {output_dir}")
    
    return success_count == len(icon_sizes)

if __name__ == "__main__":
    print("🚀 PolyFace App Icon Generator")
    print("=" * 50)
    
    success = generate_icons()
    
    if success:
        print("\n✅ All icons generated successfully!")
        print("\n📝 Next steps:")
        print("  1. Open Xcode project")
        print("  2. Clean build folder (⇧⌘K)")
        print("  3. Build and run to see new icon")
    else:
        print("\n⚠️  Some icons failed to generate. Check errors above.")
