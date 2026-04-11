"""
Generate minimal tabBar PNG icons for the WeChat Mini Program.
Requires Python 3 only (no third-party packages).
Run: python3 gen_icons.py
"""
import struct
import zlib
import os

def make_png(width, height, pixels_rgba):
    """Build a minimal valid PNG from an RGBA pixel array (list of (r,g,b,a) tuples, row-major)."""
    def chunk(name, data):
        c = name + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xFFFFFFFF)

    # IHDR
    ihdr = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)  # bit depth 8, color type 2 = RGB
    # Use RGBA (color type 6)
    ihdr = struct.pack('>II', width, height) + bytes([8, 6, 0, 0, 0])

    raw = b''
    for y in range(height):
        raw += b'\x00'  # filter type None
        for x in range(width):
            r, g, b, a = pixels_rgba[y * width + x]
            raw += bytes([r, g, b, a])

    compressed = zlib.compress(raw, 9)

    png  = b'\x89PNG\r\n\x1a\n'
    png += chunk(b'IHDR', ihdr)
    png += chunk(b'IDAT', compressed)
    png += chunk(b'IEND', b'')
    return png


def circle(cx, cy, r, px, py):
    return (px - cx) ** 2 + (py - cy) ** 2 <= r ** 2


def rect(x1, y1, x2, y2, px, py):
    return x1 <= px <= x2 and y1 <= py <= y2


SIZE = 81

# Color palette
GRAY  = (153, 153, 153, 255)
GREEN = ( 76, 175, 125, 255)
TRANS = (  0,   0,   0,   0)


def make_home_icon(color):
    r, g, b, a = color
    pixels = []
    for y in range(SIZE):
        for x in range(SIZE):
            # Roof: triangle (filled above a diagonal)
            cx, cy = SIZE // 2, SIZE // 2
            # Roof peak at (40, 12), base from (8,40) to (73,40)
            # Use lines: left slope y = -1.3*(x-40)+12  right slope y = 1.3*(x-40)+12
            roof_top  = 12
            roof_base = 42
            roof_left = 8
            roof_right = 73
            # Is point inside roof triangle?
            in_roof = False
            if roof_top <= y <= roof_base:
                half_w = (y - roof_top) / (roof_base - roof_top) * (roof_right - roof_left) / 2
                mid = SIZE // 2
                if mid - half_w <= x <= mid + half_w:
                    in_roof = True
            # Door: rect in lower center
            door_x1, door_y1, door_x2, door_y2 = 32, 52, 49, 69
            in_door = rect(door_x1, door_y1, door_x2, door_y2, x, y)
            # House body: rect
            body_x1, body_y1, body_x2, body_y2 = 16, 42, 65, 69
            in_body = rect(body_x1, body_y1, body_x2, body_y2, x, y)
            if in_roof or (in_body and not in_door):
                pixels.append((r, g, b, a))
            else:
                pixels.append(TRANS)
    return pixels


def make_recycle_icon(color):
    r, g, b, b2 = color
    pixels = []
    cx, cy = SIZE // 2, SIZE // 2
    outer = 32
    inner = 20
    for y in range(SIZE):
        for x in range(SIZE):
            dist = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5
            if inner <= dist <= outer:
                pixels.append((r, g, b, b2))
            else:
                pixels.append(TRANS)
    # Arrow notches (subtract three triangular wedges to hint at arrows)
    # Simple ring is good enough for tabBar
    return pixels


def make_user_icon(color):
    r, g, b, a = color
    pixels = []
    cx = SIZE // 2
    head_cy, head_r = 26, 14
    # Body: ellipse bottom half
    body_cx, body_cy, body_rx, body_ry = cx, 62, 22, 16
    for y in range(SIZE):
        for x in range(SIZE):
            in_head = circle(cx, head_cy, head_r, x, y)
            in_body = ((x - body_cx) ** 2 / body_rx ** 2 + (y - body_cy) ** 2 / body_ry ** 2) <= 1 and y >= body_cy - body_ry
            if in_head or in_body:
                pixels.append((r, g, b, a))
            else:
                pixels.append(TRANS)
    return pixels


icons = {
    'images/home.png':          (make_home_icon,    GRAY),
    'images/home-active.png':   (make_home_icon,    GREEN),
    'images/recycle.png':       (make_recycle_icon, GRAY),
    'images/recycle-active.png':(make_recycle_icon, GREEN),
    'images/user.png':          (make_user_icon,    GRAY),
    'images/user-active.png':   (make_user_icon,    GREEN),
}

os.makedirs('images', exist_ok=True)

for path, (fn, color) in icons.items():
    pixels = fn(color)
    png = make_png(SIZE, SIZE, pixels)
    with open(path, 'wb') as f:
        f.write(png)
    print(f'Created {path}  ({len(png)} bytes)')

print('Done.')
