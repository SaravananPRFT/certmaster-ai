import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
import LoginPage from "@/pages/LoginPage";
import { AuthProvider } from "@/context/auth-context";
import { ThemeProvider } from "@/context/theme-context";

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    <ThemeProvider>
      <AuthProvider>{children}</AuthProvider>
    </ThemeProvider>
  </BrowserRouter>
);

describe("LoginPage", () => {
  it("renders sign in form", () => {
    render(<LoginPage />, { wrapper: Wrapper });
    expect(screen.getByText("Welcome back")).toBeInTheDocument();
  });
});
