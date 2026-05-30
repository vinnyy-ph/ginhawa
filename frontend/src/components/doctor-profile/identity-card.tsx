import { FormField } from "@/components/ui/form-field";
import { ProfilePhotoField } from "@/components/ui/profile-photo-field";
import { onboardingInputClass, onboardingTextareaClass } from "@/lib/onboarding-styles";
import { Empty } from "@/components/profile/profile-fields";

interface DoctorIdentityCardProps {
  isEditing: boolean;
  profilePictureUrl: string | null;
  setProfilePictureUrl: (v: string | null) => void;
  fullName: string;
  setFullName: (v: string) => void;
  professionalTitle: string;
  setProfessionalTitle: (v: string) => void;
  specialization: string;
  bio: string;
  setBio: (v: string) => void;
}

export function DoctorIdentityCard({
  isEditing,
  profilePictureUrl,
  setProfilePictureUrl,
  fullName,
  setFullName,
  professionalTitle,
  setProfessionalTitle,
  specialization,
  bio,
  setBio,
}: DoctorIdentityCardProps) {
  return (
    <div className="bg-surface-white rounded-xl shadow-soft border border-outline-variant/30 overflow-hidden">
      {/* Coloured accent strip */}
      <div className="h-1.5 bg-gradient-to-r from-brand-light to-brand" />

      <div className="p-6 flex flex-col gap-6">
        {/* Photo + name row */}
        <div className="flex items-start gap-6">
          <ProfilePhotoField
            value={profilePictureUrl}
            onChange={setProfilePictureUrl}
            readOnly={!isEditing}
          />
          <div className="flex-1 flex flex-col gap-4 min-w-0">
            {isEditing ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField id="d-fullName" label="Full name">
                  <input
                    id="d-fullName"
                    className={onboardingInputClass}
                    placeholder="Dr. Juan dela Cruz"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </FormField>
                <FormField id="d-title" label="Professional title">
                  <input
                    id="d-title"
                    className={onboardingInputClass}
                    placeholder="MD, FPCP"
                    value={professionalTitle}
                    onChange={(e) => setProfessionalTitle(e.target.value)}
                  />
                </FormField>
              </div>
            ) : (
              <div>
                <p className="text-2xl font-bold font-serif text-text-primary leading-tight">
                  {fullName || <span className="text-on-surface-variant/40 italic font-normal text-lg">Name not set</span>}
                </p>
                {professionalTitle && (
                  <p className="text-sm text-on-surface-variant font-manrope mt-1">{professionalTitle}</p>
                )}
                {specialization && (
                  <span className="inline-flex items-center mt-2 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary font-manrope">
                    {specialization}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bio */}
        <div className="border-t border-outline-variant/20 pt-5">
          {isEditing ? (
            <FormField id="d-bio" label="Professional bio">
              <textarea
                id="d-bio"
                className={`${onboardingTextareaClass} min-h-[100px]`}
                placeholder="Tell patients about your background, approach to care, and what makes you unique..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </FormField>
          ) : (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/60 font-manrope mb-2">About</p>
              <p className="text-sm text-text-primary font-manrope leading-relaxed">
                {bio?.trim() || <Empty />}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
