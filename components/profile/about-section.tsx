"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Building2, Pencil, Plus, Trash2, Check } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

interface AboutSectionProps {
  isCompany?: boolean;
}

export const AboutSection = React.memo(function AboutSection({ isCompany = false }: AboutSectionProps) {
  const { profile, updateProfile } = useAuth();

  const [isEditing, setIsEditing] = React.useState(false);
  const [aboutText, setAboutText] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);

  const maxLength = isCompany ? 1000 : 500;

  // Initialize about text when profile loads
  React.useEffect(() => {
    if (profile?.about !== undefined) {
      setAboutText(profile.about || "");
    }
  }, [profile?.about]);

  const handleSave = React.useCallback(async () => {
    setIsSaving(true);
    try {
      const { error } = await updateProfile({ about: aboutText.trim() || null });
      if (!error) {
        setIsEditing(false);
      }
    } finally {
      setIsSaving(false);
    }
  }, [aboutText, updateProfile]);

  const handleDelete = React.useCallback(async () => {
    setIsSaving(true);
    try {
      const { error } = await updateProfile({ about: null });
      if (!error) {
        setAboutText("");
        setIsEditing(false);
      }
    } finally {
      setIsSaving(false);
    }
  }, [updateProfile]);

  const handleCancel = React.useCallback(() => {
    setAboutText(profile?.about || "");
    setIsEditing(false);
  }, [profile?.about]);

  const Icon = isCompany ? Building2 : FileText;
  const title = isCompany ? "О компании" : "О себе";
  const placeholder = isCompany
    ? "Компанийнхаа тухай бичнэ үү..."
    : "Өөрийнхөө тухай бичнэ үү...";
  const emptyMessage = isCompany
    ? "Компанийн тухай мэдээлэл нэмээгүй байна"
    : "Өөрийнхөө тухай мэдээлэл нэмээгүй байна";

  return (
    <div className="bg-card rounded-xl border p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary" />
          {title}
        </h3>
        {!isEditing && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => setIsEditing(true)}
          >
            {profile?.about ? (
              <>
                <Pencil className="h-4 w-4" />
                Засварлах
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Нэмэх
              </>
            )}
          </Button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-3">
          <Textarea
            placeholder={placeholder}
            value={aboutText}
            onChange={(e) => setAboutText(e.target.value)}
            className={isCompany ? "min-h-40 resize-none" : "min-h-30 resize-none"}
            maxLength={maxLength}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {aboutText.length}/{maxLength}
            </span>
            <div className="flex gap-2">
              {profile?.about && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isSaving}
                  className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Устгах
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={isSaving}
              >
                Болих
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving || !aboutText.trim()}
              >
                {isSaving ? (
                  "Хадгалж байна..."
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Хадгалах
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      ) : profile?.about ? (
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
          {profile.about}
        </p>
      ) : (
        <p className={`text-sm text-muted-foreground text-center ${isCompany ? "py-8" : "py-4"}`}>
          {emptyMessage}
        </p>
      )}
    </div>
  );
});
