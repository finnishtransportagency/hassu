import { render, screen } from "@testing-library/react";
import App from "./App";

test("Suunnitelman nimi input field visible", () => {
  render(<App />);
  const inputElement = screen.getByPlaceholderText(/Suunnitelman nimi/i);
  expect(inputElement).toBeInTheDocument();
});
