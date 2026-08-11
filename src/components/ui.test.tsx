// @vitest-environment jsdom
/**
 * 入力欄の挙動テスト
 *
 * 実機のiPhoneで「あ」と打つと「ああ」になる不具合が出た。
 * 入力のたびにIndexedDBへ書き込み、非同期で戻ってきた値を value に流していたため、
 * 日本語入力の変換確定と再描画が重なって文字が二重に入っていた。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { NumberInput, TextInput } from './ui'

afterEach(cleanup)

describe('TextInput の日本語入力', () => {
  it('変換中は保存せず、確定時に1回だけ保存する', () => {
    const onChange = vi.fn()
    render(<TextInput value="" onChange={onChange} />)
    const input = screen.getByRole('textbox')

    // 「あ」を入力して変換確定するまでの流れ
    fireEvent.compositionStart(input)
    fireEvent.change(input, { target: { value: 'あ' } })
    expect(onChange, '変換中に保存すると未確定文字が書き込まれる').not.toHaveBeenCalled()

    fireEvent.compositionEnd(input, { target: { value: 'あ' } })
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith('あ')
  })

  it('確定後に外部の値が遅れて戻ってきても、文字が重複しない', () => {
    const onChange = vi.fn()
    const { rerender } = render(<TextInput value="" onChange={onChange} />)
    const input = screen.getByRole('textbox') as HTMLInputElement

    fireEvent.compositionStart(input)
    fireEvent.change(input, { target: { value: 'あ' } })
    fireEvent.compositionEnd(input, { target: { value: 'あ' } })

    // DBへの書き込みが往復する間、親はまだ古い値を渡してくる
    rerender(<TextInput value="" onChange={onChange} />)
    expect(input.value).toBe('あ')

    // 遅れて反映されても表示は変わらない
    rerender(<TextInput value="あ" onChange={onChange} />)
    expect(input.value).toBe('あ')
  })

  it('変換を伴わない入力はそのまま保存する', () => {
    const onChange = vi.fn()
    render(<TextInput value="" onChange={onChange} />)

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'A' } })
    expect(onChange).toHaveBeenCalledWith('A')
  })

  it('フォーカスが外れたら外部の値に追従を戻す', () => {
    const onChange = vi.fn()
    const { rerender } = render(<TextInput value="旧" onChange={onChange} />)
    const input = screen.getByRole('textbox') as HTMLInputElement

    fireEvent.change(input, { target: { value: '新' } })
    fireEvent.blur(input)
    rerender(<TextInput value="外部で変更" onChange={onChange} />)

    expect(input.value).toBe('外部で変更')
  })
})

describe('NumberInput', () => {
  it('入力中は古い値で上書きされない', () => {
    const onChange = vi.fn()
    const { rerender } = render(<NumberInput value={0} onChange={onChange} />)
    const input = screen.getByRole('textbox') as HTMLInputElement

    fireEvent.change(input, { target: { value: '15000' } })
    expect(onChange).toHaveBeenCalledWith(15000)

    // 書き込みの往復中に古い値が来ても打った内容は消えない
    rerender(<NumberInput value={0} onChange={onChange} />)
    expect(input.value).toBe('15000')
  })

  it('全角数字を半角に直して解釈する(iPhoneの日本語キーボード対策)', () => {
    const onChange = vi.fn()
    render(<NumberInput value={0} onChange={onChange} />)

    fireEvent.change(screen.getByRole('textbox'), { target: { value: '１５０００' } })
    expect(onChange).toHaveBeenCalledWith(15000)
  })

  it('区切り文字や単位が混ざっても数字だけを拾う', () => {
    const onChange = vi.fn()
    render(<NumberInput value={0} onChange={onChange} />)

    fireEvent.change(screen.getByRole('textbox'), { target: { value: '1,２00円' } })
    expect(onChange).toHaveBeenCalledWith(1200)
  })

  it('空欄はnull許容なら null、そうでなければ 0 にする', () => {
    const nullable = vi.fn()
    const plain = vi.fn()
    render(<NumberInput value={5} onChange={nullable} nullable />)
    render(<NumberInput value={5} onChange={plain} />)
    const [first, second] = screen.getAllByRole('textbox')

    fireEvent.change(first, { target: { value: '' } })
    fireEvent.change(second, { target: { value: '' } })

    expect(nullable).toHaveBeenCalledWith(null)
    expect(plain).toHaveBeenCalledWith(0)
  })

  it('マイナスを許可していなければ負数にならない', () => {
    const onChange = vi.fn()
    render(<NumberInput value={0} onChange={onChange} />)

    fireEvent.change(screen.getByRole('textbox'), { target: { value: '-500' } })
    expect(onChange).toHaveBeenCalledWith(0)
  })

  it('差枚数のようにマイナスを許可した項目は負数を保存する', () => {
    const onChange = vi.fn()
    render(<NumberInput value={0} onChange={onChange} allowNegative />)

    fireEvent.change(screen.getByRole('textbox'), { target: { value: '-500' } })
    expect(onChange).toHaveBeenCalledWith(-500)
  })

  it('全角のマイナス記号も負数として扱う', () => {
    const onChange = vi.fn()
    render(<NumberInput value={0} onChange={onChange} allowNegative />)

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'ー５００' } })
    expect(onChange).toHaveBeenCalledWith(-500)
  })
})
