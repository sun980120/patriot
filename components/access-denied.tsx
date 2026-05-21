export function AccessDenied({ title = '접근 권한이 없습니다.' }: { title?: string }) {
  return (
    <section className="rounded-[32px] border border-rose-200 bg-white/90 p-6 shadow-soft backdrop-blur">
      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-rose-600">Access</p>
      <h2 className="mt-2 text-3xl font-black text-slate-900">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-slate-600">이 페이지는 관리자만 접근할 수 있습니다. 관리자 계정으로 로그인했는지 확인해 주세요.</p>
    </section>
  );
}
