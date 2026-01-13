"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Phone,
  Mail,
  User,
  Lock,
  Eye,
  EyeOff,
  LogOut,
  UserCircle,
  Building2,
  Star,
  ThumbsUp,
  ThumbsDown,
  Pencil,
  Briefcase,
} from "lucide-react";
import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/auth-context";
import { EducationSection } from "@/components/auth/education-section";
import { WorkExperienceSection } from "@/components/auth/work-experience-section";

interface AuthModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function AuthModal({ isOpen: controlledOpen, onClose }: AuthModalProps = {}) {
  const {
    user,
    profile,
    signIn,
    signUp,
    signOut,
    isAuthenticated,
    uploadAvatar,
    displayName,
    avatarUrl,
  } = useAuth();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [phoneStep, setPhoneStep] = React.useState<"phone" | "code">("phone");
  const [internalOpen, setInternalOpen] = React.useState(false);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled
    ? (value: boolean) => {
        if (!value && onClose) onClose();
      }
    : setInternalOpen;
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");

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

  const resetState = React.useCallback(() => {
    setPhoneStep("phone");
    setShowPassword(false);
    setShowConfirmPassword(false);
    setEmail("");
    setPassword("");
    setError("");
    setRegisterUserType("individual");
    setRegFirstName("");
    setRegLastName("");
    setRegCompanyName("");
    setRegRegistrationNumber("");
    setRegPhone("");
    setRegEmail("");
    setRegPassword("");
    setRegConfirmPassword("");
    setRegTermsAccepted(false);
    setRegErrors({});
  }, []);

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

      setOpen(false);
      resetState();
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
    setOpen,
    resetState,
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

  const handleLogin = React.useCallback(async () => {
    if (!email || !password) {
      setError("Имэйл болон нууц үгээ оруулна уу");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const { error } = await signIn(email, password);
      if (error) {
        setError(error);
        return;
      }
      setOpen(false);
      resetState();
    } finally {
      setIsSubmitting(false);
    }
  }, [email, password, signIn, setOpen, resetState]);

  const [profileOpen, setProfileOpen] = React.useState(false);

