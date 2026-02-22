import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <section className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-xl text-center">
        <p className="text-xs font-semibold tracking-[0.2em] text-slate-500 uppercase">
          Error 404
        </p>
        <h2 className="mt-2 text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-100">
          Page Not Found
        </h2>
        <p className="mt-4 text-sm md:text-base text-slate-600 dark:text-slate-300">
          The page you are looking for does not exist or may have been moved.
        </p>
        <Link
          to="/"
          className="inline-flex mt-8 items-center justify-center rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300 transition-colors"
        >
          Go To Dashboard
        </Link>
      </div>
    </section>
  );
}
