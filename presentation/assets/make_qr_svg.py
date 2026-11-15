# Pure python QR code generator (Version 3 or 4, EC M)
import sys

# Galois field log/antilog tables for GF(256) with primitive poly 0x11d (285)
EXP = [0] * 512
LOG = [0] * 256
x = 1
for i in range(255):
    EXP[i] = x
    EXP[i + 255] = x
    LOG[x] = i
    x = (x << 1) ^ (285 if x & 128 else 0)

def gf_mul(a, b):
    if a == 0 or b == 0: return 0
    return EXP[LOG[a] + LOG[b]]

def poly_mul(p1, p2):
    r = [0] * (len(p1) + len(p2) - 1)
    for i, c1 in enumerate(p1):
        for j, c2 in enumerate(p2):
            r[i + j] ^= gf_mul(c1, c2)
    return r

def rs_generator_poly(ec_len):
    g = [1]
    for i in range(ec_len):
        g = poly_mul(g, [1, EXP[i]])
    return g

def rs_encode(data, ec_len):
    gen = rs_generator_poly(ec_len)
    msg = data + [0] * ec_len
    for i in range(len(data)):
        lead = msg[i]
        if lead != 0:
            for j in range(len(gen)):
                msg[i + j] ^= gf_mul(gen[j], lead)
    return msg[-ec_len:]

# Version 4-M: 33x33, total codewords 100, data codewords 64, EC codewords 36 (2 blocks of 18 EC)
# Block 1: 32 data, 18 EC; Block 2: 32 data, 18 EC
def encode_qr_v4_m(text):
    # Byte mode: indicator 0100 (4 bits), count (8 bits)
    raw = [ord(c) for c in text]
    bits = [0, 1, 0, 0]
    count = len(raw)
    for i in range(7, -1, -1):
        bits.append((count >> i) & 1)
    for b in raw:
        for i in range(7, -1, -1):
            bits.append((b >> i) & 1)
    # Terminator up to 4 zeros
    cap_bits = 64 * 8
    pad_len = min(4, cap_bits - len(bits))
    bits.extend([0] * pad_len)
    # Pad to byte boundary
    while len(bits) % 8 != 0:
        bits.append(0)
    # Pad codewords
    pad_bytes = [0xEC, 0x11]
    pad_idx = 0
    codewords = []
    for i in range(0, len(bits), 8):
        val = 0
        for b in bits[i:i+8]:
            val = (val << 1) | b
        codewords.append(val)
    while len(codewords) < 64:
        codewords.append(pad_bytes[pad_idx % 2])
        pad_idx += 1
    
    # Split into 2 blocks of 32
    b1_data = codewords[:32]
    b2_data = codewords[32:]
    b1_ec = rs_encode(b1_data, 18)
    b2_ec = rs_encode(b2_data, 18)
    
    # Interleave
    final_codewords = []
    for i in range(32):
        final_codewords.append(b1_data[i])
        final_codewords.append(b2_data[i])
    for i in range(18):
        final_codewords.append(b1_ec[i])
        final_codewords.append(b2_ec[i])
    # 7 remainder bits for V4
    final_bits = []
    for c in final_codewords:
        for i in range(7, -1, -1):
            final_bits.append((c >> i) & 1)
    final_bits.extend([0] * 7)
    return final_bits

