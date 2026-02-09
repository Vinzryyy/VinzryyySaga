import { useState } from "react";

function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="fixed z-50 w-full bg-extraLight md:bg-transparent">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between p-4 md:px-4 md:py-8">
        
        {/* Logo */}
        <div className="flex items-center">
          <img
            src="/public/logo.png"
            alt="logo"
            className="w-[75px]"
          />
        </div>

        {/* Menu Button (Mobile) */}
        <button
          className="text-2xl md:hidden"
          onClick={() => setOpen(!open)}
        >
          <i className={open ? "ri-close-line" : "ri-menu-3-line"}></i>
        </button>

        {/* Nav Links */}
        <ul
          className={`
            absolute left-0 top-full w-full flex flex-col items-center gap-8
            bg-extraLight py-8 text-textLight transition-transform duration-500
            md:static md:w-auto md:flex-row md:bg-transparent md:py-0
            ${open ? "translate-y-0" : "-translate-y-[200%] md:translate-y-0"}
          `}
          onClick={() => setOpen(false)}
        >
          {["home", "about", "portfolio", "blog", "contact"].map((item) => (
            <li key={item}>
              <a
                href={`#${item}`}
                className="font-medium hover:text-textDark"
              >
                {item.charAt(0).toUpperCase() + item.slice(1)}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}

export default Navbar;
