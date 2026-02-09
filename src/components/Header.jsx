function Header() {
  return (
    <header id="home" className="relative overflow-hidden">
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 items-center px-4 pt-32 md:grid-cols-2 md:pt-40">
        
        {/* Text Content */}
        <div className="pb-20 md:pb-0">
          <h1 className="font-header text-4xl font-extrabold text-textDark sm:text-5xl lg:text-6xl">
            Gallery <br /> of Photographs
          </h1>

          <h2 className="mt-4 font-header text-2xl font-semibold text-textDark">
            Make moments last forever
          </h2>
        </div>

        {/* Image */}
        <div className="relative hidden h-full md:block">
          <img
            src="/public/header.png"
            alt="header"
            className="absolute right-0 top-0 h-full object-cover"
          />
        </div>
      </div>
    </header>
  );
}

export default Header;
