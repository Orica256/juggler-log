# -*- coding: utf-8 -*-
"""
phase0-research/*.json から src/data/machines.ts を生成する。

手で数値を書き写すと転記ミスが起きるため、調査結果のJSONを唯一の情報源とする。
新機種(例: 2026年10月導入予定のマイジャグラーVI)を追加するときは、
同じ形式のJSONを phase0-research/ に置き、下の ORDER と OVERRIDES に追記して再実行する。
"""
import io
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RESEARCH = os.path.join(ROOT, 'phase0-research')
OUT = os.path.join(ROOT, 'src', 'data', 'machines.ts')

# 設置台数の多い順(lineup.json の調査結果に基づく)
ORDER = [
    ('my-juggler-v', 'my-juggler-v.json'),
    ('neo-im-juggler-ex', 'neo-im-juggler-ex.json'),
    ('gogo-juggler-3', 'gogo-juggler-3.json'),
    ('funky-juggler-2', 'funky-juggler-2.json'),
    ('im-juggler-ex', 'im-juggler-ex.json'),
    ('happy-juggler-v3', 'happy-juggler-8.json'),
    ('ultra-miracle-juggler', 'ultra-miracle-juggler.json'),
    ('mr-juggler', 'mr-juggler.json'),
    ('juggler-girls-ss', 'juggler-girls-ss.json'),
]

# 調査JSONに構造化されていない値、および表記の統一。
#   soloRb     … 単独REG確率。設定1〜6が全て揃っている機種のみ収録する。
#                一部の設定しか判明していない場合、尤度計算が偏るため収録しない。
#   grapeAlt   … 対立するぶどう解析値。6設定すべてが明示されている系統のみ収録する。
#   dataStatus … 'verified' は複数情報源が一致し食い違いが無いもの。
OVERRIDES = {
    'my-juggler-v': {
        'name': 'マイジャグラーV',
        'dataStatus': 'provisional',
        'notes': '単独REGの設定差が約2倍(1/652.7→1/333.8)あり、ぶどうより判別力が高い。'
                 '設定6のぶどうは1/5.69派(4情報源)と1/5.66派(5情報源)で解析値が割れており決着していない。',
    },
    'neo-im-juggler-ex': {
        'name': 'ネオアイムジャグラーEX',
        'dataStatus': 'provisional',
        'soloRb': [630.2, 574.9, 474.9, 448.9, 364.1, 364.1],
        'notes': 'ぶどうは設定1〜5が共通で設定6のみ優遇。設定5と6はREGが同値(1/255.0)のため、'
                 '5と6の分離はぶどうが事実上唯一の手掛かりになる。単独REGは設定1→6で約1.75倍の差。'
                 'ボーナススペックは先代アイムジャグラーEXと同一だが、ネオ独自の解析確定値としての裏取りは弱い。',
    },
    'gogo-juggler-3': {
        'name': 'ゴーゴージャグラー3',
        'dataStatus': 'provisional',
        'soloRb': [472.3, 447.4, 417.8, 362.9, 331.0, 317.2],
        'grapeAlt': [6.23, 6.20, 6.14, 6.07, 6.00, 5.94],
        'notes': 'ぶどうが設定1〜6すべて別値で、シリーズ中でも設定差が大きく主指標として機能する。'
                 '1枚掛け時のぶどうは別抽選なのでカウント対象外。'
                 '設定1の合算1/149.6はマイジャグラーV設定3相当で全設定が甘めのため、合算単独での判別は危険。',
    },
    'funky-juggler-2': {
        'name': 'ファンキージャグラー2',
        'dataStatus': 'provisional',
        'notes': '単独REGの設定差が約1.8倍(1/630.2→1/352.3)と大きい。ぶどうは設定1〜6の段階差型。',
    },
    'im-juggler-ex': {
        'name': 'アイムジャグラーEX',
        'dataStatus': 'verified',
        'soloRb': [630.15, 574.88, 474.90, 448.88, 364.09, 364.09],
        'notes': 'ぶどうは設定1〜5が共通で設定6のみ優遇。設定1〜5の間ではぶどうの尤度が完全に同一になるため、'
                 'ぶどうは「設定6か否か」の判別にしか使えない。単独REGも設定5と6が同値。'
                 '2026年末前後に認定期限を迎え、ネオアイムジャグラーEXへの入替が進んでいる。',
    },
    'happy-juggler-v3': {
        'name': 'ハッピージャグラーVⅢ',
        'dataStatus': 'provisional',
        'grapeAlt': [6.04, 6.01, 5.98, 5.86, 5.84, 5.82],
        'notes': 'REG確率の設定差が約1.55倍で最有力の判別要素。'
                 'ぶどうは解析値が4系統に分裂しており全機種中もっとも不確実(設定6で最大0.07の幅)。'
                 'チェリーは高設定ほど確率が悪くなる逆設定差を持つ。単独REGは信頼できる数値が見つからず未収録。',
    },
    'ultra-miracle-juggler': {
        'name': 'ウルトラミラクルジャグラー',
        'dataStatus': 'verified',
        'soloRb': [596.0, 546.0, 490.0, 436.0, 416.0, 380.0],
        'notes': 'ぶどうは設定1〜4が全て同一(1/5.93)で、差が付くのは設定5と6のみ。'
                 '設定1と6の分母差もわずか0.12で6号機ジャグラー中最小級のため、ぶどうを主指標にできない。'
                 '単独REG(1/596→1/380、約1.57倍)を判別の主軸に据えること。',
    },
    'mr-juggler': {
        'name': 'ミスタージャグラー',
        'dataStatus': 'provisional',
        'grapeAlt': [6.13, 6.07, 6.01, 5.95, 5.88, 5.82],
        'notes': '設定6がBB=RB=1/237.4のBR比1:1になり、BR比が設定1の1.4:1から単調変化するため強力な判別要素になる。'
                 'ぶどうは2系統の解析値が全設定で一律に約0.15ずれており、刻み幅は一致するため集計基準の違いと思われる。'
                 '単独REGは設定1(1/517)と設定6(1/299)しか判明しておらず、尤度が偏るため未収録。',
    },
    'juggler-girls-ss': {
        'name': 'ジャグラーガールズSS',
        'dataStatus': 'provisional',
        'soloRb': [524.0, 485.0, 440.0, 399.0, 385.0, 359.0],
        'notes': 'REG確率の設定差(約1.51倍)がBIG(約1.21倍)より大きく、REGが第一判別要素。'
                 'ぶどうは設定1〜4が共通なうえ設定1と6の差も約2.6%と小さく、判別力は弱い。',
    },
}

