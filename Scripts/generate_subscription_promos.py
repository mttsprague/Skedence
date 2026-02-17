#!/usr/bin/env python3
"""
Generate App Store promotional images for subscription tiers
- 1024x1024px square format
- NO price references (App Store requirement)
- Large, readable text
- Clean, professional design
"""

from PIL import Image, ImageDraw, ImageFont
import os

# Subscription tier data (NO PRICES - App Store requirement)
TIERS = {
    'starter': {
        'name': 'Starter',
        'tagline': 'Perfect for Solo Coaches',
        'features': [
            '1 Location',
            'Unlimited Clients',
            'Basic Scheduling',
            'Payment Processing'
        ],
        'color': '#3B82F6'  # Blue
    },
    'studio': {
        'name': 'Studio',
        'tagline': 'Built for Growing Teams',
        'features': [
            '3 Locations',
            'Multiple Trainers',
            'Advanced Analytics',
            'Priority Support'
        ],
        'color': '#8B5CF6'  # Purple
    },
    'academy': {
        'name': 'Academy',
        'tagline': 'Scale Your Business',
        'features': [
            '10 Locations',
            'Unlimited Trainers',
            'Custom Branding',
            'API Access'
        ],
        'color': '#EC4899'  # Pink
    },
    'enterprise': {
        'name': 'Enterprise',
        'tagline': 'Maximum Performance',
        'features': [
            'Unlimited Locations',
            'White Label Options',
            'Dedicated Support',
            'Custom Integrations'
        ],
        'color': '#F59E0B'  # Amber
    }
}

def hex_to_rgb(hex_color):
    """Convert hex color to RGB tuple"""
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

def create_promo_image(tier_key, tier_data, output_path):
    """Create a promotional image for a subscription tier"""
    
    # Image dimensions (App Store requirement)
    width = 1024
    height = 1024
    
    # Create image with white background
    img = Image.new('RGB', (width, height), 'white')
    draw = ImageDraw.Draw(img)
    
    # Colors
    primary_color = hex_to_rgb(tier_data['color'])
    dark_gray = (31, 41, 55)
    light_gray = (156, 163, 175)
    
    # Draw top accent bar
    bar_height = 180
    draw.rectangle([(0, 0), (width, bar_height)], fill=primary_color)
    
    # Try to load fonts, fall back to default if not available
    try:
        title_font = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 80)
        tagline_font = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 42)
        feature_font = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 36)
        small_font = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 28)
    except:
        # Fallback to default font with size parameter
        title_font = ImageFont.load_default()
        tagline_font = ImageFont.load_default()
        feature_font = ImageFont.load_default()
        small_font = ImageFont.load_default()
    
    # Draw tier name (centered in colored bar) - LARGE for readability
    tier_name = tier_data['name'].upper()
    title_bbox = draw.textbbox((0, 0), tier_name, font=title_font)
    title_width = title_bbox[2] - title_bbox[0]
    title_x = (width - title_width) // 2
    title_y = (bar_height - (title_bbox[3] - title_bbox[1])) // 2
    draw.text((title_x, title_y), tier_name, fill='white', font=title_font)
    
    # Draw tagline below bar
    tagline_y = bar_height + 60
    tagline_bbox = draw.textbbox((0, 0), tier_data['tagline'], font=tagline_font)
    tagline_width = tagline_bbox[2] - tagline_bbox[0]
    tagline_x = (width - tagline_width) // 2
    draw.text((tagline_x, tagline_y), tier_data['tagline'], fill=dark_gray, font=tagline_font)
    
    # Draw separator line
    line_y = tagline_y + 80
    line_padding = 150
    draw.line([(line_padding, line_y), (width - line_padding, line_y)], fill=light_gray, width=2)
    
    # Draw features (left-aligned, large text for readability)
    features_start_y = line_y + 80
    feature_spacing = 90
    feature_padding_left = 200
    
    for i, feature in enumerate(tier_data['features']):
        feature_y = features_start_y + (i * feature_spacing)
        
        # Draw checkmark circle
        circle_x = feature_padding_left
        circle_y = feature_y + 18
        circle_radius = 20
        draw.ellipse(
            [(circle_x - circle_radius, circle_y - circle_radius),
             (circle_x + circle_radius, circle_y + circle_radius)],
            fill=primary_color
        )
        
        # Draw checkmark
        check_coords = [
            (circle_x - 8, circle_y),
            (circle_x - 2, circle_y + 8),
            (circle_x + 10, circle_y - 10)
        ]
        draw.line(check_coords[:2], fill='white', width=4)
        draw.line(check_coords[1:], fill='white', width=4)
        
        # Draw feature text (LARGE and BOLD)
        text_x = circle_x + circle_radius + 30
        draw.text((text_x, feature_y), feature, fill=dark_gray, font=feature_font)
    
    # Draw Skedence branding at bottom
    brand_y = height - 70
    brand_text = "SKEDENCE"
    brand_bbox = draw.textbbox((0, 0), brand_text, font=small_font)
    brand_width = brand_bbox[2] - brand_bbox[0]
    brand_x = (width - brand_width) // 2
    draw.text((brand_x, brand_y), brand_text, fill=light_gray, font=small_font)
    
    # Save image
    img.save(output_path, 'PNG', quality=95)
    print(f"✅ Created: {output_path}")

def main():
    # Create output directory
    output_dir = '/Users/matthewsprague/Documents/GitHub/Skedence Apps/AppLogos/SubscriptionPromos'
    os.makedirs(output_dir, exist_ok=True)
    
    print("🎨 Generating App Store subscription promotional images...")
    print("   Size: 1024x1024px (App Store requirement)")
    print("   Format: NO PRICES (App Store guideline compliance)")
    print()
    
    # Generate images for each tier
    for tier_key, tier_data in TIERS.items():
        output_path = os.path.join(output_dir, f'{tier_key}_promo.png')
        create_promo_image(tier_key, tier_data, output_path)
    
    print()
    print("✅ All promotional images created!")
    print(f"📁 Location: {output_dir}")
    print()
    print("📝 Next Steps:")
    print("   1. Upload these images to App Store Connect")
    print("   2. Update display names (max 30 chars):")
    print("      - Starter: 'Starter Plan'")
    print("      - Studio: 'Studio Plan'")
    print("      - Academy: 'Academy Plan'")
    print("      - Enterprise: 'Enterprise Plan'")
    print("   3. Update descriptions (max 45 chars):")
    print("      - Starter: 'Perfect for solo coaches'")
    print("      - Studio: 'Built for growing teams'")
    print("      - Academy: 'Scale your business'")
    print("      - Enterprise: 'Maximum performance & support'")
    print()
    print("⚠️  REMEMBER: Do NOT include prices in display names or descriptions!")

if __name__ == '__main__':
    main()
