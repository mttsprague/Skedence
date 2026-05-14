from PIL import Image, ImageDraw, ImageFont
import os

public_dir = os.path.join(os.path.dirname(__file__), 'public')

# ──────────────────────────────────────────────────────────────────────────────
# 1. Create landscape og-image.png (1200×630) from the 1024×1024 square
# ──────────────────────────────────────────────────────────────────────────────
orig = Image.open(os.path.join(public_dir, 'og-image-original-square.png')).convert('RGBA')
# Resize to 630×630 (fits height of card)
orig_630 = orig.resize((630, 630), Image.LANCZOS)

canvas = Image.new('RGBA', (1200, 630), (0, 0, 0, 255))
x_offset = (1200 - 630) // 2  # center horizontally = 285
canvas.paste(orig_630, (x_offset, 0), orig_630)
canvas.convert('RGB').save(os.path.join(public_dir, 'og-image.png'), 'PNG', optimize=True)
print('og-image.png created: 1200x630')

# ──────────────────────────────────────────────────────────────────────────────
# 2. Sport-specific OG images (1200×630)
# ──────────────────────────────────────────────────────────────────────────────
ORANGE = (255, 107, 53)
WHITE = (255, 255, 255)
GRAY = (180, 180, 180)
BG = (8, 8, 8)

def get_font(size):
    for path in [
        '/System/Library/Fonts/Helvetica.ttc',
        '/System/Library/Fonts/Arial.ttf',
        '/Library/Fonts/Arial.ttf',
    ]:
        try:
            return ImageFont.truetype(path, size)
        except Exception:
            pass
    return ImageFont.load_default()

logo = Image.open(os.path.join(public_dir, 'og-image-original-square.png')).convert('RGBA')
logo_size = 480
logo = logo.resize((logo_size, logo_size), Image.LANCZOS)

sports = [
    ('volleyball', 'Volleyball', 'Scheduling Software'),
    ('basketball', 'Basketball', 'Scheduling Software'),
    ('soccer',     'Soccer',     'Scheduling Software'),
    ('baseball',   'Baseball',   'Scheduling Software'),
]

for slug, sport_name, subtitle in sports:
    c = Image.new('RGB', (1200, 630), BG)
    draw = ImageDraw.Draw(c)

    # Right: logo
    logo_x = 1200 - logo_size - 60
    logo_y = (630 - logo_size) // 2
    c.paste(logo, (logo_x, logo_y), logo)

    # Right-side dark overlay to blend logo into bg on the left edge
    for i in range(200):
        alpha = int(255 * (1 - i / 200))
        draw.line([(logo_x + i, 0), (logo_x + i, 630)], fill=(8, 8, 8, alpha))

    # Left: text content
    font_h1   = get_font(80)
    font_sub  = get_font(42)
    font_tag  = get_font(26)
    font_brand = get_font(32)

    # Orange accent bar
    draw.rectangle([(50, 70), (68, 230)], fill=ORANGE)

    # Sport name (H1)
    draw.text((95, 85), sport_name, fill=WHITE, font=font_h1)

    # Subtitle
    draw.text((95, 185), subtitle, fill=ORANGE, font=font_sub)

    # Tagline
    draw.text((95, 265), 'for Coaches & Clubs', fill=GRAY, font=font_tag)

    # Separator
    draw.rectangle([(95, 320), (360, 323)], fill=(40, 40, 40))

    # Value props
    props = ['Sell lesson packages online', 'Automated booking & reminders', 'Stripe-powered payments']
    y_prop = 345
    font_prop = get_font(22)
    for prop in props:
        draw.ellipse([(95, y_prop + 6), (105, y_prop + 16)], fill=ORANGE)
        draw.text((118, y_prop), prop, fill=GRAY, font=font_prop)
        y_prop += 36

    # Brand
    draw.text((95, 580), 'skedence.com', fill=ORANGE, font=font_brand)

    out_path = os.path.join(public_dir, f'og-{slug}.png')
    c.save(out_path, 'PNG')
    print(f'og-{slug}.png created')

print('All OG images done!')
