import { useEffect } from "react";

export function useEnterIsClick(elementId: string) {
  useEffect(() => {
    const element = document.getElementById(elementId);
    if (element) {
      element.addEventListener("keypress", function (event) {
        // If the user presses the "Enter" key on the keyboard
        if (event.key === "Enter") {
          // Cancel the default action, if needed
          event.preventDefault();
          // Trigger the button element with a click
          element?.click();
        }
      });
    }
  }, [elementId]);
}

export default useEnterIsClick;
