"""Build the playable static site in _site, without local reference material."""
from pathlib import Path
import shutil


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / '_site'
DATA_FILES = (
    'data/maps/original-board.json',
    'data/maps/great-cloud.json',
    'data/cards/base-buildings-and-provisions.json',
    'data/cards/base-parchments.json',
    'data/cards/in-the-sky.json',
)


def build():
    files = [ROOT / 'index.html']
    files += sorted((ROOT / 'src').glob('*.js'))
    files += sorted((ROOT / 'src').glob('*.css'))
    files += [ROOT / path for path in DATA_FILES]
    for source in files:
        if not source.is_file() or source.is_symlink():
            raise ValueError(f'Missing or unsupported site file: {source}')
    if OUTPUT.exists():
        shutil.rmtree(OUTPUT)
    for source in files:
        target = OUTPUT / source.relative_to(ROOT)
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, target)
    (OUTPUT / '.nojekyll').touch()
    print(f'Built {len(files)} game files in {OUTPUT}')


if __name__ == '__main__':
    build()
