"use client";

/**
 * Route: /doctor/profile — doctor professional profile management
 *
 * Allows the authenticated doctor to view and edit their professional
 * information (identity, practice details, credentials, and location).
 * Changes here are visible to patients on the doctors discovery page.
 * All form state and API interactions are encapsulated in useDoctorProfileForm.
 */

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Alert } from "@/components/ui/alert";
import { DoctorIdentityCard } from "@/components/doctor-profile/identity-card";
import { PracticeDetailsCard } from "@/components/doctor-profile/practice-details-card";
import { CredentialsLocationCard } from "@/components/doctor-profile/credentials-location-card";
import { useDoctorProfileForm } from "@/hooks/use-doctor-profile-form";

/**
 * Renders the doctor profile form split across three cards (identity,
 * practice details, credentials/location). Delegates all load/save logic
 * to useDoctorProfileForm; the header buttons toggle edit mode in that hook.
 */
export default function DoctorProfilePage() {
  const { values, setField, isEditing, loading, saving, error, success, beginEdit, discard, save } =
    useDoctorProfileForm();

  return (
    <DashboardLayout role="doctor">
      <div className="animate-in fade-in duration-500">

        {/* ── Page header ── */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-serif text-text-primary mb-2">My Profile</h1>
            <p className="text-on-surface-variant">
              {isEditing ? "Make changes below, then save when you're done." : "Your professional information visible to patients."}
            </p>
          </div>
          {isEditing ? (
            <div className="flex gap-2 shrink-0">
              <Button type="button" variant="outline" onClick={discard} disabled={saving}>
                Discard Changes
              </Button>
              <Button type="submit" form="doctor-profile-form" disabled={saving} className="min-w-[140px]">
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

            <form id="doctor-profile-form" onSubmit={save} className="flex flex-col gap-5">
              <DoctorIdentityCard isEditing={isEditing} values={values} setField={setField} />
              <PracticeDetailsCard isEditing={isEditing} values={values} setField={setField} />
              <CredentialsLocationCard isEditing={isEditing} values={values} setField={setField} />
            </form>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
