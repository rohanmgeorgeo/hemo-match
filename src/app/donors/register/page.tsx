'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/ui/AppHeader';
import { EmergencyBanner } from '@/components/ui/EmergencyBanner';
import Link from 'next/link';
import { notifyDonorUpdated, useHasDonorProfile } from '@/lib/donor-state';
import { Card, LocationCapture } from '@/components/ui';
import { type DonorProfile, DEMO_DISTRICTS } from '@/types';
import {
  VALID_BLOOD_GROUPS,
  validateDonorProfile,
  type DonorProfileFormData,
} from '@/lib/validation';

export default function DonorRegisterPage() {
  const router = useRouter();
  const hasDonorProfile = useHasDonorProfile();

  const [formData, setFormData] = useState<Partial<DonorProfileFormData>>({
    fullName: '',
    bloodGroup: undefined,
    districtId: '',
    approximateArea: '',
    phoneNumber: '',
    lastDonationDate: '',
    availability: 'available',
    notificationPreference: 'enabled',
    consentGiven: false,
    locationLatitude: null,
    locationLongitude: null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const updateField = <K extends keyof DonorProfileFormData>(
    field: K,
    value: DonorProfileFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (submitError) {
      setSubmitError(null);
    }
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

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

    // Send validated payload to POST /api/donors without client-generated ID
    const payload = {
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
      const response = await fetch('/api/donors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success || !result?.donor?.id) {
        if (result?.errors && typeof result.errors === 'object') {
          setErrors(result.errors);
        }
        const userMessage =
          response.status === 503
            ? 'Database service is temporarily unavailable. Please try again shortly.'
            : result?.message && response.status === 400
            ? result.message
            : 'Unable to complete donor registration. Please verify your details and try again.';
        setSubmitError(userMessage);
        setIsSubmitting(false);
        return;
      }

      // Success: use authoritative PostgreSQL UUID returned from API
      const dbDonor = result.donor;
      const selectedDistrict = DEMO_DISTRICTS.find((dist) => dist.id === d.districtId);

      const profile: DonorProfile = {
        id: dbDonor.id,
        fullName: d.fullName,
        bloodGroup: d.bloodGroup,
        districtId: d.districtId,
        districtName: selectedDistrict?.name,
        approximateArea: d.approximateArea,
        phoneNumber: d.phoneNumber,
        lastDonationDate: d.lastDonationDate ?? null,
        availability: d.availability,
        notificationPreference: d.notificationPreference,
        consentGiven: true,
        locationLatitude: d.locationLatitude ?? null,
        locationLongitude: d.locationLongitude ?? null,
        createdAt: dbDonor.created_at || new Date().toISOString(),
      };

      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('hemo_match_demo_donor', JSON.stringify(profile));
          notifyDonorUpdated();
        }
      } catch {
        console.warn('Unable to write donor profile to localStorage');
      }

      router.push('/donors/profile');
    } catch {
      setSubmitError('A network error occurred while submitting your registration. Please check your connection and try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-transparent text-neutral-900 dark:text-neutral-100 transition-colors duration-150 selection:bg-rose-100 dark:selection:bg-rose-950/50 selection:text-rose-900 dark:selection:text-rose-200 pb-28 md:pb-16">
      {/* Global App Header */}
      <AppHeader />

      {/* Main Container */}
      <main className="relative max-w-3xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8">
        {/* Subtle ambient emerald radial wash */}
        <div
          className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[340px] -z-10 overflow-hidden opacity-30 dark:opacity-20 blur-3xl select-none"
          aria-hidden="true"
        >
          <div className="w-full h-full bg-[radial-gradient(ellipse_at_top,_rgba(16,185,129,0.16),rgba(16,185,129,0.03)_45%,transparent_70%)]" />
        </div>
        {hasDonorProfile && (
          <div className="mb-6 p-4 rounded-2xl liquid-glass border border-neutral-200/80 dark:border-white/10 text-neutral-800 dark:text-neutral-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>You already have an active demo profile on this browser. Want to modify your details instead?</span>
            </div>
            <Link
              href="/donors/profile/edit"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full liquid-glass-pill hover:bg-neutral-200/80 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white font-bold text-xs shrink-0 transition-colors"
            >
              Edit Existing Profile →
            </Link>
          </div>
        )}

        {/* Title & Introduction */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50/90 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-900/60 liquid-glass-pill shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
              Volunteer Donor Workspace • Onboarding
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-950 dark:text-white">
            Register as Volunteer Donor
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 mt-1 max-w-2xl leading-relaxed">
            Register your blood group and district to receive targeted in-app alerts when urgent needs arise.
            Your contact details remain confidential until you choose to accept.
          </p>
        </div>

        {/* Privacy Banner */}
        <EmergencyBanner tone="privacy" title="Your Contact Details are Protected" className="mb-8">
          Your contact details stay private during matching and notifications. They can only be revealed
          after you accept a request and the requester explicitly authorizes contact reveal.
          Hemo Match supports preliminary matching only; final medical qualification is conducted by qualified blood-centre personnel.
        </EmergencyBanner>

        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          {/* Card 1: Donor Identity */}
          <Card variant="default" glow="default" className="p-5 sm:p-7">
            <h2 className="text-base font-bold text-neutral-900 dark:text-white mb-4 pb-2 border-b border-neutral-100 dark:border-neutral-800/80 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400" />
              1. Donor Identity
            </h2>

            {/* Full Name */}
            <div className="mb-5" id="fullName">
              <label
                htmlFor="fullNameInput"
                className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-2"
              >
                Full Name <span className="text-rose-600 dark:text-rose-400">*</span>
              </label>
              <input
                id="fullNameInput"
                type="text"
                autoComplete="name"
                value={formData.fullName ?? ''}
                onChange={(e) => updateField('fullName', e.target.value)}
                placeholder="Your full name"
                className={`w-full h-11 px-3.5 rounded-xl text-sm bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border transition-all focus:outline-none focus:ring-2 ${
                  errors.fullName
                    ? 'border-rose-500 focus:ring-rose-500/20 dark:border-rose-600'
                    : 'border-neutral-200 dark:border-neutral-700 focus:ring-rose-500/20 focus:border-rose-600'
                }`}
              />
              <p className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                Stored as part of your private record. Only revealed after you accept and requester authorizes.
              </p>
              {errors.fullName && (
                <p role="alert" className="mt-1.5 text-xs font-medium text-rose-600 dark:text-rose-400">{errors.fullName}</p>
              )}
            </div>

            {/* Phone Number */}
            <div className="mb-5" id="phoneNumber">
              <label
                htmlFor="phoneNumberInput"
                className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-2"
              >
                Phone Number <span className="text-rose-600 dark:text-rose-400">*</span>
              </label>
              <div className="relative max-w-sm">
                <input
                  id="phoneNumberInput"
                  type="tel"
                  autoComplete="tel"
                  value={formData.phoneNumber ?? ''}
                  onChange={(e) => updateField('phoneNumber', e.target.value)}
                  placeholder="+91 98765 43210"
                  className={`w-full h-11 px-3.5 rounded-xl text-sm bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border transition-all focus:outline-none focus:ring-2 ${
                    errors.phoneNumber
                      ? 'border-rose-500 focus:ring-rose-500/20 dark:border-rose-600'
                      : 'border-neutral-200 dark:border-neutral-700 focus:ring-rose-500/20 focus:border-rose-600'
                  }`}
                />
              </div>
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 px-2.5 py-1 text-xs text-neutral-600 dark:text-neutral-300 border border-neutral-200/70 dark:border-neutral-700">
                <svg className="w-3 h-3 text-neutral-500 dark:text-neutral-400" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                </svg>
                <span>Hidden until authorized contact-reveal stage</span>
              </div>
              {errors.phoneNumber && (
                <p role="alert" className="mt-2 text-xs font-medium text-rose-600 dark:text-rose-400">{errors.phoneNumber}</p>
              )}
            </div>

            {/* Blood Group */}
            <div id="bloodGroup">
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-2">
                Blood Group <span className="text-rose-600 dark:text-rose-400">*</span>
              </label>
              <div role="radiogroup" aria-label="Blood Group" className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {VALID_BLOOD_GROUPS.map((bg) => {
                  const isSelected = formData.bloodGroup === bg;
                  return (
                    <button
                      key={bg}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => updateField('bloodGroup', bg)}
                      className={`h-12 rounded-xl text-sm font-bold transition-all duration-150 active:scale-95 flex items-center justify-center cursor-pointer border select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600 ${
                        isSelected
                          ? 'bg-rose-600 text-white border-rose-600 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.4),0_2px_8px_-1px_rgba(225,29,72,0.4)] ring-2 ring-rose-500/30 dark:ring-rose-500/40 font-bold scale-[1.02]'
                          : 'liquid-glass-pill hover:bg-neutral-100/80 dark:hover:bg-white/5 text-neutral-800 dark:text-neutral-200 dark:hover:text-white border-neutral-200/80 dark:border-white/10 font-semibold shadow-xs'
                      }`}
                    >
                      <span className="tabular-nums">{bg}</span>
                    </button>
                  );
                })}
              </div>
              {errors.bloodGroup && (
                <p role="alert" className="mt-2 text-xs font-medium text-rose-600 dark:text-rose-400">{errors.bloodGroup}</p>
              )}
            </div>
          </Card>

          {/* Card 2: Location */}
          <Card variant="default" glow="default" className="p-5 sm:p-7">
            <h2 className="text-base font-bold text-neutral-900 dark:text-white mb-4 pb-2 border-b border-neutral-100 dark:border-neutral-800/80 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400" />
              2. District &amp; Location
            </h2>

            {/* Private Proximity Matching Location Control */}
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

            {/* District */}
            <div className="mb-5" id="districtId">
              <label
                htmlFor="districtSelect"
                className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-2"
              >
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
                <option value="">Select your district...</option>
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

            {/* Approximate Area */}
            <div id="approximateArea">
              <label
                htmlFor="approximateAreaInput"
                className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-2"
              >
                Approximate Area / Locality <span className="text-rose-600 dark:text-rose-400">*</span>
              </label>
              <input
                id="approximateAreaInput"
                type="text"
                value={formData.approximateArea ?? ''}
                onChange={(e) => updateField('approximateArea', e.target.value)}
                placeholder="e.g., Kaloor North, MG Road Sector, Town East"
                className={`w-full h-11 px-3.5 rounded-xl text-sm bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border transition-all focus:outline-none focus:ring-2 ${
                  errors.approximateArea
                    ? 'border-rose-500 focus:ring-rose-500/20 dark:border-rose-600'
                    : 'border-neutral-200 dark:border-neutral-700 focus:ring-rose-500/20 focus:border-rose-600'
                }`}
              />
              <p className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                Enter a neighbourhood or area only. Do <strong>not</strong> enter your private home address.
              </p>
              {errors.approximateArea && (
                <p role="alert" className="mt-1.5 text-xs font-medium text-rose-600 dark:text-rose-400">{errors.approximateArea}</p>
              )}
            </div>
          </Card>

          {/* Card 3: Donation History */}
          <Card variant="default" glow="default" className="p-5 sm:p-7">
            <h2 className="text-base font-bold text-neutral-900 dark:text-white mb-4 pb-2 border-b border-neutral-100 dark:border-neutral-800/80 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400" />
              3. Donation History &amp; Recovery Interval
            </h2>

            {/* Last Donation Date */}
            <div id="lastDonationDate">
              <label
                htmlFor="lastDonationDateInput"
                className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-2"
              >
                Last Donation Date <span className="text-neutral-400 dark:text-neutral-500 font-normal">(Optional)</span>
              </label>
              <input
                id="lastDonationDateInput"
                type="date"
                value={formData.lastDonationDate ?? ''}
                onChange={(e) => updateField('lastDonationDate', e.target.value)}
                className={`w-full sm:w-64 h-11 px-3.5 rounded-xl text-sm bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 border transition-all focus:outline-none focus:ring-2 cursor-pointer ${
                  errors.lastDonationDate
                    ? 'border-rose-500 focus:ring-rose-500/20 dark:border-rose-600'
                    : 'border-neutral-200 dark:border-neutral-700 focus:ring-rose-500/20 focus:border-rose-600'
                }`}
              />
              <div className="mt-2.5 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/70 border border-neutral-200/70 dark:border-neutral-700 text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed space-y-1">
                <p>
                  <strong>Application Policy Notice:</strong> For this hackathon matching policy, donors with a known last donation date must have at least 120 calendar days of recovery time.
                </p>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  This is preliminary matching logic, not final medical eligibility. Leaving this blank indicates unknown donation history, which is excluded from matching under this policy.
                </p>
              </div>
              {errors.lastDonationDate && (
                <p role="alert" className="mt-1.5 text-xs font-medium text-rose-600 dark:text-rose-400">{errors.lastDonationDate}</p>
              )}
            </div>
          </Card>

          {/* Card 4: Participation & Consent */}
          <Card variant="default" glow="default" className="p-5 sm:p-7">
            <h2 className="text-base font-bold text-neutral-900 dark:text-white mb-4 pb-2 border-b border-neutral-100 dark:border-neutral-800/80 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400" />
              4. Participation &amp; Notification Settings
            </h2>

            {/* Availability */}
            <div className="mb-6" id="availability">
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-2">
                Current Availability <span className="text-rose-600 dark:text-rose-400">*</span>
              </label>
              <div role="radiogroup" aria-label="Availability" className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    value: 'available' as const,
                    label: 'Available',
                    desc: 'Ready to receive matching requests',
                    color: 'emerald',
                  },
                  {
                    value: 'temporarily_unavailable' as const,
                    label: 'Temporarily Unavailable',
                    desc: 'Temporarily unable to donate',
                    color: 'amber',
                  },
                  {
                    value: 'paused' as const,
                    label: 'Paused',
                    desc: 'Profile paused from alerts',
                    color: 'neutral',
                  },
                ].map(({ value, label, desc, color }) => {
                  const isSelected = formData.availability === value;
                  const selectedClasses =
                    color === 'emerald'
                      ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-500 dark:border-emerald-600 ring-2 ring-emerald-500/20'
                      : color === 'amber'
                      ? 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-500 dark:border-amber-600 ring-2 ring-amber-500/20'
                      : 'bg-neutral-100 dark:bg-neutral-800 border-neutral-400 dark:border-neutral-600 ring-2 ring-neutral-400/20';
                  const dotColor =
                    color === 'emerald'
                      ? 'bg-emerald-500'
                      : color === 'amber'
                      ? 'bg-amber-500'
                      : 'bg-neutral-400';
                  const labelColor =
                    color === 'emerald'
                      ? 'text-emerald-800 dark:text-emerald-300'
                      : color === 'amber'
                      ? 'text-amber-800 dark:text-amber-300'
                      : 'text-neutral-800 dark:text-neutral-200';
                  return (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => updateField('availability', value)}
                      className={`p-4 rounded-2xl text-left border transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 ${
                        isSelected ? selectedClasses : 'liquid-glass hover:border-neutral-300 dark:hover:border-neutral-700 border-neutral-200/80 dark:border-white/10 shadow-xs'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                        <span className={`text-sm font-bold ${labelColor}`}>{label}</span>
                      </div>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">{desc}</p>
                    </button>
                  );
                })}
              </div>
              {errors.availability && (
                <p role="alert" className="mt-2 text-xs font-medium text-rose-600 dark:text-rose-400">{errors.availability}</p>
              )}
            </div>

            {/* Notification Preference */}
            <div className="mb-6" id="notificationPreference">
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-2">
                In-App Match Notifications <span className="text-rose-600 dark:text-rose-400">*</span>
              </label>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3">
                When enabled, Hemo Match may send relevant in-app blood requests to your donor inbox.
              </p>
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
                      className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold border transition-all cursor-pointer flex items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 ${
                        isSelected
                          ? 'bg-neutral-950 dark:bg-neutral-100 text-white dark:text-neutral-950 border-neutral-950 dark:border-white shadow-xs'
                          : 'bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 dark:hover:text-white border-neutral-200/90 dark:border-neutral-700'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              {errors.notificationPreference && (
                <p role="alert" className="mt-2 text-xs font-medium text-rose-600 dark:text-rose-400">{errors.notificationPreference}</p>
              )}
            </div>

            {/* Consent */}
            <div
              id="consentGiven"
              className={`p-4 rounded-2xl border transition-colors ${
                errors.consentGiven
                  ? 'border-rose-300 dark:border-rose-900 bg-rose-50/40 dark:bg-rose-950/20'
                  : 'border-neutral-200/80 dark:border-neutral-700 bg-neutral-50/70 dark:bg-neutral-800/60'
              }`}
            >
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  id="consentCheckbox"
                  checked={formData.consentGiven ?? false}
                  onChange={(e) => updateField('consentGiven', e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-rose-600 shrink-0 cursor-pointer"
                />
                <span className="text-xs sm:text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed font-normal">
                  I volunteer to receive district match notifications when compatible blood requests arise.
                  I understand that my contact information remains strictly protected until I accept a request
                  and the requester explicitly authorizes reveal, and that final donation qualification is confirmed
                  at the hospital or blood centre.
                </span>
              </label>
              {errors.consentGiven && (
                <p role="alert" className="mt-2 text-xs font-medium text-rose-600 dark:text-rose-400">{errors.consentGiven}</p>
              )}
            </div>
          </Card>

          {/* Submit */}
          <div className="pt-2">
            {submitError && (
              <div
                role="alert"
                className="mb-4 p-4 rounded-2xl border border-rose-200 dark:border-rose-900 bg-rose-50/90 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 text-xs flex items-start gap-3"
              >
                <svg
                  className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
                  />
                </svg>
                <div>
                  <p className="font-bold">Registration Error</p>
                  <p className="mt-0.5 text-rose-700 dark:text-rose-400 leading-relaxed">{submitError}</p>
                </div>
              </div>
            )}

            <button
              type="submit"
              id="submit-donor-registration-btn"
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 rounded-full bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white font-bold text-sm transition-all duration-150 shadow-xs hover:shadow flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin w-4 h-4 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  <span>Saving Registration...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
                  </svg>
                  <span>Complete Volunteer Registration</span>
                </>
              )}
            </button>
            <p className="text-center text-xs text-neutral-400 dark:text-neutral-500 mt-3">
              Your profile will be securely saved to district coordination records.
            </p>
          </div>
        </form>
      </main>
    </div>
  );
}
