import {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  formatError,
  safeAsync,
} from "@/lib/error-handler";

describe("Error Handler", () => {
  describe("Custom Error Classes", () => {
    it("should create AppError with correct properties", () => {
      const error = new AppError("Test error", 500, "TEST_CODE");

      expect(error.message).toBe("Test error");
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe("TEST_CODE");
      expect(error.name).toBe("AppError");
    });

    it("should create ValidationError", () => {
      const error = new ValidationError("Invalid input");

      expect(error.message).toBe("Invalid input");
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe("VALIDATION_ERROR");
    });

    it("should create AuthenticationError", () => {
      const error = new AuthenticationError();

      expect(error.statusCode).toBe(401);
      expect(error.code).toBe("AUTHENTICATION_ERROR");
    });

    it("should create AuthorizationError", () => {
      const error = new AuthorizationError();

      expect(error.statusCode).toBe(403);
      expect(error.code).toBe("AUTHORIZATION_ERROR");
    });

    it("should create NotFoundError", () => {
      const error = new NotFoundError();

      expect(error.statusCode).toBe(404);
      expect(error.code).toBe("NOT_FOUND");
    });
  });

  describe("formatError", () => {
    it("should format AppError correctly", () => {
      const error = new ValidationError("Invalid data");
      const formatted = formatError(error);

      expect(formatted).toEqual({
        message: "Invalid data",
        code: "VALIDATION_ERROR",
        statusCode: 400,
      });
    });

    it("should format generic Error", () => {
      const error = new Error("Something went wrong");
      const formatted = formatError(error);

      expect(formatted).toEqual({
        message: "Something went wrong",
        code: "INTERNAL_ERROR",
        statusCode: 500,
      });
    });

    it("should handle unknown errors", () => {
      const error = "string error";
      const formatted = formatError(error);

      expect(formatted).toEqual({
        message: "Тодорхойгүй алдаа гарлаа",
        code: "UNKNOWN_ERROR",
        statusCode: 500,
      });
    });
  });

  describe("safeAsync", () => {
    it("should return data on successful promise", async () => {
      const promise = Promise.resolve("success");
      const [error, data] = await safeAsync(promise);

      expect(error).toBeNull();
      expect(data).toBe("success");
    });

    it("should return error on failed promise", async () => {
      const promise = Promise.reject(new Error("Failed"));
      const [error, data] = await safeAsync(promise);

      expect(error).toBeInstanceOf(Error);
      expect(error?.message).toBe("Failed");
      expect(data).toBeNull();
    });
  });
});