MAX_SOURCES = 6

# ボーナス1回あたりの平均消化ゲーム数。別調査(bonus-games.json)から読み込む。
# ぶどう確率の分母を通常時ゲーム数に補正するために使う。
BONUS_GAMES_FILE = os.path.join(RESEARCH, 'bonus-games.json')


def load_bonus_games():
    if not os.path.exists(BONUS_GAMES_FILE):
        return {}
    data = json.load(io.open(BONUS_GAMES_FILE, encoding='utf-8'))
    result = {}
    for m in data.get('machines', []):
        big, reg = m.get('bigGames'), m.get('regGames')
        # 片方でも欠けていたら補正に使えないので採用しない
        if isinstance(big, (int, float)) and isinstance(reg, (int, float)):
            result[m.get('id')] = (big, reg)
    return result


def esc(s):
    return s.replace('\\', '\\\\').replace("'", "\\'").replace('\n', ' ')


def normalize_spec(spec):
    # 「6.0号機」表記を統一する。6.5号機の区分は情報源で確証が得られなかったため各機種の調査値を尊重する。
    return '6号機' if spec in ('6.0号機', '6号機') else spec


def collect_sources(d):
    urls = []
    for s in d.get('sources', []):
        url = s.get('url') if isinstance(s, dict) else s
        if url and url not in urls:
            urls.append(url)
    return urls[:MAX_SOURCES]


