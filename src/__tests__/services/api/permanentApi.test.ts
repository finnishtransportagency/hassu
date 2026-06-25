// Contains code generated or recommended by Amazon Q
import { stripCredentialsFromUrl } from "@services/api/permanentApi";

describe("stripCredentialsFromUrl", () => {
  it("should convert relative path to absolute URL using window.location.origin", () => {
    // jsdom default origin is "http://localhost"
    expect(stripCredentialsFromUrl("/graphql")).toBe("http://localhost/graphql");
    expect(stripCredentialsFromUrl("/yllapito/graphql")).toBe("http://localhost/yllapito/graphql");
  });

  it("should strip credentials from absolute URL", () => {
    expect(stripCredentialsFromUrl("https://user:pass@hassudev.testivaylapilvi.fi/graphql")).toBe(
      "https://hassudev.testivaylapilvi.fi/graphql"
    );
  });

  it("should return absolute URL unchanged if no credentials present", () => {
    expect(stripCredentialsFromUrl("https://hassudev.testivaylapilvi.fi/graphql")).toBe("https://hassudev.testivaylapilvi.fi/graphql");
  });

  it("should return invalid URL string as-is", () => {
    expect(stripCredentialsFromUrl("not-a-valid-url")).toBe("not-a-valid-url");
  });
});
