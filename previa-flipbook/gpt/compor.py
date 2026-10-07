from __future__ import annotations

from pathlib import Path
from typing import Iterable

from PIL import Image, ImageDraw, ImageFilter, ImageFont


W, H = 1600, 2400
ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
ASSETS = ROOT / "assets" / "projetos"
FONTS = OUT / "fonts"

COLORS = {
    "petroleum": "#12384f",
    "night": "#0a2232",
    "blue": "#1d7fb8",
    "strong_blue": "#1d4ed8",
    "terracotta": "#d2643a",
    "yellow": "#fcc419",
    "paper": "#f7fafd",
    "ink": "#0a2232",
    "muted": "#536b7b",
    "white": "#ffffff",
}

PLAN_P13 = ASSETS / "p13-sobrado-5x20-3q-planta.png"
PLAN_P11 = ASSETS / "p11-terrea-12x20-geminadas-planta.png"
PLAN_P03 = ASSETS / "p03-terrea-5x20-1q-planta.png"


def font(family: str, size: int, weight: int = 400) -> ImageFont.FreeTypeFont:
    paths = {
        "Sora": FONTS / "Sora-Variable.ttf",
        "Inter": FONTS / "Inter-Variable.ttf",
        "Outfit": FONTS / "Outfit-Variable.ttf",
    }
    f = ImageFont.truetype(str(paths[family]), size=size)
    try:
        axes = f.get_variation_axes()
        values: list[float] = []
        for axis in axes:
            name = axis["name"]
            if isinstance(name, bytes):
                name = name.decode("utf-8")
            if str(name).lower() == "weight":
                values.append(max(axis["minimum"], min(axis["maximum"], weight)))
            else:
                values.append(axis["default"])
        f.set_variation_by_axes(values)
    except (AttributeError, OSError, ValueError):
        pass
    return f


def rgb(hex_color: str) -> tuple[int, int, int]:
    value = hex_color.lstrip("#")
    return tuple(int(value[i : i + 2], 16) for i in (0, 2, 4))


def wrap_text(draw: ImageDraw.ImageDraw, text: str, fnt: ImageFont.FreeTypeFont, max_width: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = word if not current else f"{current} {word}"
        if draw.textbbox((0, 0), candidate, font=fnt)[2] <= max_width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def draw_wrapped(
    draw: ImageDraw.ImageDraw,
    xy: tuple[int, int],
    text: str,
    fnt: ImageFont.FreeTypeFont,
    fill: str,
    max_width: int,
    line_gap: int = 10,
    anchor: str = "la",
    align: str = "left",
) -> int:
    lines = wrap_text(draw, text, fnt, max_width)
    line_height = fnt.getbbox("Ag")[3] - fnt.getbbox("Ag")[1]
    y = xy[1]
    for line in lines:
        x = xy[0]
        if align == "center":
            line_width = draw.textbbox((0, 0), line, font=fnt)[2]
            x = xy[0] + (max_width - line_width) / 2
        draw.text((x, y), line, font=fnt, fill=fill, anchor=anchor)
        y += line_height + line_gap
    return y


def draw_tracking_text(
    draw: ImageDraw.ImageDraw,
    xy: tuple[int, int],
    text: str,
    fnt: ImageFont.FreeTypeFont,
    fill: str,
    tracking: int = 4,
) -> int:
    x, y = xy
    for char in text:
        draw.text((x, y), char, font=fnt, fill=fill, anchor="la")
        x += draw.textlength(char, font=fnt) + tracking
    return int(x)


def draw_label(draw: ImageDraw.ImageDraw, text: str, y: int, color: str, x: int = 112) -> None:
    fnt = font("Outfit", 47, 700)
    draw_tracking_text(draw, (x, y), text, fnt, color, tracking=3)


def draw_grid(base: Image.Image, dark: bool = False) -> None:
    overlay = Image.new("RGBA", base.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    if dark:
        minor, major = (29, 127, 184, 16), (29, 127, 184, 30)
    else:
        minor, major = (29, 127, 184, 14), (29, 127, 184, 25)
    step = 64
    for x in range(0, W + 1, step):
        d.line((x, 0, x, H), fill=major if x % (step * 5) == 0 else minor, width=2 if x % (step * 5) == 0 else 1)
    for y in range(0, H + 1, step):
        d.line((0, y, W, y), fill=major if y % (step * 5) == 0 else minor, width=2 if y % (step * 5) == 0 else 1)
    base.alpha_composite(overlay)


def rounded_layer(size: tuple[int, int], radius: int, fill: str) -> Image.Image:
    layer = Image.new("RGBA", size, (0, 0, 0, 0))
    ImageDraw.Draw(layer).rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), radius=radius, fill=fill)
    return layer