def main():
    bonus_games = load_bonus_games()
    blocks = []
    for machine_id, filename in ORDER:
        d = json.load(io.open(os.path.join(RESEARCH, filename), encoding='utf-8'))
        ov = OVERRIDES[machine_id]
        settings = sorted(d['settings'], key=lambda s: s['setting'])
        assert len(settings) == 6, '%s: 設定が6件ではない' % machine_id

        solo = ov.get('soloRb')
        alt = ov.get('grapeAlt')

        rows = []
        for i, s in enumerate(settings):
            solo_v = solo[i] if solo else s.get('soloRbProb')
            alt_v = alt[i] if alt else s.get('grapeProbAlt')
            # 対立系統が採用値と同一なら、対立は無いものとして扱う
            if alt_v is not None and abs(alt_v - s['grapeProb']) < 1e-9:
                alt_v = None
            rows.append(
                '      { setting: %d, bbProb: %s, rbProb: %s, totalProb: %s, '
                'grapeProb: %s, grapeProbAlt: %s, soloRbProb: %s, payoutRate: %s },'
                % (
                    s['setting'], s['bbProb'], s['rbProb'], s['totalProb'],
                    s['grapeProb'],
                    'null' if alt_v is None else alt_v,
                    'null' if solo_v is None else solo_v,
                    s['payoutRate'],
                )
            )

        bonus = bonus_games.get(machine_id)
        bonus_literal = 'null' if bonus is None else '{ big: %s, reg: %s }' % (bonus[0], bonus[1])

        src_lines = ''.join("\n      '%s'," % u for u in collect_sources(d))
        blocks.append(
            "  {\n"
            "    id: '%s',\n"
            "    name: '%s',\n"
            "    maker: '%s',\n"
            "    releaseYear: %s,\n"
            "    spec: '%s',\n"
            "    dataStatus: '%s',\n"
            "    notes:\n      '%s',\n"
            "    bonusGames: %s,\n"
            "    settings: [\n%s\n    ],\n"
            "    sources: [%s\n    ],\n"
            "  },"
            % (
                machine_id, esc(ov['name']), esc(d.get('maker', '北電子')),
                d.get('releaseYear') if d.get('releaseYear') else 'null',
                normalize_spec(d.get('spec', '6号機')),
                ov['dataStatus'], esc(ov['notes']), bonus_literal,
                '\n'.join(rows), src_lines,
            )
        )

    header = '''/**
 * 機種マスタ(設定1〜6の理論値)
 *
 * ⚠ このファイルは scripts/generate-machines.py が phase0-research/*.json から自動生成する。
 *    直接編集しないこと。数値を直すときは調査JSONを直してスクリプトを再実行する。
 *
 * 数値の性質:
 *   BB / RB / 合算 / 出玉率 … 全情報源が完全一致。実質メーカー公表値とみなせる。
 *   ぶどう / 単独REG        … 北電子は小役確率を公表していないため、すべて第三者の解析値。
 *                             機種によっては複数系統が流通しており、対立系統は grapeProbAlt に持つ。
 *   単独REG                 … 設定1〜6がすべて揃っている機種のみ収録(欠けていると尤度が偏るため)。
 *   bonusGames              … ぶどうの分母を通常時ゲーム数に補正するための平均消化G数。
 *                             裏が取れていない機種は null(補正せず、UIに断りを出す)。
 *
 * 「6.5号機」の区分は情報源で確証が得られなかったため、spec は表示用の参考情報として扱うこと。
 * 判別計算には一切使用しない。
 */
import type { MachineSpec } from '../types'

export const MACHINES: MachineSpec[] = [
'''
    footer = '''
]

/** IDから機種マスタを引く */
export function findMachine(id: string): MachineSpec | undefined {
  return MACHINES.find((m) => m.id === id)
}

/** 暫定値を含む機種が存在するか(UIの注意喚起に使う) */
export function hasProvisionalData(): boolean {
  return MACHINES.some((m) => m.dataStatus === 'provisional')
}
'''
    io.open(OUT, 'w', encoding='utf-8', newline='\n').write(header + '\n'.join(blocks) + footer)
    print('generated: %s (%d machines)' % (OUT, len(blocks)))


if __name__ == '__main__':
    main()
