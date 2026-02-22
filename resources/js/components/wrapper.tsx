const Wrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <main className="min-h-screen bg-slate-100 bg-linear-to-b from-slate-50 to-slate-100 px-4 pt-[40vh] pb-8">
      <div className="mx-auto w-full max-w-md">
        {children}
      </div>
    </main>
  );
};

export default Wrapper;
