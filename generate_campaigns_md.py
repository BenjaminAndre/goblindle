#!/usr/bin/env python3

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / 'web' / 'static' / 'campaigns.json'
OUTPUT = ROOT / 'CAMPAIGNS.md'

PREFERRED_ORDER = ['campaign', 'gm', 'game', 'year', 'pj_max', 'duration', 'deaths', 'image']


def escape_markdown(value):
    text = str(value).replace('|', '\\|').replace('\r\n', '<br>').replace('\n', '<br>')
    return text


def campaign_sort_key(campaign):
    year_value = campaign.get('year', {}).get('value')
    try:
        year = int(year_value) if year_value is not None else 0
    except (TypeError, ValueError):
        year = 0

    gm_value = campaign.get('gm', {}).get('value') or ''
    campaign_value = campaign.get('campaign', {}).get('value') or ''

    return (year, str(gm_value).casefold(), str(campaign_value).casefold())


def field_value(field):
    if not field or 'value' not in field:
        return ''
    value = field['value']
    notes = field.get('notes') or []
    if notes:
        note_text = '; '.join(str(note) for note in notes)
        return f"{escape_markdown(value)} ({escape_markdown(note_text)})"
    return escape_markdown(value)


def main():
    campaigns = json.loads(SOURCE.read_text(encoding='utf-8'))
    campaigns = sorted(campaigns, key=campaign_sort_key)

    all_fields = []
    for campaign in campaigns:
        all_fields.extend(campaign.keys())
    field_order = []
    for key in PREFERRED_ORDER:
        if key in all_fields and key not in field_order:
            field_order.append(key)
    for key in all_fields:
        if key not in field_order:
            field_order.append(key)

    headers = []
    for key in field_order:
        label = key.replace('_', ' ')
        label = label.replace('pj max', 'PJ Max')
        label = label.replace('gm', 'GM')
        label = label.replace('game', 'Game')
        label = label.replace('year', 'Year')
        label = label.replace('duration', 'Duration')
        label = label.replace('deaths', 'Deaths')
        label = label.replace('campaign', 'Campaign')
        label = label.replace('image', 'Image')
        headers.append(label)

    rows = []
    for campaign in campaigns:
        row = []
        for key in field_order:
            row.append(field_value(campaign.get(key, {})))
        rows.append('| ' + ' | '.join(row) + ' |')

    md = [
        '# Campaigns',
        '',
        f'Generated from `{SOURCE.relative_to(ROOT).as_posix()}` with {len(campaigns)} entries.',
        '',
        '| ' + ' | '.join(headers) + ' |',
        '| ' + ' | '.join(['---'] * len(headers)) + ' |',
        *rows,
    ]

    OUTPUT.write_text('\n'.join(md) + '\n', encoding='utf-8')
    print(f'Wrote {len(campaigns)} campaigns to {OUTPUT.relative_to(ROOT).as_posix()}')


if __name__ == '__main__':
    main()
