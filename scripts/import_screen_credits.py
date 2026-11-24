"""Join the store catalog to IMDb's public non-commercial datasets locally.

Download title.ratings, title.crew, title.principals, title.episode and name.basics
as .tsv.gz files from https://datasets.imdbws.com/ into one directory, then pass
that directory to this script. Only the small set of matched credits is published.
"""
import argparse
import gzip
import json
from collections import Counter, defaultdict
from pathlib import Path

DIST = Path(__file__).resolve().parents[1] / 'dist'


def rows(data, table):
    with gzip.open(data / (table + '.tsv.gz'), 'rb') as stream:
        next(stream)
        yield from stream


def matches(data, table, keys):
    for row in rows(data, table):
        key, _, rest = row.partition(b'\t')
        if key in keys:
            yield key, rest.rstrip(b'\r\n').split(b'\t')


def people(field):
    return [] if field == b'\\N' else field.split(b',')


def make_credits(data, catalog):
    titles = {item['id'].encode(): item for item in catalog}
    shows = {key for key, item in titles.items() if item['category'] in ('anime', 'shows')}
    # Match the parent field of each episode locally. Series-level IMDb CSV rows
    # often omit directors, so we can rank credited episode directors by frequency.
    episodes = {}
    for row in rows(data, 'title.episode'):
        episode, parent, _ = row.split(b'\t', 2)
        if parent in shows:
            episodes[episode] = parent
    relevant = titles.keys() | episodes.keys()
    title_directors = {}
    episode_directors = defaultdict(Counter)
    for key, (directors, _) in matches(data, 'title.crew', relevant):
        if key in titles:
            title_directors[key] = people(directors)
        else:
            episode_directors[episodes[key]].update(people(directors))

    casts = defaultdict(list)
    episode_casts = defaultdict(Counter)
    for key, (order, person, role, _, _) in matches(data, 'title.principals', relevant):
        if role not in (b'actor', b'actress', b'self'):
            continue
        if key in titles:
            casts[key].append((int(order), person))
        else:
            episode_casts[episodes[key]].update([person])

    wanted = set()
    directors, main_cast = {}, {}
    for key in titles:
        ranked = episode_directors[key].most_common(4)
        directors[key] = [person for person, count in ranked] or title_directors.get(key, [])
        cast = [person for _, person in sorted(casts[key])]
        if not cast:
            cast = [person for person, count in episode_casts[key].most_common(5)]
        main_cast[key] = list(dict.fromkeys(cast))[:5]
        wanted.update(main_cast[key])
        wanted.update(directors[key])
    names = {person: fields[0].decode() for person, fields in matches(data, 'name.basics', wanted)}
    ratings = {key: fields[0].decode() for key, fields in matches(data, 'title.ratings', titles)}
    result = {}
    for key, item in titles.items():
        # The shelf catalog's creator field is the Directors column of the IMDb CSV.
        listed = [name.strip() for name in item['creator'].split(',') if name.strip()]
        result[item['id']] = {
            'rating': ratings.get(key) or item['rating'],
            'genres': item['genres'],
            'directors': listed or [names[p] for p in directors[key] if p in names],
            'cast': list(dict.fromkeys(names[p] for p in main_cast[key] if p in names)),
        }
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('dataset_directory', type=Path)
    args = parser.parse_args()
    catalog = json.loads((DIST / 'imdb-items.json').read_text())
    credits = make_credits(args.dataset_directory, catalog)
    output = DIST / 'screen-credits.json'
    temp = output.with_suffix('.tmp')
    temp.write_text(json.dumps(credits, ensure_ascii=False, separators=(',', ':')) + '\n')
    temp.replace(output)
    print(len(credits), 'titles', {key: sum(bool(v[key]) for v in credits.values())
                                  for key in ('rating', 'genres', 'directors', 'cast')})


if __name__ == '__main__':
    main()
