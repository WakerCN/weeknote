/**
 * 验证码输入组件
 * 6位数字验证码输入框，支持自动聚焦、粘贴等功能
 */

import { useRef, useState, useEffect, KeyboardEvent, ClipboardEvent } from 'react';

interface CodeInputProps {
  /** 验证码长度，默认6 */
  length?: number;
  /** 当前值 */
  value: string;
  /** 值变化回调 */
  onChange: (value: string) => void;
  /** 输入完成回调 */
  onComplete?: (code: string) => void;
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否显示错误状态 */
  error?: boolean;
  /** 是否自动聚焦 */
  autoFocus?: boolean;
}

export default function CodeInput({
  length = 6,
  value,
  onChange,
  onComplete,
  disabled = false,
  error = false,
  autoFocus = true,
}: CodeInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  // 将字符串值转换为数组
  const valueArray = value.split('').slice(0, length);
  while (valueArray.length < length) {
    valueArray.push('');
  }

  // 自动聚焦第一个输入框
  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus]);

  // 输入完成时触发回调
  useEffect(() => {
    if (value.length === length && onComplete) {
      onComplete(value);
    }
  }, [value, length, onComplete]);

  /**
   * 处理输入
   */
  const handleInput = (index: number, inputValue: string) => {
    // 只允许数字
    const digit = inputValue.replace(/\D/g, '').slice(-1);
    if (!digit) return;

    const newValue = valueArray.slice();
    newValue[index] = digit;
    onChange(newValue.join(''));

    // 自动聚焦下一个输入框
    if (index < length - 1 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  /**
   * 处理键盘事件
   */
  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const newValue = valueArray.slice();

      if (valueArray[index]) {
        // 当前格有值，删除当前格
        newValue[index] = '';
        onChange(newValue.join(''));
      } else if (index > 0) {
        // 当前格为空，删除上一格并聚焦
        newValue[index - 1] = '';
        onChange(newValue.join(''));
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  /**
   * 处理粘贴
   */
  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    const digits = pastedData.replace(/\D/g, '').slice(0, length);

    if (digits) {
      onChange(digits);
      // 聚焦到最后一个填充的位置或最后一个输入框
      const focusIndex = Math.min(digits.length, length - 1);
      inputRefs.current[focusIndex]?.focus();
    }
  };

  /**
   * 处理聚焦
   */
  const handleFocus = (index: number) => {
    setFocusedIndex(index);
    // 选中当前输入框的内容
    inputRefs.current[index]?.select();
  };

  /**
   * 处理失焦
   */
  const handleBlur = () => {
    setFocusedIndex(-1);
  };

  return (
    <div className="flex gap-2 justify-center">
      {valueArray.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={(e) => handleInput(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onFocus={() => handleFocus(index)}
          onBlur={handleBlur}
          disabled={disabled}
          className={`
            w-12 h-14 text-center text-2xl font-bold
            bg-[#0d1117] border rounded-lg
            text-[#f0f6fc]
            transition-all duration-200
            focus:outline-none focus:ring-2
            disabled:opacity-50 disabled:cursor-not-allowed
            ${
              error
                ? 'border-red-500 focus:ring-red-500/50'
                : focusedIndex === index
                  ? 'border-[#1f6feb] ring-2 ring-[#1f6feb]/50'
                  : 'border-[#30363d] focus:border-[#1f6feb] focus:ring-[#1f6feb]/50'
            }
          `}
          aria-label={`验证码第${index + 1}位`}
        />
      ))}
    </div>
  );
}
