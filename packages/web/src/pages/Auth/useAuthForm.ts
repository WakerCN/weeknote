/**
 * 认证表单状态管理 Hook
 * 统一管理所有表单字段和错误状态
 */
import { useState, useEffect, useCallback } from 'react';

export interface AuthFormData {
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
  code: string;
  rememberMe: boolean;
}

export interface AuthFormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  name?: string;
  code?: string;
}

export interface UseAuthFormReturn {
  /** 表单数据 */
  formData: AuthFormData;
  /** 表单错误 */
  errors: AuthFormErrors;
  /** 设置单个字段值 */
  setField: (field: keyof AuthFormData, value: any) => void;
  /** 批量设置字段值 */
  setFields: (fields: Partial<AuthFormData>) => void;
  /** 设置单个字段错误 */
  setError: (field: keyof AuthFormErrors, error: string) => void;
  /** 清除所有错误 */
  clearErrors: () => void;
  /** 清除单个字段 */
  clearField: (field: keyof AuthFormData) => void;
  /** 重置表单 */
  reset: () => void;
}

const REMEMBERED_EMAIL_KEY = 'rememberedEmail';

/**
 * 认证表单状态管理 Hook
 */
export function useAuthForm(): UseAuthFormReturn {
  const [formData, setFormData] = useState<AuthFormData>({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    code: '',
    rememberMe: false,
  });

  const [errors, setErrors] = useState<AuthFormErrors>({});

  // 初始化时读取记住的邮箱
  useEffect(() => {
    const savedEmail = localStorage.getItem(REMEMBERED_EMAIL_KEY);
    if (savedEmail) {
      setFormData((prev) => ({
        ...prev,
        email: savedEmail,
        rememberMe: true,
      }));
    }
  }, []);

  const setField = useCallback(
    (field: keyof AuthFormData, value: any) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      // 清除对应字段的错误
      if (errors[field as keyof AuthFormErrors]) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next[field as keyof AuthFormErrors];
          return next;
        });
      }
    },
    [errors]
  );

  const setFields = useCallback((fields: Partial<AuthFormData>) => {
    setFormData((prev) => ({ ...prev, ...fields }));
  }, []);

  const setError = useCallback((field: keyof AuthFormErrors, error: string) => {
    setErrors((prev) => ({ ...prev, [field]: error }));
  }, []);

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  const clearField = useCallback((field: keyof AuthFormData) => {
    setFormData((prev) => ({
      ...prev,
      [field]: field === 'rememberMe' ? false : '',
    }));
  }, []);

  const reset = useCallback(() => {
    setFormData({
      email: '',
      password: '',
      confirmPassword: '',
      name: '',
      code: '',
      rememberMe: false,
    });
    setErrors({});
  }, []);

  return {
    formData,
    errors,
    setField,
    setFields,
    setError,
    clearErrors,
    clearField,
    reset,
  };
}
