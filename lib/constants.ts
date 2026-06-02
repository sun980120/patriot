export const CLUB_NAME = '패트리어트';
export const START_YEAR = 2026;
export const HIDDEN_PROFILE_EMAILS = ['woosung9801@gmail.com'] as const;

export const ROLE_META = {
  정회원: { fee: 20000, badge: 'bg-brand-100 text-brand-900' },
  준회원: { fee: 10000, badge: 'bg-amber-100 text-amber-900' },
  간사: { fee: 0, badge: 'bg-emerald-100 text-emerald-900' },
} as const;

export function getVisibleMonths(year: number) {
  return year === START_YEAR ? [5, 6, 7, 8, 9, 10, 11, 12] : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
}

export const CLUB_BANK = {
  bankName: '수협은행',
  accountNumber: '0010-3508-4788',
  accountHolder: '박형주',
};
