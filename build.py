from pathlib import Path
import re


BASE_DIR = Path(__file__).resolve().parent

CSS_FILES = [
    "css/base.css",
    "css/layout.css",
    "css/components.css",
    "css/responsive.css",
]

JS_FILES = [
    "js/config.js",
    "js/core.js",
    "js/store.js",
    "js/converterView.js",
    "js/mapView.js",
    "js/quizView.js",
    "js/app.js",
]


def read_text(relative_path: str) -> str:
    path = BASE_DIR / relative_path

    if not path.exists():
        raise FileNotFoundError(f"파일을 찾을 수 없습니다: {relative_path}")

    return path.read_text(encoding="utf-8")


def replace_build_block(
    html: str,
    block_name: str,
    replacement: str
) -> str:
    pattern = re.compile(
        rf"<!-- BUILD:{block_name}:START -->"
        rf".*?"
        rf"<!-- BUILD:{block_name}:END -->",
        re.DOTALL,
    )

    block = (
        f"<!-- BUILD:{block_name}:START -->\n"
        f"{replacement}\n"
        f"<!-- BUILD:{block_name}:END -->"
    )

    updated_html, count = pattern.subn(block, html, count=1)

    if count != 1:
        raise RuntimeError(
            f"{block_name} 빌드 블록을 index.html에서 찾을 수 없습니다."
        )

    return updated_html


def build_single_html():
    source_html = read_text("index.html")

    combined_css = "\n\n".join(
        f"/* ===== {path} ===== */\n{read_text(path)}"
        for path in CSS_FILES
    )

    combined_js = "\n\n".join(
        f"/* ===== {path} ===== */\n{read_text(path)}"
        for path in JS_FILES
    )

    style_tag = f"<style>\n{combined_css}\n</style>"
    script_tag = f"<script>\n{combined_js}\n</script>"

    output_html = replace_build_block(
        source_html,
        "CSS",
        style_tag,
    )

    output_html = replace_build_block(
        output_html,
        "JS",
        script_tag,
    )

    output_dir = BASE_DIR / "docs"
    output_dir.mkdir(parents=True, exist_ok=True)

    output_file = output_dir / "index.html"
    output_file.write_text(output_html, encoding="utf-8")

    file_size_kb = output_file.stat().st_size / 1024

    print(
        f"\033[92mBuild OK -> "
        f"docs/index.html ({file_size_kb:.1f} KB)\033[0m"
    )


if __name__ == "__main__":
    build_single_html()
