declare module "#auth-utils" {
  interface User {
    id: string;
    email: string;
    name: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
    role: "admin" | "developer";
  }

  interface UserSession {}
}

export {};
