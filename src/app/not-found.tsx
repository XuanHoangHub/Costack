import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-slate-900 dark:bg-slate-950 dark:text-white">
      <div className="max-w-xl text-center">
        <p className="text-sm font-black uppercase tracking-[0.3em] text-blue-600">404</p>
        <h1 className="mt-3 text-4xl font-black">Trang này không tồn tại</h1>
        <p className="mt-4 text-sm leading-6 text-slate-500 dark:text-slate-400">Đường dẫn có thể đã thay đổi hoặc nội dung đã được di chuyển.</p>
        <Link href="/" className="mt-7 inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700">Quay về Apexa</Link>
      </div>
    </main>
  );
}
