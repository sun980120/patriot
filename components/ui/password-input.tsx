'use client';

import { useState, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export function PasswordInput({ label = '비밀번호', className = '', ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { label?: string }) {
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeOff : Eye;
  const action = `${label} ${visible ? '숨기기' : '보기'}`;
  return <div className="relative min-w-0">
    <input {...props} type={visible ? 'text' : 'password'} className={`auth-input auth-password ${className}`} />
    <button type="button" disabled={props.disabled} onClick={() => setVisible(value => !value)} aria-label={action} title={action} aria-pressed={visible} className="absolute right-1 top-1 flex h-10 w-10 items-center justify-center rounded-md text-slate-500 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40"><Icon className="h-4 w-4" /></button>
  </div>;
}
