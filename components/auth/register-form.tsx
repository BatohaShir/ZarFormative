"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Phone,
  Mail,
  User,
  Lock,
  Eye,
  EyeOff,
  Building2,
  Briefcase,
} from "lucide-react";

interface RegisterFormProps {
  onSuccess: () => void;
  signUp: (
    email: string,
    password: string,
    metadata: Record<string, unknown>
  ) => Promise<{ error: string | null }>;
}

export function RegisterForm({ onSuccess, signUp }: RegisterFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  // Registration form state
  const [registerUserType, setRegisterUserType] = React.useState<"individual" | "company">(
    "individual"
  );
  const [regFirstName, setRegFirstName] = React.useState("");
  const [regLastName, setRegLastName] = React.useState("");
  const [regCompanyName, setRegCompanyName] = React.useState("");
  const [regRegistrationNumber, setRegRegistrationNumber] = React.useState("");
  const [regPhone, setRegPhone] = React.useState("");
  const [regEmail, setRegEmail] = React.useState("");
  const [regPassword, setRegPassword] = React.useState("");
  const [regConfirmPassword, setRegConfirmPassword] = React.useState("");
  const [regTermsAccepted, setRegTermsAccepted] = React.useState(false);
  const [regErrors, setRegErrors] = React.useState<Record<string, string>>({});

  const validateEmail = React.useCallback((email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }, []);

  const validatePhone = React.useCallback((phone: string): boolean => {
    const phoneRegex = /^[0-9]{8}$/;
    return phoneRegex.test(phone.replace(/\s/g, ""));
  }, []);

  const validateRegisterForm = React.useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (registerUserType === "individual") {
      if (!regFirstName.trim()) {
        newErrors.firstName = "Нэрээ оруулна уу";
      }
      if (!regLastName.trim()) {
        newErrors.lastName = "Овгоо оруулна уу";
      }
    } else {
      if (!regCompanyName.trim()) {
        newErrors.companyName = "Компанийн нэрийг оруулна уу";
      }
      if (!regRegistrationNumber.trim()) {
        newErrors.registrationNumber = "Регистрийн дугаарыг оруулна уу";
      }
    }

    if (!regPhone.trim()) {
      newErrors.phone = "Утасны дугаараа оруулна уу";
    } else if (!validatePhone(regPhone)) {
      newErrors.phone = "Утасны дугаар 8 оронтой байх ёстой";
    }

    if (!regEmail.trim()) {
      newErrors.email = "И-мэйл хаягаа оруулна уу";
    } else if (!validateEmail(regEmail)) {
      newErrors.email = "И-мэйл хаяг буруу байна";
    }

    if (!regPassword.trim()) {
      newErrors.password = "Нууц үгээ оруулна уу";
    } else if (regPassword.length < 6) {
      newErrors.password = "Нууц үг хамгийн багадаа 6 тэмдэгт байх ёстой";
    }

    if (!regConfirmPassword.trim()) {
      newErrors.confirmPassword = "Нууц үгээ давтан оруулна уу";
    } else if (regPassword !== regConfirmPassword) {
      newErrors.confirmPassword = "Нууц үг таарахгүй байна";
    }

    if (!regTermsAccepted) {
      newErrors.terms = "Үйлчилгээний нөхцлийг зөвшөөрнө үү";
    }

    setRegErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [
    registerUserType,
    regFirstName,
    regLastName,
    regCompanyName,
    regRegistrationNumber,
    regPhone,
    regEmail,
    regPassword,
    regConfirmPassword,
    regTermsAccepted,
    validateEmail,
    validatePhone,
  ]);

  const handleRegister = React.useCallback(async () => {
    if (!validateRegisterForm()) {
      return;
    }

    setIsSubmitting(true);
    setRegErrors({});

    try {
      const metadata =
        registerUserType === "individual"
          ? {
              first_name: regFirstName,
              last_name: regLastName,
              phone_number: regPhone,
              is_company: false,
            }
          : {
              company_name: regCompanyName,
              registration_number: regRegistrationNumber,
              phone_number: regPhone,
              is_company: true,
            };

      const { error } = await signUp(regEmail, regPassword, metadata);

      if (error) {
        setRegErrors({ general: error });
        return;
      }

      onSuccess();
    } finally {
      setIsSubmitting(false);
    }
  }, [
    validateRegisterForm,
    registerUserType,
    regFirstName,
    regLastName,
    regPhone,
    regCompanyName,
    regRegistrationNumber,
    regEmail,
    regPassword,
    signUp,
    onSuccess,
  ]);

  const clearRegError = React.useCallback((field: string) => {
    setRegErrors((prev) => {
      if (prev[field]) {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      }
      return prev;
    });
  }, []);

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* User Type Selection */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg">
        <button
          type="button"
          onClick={() => {
            setRegisterUserType("individual");
            setRegErrors({});
          }}
          className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs sm:text-sm font-medium transition-all ${
            registerUserType === "individual"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <User className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          Хувь хүн
        </button>
        <button
          type="button"
          onClick={() => {
            setRegisterUserType("company");
            setRegErrors({});
          }}
          className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs sm:text-sm font-medium transition-all ${
            registerUserType === "company"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Building2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          Байгууллага
        </button>
      </div>

      {/* Registration Form */}
      <div className="space-y-2 sm:space-y-3">
        {/* Individual fields */}
        {registerUserType === "individual" && (
          <>
            <div className="space-y-1">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                <Input
                  placeholder="Нэр"
                  className="pl-9 sm:pl-10 h-9 sm:h-10 text-sm"
                  value={regFirstName}
                  onChange={(e) => {
                    setRegFirstName(e.target.value);
                    clearRegError("firstName");
                  }}
                  aria-invalid={!!regErrors.firstName}
                />
              </div>
              {regErrors.firstName && (
                <p className="text-destructive text-xs pl-1">{regErrors.firstName}</p>
              )}
            </div>
            <div className="space-y-1">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                <Input
                  placeholder="Овог"
                  className="pl-9 sm:pl-10 h-9 sm:h-10 text-sm"
                  value={regLastName}
                  onChange={(e) => {
                    setRegLastName(e.target.value);
                    clearRegError("lastName");
                  }}
                  aria-invalid={!!regErrors.lastName}
                />
              </div>
              {regErrors.lastName && (
                <p className="text-destructive text-xs pl-1">{regErrors.lastName}</p>
              )}
            </div>
          </>
        )}

        {/* Company fields */}
        {registerUserType === "company" && (
          <>
            <div className="space-y-1">
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                <Input
                  placeholder="Компанийн нэр"
                  className="pl-9 sm:pl-10 h-9 sm:h-10 text-sm"
                  value={regCompanyName}
                  onChange={(e) => {
                    setRegCompanyName(e.target.value);
                    clearRegError("companyName");
                  }}
                  aria-invalid={!!regErrors.companyName}
                />
              </div>
              {regErrors.companyName && (
                <p className="text-destructive text-xs pl-1">{regErrors.companyName}</p>
              )}
            </div>
            <div className="space-y-1">
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                <Input
                  placeholder="Регистрийн дугаар"
                  className="pl-9 sm:pl-10 h-9 sm:h-10 text-sm"
                  value={regRegistrationNumber}
                  onChange={(e) => {
                    setRegRegistrationNumber(e.target.value);
                    clearRegError("registrationNumber");
                  }}
                  aria-invalid={!!regErrors.registrationNumber}
                />
              </div>
              {regErrors.registrationNumber && (
                <p className="text-destructive text-xs pl-1">{regErrors.registrationNumber}</p>
              )}
            </div>
          </>
        )}

        {/* Common fields */}
        <div className="space-y-1">
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
            <Input
              type="tel"
              placeholder="Утасны дугаар"
              className="pl-9 sm:pl-10 h-9 sm:h-10 text-sm"
              value={regPhone}
              onChange={(e) => {
                setRegPhone(e.target.value);
                clearRegError("phone");
              }}
              aria-invalid={!!regErrors.phone}
            />
          </div>
          {regErrors.phone && (
            <p className="text-destructive text-xs pl-1">{regErrors.phone}</p>
          )}
        </div>
        <div className="space-y-1">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
            <Input
              type="email"
              placeholder="Имэйл"
              className="pl-9 sm:pl-10 h-9 sm:h-10 text-sm"
              value={regEmail}
              onChange={(e) => {
                setRegEmail(e.target.value);
                clearRegError("email");
              }}
              aria-invalid={!!regErrors.email}
            />
          </div>
          {regErrors.email && (
            <p className="text-destructive text-xs pl-1">{regErrors.email}</p>
          )}
        </div>
        <div className="space-y-1">
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Нууц үг"
              className="pl-9 sm:pl-10 pr-9 sm:pr-10 h-9 sm:h-10 text-sm"
              value={regPassword}
              onChange={(e) => {
                setRegPassword(e.target.value);
                clearRegError("password");
              }}
              aria-invalid={!!regErrors.password}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? (
                <EyeOff className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              ) : (
                <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              )}
            </button>
          </div>
          {regErrors.password && (
            <p className="text-destructive text-xs pl-1">{regErrors.password}</p>
          )}
        </div>
        <div className="space-y-1">
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
            <Input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Нууц үг давтах"
              className="pl-9 sm:pl-10 pr-9 sm:pr-10 h-9 sm:h-10 text-sm"
              value={regConfirmPassword}
              onChange={(e) => {
                setRegConfirmPassword(e.target.value);
                clearRegError("confirmPassword");
              }}
              aria-invalid={!!regErrors.confirmPassword}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showConfirmPassword ? (
                <EyeOff className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              ) : (
                <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              )}
            </button>
          </div>
          {regErrors.confirmPassword && (
            <p className="text-destructive text-xs pl-1">{regErrors.confirmPassword}</p>
          )}
        </div>

        {/* Terms checkbox */}
        <div className="space-y-1">
          <div className="flex items-start gap-2">
            <Checkbox
              id="terms"
              checked={regTermsAccepted}
              onCheckedChange={(checked) => {
                setRegTermsAccepted(checked as boolean);
                clearRegError("terms");
              }}
              className="mt-0.5"
            />
            <Label
              htmlFor="terms"
              className="text-[10px] sm:text-xs font-normal leading-tight cursor-pointer text-muted-foreground"
            >
              <a href="#" className="text-primary hover:underline">
                Үйлчилгээний нөхцөл
              </a>{" "}
              болон{" "}
              <a href="#" className="text-primary hover:underline">
                нууцлалын бодлого
              </a>
              -г зөвшөөрч байна.
            </Label>
          </div>
          {regErrors.terms && (
            <p className="text-destructive text-xs pl-1">{regErrors.terms}</p>
          )}
        </div>

        {regErrors.general && (
          <p className="text-xs sm:text-sm text-red-500 text-center bg-red-50 dark:bg-red-950/30 p-2 rounded">
            {regErrors.general}
          </p>
        )}

        <Button
          className="w-full h-9 sm:h-10 text-sm"
          onClick={handleRegister}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Уншиж байна..." : "Бүртгүүлэх"}
        </Button>
      </div>
    </div>
  );
}
