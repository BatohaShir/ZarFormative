"use client";

import * as React from "react";
import { User, Building2, Hash, Mail, Phone } from "lucide-react";

interface PersonalInfoCardProps {
  isCompany: boolean;
  companyName?: string | null;
  registrationNumber?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email: string;
  phoneNumber?: string | null;
}

export const PersonalInfoCard = React.memo(function PersonalInfoCard({
  isCompany,
  companyName,
  registrationNumber,
  firstName,
  lastName,
  email,
  phoneNumber,
}: PersonalInfoCardProps) {
  return (
    <div className="bg-card rounded-xl border p-4 md:p-6">
      <h3 className="font-semibold text-lg flex items-center gap-2 mb-4">
        {isCompany ? (
          <Building2 className="h-5 w-5 text-primary" />
        ) : (
          <User className="h-5 w-5 text-primary" />
        )}
        {isCompany ? "Компанийн мэдээлэл" : "Хувийн мэдээлэл"}
      </h3>

      <div className="space-y-4">
        {isCompany ? (
          <>
            <div className="flex items-start gap-3">
              <Building2 className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Нэр</p>
                <p className="font-medium truncate">{companyName || "-"}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Hash className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Регистрийн дугаар</p>
                <p className="font-medium truncate">{registrationNumber || "-"}</p>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Нэр</p>
                <p className="font-medium truncate">{firstName || "-"}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Овог</p>
                <p className="font-medium truncate">{lastName || "-"}</p>
              </div>
            </div>
          </>
        )}

        <div className="flex items-start gap-3">
          <Mail className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">Имэйл</p>
            <p className="font-medium truncate">{email}</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Phone className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">Утас</p>
            <p className="font-medium truncate">{phoneNumber || "-"}</p>
          </div>
        </div>
      </div>
    </div>
  );
});
