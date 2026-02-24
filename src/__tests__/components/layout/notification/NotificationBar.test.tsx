import { render, screen} from "@testing-library/react"
import NotificationBar from "@components/notification/NotificationBar"
import { getPublicEnv } from "src/util/env";

// Mockataan getPublicEnv
jest.mock("src/util/env", () => ({
  getPublicEnv: jest.fn(),
}));

describe("NotificationBar component", () => {
  const mockedGetEnv = getPublicEnv as jest.Mock;

  beforeEach(() => {
    mockedGetEnv.mockReset();
  });

  it("renders ENVIRONMENT and VERSION correctly with normal values", () => {
    mockedGetEnv.mockImplementation((key: string) => {
      if (key === "ENVIRONMENT") return "test-env";
      if (key === "VERSION") return "1.2.3";
    });

    render(<NotificationBar />);

    expect(screen.getByText(/^YMPÄRISTÖ:/).textContent).toBe("YMPÄRISTÖ: test-env ");
    expect(screen.getByText(/^VERSIO:/).textContent).toBe("VERSIO: 1.2.3 ");
  });

  it("renders undefined for value for if env variables are undefined", () => {
    mockedGetEnv.mockReturnValue(undefined);

    render(<NotificationBar />);

    expect(screen.getByText(/^YMPÄRISTÖ:/).textContent).toBe("YMPÄRISTÖ:  ");
    expect(screen.getByText(/^VERSIO:/).textContent).toBe("VERSIO:  ");
  });

  it("renders dynamic environment values correctly", () => {
    mockedGetEnv.mockImplementation((key: string) => {
      if (key === "ENVIRONMENT") return "feature";
      if (key === "VERSION") return "9.9.9";
    });

    render(<NotificationBar />);

    expect(screen.getByText(/^YMPÄRISTÖ:/).textContent).toBe("YMPÄRISTÖ: feature ");
    expect(screen.getByText(/^VERSIO:/).textContent).toBe("VERSIO: 9.9.9 ");
  });
});
