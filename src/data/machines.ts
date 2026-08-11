/**
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
  {
    id: 'my-juggler-v',
    name: 'マイジャグラーV',
    maker: '北電子',
    releaseYear: 2021,
    spec: '6号機',
    dataStatus: 'provisional',
    notes:
      '単独REGの設定差が約2倍(1/652.7→1/333.8)あり、ぶどうより判別力が高い。設定6のぶどうは1/5.69派(4情報源)と1/5.66派(5情報源)で解析値が割れており決着していない。',
    bonusGames: { big: 20, reg: 8 },
    settings: [
      { setting: 1, bbProb: 273.1, rbProb: 409.6, totalProb: 163.8, grapeProb: 5.9, grapeProbAlt: null, soloRbProb: 652.73, payoutRate: 97.0 },
      { setting: 2, bbProb: 270.8, rbProb: 385.5, totalProb: 159.1, grapeProb: 5.88, grapeProbAlt: 5.85, soloRbProb: 607.65, payoutRate: 98.0 },
      { setting: 3, bbProb: 266.4, rbProb: 336.1, totalProb: 148.6, grapeProb: 5.82, grapeProbAlt: 5.8, soloRbProb: 500.25, payoutRate: 99.9 },
      { setting: 4, bbProb: 254.0, rbProb: 290.0, totalProb: 135.4, grapeProb: 5.81, grapeProbAlt: 5.78, soloRbProb: 411.91, payoutRate: 102.8 },
      { setting: 5, bbProb: 240.1, rbProb: 268.6, totalProb: 126.8, grapeProb: 5.79, grapeProbAlt: 5.76, soloRbProb: 397.19, payoutRate: 105.3 },
      { setting: 6, bbProb: 229.1, rbProb: 229.1, totalProb: 114.6, grapeProb: 5.69, grapeProbAlt: 5.66, soloRbProb: 333.81, payoutRate: 109.4 },
    ],
    sources: [
      'https://slobase.jp/machines/myjuggler5',
      'https://www.nankaikoya.jp/myjuggler-five/',
      'https://p-town.dmm.com/specials/2538',
      'https://nana-press.com/kaiseki/machine/191/6665/',
      'https://nana-press.com/kaiseki/machine/191/8709/',
      'https://jugjug.net/myjuggler5',
    ],
  },
  {
    id: 'neo-im-juggler-ex',
    name: 'ネオアイムジャグラーEX',
    maker: '北電子',
    releaseYear: 2025,
    spec: '6号機',
    dataStatus: 'provisional',
    notes:
      'ぶどうは設定1〜5が共通で設定6のみ優遇。設定5と6はREGが同値(1/255.0)のため、5と6の分離はぶどうが事実上唯一の手掛かりになる。単独REGは設定1→6で約1.75倍の差。ボーナススペックは先代アイムジャグラーEXと同一だが、ネオ独自の解析確定値としての裏取りは弱い。',
    bonusGames: { big: 21, reg: 8 },
    settings: [
      { setting: 1, bbProb: 273.1, rbProb: 439.8, totalProb: 168.5, grapeProb: 6.02, grapeProbAlt: null, soloRbProb: 630.2, payoutRate: 97.0 },
      { setting: 2, bbProb: 269.7, rbProb: 399.6, totalProb: 161.0, grapeProb: 6.02, grapeProbAlt: null, soloRbProb: 574.9, payoutRate: 98.0 },
      { setting: 3, bbProb: 269.7, rbProb: 331.0, totalProb: 148.6, grapeProb: 6.02, grapeProbAlt: null, soloRbProb: 474.9, payoutRate: 99.5 },
      { setting: 4, bbProb: 259.0, rbProb: 315.1, totalProb: 142.2, grapeProb: 6.02, grapeProbAlt: null, soloRbProb: 448.9, payoutRate: 101.1 },
      { setting: 5, bbProb: 259.0, rbProb: 255.0, totalProb: 128.5, grapeProb: 6.02, grapeProbAlt: null, soloRbProb: 364.1, payoutRate: 103.3 },
      { setting: 6, bbProb: 255.0, rbProb: 255.0, totalProb: 127.5, grapeProb: 5.78, grapeProbAlt: null, soloRbProb: 364.1, payoutRate: 105.5 },
    ],
    sources: [
      'https://www.p-world.co.jp/machine/database/10269',
      'https://nana-press.com/kaiseki/machine/978/',
      'https://pachiseven.jp/machines/7179',
      'https://jugjug.net/neo-im-juggler-ex',
      'https://kenslo65536.com/kaiseki/juggler-neo-im-ex.html',
      'https://note.com/pachiprotool/n/n7af9b37a7e15',
    ],
  },
  {
    id: 'gogo-juggler-3',
    name: 'ゴーゴージャグラー3',
    maker: '北電子',
    releaseYear: 2023,
    spec: '6号機',
    dataStatus: 'provisional',
    notes:
      'ぶどうが設定1〜6すべて別値で、シリーズ中でも設定差が大きく主指標として機能する。1枚掛け時のぶどうは別抽選なのでカウント対象外。設定1の合算1/149.6はマイジャグラーV設定3相当で全設定が甘めのため、合算単独での判別は危険。',
    bonusGames: { big: 20, reg: 8 },
    settings: [
      { setting: 1, bbProb: 259.0, rbProb: 354.2, totalProb: 149.6, grapeProb: 6.25, grapeProbAlt: 6.23, soloRbProb: 472.3, payoutRate: 97.2 },
      { setting: 2, bbProb: 258.0, rbProb: 332.7, totalProb: 145.3, grapeProb: 6.2, grapeProbAlt: null, soloRbProb: 447.4, payoutRate: 98.2 },
      { setting: 3, bbProb: 257.0, rbProb: 306.2, totalProb: 139.7, grapeProb: 6.15, grapeProbAlt: 6.14, soloRbProb: 417.8, payoutRate: 99.4 },
      { setting: 4, bbProb: 254.0, rbProb: 268.6, totalProb: 130.5, grapeProb: 6.07, grapeProbAlt: null, soloRbProb: 362.9, payoutRate: 101.6 },
      { setting: 5, bbProb: 247.3, rbProb: 247.3, totalProb: 123.7, grapeProb: 6.0, grapeProbAlt: null, soloRbProb: 331.0, payoutRate: 103.8 },
      { setting: 6, bbProb: 234.9, rbProb: 234.9, totalProb: 117.4, grapeProb: 5.92, grapeProbAlt: 5.94, soloRbProb: 317.2, payoutRate: 106.5 },
    ],
    sources: [
      'https://juggler7.com/gogo3/kaiseki.html',
      'https://juggler7.com/gogo3/settei-hanbetu.html',
      'https://grape-reverse.com/gogo3',
      'https://www.nankaikoya.jp/gogojuggler3/',
      'https://1geki.jp/slot/s_gogojuggler3/',
      'https://1geki.jp/slot/s_gogojuggler3/4/',
    ],
  },
  {
    id: 'funky-juggler-2',
    name: 'ファンキージャグラー2',
    maker: '北電子',
    releaseYear: 2021,
    spec: '6号機',
    dataStatus: 'provisional',
    notes:
      '単独REGの設定差が約1.8倍(1/630.2→1/352.3)と大きい。ぶどうは設定1〜6の段階差型。',
    bonusGames: { big: 20, reg: 8 },
    settings: [
      { setting: 1, bbProb: 266.4, rbProb: 439.8, totalProb: 165.9, grapeProb: 5.94, grapeProbAlt: 5.93, soloRbProb: 630.15, payoutRate: 97.0 },
      { setting: 2, bbProb: 259.0, rbProb: 407.1, totalProb: 158.3, grapeProb: 5.92, grapeProbAlt: 5.9, soloRbProb: 585.14, payoutRate: 98.5 },
      { setting: 3, bbProb: 256.0, rbProb: 366.1, totalProb: 150.7, grapeProb: 5.88, grapeProbAlt: 5.83, soloRbProb: 512.0, payoutRate: 99.8 },
      { setting: 4, bbProb: 249.2, rbProb: 322.8, totalProb: 140.6, grapeProb: 5.83, grapeProbAlt: 5.81, soloRbProb: 448.88, payoutRate: 102.0 },
      { setting: 5, bbProb: 240.1, rbProb: 299.3, totalProb: 133.2, grapeProb: 5.76, grapeProbAlt: 5.75, soloRbProb: 404.54, payoutRate: 104.3 },
      { setting: 6, bbProb: 219.9, rbProb: 262.1, totalProb: 119.6, grapeProb: 5.67, grapeProbAlt: null, soloRbProb: 352.34, payoutRate: 109.0 },
    ],
    sources: [
      'https://p-town.dmm.com/specials/2467',
      'https://www.nankaikoya.jp/funkyjuggler2/',
      'https://akirameruna.com/funky2-jug',
      'https://jug123.com/funky2spec/',
      'https://www.slopachi-quest.com/article/fanky-jagra-2-settei/',
      'https://jugglertopics.jp/fj2/299/',
    ],
  },
  {
    id: 'im-juggler-ex',
    name: 'アイムジャグラーEX',
    maker: '北電子',
    releaseYear: 2020,
    spec: '6号機',
    dataStatus: 'verified',
    notes:
      'ぶどうは設定1〜5が共通で設定6のみ優遇。設定1〜5の間ではぶどうの尤度が完全に同一になるため、ぶどうは「設定6か否か」の判別にしか使えない。単独REGも設定5と6が同値。2026年末前後に認定期限を迎え、ネオアイムジャグラーEXへの入替が進んでいる。',
    bonusGames: { big: 21, reg: 8 },
    settings: [
      { setting: 1, bbProb: 273.1, rbProb: 439.8, totalProb: 168.5, grapeProb: 6.02, grapeProbAlt: null, soloRbProb: 630.15, payoutRate: 97.0 },
      { setting: 2, bbProb: 269.7, rbProb: 399.6, totalProb: 161.0, grapeProb: 6.02, grapeProbAlt: null, soloRbProb: 574.88, payoutRate: 98.0 },
      { setting: 3, bbProb: 269.7, rbProb: 331.0, totalProb: 148.6, grapeProb: 6.02, grapeProbAlt: null, soloRbProb: 474.9, payoutRate: 99.5 },
      { setting: 4, bbProb: 259.0, rbProb: 315.1, totalProb: 142.2, grapeProb: 6.02, grapeProbAlt: null, soloRbProb: 448.88, payoutRate: 101.1 },
      { setting: 5, bbProb: 259.0, rbProb: 255.0, totalProb: 128.5, grapeProb: 6.02, grapeProbAlt: null, soloRbProb: 364.09, payoutRate: 103.3 },
      { setting: 6, bbProb: 255.0, rbProb: 255.0, totalProb: 127.5, grapeProb: 5.78, grapeProbAlt: null, soloRbProb: 364.09, payoutRate: 105.5 },
    ],
    sources: [
      'https://juggler7.com/aimex-6gouki/kaiseki.html',
      'https://juggler7.com/aimex-6gouki/settei-hanbetu.html',
      'https://www.nankaikoya.jp/aimujuggler-6gouki/',
      'https://p-town.dmm.com/machines/3626',
      'https://p-town.dmm.com/specials/2552',
      'https://1geki.jp/slot/s_ij_ex_6/',
    ],
  },
  {
    id: 'happy-juggler-v3',
    name: 'ハッピージャグラーVⅢ',
    maker: '北電子',
    releaseYear: 2022,
    spec: '6号機',
    dataStatus: 'provisional',
    notes:
      'REG確率の設定差が約1.55倍で最有力の判別要素。ぶどうは解析値が4系統に分裂しており全機種中もっとも不確実(設定6で最大0.07の幅)。チェリーは高設定ほど確率が悪くなる逆設定差を持つ。単独REGは信頼できる数値が見つからず未収録。',
    bonusGames: { big: 20, reg: 8 },
    settings: [
      { setting: 1, bbProb: 273.1, rbProb: 397.2, totalProb: 161.8, grapeProb: 6.07, grapeProbAlt: 6.04, soloRbProb: null, payoutRate: 97.0 },
      { setting: 2, bbProb: 270.8, rbProb: 362.1, totalProb: 154.9, grapeProb: 6.03, grapeProbAlt: 6.01, soloRbProb: null, payoutRate: 98.1 },
      { setting: 3, bbProb: 263.2, rbProb: 332.7, totalProb: 146.9, grapeProb: 6.0, grapeProbAlt: 5.98, soloRbProb: null, payoutRate: 99.9 },
      { setting: 4, bbProb: 254.0, rbProb: 300.6, totalProb: 137.7, grapeProb: 5.86, grapeProbAlt: null, soloRbProb: null, payoutRate: 102.9 },
      { setting: 5, bbProb: 239.2, rbProb: 273.1, totalProb: 127.5, grapeProb: 5.84, grapeProbAlt: null, soloRbProb: null, payoutRate: 105.8 },
      { setting: 6, bbProb: 226.0, rbProb: 256.0, totalProb: 120.0, grapeProb: 5.8, grapeProbAlt: 5.82, soloRbProb: null, payoutRate: 108.4 },
    ],
    sources: [
      'https://chonborista.com/slot/kitadenshi/173776/',
      'https://imakati.jp/happy-juggler-v3',
      'https://juggler7.com/happy3/kaiseki.html',
      'https://jugglersnet.com/analysis/budo-6',
      'https://www.nankaikoya.jp/juggler-budou/',
      'https://grape-reverse.com/happyv3',
    ],
  },
  {
    id: 'ultra-miracle-juggler',
    name: 'ウルトラミラクルジャグラー',
    maker: '北電子',
    releaseYear: 2024,
    spec: '6.5号機',
    dataStatus: 'verified',
    notes:
      'ぶどうは設定1〜4が全て同一(1/5.93)で、差が付くのは設定5と6のみ。設定1と6の分母差もわずか0.12で6号機ジャグラー中最小級のため、ぶどうを主指標にできない。単独REG(1/596→1/380、約1.57倍)を判別の主軸に据えること。',
    bonusGames: { big: 20, reg: 8 },
    settings: [
      { setting: 1, bbProb: 267.5, rbProb: 425.6, totalProb: 164.3, grapeProb: 5.93, grapeProbAlt: null, soloRbProb: 596.0, payoutRate: 97.0 },
      { setting: 2, bbProb: 261.1, rbProb: 402.1, totalProb: 158.3, grapeProb: 5.93, grapeProbAlt: null, soloRbProb: 546.0, payoutRate: 98.1 },
      { setting: 3, bbProb: 256.0, rbProb: 350.5, totalProb: 147.9, grapeProb: 5.93, grapeProbAlt: null, soloRbProb: 490.0, payoutRate: 99.8 },
      { setting: 4, bbProb: 242.7, rbProb: 322.8, totalProb: 138.6, grapeProb: 5.93, grapeProbAlt: null, soloRbProb: 436.0, payoutRate: 102.1 },
      { setting: 5, bbProb: 233.2, rbProb: 297.9, totalProb: 130.8, grapeProb: 5.87, grapeProbAlt: null, soloRbProb: 416.0, payoutRate: 104.5 },
      { setting: 6, bbProb: 216.3, rbProb: 277.7, totalProb: 121.6, grapeProb: 5.81, grapeProbAlt: null, soloRbProb: 380.0, payoutRate: 108.1 },
    ],
    sources: [
      'https://www.nankaikoya.jp/ultra-miracle-juggler/',
      'https://juggler7.com/ultramiracle/settei-hanbetu.html',
      'https://jugglersnet.com/analysis/ultra-miracle-juggler',
      'https://jugglersnet.com/analysis/budo-6',
      'https://www.nankaikoya.jp/juggler-budou/',
      'https://1geki.jp/slot/s_ulmira_juggler/0/',
    ],
  },
  {
    id: 'mr-juggler',
    name: 'ミスタージャグラー',
    maker: '北電子',
    releaseYear: 2024,
    spec: '6.5号機',
    dataStatus: 'provisional',
    notes:
      '設定6がBB=RB=1/237.4のBR比1:1になり、BR比が設定1の1.4:1から単調変化するため強力な判別要素になる。ぶどうは2系統の解析値が全設定で一律に約0.15ずれており、刻み幅は一致するため集計基準の違いと思われる。単独REGは設定1(1/517)と設定6(1/299)しか判明しておらず、尤度が偏るため未収録。',
    bonusGames: { big: 20, reg: 8 },
    settings: [
      { setting: 1, bbProb: 268.6, rbProb: 374.5, totalProb: 156.4, grapeProb: 6.29, grapeProbAlt: 6.13, soloRbProb: null, payoutRate: 97.0 },
      { setting: 2, bbProb: 267.5, rbProb: 354.2, totalProb: 152.4, grapeProb: 6.22, grapeProbAlt: 6.07, soloRbProb: null, payoutRate: 98.0 },
      { setting: 3, bbProb: 260.1, rbProb: 331.0, totalProb: 145.6, grapeProb: 6.15, grapeProbAlt: 6.01, soloRbProb: null, payoutRate: 99.8 },
      { setting: 4, bbProb: 249.2, rbProb: 291.3, totalProb: 134.3, grapeProb: 6.09, grapeProbAlt: 5.95, soloRbProb: null, payoutRate: 102.7 },
      { setting: 5, bbProb: 240.9, rbProb: 257.0, totalProb: 124.4, grapeProb: 6.02, grapeProbAlt: 5.88, soloRbProb: null, payoutRate: 105.5 },
      { setting: 6, bbProb: 237.4, rbProb: 237.4, totalProb: 118.7, grapeProb: 5.96, grapeProbAlt: 5.82, soloRbProb: null, payoutRate: 107.3 },
    ],
    sources: [
      'https://chonborista.com/slot/kitadenshi/214160/',
      'https://www.nankaikoya.jp/mrjuggler/',
      'https://juggler7.com/mrjuggler/settei-hanbetu.html',
      'https://www.nankaikoya.jp/juggler-budou/',
      'https://jugglersnet.com/analysis/budo-6',
      'https://1geki.jp/slot/s_mrjuggler/0/',
    ],
  },
  {
    id: 'juggler-girls-ss',
    name: 'ジャグラーガールズSS',
    maker: '北電子',
    releaseYear: 2024,
    spec: '6号機',
    dataStatus: 'provisional',
    notes:
      'REG確率の設定差(約1.51倍)がBIG(約1.21倍)より大きく、REGが第一判別要素。ぶどうは設定1〜4が共通なうえ設定1と6の差も約2.6%と小さく、判別力は弱い。',
    bonusGames: { big: 20, reg: 8 },
    settings: [
      { setting: 1, bbProb: 273.1, rbProb: 381.0, totalProb: 159.1, grapeProb: 5.98, grapeProbAlt: null, soloRbProb: 524.0, payoutRate: 97.0 },
      { setting: 2, bbProb: 270.8, rbProb: 350.5, totalProb: 152.8, grapeProb: 5.98, grapeProbAlt: null, soloRbProb: 485.0, payoutRate: 97.9 },
      { setting: 3, bbProb: 260.1, rbProb: 316.6, totalProb: 142.8, grapeProb: 5.98, grapeProbAlt: null, soloRbProb: 440.0, payoutRate: 99.9 },
      { setting: 4, bbProb: 250.1, rbProb: 281.3, totalProb: 132.4, grapeProb: 5.98, grapeProbAlt: null, soloRbProb: 399.0, payoutRate: 102.1 },
      { setting: 5, bbProb: 243.6, rbProb: 270.8, totalProb: 128.3, grapeProb: 5.88, grapeProbAlt: null, soloRbProb: 385.0, payoutRate: 104.0 },
      { setting: 6, bbProb: 226.0, rbProb: 252.1, totalProb: 119.2, grapeProb: 5.83, grapeProbAlt: null, soloRbProb: 359.0, payoutRate: 107.5 },
    ],
    sources: [
      'https://www.p-world.co.jp/machine/database/10009',
      'https://pachiseven.jp/machines/6903/cutout/4',
      'https://jugjug.net/jugglergirls_ss',
      'https://www.nankaikoya.jp/jugglergirls-ss/',
      'https://kenslo65536.com/kaiseki/juggler-s-girls.html',
      'https://jugcheckneo.link/juggler-girls-ss/',
    ],
  },
]

/** IDから機種マスタを引く */
export function findMachine(id: string): MachineSpec | undefined {
  return MACHINES.find((m) => m.id === id)
}

/** 暫定値を含む機種が存在するか(UIの注意喚起に使う) */
export function hasProvisionalData(): boolean {
  return MACHINES.some((m) => m.dataStatus === 'provisional')
}