def build_matrix_v4(bits):
    size = 33
    mat = [[None] * size for _ in range(size)]
    res = [[False] * size for _ in range(size)] # True if reserved (timing/finder/etc)

    # 1. Finder patterns
    def place_finder(row, col):
        for r in range(-1, 8):
            for c in range(-1, 8):
                if 0 <= row + r < size and 0 <= col + c < size:
                    res[row + r][col + c] = True
                    if 0 <= r <= 6 and 0 <= c <= 6:
                        if r in (0, 6) or c in (0, 6) or (2 <= r <= 4 and 2 <= c <= 4):
                            mat[row + r][col + c] = 1
                        else:
                            mat[row + r][col + c] = 0
                    else:
                        mat[row + r][col + c] = 0

    place_finder(0, 0)
    place_finder(0, size - 7)
    place_finder(size - 7, 0)

    # 2. Timing patterns
    for i in range(8, size - 8):
        res[6][i] = True
        mat[6][i] = 1 if i % 2 == 0 else 0
        res[i][6] = True
        mat[i][6] = 1 if i % 2 == 0 else 0

    # 3. Alignment pattern at (24, 24) for V4
    def place_align(row, col):
        for r in range(-2, 3):
            for c in range(-2, 3):
                res[row + r][col + c] = True
                if abs(r) == 2 or abs(c) == 2 or (r == 0 and c == 0):
                    mat[row + r][col + c] = 1
                else:
                    mat[row + r][col + c] = 0
    place_align(24, 24)

    # 4. Dark module
    mat[size - 8][8] = 1
    res[size - 8][8] = True

    # Reserve format info
    for i in range(9):
        res[8][i] = True
        res[i][8] = True
    for i in range(size - 8, size):
        res[8][i] = True
        res[i][8] = True

    # 5. Place data with Mask 0 ((r + c) % 2 == 0)
    # Mask 0 is standard
    bit_idx = 0
    col = size - 1
    while col > 0:
        if col == 6: col -= 1 # Skip vertical timing
        for row_step in range(size):
            r = (size - 1 - row_step) if ((col // 2) % 2 == 1) else row_step
            for c in (col, col - 1):
                if not res[r][c]:
                    b = bits[bit_idx] if bit_idx < len(bits) else 0
                    bit_idx += 1
                    # Apply Mask 0: flip if (r + c) % 2 == 0
                    if (r + c) % 2 == 0:
                        b ^= 1
                    mat[r][c] = b
        col -= 2

    # 6. Format info: Level M (00), Mask 0 (000) -> 00000 -> BCH 101010000010010 ^ mask 101010000010010 = 000000000000000 ^ 101010000010010
    # Actually Format for M-0 is: 00 000 -> BCH(15,5): 101010000010010 ^ 101010000010010 = 0? Wait, format string with mask:
    # Let's compute standard BCH for M (00) + Mask 0 (000) = 00000 -> BCH remainder 0000000000 -> XOR with 101010000010010 -> format_bits = [1,0,1,0,1,0,0,0,0,0,1,0,0,1,0]
    fmt = [1,0,1,0,1,0,0,0,0,0,1,0,0,1,0]
    # Place format bits
    # top-left
    fmt_coords_tl = [(8,0),(8,1),(8,2),(8,3),(8,4),(8,5),(8,7),(8,8),(7,8),(5,8),(4,8),(3,8),(2,8),(1,8),(0,8)]
    for idx, (r, c) in enumerate(fmt_coords_tl):
        mat[r][c] = fmt[idx]
    # split bottom-left and top-right
    for idx in range(7):
        mat[size - 1 - idx][8] = fmt[idx]
    for idx in range(8):
        mat[8][size - 8 + idx] = fmt[7 + idx]

    return mat

def save_svg(matrix, filename):
    size = len(matrix)
    margin = 2
    view_size = size + margin * 2
    svg = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {view_size} {view_size}" width="100%" height="100%">']
    svg.append(f'<rect width="{view_size}" height="{view_size}" fill="#0D1527" rx="2" />')
    for r in range(size):
        for c in range(size):
            if matrix[r][c] == 1:
                svg.append(f'<rect x="{c + margin}" y="{r + margin}" width="1.02" height="1.02" fill="#00F2FE" />')
    svg.append('</svg>')
    with open(filename, 'w') as f:
        f.write('\n'.join(svg))

url = "https://nasa-project-spain.vercel.app/"
bits = encode_qr_v4_m(url)
mat = build_matrix_v4(bits)
save_svg(mat, 'presentation/assets/qr_code.svg')
print("Successfully generated presentation/assets/qr_code.svg!")
