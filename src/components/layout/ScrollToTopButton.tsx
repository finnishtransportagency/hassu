import { throttle } from "lodash";
import React, { FunctionComponent, useEffect, useState } from "react";

const SCROLL_OFFSET = 200;
const ScrollToTopButton: FunctionComponent = () => {
  const [toTopEnabled, setToTopEnabled] = useState(false);

  useEffect(() => {
    const handleScroll = throttle(() => {
      setToTopEnabled(window.pageYOffset > SCROLL_OFFSET);
    }, 300);

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <button
      id="to-top-button"
      onClick={() => {
        window.scrollTo(0, 0);
      }}
      className={`fixed bottom-6 right-6 bg-primary text-white rounded p-4 ${!toTopEnabled ? "hidden" : ""}`}
    >
      To Top
    </button>
  );
};

export default ScrollToTopButton;
