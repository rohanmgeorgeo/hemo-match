'use client';

import React, { useState, useMemo, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppHeader } from '@/components/ui/AppHeader';
import { EmergencyBanner } from '@/components/ui/EmergencyBanner';
import { notifyDonorUpdated } from '@/lib/donor-state';
import { Card, LocationCapture, BloodGroupPicker } from '@/components/ui';
import { type DonorProfile, DEMO_DISTRICTS, type BloodGroup } from '@/types';
import {
  validateDonorProfile,
  type DonorProfileFormData,
  } from '@/lib/validation';


function subscribe(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}
function getSnapshot(): string | null {
  return window.localStorage.getItem("hemo_match_demo_donor");
}
function getServerSnapshot(): string | null {
  return null;
}

export default function EditDonorProfilePage() {
  const router = useRouter();
  const storedJson = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const existingDonor = useMemo<DonorProfile | null>(() => {
    if (!storedJson) return null;
    try {
      return JSON.parse(storedJson) as DonorProfile;
    } catch {
      return null;
    }
  }, [storedJson]);

  const [initializedId, setInitializedId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<DonorProfileFormData>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (existingDonor && initializedId !== existingDonor.id) {
    setInitializedId(existingDonor.id);
    setFormData({
      fullName: existingDonor.fullName,
      phoneNumber: existingDonor.phoneNumber,
      bloodGroup: existingDonor.bloodGroup,
      districtId: existingDonor.districtId,
      approximateArea: existingDonor.approximateArea,
      lastDonationDate: existingDonor.lastDonationDate ?? "",
      availability: existingDonor.availability,
      notificationPreference: existingDonor.notificationPreference,
      consentGiven: existingDonor.consentGiven,
      locationLatitude: existingDonor.locationLatitude ?? null,
      locationLongitude: existingDonor.locationLongitude ?? null,
    });
  }

  const updateField = <K extends keyof DonorProfileFormData>(
    field: K,
    value: DonorProfileFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev: Record<string, string>) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !existingDonor) return;

    setSubmitError(null);
    setIsSubmitting(true);

    const validation = validateDonorProfile(formData);

    if (!validation.isValid || !validation.data) {
      setErrors(validation.errors);
      setIsSubmitting(false);
      const firstErrorField = Object.keys(validation.errors)[0];
      if (firstErrorField) {
        const el = document.getElementById(firstErrorField);
        if (el) {
          el.focus();
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
      return;
    }

    const d = validation.data;
    const districtObj = DEMO_DISTRICTS.find((dist) => dist.id === d.districtId);
    const districtName = districtObj ? districtObj.name : d.districtId;

    const updatedProfile: DonorProfile = {
      ...existingDonor,
      fullName: d.fullName,
      phoneNumber: d.phoneNumber,
      bloodGroup: d.bloodGroup,
      districtId: d.districtId,
      districtName,
      approximateArea: d.approximateArea,
      lastDonationDate: d.lastDonationDate ?? null,
      availability: d.availability,
      notificationPreference: d.notificationPreference,
      consentGiven: d.consentGiven,
      locationLatitude: d.locationLatitude ?? null,
      locationLongitude: d.locationLongitude ?? null,
    };

    const payload = {
      id: existingDonor.id,
      fullName: d.fullName,
      bloodGroup: d.bloodGroup,
      districtId: d.districtId,
      approximateArea: d.approximateArea,
      phoneNumber: d.phoneNumber,
      lastDonationDate: d.lastDonationDate || undefined,
      availability: d.availability,
      notificationPreference: d.notificationPreference,
      consentGiven: d.consentGiven,
      locationLatitude: d.locationLatitude ?? null,
      locationLongitude: d.locationLongitude ?? null,
    };

    try {
      const response = await fetch("/api/donors", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok && response.status !== 503) {
        if (result?.errors && typeof result.errors === "object") {
          setErrors(result.errors);
        }
        setSubmitError(result?.message || "Unable to update donor profile in database. Please check your details.");
        setIsSubmitting(false);
        return;
      }

      if (typeof window !== "undefined") {
        window.localStorage.setItem("hemo_match_demo_donor", JSON.stringify(updatedProfile));
        notifyDonorUpdated();
      }
      router.push("/donors/profile");
    } catch {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("hemo_match_demo_donor", JSON.stringify(updatedProfile));
        notifyDonorUpdated();
      }
      router.push("/donors/profile");
    }
  };

  if (storedJson === null) {
    return (
      <div className="flex-1 flex flex-col bg-transparent text-neutral-900 dark:text-neutral-100">
        <AppHeader />
        <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-12 text-center page-enter">
          <div className="w-8 h-8 border-2 border-rose-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-neutral-500">Loading donor profile...</p>
        </main>
      </div>
    );
  }

  if (!existingDonor) {
    return (
      <div className="flex-1 flex flex-col bg-transparent text-neutral-900 dark:text-neutral-100">
        <AppHeader />
        <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-12 text-center">
          <h2 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">No Active Donor Profile Found</h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-6">
            You do not currently have a registered donor profile on this browser demo.
          </p>
          <Link
            href="/donors/register"
            className="px-5 py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs"
          >
            Register as Volunteer Donor
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-transparent text-neutral-900 dark:text-neutral-100 transition-colors duration-150 selection:bg-rose-100 dark:selection:bg-rose-950/50 selection:text-rose-900 dark:selection:text-rose-200 pb-28 md:pb-16">
      <AppHeader />

      <main className="relative max-w-3xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8">
        <div
          className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[340px] -z-10 overflow-hidden opacity-30 dark:opacity-20 blur-3xl select-none"
          aria-hidden="true"
        >
          <div className="w-full h-full bg-[radial-gradient(ellipse_at_top,_rgba(225,29,72,0.16),rgba(225,29,72,0.03)_45%,transparent_70%)]" />
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between gap-3 mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50/90 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-200/80 dark:border-rose-900/60 liquid-glass-pill shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-600 dark:bg-rose-400" />
              Volunteer Donor Workspace • Edit Profile
            </span>
            <Link
              href="/donors/profile"
              className="text-xs font-medium text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
            >
              Cancel
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-950 dark:text-white">
            Update Donor Profile
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1 max-w-xl leading-relaxed">
            Modify your district location, availability, or donation interval details. Your donor reference ID remains unchanged.
          </p>
        </div>

        <EmergencyBanner
          tone="notice"
          title="Clinical & Coordination Notice"
          className="mb-6"
        >
          Hemo Match coordinates voluntary district preliminary matching only. Updating your details does not replace qualification confirmed by qualified clinical personnel at the blood bank.
        </EmergencyBanner>

        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          {/* Personal Identity */}
          <Card variant="default" className="p-6 sm:p-7 shadow-xs">
            <h2 className="text-sm font-bold text-neutral-950 dark:text-white mb-4 pb-2 border-b border-neutral-100 dark:border-neutral-800">
              Personal Identity
            </h2>

            {/* Full Name */}
            <div className="mb-5" id="fullName">
              <label htmlFor="fullNameInput" className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-2">
                Full Name <span className="text-rose-600 dark:text-rose-400">*</span>
              </label>
              <input
                id="fullNameInput"
                type="text"
                value={formData.fullName ?? ''}
                onChange={(e) => updateField('fullName', e.target.value)}
                className={`w-full h-11 px-3.5 rounded-xl text-sm bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border transition-all focus:outline-none focus:ring-2 ${
                  errors.fullName
                    ? 'border-rose-500 focus:ring-rose-500/20 dark:border-rose-600'
                    : 'border-neutral-200 dark:border-neutral-700 focus:ring-rose-500/20 focus:border-rose-600'
                }`}
              />
              {errors.fullName && (
                <p role="alert" className="mt-1.5 text-xs font-medium text-rose-600 dark:text-rose-400">{errors.fullName}</p>
              )}
            </div>

            {/* Phone Number */}
            <div className="mb-5" id="phoneNumber">
              <label htmlFor="phoneInput" className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-2">
                Mobile Number <span className="text-rose-600 dark:text-rose-400">*</span>
              </label>
              <input
                id="phoneInput"
                type="tel"
                value={formData.phoneNumber ?? ''}
                onChange={(e) => updateField('phoneNumber', e.target.value)}
                className={`w-full h-11 px-3.5 rounded-xl text-sm bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border transition-all focus:outline-none focus:ring-2 ${
                  errors.phoneNumber
                    ? 'border-rose-500 focus:ring-rose-500/20 dark:border-rose-600'
                    : 'border-neutral-200 dark:border-neutral-700 focus:ring-rose-500/20 focus:border-rose-600'
                }`}
              />
              <p className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                Kept strictly confidential. Only revealed after you accept an urgent match request.
              </p>
              {errors.phoneNumber && (
                <p role="alert" className="mt-1.5 text-xs font-medium text-rose-600 dark:text-rose-400">{errors.phoneNumber}</p>
              )}
            </div>

            {/* Blood Group */}
            <div id="bloodGroup">
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-2">
                Blood Group <span className="text-rose-600 dark:text-rose-400">*</span>
              </label>
              <BloodGroupPicker
                value={formData.bloodGroup as BloodGroup | undefined}
                onChange={(bg) => updateField('bloodGroup', bg)}
                error={errors.bloodGroup}
              />
            </div>
          </Card>

          {/* Location & District */}
          <Card variant="default" className="p-6 sm:p-7 shadow-xs">
            <h2 className="text-sm font-bold text-neutral-950 dark:text-white mb-4 pb-2 border-b border-neutral-100 dark:border-neutral-800">
              Location &amp; District Coordination
            </h2>

            <div className="mb-5">
              <LocationCapture
                context="donor"
                value={
                  formData.locationLatitude != null && formData.locationLongitude != null
                    ? { latitude: formData.locationLatitude, longitude: formData.locationLongitude }
                    : null
                }
                onChange={(coords) => {
                  setFormData((prev) => ({
                    ...prev,
                    locationLatitude: coords?.latitude ?? null,
                    locationLongitude: coords?.longitude ?? null,
                  }));
                }}
              />
            </div>

            <div className="mb-5" id="districtId">
              <label htmlFor="districtSelect" className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-2">
                District <span className="text-rose-600 dark:text-rose-400">*</span>
              </label>
              <select
                id="districtSelect"
                value={formData.districtId ?? ''}
                onChange={(e) => updateField('districtId', e.target.value)}
                className={`w-full h-11 px-3.5 rounded-xl text-sm bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border transition-all focus:outline-none focus:ring-2 cursor-pointer ${
                  errors.districtId
                    ? 'border-rose-500 focus:ring-rose-500/20 dark:border-rose-600'
                    : 'border-neutral-200 dark:border-neutral-700 focus:ring-rose-500/20 focus:border-rose-600'
                }`}
              >
                <option value="">Select a district...</option>
                {DEMO_DISTRICTS.map((dist) => (
                  <option key={dist.id} value={dist.id}>
                    {dist.name} {dist.state ? `(${dist.state})` : ''}
                  </option>
                ))}
              </select>
              {errors.districtId && (
                <p role="alert" className="mt-1.5 text-xs font-medium text-rose-600 dark:text-rose-400">{errors.districtId}</p>
              )}
            </div>

            <div id="approximateArea">
              <label htmlFor="approximateAreaInput" className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-2">
                Approximate Area / Locality <span className="text-rose-600 dark:text-rose-400">*</span>
              </label>
              <input
                id="approximateAreaInput"
                type="text"
                value={formData.approximateArea ?? ''}
                onChange={(e) => updateField('approximateArea', e.target.value)}
                placeholder="e.g., Kaloor East, Marine Drive"
                className={`w-full h-11 px-3.5 rounded-xl text-sm bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border transition-all focus:outline-none focus:ring-2 ${
                  errors.approximateArea
                    ? 'border-rose-500 focus:ring-rose-500/20 dark:border-rose-600'
                    : 'border-neutral-200 dark:border-neutral-700 focus:ring-rose-500/20 focus:border-rose-600'
                }`}
              />
              {errors.approximateArea && (
                <p role="alert" className="mt-1.5 text-xs font-medium text-rose-600 dark:text-rose-400">{errors.approximateArea}</p>
              )}
            </div>
          </Card>

          {/* Donation History & Preferences */}
          <Card variant="default" className="p-6 sm:p-7 shadow-xs">
            <h2 className="text-sm font-bold text-neutral-950 dark:text-white mb-4 pb-2 border-b border-neutral-100 dark:border-neutral-800">
              Donation History &amp; Availability
            </h2>

            <div className="mb-5" id="lastDonationDate">
              <label htmlFor="lastDonationDateInput" className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-1">
                Last Donation Date <span className="text-rose-600 dark:text-rose-400">*</span>
              </label>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">
                Required for Hemo Match&apos;s preliminary 120-day matching interval. This does not determine final medical eligibility.
              </p>
              <div>
                <input
                  id="lastDonationDateInput"
                  type="date"
                  required
                  aria-required="true"
                  aria-invalid={!!errors.lastDonationDate}
                  value={formData.lastDonationDate ?? ''}
                  onChange={(e) => updateField('lastDonationDate', e.target.value)}
                  className={`w-full sm:w-64 h-11 px-3.5 rounded-xl text-sm bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border transition-all focus:outline-none focus:ring-2 cursor-pointer ${
                    errors.lastDonationDate
                      ? 'border-rose-500 focus:ring-rose-500/20 dark:border-rose-600'
                      : 'border-neutral-200 dark:border-neutral-700 focus:ring-rose-500/20 focus:border-rose-600'
                  }`}
                />
              </div>
              {errors.lastDonationDate && (
                <p role="alert" className="mt-1.5 text-xs font-medium text-rose-600 dark:text-rose-400">{errors.lastDonationDate}</p>
              )}
            </div>

            <div className="mb-5" id="availability">
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-2">
                Availability Status <span className="text-rose-600 dark:text-rose-400">*</span>
              </label>
              <div role="radiogroup" aria-label="Availability Status" className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { value: 'available' as const, label: 'Available', desc: 'Ready for emergency requests', dotColor: 'bg-emerald-500', selectedClasses: 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-500 dark:border-emerald-600 ring-2 ring-emerald-500/20' },
                  { value: 'temporarily_unavailable' as const, label: 'Temporarily Unavailable', desc: 'Not available currently', dotColor: 'bg-amber-500', selectedClasses: 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-500 dark:border-amber-600 ring-2 ring-amber-500/20' },
                  { value: 'paused' as const, label: 'Paused', desc: 'Matching paused', dotColor: 'bg-neutral-400', selectedClasses: 'bg-neutral-100 dark:bg-neutral-800 border-neutral-400 ring-2 ring-neutral-400/20' },
                ].map(({ value, label, desc, dotColor, selectedClasses }) => {
                  const isSelected = formData.availability === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => updateField('availability', value)}
                      className={`p-4 rounded-2xl text-left border transition-all cursor-pointer ${
                        isSelected ? selectedClasses : 'liquid-glass hover:border-neutral-300 dark:hover:border-neutral-700 border-neutral-200/80 dark:border-white/10 shadow-xs'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                        <span className="text-sm font-bold">{label}</span>
                      </div>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">{desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mb-2" id="notificationPreference">
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-2">
                In-App Match Notifications <span className="text-rose-600 dark:text-rose-400">*</span>
              </label>
              <div role="radiogroup" aria-label="Notification Preference" className="flex gap-3 max-w-xs">
                {[
                  { value: 'enabled' as const, label: 'Enabled' },
                  { value: 'disabled' as const, label: 'Disabled' },
                ].map(({ value, label }) => {
                  const isSelected = formData.notificationPreference === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => updateField('notificationPreference', value)}
                      className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold border transition-all cursor-pointer flex items-center justify-center ${
                        isSelected
                          ? 'bg-neutral-950 dark:bg-neutral-100 text-white dark:text-neutral-950 border-neutral-950 dark:border-white shadow-xs'
                          : 'bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 border-neutral-200/90 dark:border-neutral-700'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </Card>

          {/* Submit */}
          <div className="pt-2">
            {submitError && (
              <div
                role="alert"
                className="mb-4 p-4 rounded-2xl border border-rose-200 dark:border-rose-900 bg-rose-50/90 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 text-xs"
              >
                {submitError}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                type="submit"
                id="save-donor-changes-btn"
                disabled={isSubmitting}
                className="w-full sm:flex-1 py-3.5 px-4 rounded-full bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white font-bold text-sm transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin w-4 h-4 text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <span>Save Changes</span>
                )}
              </button>
              <Link
                href="/donors/profile"
                className="w-full sm:w-auto px-6 py-3.5 rounded-full liquid-glass-pill hover:bg-neutral-100/80 dark:hover:bg-neutral-800/80 text-neutral-800 dark:text-neutral-200 font-semibold text-sm border border-neutral-200/80 dark:border-white/10 text-center transition-all"
              >
                Cancel
              </Link>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
