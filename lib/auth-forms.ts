export function formatPhoneNumber(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  const areaLength = digits.startsWith('02') ? 2 : 3;
  if (digits.length <= areaLength) return digits;
  if (digits.length <= areaLength + 4) return `${digits.slice(0, areaLength)}-${digits.slice(areaLength)}`;
  return `${digits.slice(0, areaLength)}-${digits.slice(areaLength, -4)}-${digits.slice(-4)}`;
}

export function validateSignup(input: {
  fullName: string; username: string; phoneNumber: string; address: string;
  birthDate: string; password: string; passwordConfirmation: string;
}, today: string): { field: string; message: string } | null {
  for (const [field, label] of [['fullName', '이름'], ['username', '아이디'], ['phoneNumber', '전화번호'], ['birthDate', '생년월일'], ['password', '비밀번호']] as const) {
    if (!input[field].trim()) return { field, message: `${label}${field === 'fullName' || field === 'birthDate' ? '을' : '를'}${field === 'birthDate' ? ' 선택' : ' 입력'}해 주세요.` };
  }
  if (!input.address.trim()) return { field: 'address', message: '주소를 검색해 주세요.' };
  const date = new Date(`${input.birthDate}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.birthDate) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== input.birthDate || input.birthDate > today) {
    return { field: 'birthDate', message: '올바른 생년월일을 선택해 주세요.' };
  }
  if (input.password !== input.passwordConfirmation) return { field: 'passwordConfirmation', message: '비밀번호가 일치하지 않습니다.' };
  return null;
}
