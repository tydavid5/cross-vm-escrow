from PIL import Image, ImageDraw, ImageFont
import os

W, H = 1600, 900
base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out = os.path.join(base, "featured.png")
img = Image.new("RGB", (W, H), (31, 41, 55))
d = ImageDraw.Draw(img)
d.rectangle([0, 0, W, 140], fill=(15, 118, 110))
d.rectangle([0, 760, W, H], fill=(15, 118, 110))

def font(size, bold=False):
    for path in ["/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "/usr/share/fonts/TTF/DejaVuSans.ttf"]:
        try:
            return ImageFont.truetype(path, size)
        except Exception:
            pass
    return ImageFont.load_default()

d.text((60, 35), "QORECHAIN TESTNET ONLY", font=font(28, True), fill=(94, 234, 212))
d.text((60, 72), "qorechain-diana  |  EVM chain id 9800  |  SDK 0.14.0", font=font(24), fill=(255, 255, 255))
d.text((60, 790), "Lock on EVM. Call Native atomically. Release on schedule.", font=font(28, True), fill=(255, 255, 255))
d.text((60, 200), "Cross-VM", font=font(110, True), fill=(255, 255, 255))
d.text((60, 310), "Escrow", font=font(110, True), fill=(94, 234, 212))
d.text((60, 440), "An EVM payment and Native vesting", font=font(32), fill=(209, 213, 219))
d.text((60, 480), "live in separate worlds.", font=font(32), fill=(209, 213, 219))

d.rounded_rectangle([950, 210, 1540, 430], radius=24, fill=(255, 255, 255))
d.rounded_rectangle([950, 470, 1540, 690], radius=24, fill=(15, 118, 110), outline=(94, 234, 212), width=4)
d.text((990, 240), "EVM", font=font(44, True), fill=(17, 94, 89))
d.text((990, 300), "Lock payment", font=font(30), fill=(31, 41, 55))
d.text((990, 340), "Record vesting schedule", font=font(30), fill=(31, 41, 55))
d.text((990, 500), "NATIVE", font=font(44, True), fill=(94, 234, 212))
d.text((990, 560), "Atomic call, targetVM 1", font=font(30), fill=(255, 255, 255))
d.text((990, 600), "Precompile 0x...0901", font=font(30), fill=(255, 255, 255))
d.ellipse([760, 300, 900, 440], fill=(20, 184, 166))
d.text((800, 345), "->", font=font(64, True), fill=(255, 255, 255))
d.text((770, 450), "ATOMIC", font=font(26, True), fill=(94, 234, 212))
img.save(out, "PNG")
print("wrote " + out + " " + str(W) + "x" + str(H))
