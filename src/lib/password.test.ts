import { isStrongPassword } from "./password";

describe("isStrongPassword", () => {
  it("accepts a password meeting every requirement", () => {
    expect(isStrongPassword("Secure1!")).toBe(true);
  });

  it.each(["short1!", "lowercase1!", "UPPERCASE1!", "NoNumber!", "NoSpecial1"]) (
    "rejects %s when a requirement is missing",
    password => {
      expect(isStrongPassword(password)).toBe(false);
    },
  );
});