def paste_shadowed(
    base: Image.Image,
    content: Image.Image,
    xy: tuple[int, int],
    radius: int = 22,
    offset: tuple[int, int] = (0, 24),
    opacity: int = 80,
) -> None:
    shadow = Image.new("RGBA", content.size, (0, 0, 0, 0))
    alpha = content.getchannel("A") if content.mode == "RGBA" else Image.new("L", content.size, 255)
    shadow.putalpha(alpha)
    black = Image.new("RGBA", content.size, (4, 20, 30, opacity))
    black.putalpha(alpha.point(lambda p: p * opacity // 255))
    black = black.filter(ImageFilter.GaussianBlur(radius))
    base.alpha_composite(black, (xy[0] + offset[0], xy[1] + offset[1]))
    base.alpha_composite(content, xy)


def plan_sheet(path: Path, width: int, angle: float = 0.0, pad: int = 16) -> Image.Image:
    source = Image.open(path).convert("RGB")
    height = round(width * source.height / source.width)
    source = source.resize((width, height), Image.Resampling.LANCZOS)
    sheet = Image.new("RGBA", (width + pad * 2, height + pad * 2), COLORS["white"])
    sheet.alpha_composite(source.convert("RGBA"), (pad, pad))
    if angle:
        sheet = sheet.rotate(angle, resample=Image.Resampling.BICUBIC, expand=True, fillcolor=(0, 0, 0, 0))
    return sheet


def page_1() -> Image.Image:
    page = Image.new("RGBA", (W, H), COLORS["night"])
    draw_grid(page, dark=True)
    d = ImageDraw.Draw(page)

    # Cabeçalho editorial: um único detalhe amarelo nesta página.
    label_font = font("Outfit", 47, 750)
    label = "BIBLIOTECA DIGITAL DE PROJETOS"
    label_w = d.textbbox((0, 0), label, font=label_font)[2]
    chip_pad = 54
    chip_right = 112 + label_w + chip_pad * 2          # largura = texto + respiro
    d.rounded_rectangle((112, 116, chip_right, 198), radius=41, fill=COLORS["yellow"])
    d.text((112 + chip_pad, 157), label, font=label_font, fill=COLORS["night"], anchor="lm")

    title_font = font("Sora", 154, 800)
    d.text((112, 285), "100 Projetos", font=title_font, fill=COLORS["white"], anchor="la")
    second = "de Casas e Sobrados"
    second_font = font("Sora", 136, 800)
    d.text((112, 462), second, font=second_font, fill=COLORS["white"], anchor="la")

    subtitle_font = font("Inter", 67, 520)
    draw_wrapped(
        d,
        (116, 670),
        "para construir e lucrar em terrenos pequenos",
        subtitle_font,
        "#b9d2df",
        1210,
        line_gap=16,
    )

    # Três pranchas reais: nenhuma planta é redesenhada.
    p11 = plan_sheet(PLAN_P11, 1110, angle=-5.2)
    p03 = plan_sheet(PLAN_P03, 1050, angle=5.0)
    p13 = plan_sheet(PLAN_P13, 1240, angle=-0.8)
    paste_shadowed(page, p11, (-180, 1015), radius=34, offset=(8, 34), opacity=115)
    paste_shadowed(page, p03, (620, 1185), radius=34, offset=(8, 34), opacity=115)
    paste_shadowed(page, p13, (166, 1478), radius=38, offset=(8, 38), opacity=130)

    # Rodapé sobre uma base limpa para manter leitura em tela pequena.
    footer_layer = Image.new("RGBA", (W, 190), (10, 34, 50, 242))
    page.alpha_composite(footer_layer, (0, H - 190))
    d = ImageDraw.Draw(page)
    footer = "Plantas · Medidas do lote · Implantação · Fundação"
    footer_font = font("Inter", 48, 600)
    box = d.textbbox((0, 0), footer, font=footer_font)
    d.text(((W - (box[2] - box[0])) / 2, H - 96), footer, font=footer_font, fill="#d8e6ed", anchor="lm")
    return page.convert("RGB")


def light_page() -> Image.Image:
    page = Image.new("RGBA", (W, H), COLORS["paper"])
    draw_grid(page, dark=False)
    return page


def page_2() -> Image.Image:
    page = light_page()
    d = ImageDraw.Draw(page)
    # A faixa de lombada se repete invertida na página 3, unindo a dupla.
    d.rectangle((W - 18, 0, W, H), fill=COLORS["blue"])
    draw_label(d, "COMO USAR", 118, COLORS["terracotta"])

    title_font = font("Sora", 140, 800)
    draw_wrapped(
        d,
        (112, 245),
        "Em vez de imaginar do zero, você compara.",
        title_font,
        COLORS["ink"],
        1325,
        line_gap=15,
    )

    steps = [
        ("01", "Comece pelo terreno", "Veja os projetos do seu tamanho de lote."),
        ("02", "Compare as opções", "O mesmo lote pode virar casa, sobrado ou duas unidades."),
        ("03", "Leve ao profissional", "Leve a referência escolhida ao seu arquiteto ou engenheiro."),
    ]
    number_font = font("Outfit", 116, 800)
    step_title_font = font("Sora", 65, 750)
    body_font = font("Inter", 63, 470)
    y_positions = [720, 1115, 1510]
    for idx, ((number, title, body), y) in enumerate(zip(steps, y_positions)):
        if idx:
            d.line((112, y - 82, 1440, y - 82), fill="#c8d8e1", width=3)
        d.text((112, y), number, font=number_font, fill=COLORS["terracotta"], anchor="la")
        text_x = 338
        d.text((text_x, y + 8), title, font=step_title_font, fill=COLORS["ink"], anchor="la")
        draw_wrapped(d, (text_x, y + 104), body, body_font, COLORS["muted"], 1050, line_gap=12)

    # Único detalhe amarelo: aviso de responsabilidade no rodapé.
    warning_y = 2020
    warning = rounded_layer((1376, 276), 28, "#e7f1f7")
    warning_draw = ImageDraw.Draw(warning)
    warning_draw.rectangle((0, 0, 18, 276), fill=COLORS["yellow"])
    warning_font = font("Inter", 44, 540)
    draw_wrapped(
        warning_draw,
        (55, 39),
        "Os projetos são referências e estudos preliminares. Não substituem arquiteto ou engenheiro, projeto executivo, cálculo estrutural, ART/RRT nem aprovação municipal.",
        warning_font,
        COLORS["ink"],
        1260,
        line_gap=10,
    )
    paste_shadowed(page, warning, (112, warning_y), radius=16, offset=(0, 10), opacity=35)
    return page.convert("RGB")


def map_plan_point(
    source_xy: tuple[int, int],
    source_size: tuple[int, int],
    placed_xy: tuple[int, int],
    placed_size: tuple[int, int],
) -> tuple[int, int]:
    return (
        round(placed_xy[0] + source_xy[0] / source_size[0] * placed_size[0]),
        round(placed_xy[1] + source_xy[1] / source_size[1] * placed_size[1]),
    )


def page_3() -> Image.Image:
    page = light_page()
    d = ImageDraw.Draw(page)
    d.rectangle((0, 0, 18, H), fill=COLORS["blue"])
    draw_label(d, "COMO LER", 118, COLORS["terracotta"], x=130)

    title_font = font("Sora", 120, 800)
    title_end = draw_wrapped(
        d,
        (130, 245),
        "Tudo o que você precisa, numa prancha.",
        title_font,
        COLORS["ink"],
        1320,
        line_gap=15,
    )

    source = Image.open(PLAN_P13).convert("RGB")
    plan_x, plan_y = 94, max(720, title_end + 95)      # nunca encosta no titulo
    plan_w = 1412
    plan_h = round(plan_w * source.height / source.width)
    resized = source.resize((plan_w, plan_h), Image.Resampling.LANCZOS)
    sheet = Image.new("RGBA", (plan_w + 28, plan_h + 28), COLORS["white"])
    sheet.alpha_composite(resized.convert("RGBA"), (14, 14))
    paste_shadowed(page, sheet, (plan_x - 14, plan_y - 14), radius=26, offset=(0, 24), opacity=70)

    # Pontos medidos diretamente na prancha p13 (1376×768).
    marker_specs = [
        (1, (250, 410), (-92, -82)),       # nome e área de ambiente
        (2, (434, 690), (96, 20)),         # cotas do lote
        (3, (320, 754), (-38, -92)),       # legenda de cores das aberturas
        (4, (1148, 218), (92, -70)),       # implantação
        (5, (1148, 560), (98, 32)),        # fundação
    ]
    marker_font = font("Outfit", 45, 800)
    source_size = source.size
    for number, source_point, delta in marker_specs:
        target = map_plan_point(source_point, source_size, (plan_x, plan_y), (plan_w, plan_h))
        center = (target[0] + delta[0], target[1] + delta[1])
        d.line((center[0], center[1], target[0], target[1]), fill=COLORS["terracotta"], width=8)
        d.ellipse((target[0] - 8, target[1] - 8, target[0] + 8, target[1] + 8), fill=COLORS["terracotta"])
        d.ellipse((center[0] - 37, center[1] - 37, center[0] + 37, center[1] + 37), fill=COLORS["terracotta"])
        d.text(center, str(number), font=marker_font, fill=COLORS["white"], anchor="mm")

    items = [
        "Nome e área de cada ambiente",
        "Medidas do lote",
        "Cores das aberturas: azul janela · laranja porta · verde porta-janela",
        "Implantação no lote",
        "Fundação seguindo as paredes",
    ]
    list_y = plan_y + plan_h + 92
    circle_font = font("Outfit", 41, 800)
    list_font = font("Inter", 64, 570)
    for idx, item in enumerate(items, start=1):
        cy = list_y + 46
        d.ellipse((130, cy - 34, 198, cy + 34), fill=COLORS["terracotta"])
        d.text((164, cy), str(idx), font=circle_font, fill=COLORS["white"], anchor="mm")
        end_y = draw_wrapped(d, (232, list_y), item, list_font, COLORS["ink"], 1210, line_gap=8)
        row_h = max(106, end_y - list_y + 22)
        list_y += row_h
        if idx < len(items):
            d.line((232, list_y - 8, 1450, list_y - 8), fill="#d4e0e7", width=2)

    return page.convert("RGB")


def draw_pills(
    draw: ImageDraw.ImageDraw,
    labels: Iterable[str],
    y: int,
    max_x: int = 1488,
    x0: int = 112,
    height: int = 92,
    gap: int = 20,
    row_gap: int = 22,
    font_size: int = 48,
) -> int:
    pill_font = font("Outfit", font_size, 650)
    x = x0
    current_y = y
    for label in labels:
        text_w = draw.textbbox((0, 0), label, font=pill_font)[2]
        pill_w = int(text_w + 66)
        if x + pill_w > max_x:
            x = x0
            current_y += height + row_gap
        draw.rounded_rectangle((x, current_y, x + pill_w, current_y + height), radius=height // 2, fill=COLORS["petroleum"])
        draw.text((x + pill_w / 2, current_y + height / 2 - 2), label, font=pill_font, fill=COLORS["white"], anchor="mm")
        x += pill_w + gap
    return current_y + height


def page_4() -> Image.Image:
    page = Image.new("RGBA", (W, H), COLORS["night"])
    draw_grid(page, dark=True)
    d = ImageDraw.Draw(page)

    # Único detalhe amarelo: rótulo de abertura.
    d.rounded_rectangle((112, 116, 563, 194), radius=39, fill=COLORS["yellow"])
    label_font = font("Outfit", 45, 760)
    label = "ENCONTRE O SEU"
    label_w = d.textbbox((0, 0), label, font=label_font)[2]
    d.text((337 - label_w / 2, 154), label, font=label_font, fill=COLORS["night"], anchor="lm")

    title_font = font("Sora", 145, 800)
    draw_wrapped(d, (112, 285), "Procure pelo seu terreno.", title_font, COLORS["white"], 1355, line_gap=18)

    section_font = font("Outfit", 48, 730)
    d.text((112, 650), "TAMANHO DO LOTE", font=section_font, fill=COLORS["terracotta"], anchor="la")
    end_lotes = draw_pills(d, ["5x20", "6x20", "7x20", "8x20", "10x20", "12x20", "e mais"], 735, font_size=49)

    type_y = end_lotes + 120
    d.text((112, type_y), "TIPO DE IMÓVEL", font=section_font, fill=COLORS["terracotta"], anchor="la")
    end_types = draw_pills(
        d,
        ["Casa térrea", "Sobrado", "Duas unidades", "Para aluguel", "Com comércio", "Terreno estreito", "Esquina", "Casa de fundos"],
        type_y + 85,
        height=88,
        row_gap=20,
        font_size=49,
    )

    rooms_y = end_types + 112
    d.text((112, rooms_y), "QUARTOS", font=section_font, fill=COLORS["terracotta"], anchor="la")
    draw_pills(d, ["1", "2", "3", "4"], rooms_y + 85, height=90, font_size=50)

    closer = rounded_layer((1376, 236), 34, COLORS["strong_blue"])
    closer_draw = ImageDraw.Draw(closer)
    closer_font = font("Sora", 70, 800)
    closer_text = "A partir daqui começam os projetos."
    lines = wrap_text(closer_draw, closer_text, closer_font, 1220)
    line_height = closer_font.getbbox("Ag")[3] - closer_font.getbbox("Ag")[1]
    total_h = len(lines) * line_height + (len(lines) - 1) * 6
    yy = (236 - total_h) / 2
    for line in lines:
        line_w = closer_draw.textbbox((0, 0), line, font=closer_font)[2]
        closer_draw.text(((1376 - line_w) / 2, yy), line, font=closer_font, fill=COLORS["white"], anchor="la")
        yy += line_height + 6
    paste_shadowed(page, closer, (112, 2070), radius=24, offset=(0, 18), opacity=95)
    return page.convert("RGB")


def save_pages() -> None:
    pages = [page_1(), page_2(), page_3(), page_4()]
    preview_dir = OUT / "_conferencia-350px"
    preview_dir.mkdir(parents=True, exist_ok=True)
    for index, page in enumerate(pages, start=1):
        output = OUT / f"{index}.png"
        page.save(output, format="PNG", optimize=True)
        preview = page.resize((350, 525), Image.Resampling.LANCZOS)
        preview.save(preview_dir / f"{index}.png", format="PNG", optimize=True)
        print(f"OK {output.name}: {page.width}x{page.height}")


if __name__ == "__main__":
    save_pages()
