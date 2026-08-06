#!/usr/bin/env python3
"""시안 PNG 를 픽셀 단위로 실측한다. 눈대중 금지.

리포에는 원본 webp 만 커밋돼 있다(png 는 파생물이라 gitignore). 먼저 변환할 것:

    sips -s format png .impeccable/refs/qb-board.webp --out .impeccable/refs/qb-board.png
    python3 .impeccable/refs/measure-reference.py .impeccable/refs/qb-board.png

배율 기준: 시안 폰 화면 폭(보드 332px) = 실제 375px → 1.130
"""
import struct, zlib, pathlib, sys

def load(p):
    d = pathlib.Path(p).read_bytes(); pos = 8; idat = b''
    while pos < len(d):
        ln = struct.unpack('>I', d[pos:pos+4])[0]; typ = d[pos+4:pos+8]; data = d[pos+8:pos+8+ln]
        if typ == b'IHDR': w, h, bd, ct = struct.unpack('>IIBB', data[:10])
        elif typ == b'IDAT': idat += data
        elif typ == b'IEND': break
        pos += 12 + ln
    raw = zlib.decompress(idat); ch = 4 if ct == 6 else 3; stride = w*ch
    out = bytearray(); prev = bytearray(stride); i = 0
    for y in range(h):
        f = raw[i]; i += 1; line = bytearray(raw[i:i+stride]); i += stride
        for x in range(stride):
            a = line[x-ch] if x >= ch else 0; b = prev[x]; c = prev[x-ch] if x >= ch else 0
            if f == 1: line[x] = (line[x]+a) & 255
            elif f == 2: line[x] = (line[x]+b) & 255
            elif f == 3: line[x] = (line[x]+(a+b)//2) & 255
            elif f == 4:
                pa, pb, pc = abs(b-c), abs(a-c), abs(a+b-2*c)
                pr = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
                line[x] = (line[x]+pr) & 255
        out += line; prev = line
    return w, h, ch, bytes(out)

W, H, CH, PX = load(sys.argv[1] if len(sys.argv) > 1 else '.impeccable/refs/qb-board.png')
def px(x, y): i = (y*W + x)*CH; return PX[i], PX[i+1], PX[i+2]
def is_black(c): return c[0] < 70 and c[1] < 70 and c[2] < 70
def is_yellow(c): return c[0] > 200 and 150 < c[1] < 230 and c[2] < 100
def is_white(c): return c[0] > 225 and c[1] > 225 and c[2] > 225

print(f'board {W}x{H}')

# ── 1) 폰 목업 화면 영역 찾기 (오른쪽 절반의 큰 검정 베젤 안쪽 노랑) ──
def phone_screen():
    best = None
    for y in range(250, 1100, 4):
        run = None
        for x in range(1450, 2010):
            if is_yellow(px(x, y)):
                if run is None: run = x
            else:
                if run is not None and x-run > 200:
                    if best is None or x-run > best[2]-best[1]: best = (y, run, x)
                run = None
    return best
row = phone_screen()
print('폰 화면 대표 스캔라인:', row)
sx0, sx1 = row[1], row[2]
SW = sx1 - sx0
print(f'폰 화면 폭 = {SW}px  → 실제 375 환산 배율 {375/SW:.3f}')
S = 375 / SW                                   # 보드 px → 실제 px

# 화면 세로 범위
def screen_v():
    xs = (sx0+sx1)//2; top = bot = None
    for y in range(200, 1152):
        c = px(xs, y)
        if (is_yellow(c) or is_black(c)) and top is None and y > 240: top = y
        if is_yellow(c) or is_black(c): bot = y
    return top, bot
sy0, sy1 = screen_v()
print(f'폰 화면 세로 {sy0}~{sy1} = {sy1-sy0}px → 실제 {(sy1-sy0)*S:.0f}px')

# ── 2) 카드 보더 두께·색 실측 ──
def scan_border(y, x_from, x_to):
    """수평 스캔에서 노랑→비노랑→노랑 전이 구간(=보더)을 잡는다."""
    runs = []; run = None
    for x in range(x_from, x_to):
        c = px(x, y)
        if not is_yellow(c):
            if run is None: run = [x, x, c]
            else: run[1] = x
        else:
            if run is not None:
                runs.append(tuple(run)); run = None
    return runs

print()
print('── 카드 보더 실측 (수평 스캔) ──')
for y in [660, 700, 745]:
    rs = [r for r in scan_border(y, sx0+5, sx1-5) if r[1]-r[0] < 12]
    for a, b, c in rs[:4]:
        print(f'  y={y}  두께 {b-a+1}px → 실제 {(b-a+1)*S:.1f}px   색 rgb{c}')

# ── 3) 검정 픽토그램 인셋 크기 ──
print()
print('── 검정 인셋(픽토그램) 크기 ──')
def black_boxes(y):
    out = []; run = None
    for x in range(sx0, sx1):
        if is_black(px(x, y)):
            if run is None: run = x
        else:
            if run is not None and x-run > 20: out.append((run, x))
            run = None
    return out
for y in [690, 700, 860, 880]:
    for a, b in black_boxes(y):
        print(f'  y={y}  가로 {b-a}px → 실제 {(b-a)*S:.0f}px')

# ── 4) 하단 내비 ──
print()
print('── 하단 내비 ──')
xs = (sx0+sx1)//2
navtop = None
for y in range(sy1-260, sy1):
    if is_black(px(xs, y)) and navtop is None: navtop = y
print(f'  내비 상단 y={navtop}  높이 {sy1-navtop}px → 실제 {(sy1-navtop)*S:.0f}px')
# 내비가 화면 폭을 꽉 채우는가
c_left = px(sx0+3, navtop+30); c_right = px(sx1-3, navtop+30)
print(f'  좌측끝 rgb{c_left} / 우측끝 rgb{c_right} → 전폭? {is_black(c_left) and is_black(c_right)}')

# ── 5) 카드 코너 라운드 (좌상단 곡률 추적) ──
print()
print('── 카드 라운드 ──')
def corner_radius(x_left, y_top, span=60):
    """카드 좌상단에서 보더가 나타나는 첫 x 를 y별로 훑어 반지름 추정"""
    firsts = []
    for dy in range(span):
        y = y_top+dy; first = None
        for dx in range(span):
            x = x_left+dx
            if not is_yellow(px(x, y)): first = dx; break
        if first is not None: firsts.append((dy, first))
    if not firsts: return None
    return max(f for _, f in firsts[:span//2])
for (cx, cy) in [(1520, 600), (1520, 780)]:
    r = corner_radius(cx, cy)
    if r: print(f'  코너({cx},{cy}) 반지름 ≈ {r}px → 실제 {r*S:.0f}px')
