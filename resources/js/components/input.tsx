const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => {
  return (
    <input
      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 shadow-sm transition focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
      {...props}
    />
  );
};

export default Input;