  const handleAvatarChange = React.useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        setIsUploadingAvatar(true);
        try {
          const { error } = await uploadAvatar(file);
          if (error) {
            console.error("Avatar upload error:", error);
          }
        } finally {
          setIsUploadingAvatar(false);
        }
      }
    },
    [uploadAvatar]
  );

  const handleSignOut = React.useCallback(() => {
    signOut();
    setProfileOpen(false);
  }, [signOut]);

  // If user is authenticated, show user menu
  if (isAuthenticated && user) {
    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="relative">
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-8 h-8 md:w-9 md:h-9 rounded-full object-cover border-2 border-blue-500"
                />
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 md:w-3 md:h-3 bg-green-500 rounded-full border-[2px] border-background" />
              </div>
              <span className="hidden md:block text-sm font-medium max-w-24 truncate">
                {displayName}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="flex items-center gap-3 p-3 border-b">
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-10 h-10 rounded-full object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{displayName}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
            <DropdownMenuItem className="gap-2 cursor-pointer" asChild>
              <Link href="/account/me">
                <UserCircle className="h-4 w-4" />
                Миний профайл
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-2 cursor-pointer text-red-600 focus:text-red-600"
              onClick={() => signOut()}
            >
              <LogOut className="h-4 w-4" />
              Гарах
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Profile Modal */}
        <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
          <DialogContent className="w-[calc(100%-2rem)] max-w-md rounded-xl p-0 max-h-[90vh] flex flex-col overflow-hidden">
            <DialogHeader className="p-4 sm:p-6 pb-0 shrink-0">
              <DialogTitle className="text-center text-lg">Миний профайл</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 pt-4 space-y-6">
              {/* Avatar and Name */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="w-24 h-24 rounded-full object-cover border-[3px] border-blue-500"
                  />
                  {isUploadingAvatar ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                      <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-0 right-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-blue-600 transition-colors border-2 border-background"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-semibold">{displayName}</h3>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-center gap-1 text-yellow-500 mb-1">
                    <Star className="h-4 w-4 fill-current" />
                    <span className="font-bold">4.9</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Үнэлгээ</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-center gap-1 text-green-500 mb-1">
                    <ThumbsUp className="h-4 w-4" />
                    <span className="font-bold">127</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Амжилттай</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-center gap-1 text-red-500 mb-1">
                    <ThumbsDown className="h-4 w-4" />
                    <span className="font-bold">2</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Амжилтгүй</p>
                </div>
              </div>

              {/* Info */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <User className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Нэр</p>
                    <p className="text-sm font-medium">{profile?.first_name || "-"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <User className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Овог</p>
                    <p className="text-sm font-medium">{profile?.last_name || "-"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <Mail className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Имэйл</p>
                    <p className="text-sm font-medium">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <Phone className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Утас</p>
                    <p className="text-sm font-medium">{profile?.phone_number || "-"}</p>
                  </div>
                </div>
                {profile?.is_company && (
                  <>
                    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                      <Building2 className="h-5 w-5 text-muted-foreground shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">Компанийн нэр</p>
                        <p className="text-sm font-medium">{profile.company_name || "-"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                      <Building2 className="h-5 w-5 text-muted-foreground shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">Регистрийн дугаар</p>
                        <p className="text-sm font-medium">{profile.registration_number || "-"}</p>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Education */}
              <EducationSection />

              {/* Work Experience */}
              <WorkExperienceSection />

              {/* Action Buttons */}
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full text-red-600 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Гарах
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) resetState();
      }}
    >
      <DialogTrigger asChild>
        <Button className="text-sm md:text-base">Нэвтрэх</Button>
      </DialogTrigger>
      <DialogContent className="w-[calc(100%-2rem)] max-w-md rounded-xl p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-center text-lg sm:text-2xl">
            <span className="text-[#c4272f]">Uilc</span>
            <span className="text-[#015197]">hilge</span>
            <span className="text-[#c4272f]">e.mn</span>
          </DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-9 sm:h-10">
            <TabsTrigger value="login" className="text-xs sm:text-sm">
              Нэвтрэх
            </TabsTrigger>
            <TabsTrigger value="register" className="text-xs sm:text-sm">
              Бүртгүүлэх
            </TabsTrigger>
          </TabsList>

          {/* Login Tab */}
          <TabsContent value="login" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
            {/* Phone Login */}
            <div className="space-y-2 sm:space-y-3">
              {phoneStep === "phone" ? (
                <>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                    <Input
                      type="tel"
                      placeholder="Утасны дугаар"
                      className="pl-9 sm:pl-10 h-9 sm:h-10 text-sm"
                    />
                  </div>
                  <Button className="w-full h-9 sm:h-10 text-sm" onClick={() => setPhoneStep("code")}>
                    Код авах
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-xs sm:text-sm text-muted-foreground text-center">
                    Таны утсанд илгээсэн кодыг оруулна уу
                  </p>
                  <div className="flex gap-2 justify-center">
                    {[1, 2, 3, 4].map((i) => (
                      <Input
                        key={i}
                        type="text"
                        maxLength={1}
                        className="w-10 h-10 sm:w-12 sm:h-12 text-center text-lg sm:text-xl"
                      />
                    ))}
                  </div>
                  <Button className="w-full h-9 sm:h-10 text-sm">Нэвтрэх</Button>
                  <Button
                    variant="ghost"
                    className="w-full text-xs sm:text-sm h-8 sm:h-9"
                    onClick={() => setPhoneStep("phone")}
                  >
                    Буцах
                  </Button>
                </>
              )}
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-[10px] sm:text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">эсвэл имэйлээр</span>
              </div>
            </div>

            {/* Email Login */}
            <div className="space-y-2 sm:space-y-3">
              {error && (
                <p className="text-xs sm:text-sm text-red-500 text-center bg-red-50 dark:bg-red-950/30 p-2 rounded">
                  {error}
                </p>
              )}
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="Имэйл"
                  className="pl-9 sm:pl-10 h-9 sm:h-10 text-sm"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError("");
                  }}
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Нууц үг"
                  className="pl-9 sm:pl-10 pr-9 sm:pr-10 h-9 sm:h-10 text-sm"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleLogin();
                    }
                  }}
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
              <Button
                className="w-full h-9 sm:h-10 text-sm"
                onClick={handleLogin}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Уншиж байна..." : "Нэвтрэх"}
              </Button>
              <Button variant="link" className="w-full text-xs sm:text-sm h-8">
                Нууц үгээ мартсан?
              </Button>
            </div>
          </TabsContent>

          {/* Register Tab */}
          <TabsContent value="register" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
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
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
