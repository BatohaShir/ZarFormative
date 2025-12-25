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
import { Phone, Mail, User, Lock, Eye, EyeOff, LogOut, UserCircle, Star, ThumbsUp, ThumbsDown, Calendar, Pencil } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export function AuthModal() {
  const { user, login, logout, updateAvatar, isAuthenticated } = useAuth();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [phoneStep, setPhoneStep] = React.useState<"phone" | "code">("phone");
  const [open, setOpen] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");

  const resetState = () => {
    setPhoneStep("phone");
    setShowPassword(false);
    setShowConfirmPassword(false);
    setEmail("");
    setPassword("");
    setError("");
  };

  const handleLogin = () => {
    if (!email || !password) {
      setError("Имэйл болон нууц үгээ оруулна уу");
      return;
    }
    const success = login(email, password);
    if (success) {
      setOpen(false);
      resetState();
    } else {
      setError("Имэйл эсвэл нууц үг буруу байна");
    }
  };

  const [profileOpen, setProfileOpen] = React.useState(false);

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        updateAvatar(result);
      };
      reader.readAsDataURL(file);
    }
  };

  // If user is authenticated, show user menu
  if (isAuthenticated && user) {
    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="relative">
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-8 h-8 md:w-9 md:h-9 rounded-full object-cover border-2 border-blue-500"
                />
                {/* Online indicator */}
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 md:w-3 md:h-3 bg-green-500 rounded-full border-[2px] border-background" />
              </div>
              <span className="hidden md:block text-sm font-medium max-w-24 truncate">
                {user.name}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="flex items-center gap-3 p-3 border-b">
              <img
                src={user.avatar}
                alt={user.name}
                className="w-10 h-10 rounded-full object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
            <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => setProfileOpen(true)}>
              <UserCircle className="h-4 w-4" />
              Миний профайл
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-2 cursor-pointer text-red-600 focus:text-red-600"
              onClick={logout}
            >
              <LogOut className="h-4 w-4" />
              Гарах
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Profile Modal */}
        <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
          <DialogContent className="w-[calc(100%-2rem)] max-w-md rounded-xl p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-center text-lg">Миний профайл</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {/* Avatar and Name */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-24 h-24 rounded-full object-cover border-[3px] border-blue-500"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-blue-600 transition-colors border-2 border-background"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-semibold">{user.name}</h3>
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
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Имэйл</p>
                    <p className="text-sm font-medium">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <Phone className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Утас</p>
                    <p className="text-sm font-medium">+976 9911 2233</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Бүртгүүлсэн</p>
                    <p className="text-sm font-medium">2023 оны 5-р сар</p>
                  </div>
                </div>
              </div>

              {/* Logout Button */}
              <Button
                variant="outline"
                className="w-full text-red-600 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                onClick={() => {
                  logout();
                  setProfileOpen(false);
                }}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Гарах
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetState();
    }}>
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
            <TabsTrigger value="login" className="text-xs sm:text-sm">Нэвтрэх</TabsTrigger>
            <TabsTrigger value="register" className="text-xs sm:text-sm">Бүртгүүлэх</TabsTrigger>
          </TabsList>

          {/* Login Tab */}
          <TabsContent value="login" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
            {/* Google Login */}
            <Button variant="outline" className="w-full gap-2 h-9 sm:h-10 text-xs sm:text-sm">
              <GoogleIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              Google-ээр нэвтрэх
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-[10px] sm:text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  эсвэл
                </span>
              </div>
            </div>

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
                  <Button
                    className="w-full h-9 sm:h-10 text-sm"
                    onClick={() => setPhoneStep("code")}
                  >
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
                <span className="bg-background px-2 text-muted-foreground">
                  эсвэл имэйлээр
                </span>
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
              <Button className="w-full h-9 sm:h-10 text-sm" onClick={handleLogin}>
                Нэвтрэх
              </Button>
              <Button variant="link" className="w-full text-xs sm:text-sm h-8">
                Нууц үгээ мартсан?
              </Button>

              {/* Test credentials hint */}
              <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
                <p className="font-medium mb-1">Тест хэрэглэгч:</p>
                <p>Имэйл: <span className="font-mono text-foreground">test@test.com</span></p>
                <p>Нууц үг: <span className="font-mono text-foreground">123456</span></p>
              </div>
            </div>
          </TabsContent>

          {/* Register Tab */}
          <TabsContent value="register" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
            {/* Google Register */}
            <Button variant="outline" className="w-full gap-2 h-9 sm:h-10 text-xs sm:text-sm">
              <GoogleIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              Google-ээр бүртгүүлэх
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-[10px] sm:text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  эсвэл
                </span>
              </div>
            </div>

            {/* Registration Form */}
            <div className="space-y-2 sm:space-y-3">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                <Input placeholder="Нэр" className="pl-9 sm:pl-10 h-9 sm:h-10 text-sm" />
              </div>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                <Input type="tel" placeholder="Утасны дугаар" className="pl-9 sm:pl-10 h-9 sm:h-10 text-sm" />
              </div>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                <Input type="email" placeholder="Имэйл" className="pl-9 sm:pl-10 h-9 sm:h-10 text-sm" />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Нууц үг"
                  className="pl-9 sm:pl-10 pr-9 sm:pr-10 h-9 sm:h-10 text-sm"
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
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Нууц үг давтах"
                  className="pl-9 sm:pl-10 pr-9 sm:pr-10 h-9 sm:h-10 text-sm"
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
              <Button className="w-full h-9 sm:h-10 text-sm">Бүртгүүлэх</Button>
            </div>

            <p className="text-[10px] sm:text-xs text-center text-muted-foreground">
              Бүртгүүлснээр та манай{" "}
              <a href="#" className="text-primary hover:underline">
                үйлчилгээний нөхцөл
              </a>{" "}
              болон{" "}
              <a href="#" className="text-primary hover:underline">
                нууцлалын бодлого
              </a>
              -г зөвшөөрч байна.
            </p>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
