"""Generate a default avatar PNG for the miniapp."""
import struct, zlib, os

def make_png(w, h, pixels):
    def chunk(name, data):
        c = name + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xFFFFFFFF)
    ihdr = struct.pack('>II', w, h) + bytes([8, 6, 0, 0, 0])
    raw = b''
    for y in range(h):
        raw += b'\x00'
        for x in range(w):
            raw += bytes(pixels[y * w + x])
    png = b'\x89PNG\r\n\x1a\n'
    png += chunk(b'IHDR', ihdr)
    png += chunk(b'IDAT', zlib.compress(raw, 9))
    png += chunk(b'IEND', b'')
    return png

SIZE = 120
BG = (76, 175, 125, 255)
LIGHT = (200, 230, 215, 255)
TRANS = (0, 0, 0, 0)

def circle(cx, cy, r, x, y):
    return (x-cx)**2 + (y-cy)**2 <= r**2

pixels = []
cx = cy = SIZE // 2
for y in range(SIZE):
    for x in range(SIZE):
        # Outer circle mask
        if not circle(cx, cy, cx-1, x, y):
            pixels.append(TRANS); continue
        # Head
        if circle(cx, 40, 18, x, y):
            pixels.append(LIGHT); continue
        # Body (lower semicircle)
        if circle(cx, 105, 36, x, y) and y >= 75:
            pixels.append(LIGHT); continue
        pixels.append(BG)

png = make_png(SIZE, SIZE, pixels)
os.makedirs('images', exist_ok=True)
with open('images/default-avatar.png', 'wb') as f:
    f.write(png)
print('Created images/default-avatar.png')
