"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Alert } from "@/components/ui/alert";
import { IdentityCard } from "@/components/profile/identity-card";
import { LocationInsuranceCard } from "@/components/profile/location-insurance-card";
import { MedicalHistoryCard } from "@/components/profile/medical-history-card";
import { usePatientProfileForm } from "@/hooks/use-patient-profile-form";

export default function PatientProfilePage() {
  const { values, setField, isEditing, loading, saving, error, success, beginEdit, discard, save } =
    usePatientProfileForm();

  return (
    <DashboardLayout role="patient">
      <div className="animate-in fade-in duration-500">

        {/* ── Page header ── */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-serif text-text-primary mb-2">My Profile</h1>
            <p className="text-on-surface-variant">
              {isEditing ? "Make changes below, then save when you're done." : "Your personal and medical information."}
            </p>
          </div>
          {isEditing ? (
            <div className="flex gap-2 shrink-0">
              <Button type="button" variant="outline" onClick={discard} disabled={saving}>
                Discard Changes
              </Button>
              <Button type="submit" form="patient-profile-form" disabled={saving} className="min-w-[140px]">
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          ) : (
            <Button type="button" onClick={beginEdit} disabled={loading} className="min-w-[140px] shrink-0">
              Edit Profile
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : (
          <>
            {success && <Alert variant="success" className="mb-6">Profile updated successfully.</Alert>}
            {error && <Alert variant="error" className="mb-6">{error}</Alert>}

            <form id="patient-profile-form" onSubmit={save} className="flex flex-col gap-5">
              <IdentityCard isEditing={isEditing} values={values} setField={setField} />
              <LocationInsuranceCard isEditing={isEditing} values={values} setField={setField} />
              <MedicalHistoryCard isEditing={isEditing} values={values} setField={setField} />
            </form>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
