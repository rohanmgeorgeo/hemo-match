'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type DonorProfile, DEMO_DISTRICTS } from '@/types';
import {
  VALID_BLOOD_GROUPS,
  validateDonorProfile,
  type DonorProfileFormData,
} from '@/lib/validation';

export default function DonorRegisterPage() {
  const router = useRouter();

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
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = <K extends keyof DonorProfileFormData>(
    field: K,
    value: DonorProfileFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
    const selectedDistrict = DEMO_DISTRICTS.find((dist) => dist.id === d.districtId);

    const profile: DonorProfile = {
      id: `donor-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
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
      createdAt: new Date().toISOString(),
    };

    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('hemo_match_demo_donor', JSON.stringify(profile));
      }
    } catch {
      console.warn('Unable to write donor profile to localStorage');
    }

    router.push('/donors/profile');
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-neutral-900 selection:bg-rose-100 selection:text-rose-900 pb-20">
      {/* Header */}
      <header className="w-full border-b border-neutral-200/70 bg-white/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-950 transition-colors py-2 pr-3 -ml-2 rounded-lg"
          >
            <svg
              className="w-4 h-4 text-neutral-500"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
            Back to Home
          </Link>

          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-600" />
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Donor Registration
            </span>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12">
        {/* Title */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-950 mb-2">
            Register as a Donor
          </h1>
          <p className="text-sm sm:text-base text-neutral-600 leading-relaxed">
            Create your donor profile so that future blood requests in your district can
            identify potentially matching donors. Your contact details remain private
            throughout the matching process.
          </p>
        </div>

        {/* Privacy Card */}
        <div className="rounded-2xl bg-blue-50/60 border border-blue-200/80 p-4 sm:p-5 mb-8 flex items-start gap-3.5 shadow-xs">
          <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
            <svg className="w-4 h-4 text-blue-700" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
          </div>
          <div className="text-xs sm:text-sm text-blue-900/90 leading-relaxed">
            <strong className="font-semibold text-blue-950 block mb-1">Your Privacy is Protected</strong>
            <ul className="space-y-0.5 text-blue-900/80 list-disc list-inside">
              <li>Exact home addresses are not collected.</li>
              <li>Your phone number is stored privately and is never shown to blood requesters during matching.</li>
              <li>Contact information is only shared through the future acceptance and contact-reveal workflow.</li>
              <li>Hemo Match does not determine final medical eligibility.</li>
            </ul>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          {/* Card 1: Identity */}
          <div className="bg-white rounded-3xl border border-neutral-200/80 p-5 sm:p-7 shadow-xs">
            <h2 className="text-base font-semibold text-neutral-900 mb-5 pb-2 border-b border-neutral-100 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              Donor Identity
            </h2>

            {/* Full Name */}
            <div className="mb-5" id="fullName">
              <label
                htmlFor="fullNameInput"
                className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-2"
              >
                Full Name <span className="text-rose-600">*</span>
              </label>
              <input
                id="fullNameInput"
                type="text"
                autoComplete="name"
                value={formData.fullName ?? ''}
                onChange={(e) => updateField('fullName', e.target.value)}
                placeholder="Your full name"
                className={`w-full h-11 px-3.5 rounded-xl text-sm bg-neutral-50 border transition-all focus:outline-none focus:ring-2 ${
                  errors.fullName
                    ? 'border-rose-500 focus:ring-rose-500/20'
                    : 'border-neutral-200 focus:ring-rose-500/20 focus:border-rose-600'
                }`}
              />
              <p className="mt-1.5 text-xs text-neutral-500">
                Your name is part of your private donor record and is not displayed publicly.
              </p>
              {errors.fullName && (
                <p role="alert" className="mt-1.5 text-xs font-medium text-rose-600">{errors.fullName}</p>
              )}
            </div>

            {/* Blood Group */}
            <div id="bloodGroup">
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-2">
                Blood Group <span className="text-rose-600">*</span>
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
                      className={`h-12 rounded-xl text-sm font-semibold transition-all duration-150 flex items-center justify-center cursor-pointer border ${
                        isSelected
                          ? 'bg-rose-600 text-white border-rose-600 shadow-xs ring-2 ring-rose-600/30'
                          : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-800 border-neutral-200/90'
                      }`}
                    >
                      {bg}
                    </button>
                  );
                })}
              </div>
              {errors.bloodGroup && (
                <p role="alert" className="mt-2 text-xs font-medium text-rose-600">{errors.bloodGroup}</p>
              )}
            </div>
          </div>

          {/* Card 2: Location */}
          <div className="bg-white rounded-3xl border border-neutral-200/80 p-5 sm:p-7 shadow-xs">
            <h2 className="text-base font-semibold text-neutral-900 mb-5 pb-2 border-b border-neutral-100 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              District &amp; Location
            </h2>

            {/* District */}
            <div className="mb-5" id="districtId">
              <label
                htmlFor="districtSelect"
                className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-2"
              >
                District <span className="text-rose-600">*</span>
              </label>
              <select
                id="districtSelect"
                value={formData.districtId ?? ''}
                onChange={(e) => updateField('districtId', e.target.value)}
                className={`w-full h-11 px-3.5 rounded-xl text-sm bg-neutral-50 border transition-all focus:outline-none focus:ring-2 cursor-pointer ${
                  errors.districtId
                    ? 'border-rose-500 focus:ring-rose-500/20'
                    : 'border-neutral-200 focus:ring-rose-500/20 focus:border-rose-600'
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
                <p role="alert" className="mt-1.5 text-xs font-medium text-rose-600">{errors.districtId}</p>
              )}
            </div>

            {/* Approximate Area */}
            <div id="approximateArea">
              <label
                htmlFor="approximateAreaInput"
                className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-2"
              >
                Approximate Area / Locality <span className="text-rose-600">*</span>
              </label>
              <input
                id="approximateAreaInput"
                type="text"
                value={formData.approximateArea ?? ''}
                onChange={(e) => updateField('approximateArea', e.target.value)}
                placeholder="e.g., Kaloor North, MG Road Sector, Town East"
                className={`w-full h-11 px-3.5 rounded-xl text-sm bg-neutral-50 border transition-all focus:outline-none focus:ring-2 ${
                  errors.approximateArea
                    ? 'border-rose-500 focus:ring-rose-500/20'
                    : 'border-neutral-200 focus:ring-rose-500/20 focus:border-rose-600'
                }`}
              />
              <p className="mt-1.5 text-xs text-neutral-500">
                Enter a neighbourhood or area only. Do <strong>not</strong> enter your exact home address.
              </p>
              {errors.approximateArea && (
                <p role="alert" className="mt-1.5 text-xs font-medium text-rose-600">{errors.approximateArea}</p>
              )}
            </div>
          </div>

          {/* Card 3: Private Contact */}
          <div className="bg-white rounded-3xl border border-neutral-200/80 p-5 sm:p-7 shadow-xs">
            <h2 className="text-base font-semibold text-neutral-900 mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              Contact Information
            </h2>
            <p className="text-xs text-neutral-500 mb-5 leading-relaxed">
              Your phone number is required so that future accepted-request coordination can proceed.
              It remains <strong className="text-neutral-700">fully private</strong> — it is never shown to blood requesters
              during the matching stage. It will only become available through the explicit contact-reveal workflow.
            </p>

            {/* Phone Number */}
            <div id="phoneNumber">
              <label
                htmlFor="phoneNumberInput"
                className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-2"
              >
                Phone Number <span className="text-rose-600">*</span>
              </label>
              <div className="relative max-w-sm">
                <input
                  id="phoneNumberInput"
                  type="tel"
                  autoComplete="tel"
                  value={formData.phoneNumber ?? ''}
                  onChange={(e) => updateField('phoneNumber', e.target.value)}
                  placeholder="+91 98765 43210"
                  className={`w-full h-11 px-3.5 rounded-xl text-sm bg-neutral-50 border transition-all focus:outline-none focus:ring-2 ${
                    errors.phoneNumber
                      ? 'border-rose-500 focus:ring-rose-500/20'
                      : 'border-neutral-200 focus:ring-rose-500/20 focus:border-rose-600'
                  }`}
                />
              </div>
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-600">
                <svg className="w-3 h-3 text-neutral-500" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                </svg>
                Hidden until contact-reveal stage
              </div>
              {errors.phoneNumber && (
                <p role="alert" className="mt-2 text-xs font-medium text-rose-600">{errors.phoneNumber}</p>
              )}
            </div>
          </div>

          {/* Card 4: Donation History & Availability */}
          <div className="bg-white rounded-3xl border border-neutral-200/80 p-5 sm:p-7 shadow-xs">
            <h2 className="text-base font-semibold text-neutral-900 mb-5 pb-2 border-b border-neutral-100 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              Donation History &amp; Availability
            </h2>

            {/* Last Donation Date */}
            <div className="mb-6" id="lastDonationDate">
              <label
                htmlFor="lastDonationDateInput"
                className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-2"
              >
                Last Donation Date <span className="text-neutral-400 font-normal">(Optional)</span>
              </label>
              <input
                id="lastDonationDateInput"
                type="date"
                value={formData.lastDonationDate ?? ''}
                onChange={(e) => updateField('lastDonationDate', e.target.value)}
                className={`w-full sm:w-64 h-11 px-3.5 rounded-xl text-sm bg-neutral-50 border transition-all focus:outline-none focus:ring-2 cursor-pointer ${
                  errors.lastDonationDate
                    ? 'border-rose-500 focus:ring-rose-500/20'
                    : 'border-neutral-200 focus:ring-rose-500/20 focus:border-rose-600'
                }`}
              />
              <p className="mt-1.5 text-xs text-neutral-500">
                Providing this helps the matching stage evaluate donation eligibility during the matching process.
              </p>
              {errors.lastDonationDate && (
                <p role="alert" className="mt-1.5 text-xs font-medium text-rose-600">{errors.lastDonationDate}</p>
              )}
            </div>

            {/* Availability */}
            <div id="availability">
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-2">
                Current Availability <span className="text-rose-600">*</span>
              </label>
              <div role="radiogroup" aria-label="Availability" className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    value: 'available' as const,
                    label: 'Available',
                    desc: 'Ready to respond to matching requests',
                    color: 'emerald',
                  },
                  {
                    value: 'temporarily_unavailable' as const,
                    label: 'Temporarily Unavailable',
                    desc: 'Unavailable at the moment, may become available',
                    color: 'amber',
                  },
                  {
                    value: 'paused' as const,
                    label: 'Paused',
                    desc: 'Profile inactive, will not receive match alerts',
                    color: 'neutral',
                  },
                ].map(({ value, label, desc, color }) => {
                  const isSelected = formData.availability === value;
                  const selectedClasses =
                    color === 'emerald'
                      ? 'bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20'
                      : color === 'amber'
                      ? 'bg-amber-50/80 border-amber-500 ring-2 ring-amber-500/20'
                      : 'bg-neutral-100 border-neutral-400 ring-2 ring-neutral-400/20';
                  const dotColor =
                    color === 'emerald'
                      ? 'bg-emerald-500'
                      : color === 'amber'
                      ? 'bg-amber-500'
                      : 'bg-neutral-400';
                  const labelColor =
                    color === 'emerald'
                      ? 'text-emerald-800'
                      : color === 'amber'
                      ? 'text-amber-800'
                      : 'text-neutral-800';
                  return (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => updateField('availability', value)}
                      className={`p-4 rounded-2xl text-left border transition-all cursor-pointer ${
                        isSelected ? selectedClasses : 'bg-neutral-50 hover:bg-neutral-100 border-neutral-200/90'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                        <span className={`text-sm font-semibold ${labelColor}`}>{label}</span>
                      </div>
                      <p className="text-xs text-neutral-500 leading-relaxed">{desc}</p>
                    </button>
                  );
                })}
              </div>
              {errors.availability && (
                <p role="alert" className="mt-2 text-xs font-medium text-rose-600">{errors.availability}</p>
              )}
            </div>
          </div>

          {/* Card 5: Notifications & Consent */}
          <div className="bg-white rounded-3xl border border-neutral-200/80 p-5 sm:p-7 shadow-xs">
            <h2 className="text-base font-semibold text-neutral-900 mb-5 pb-2 border-b border-neutral-100 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              Notifications &amp; Consent
            </h2>

            {/* Notification Preference */}
            <div className="mb-6" id="notificationPreference">
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-2">
                Matching Notifications <span className="text-rose-600">*</span>
              </label>
              <p className="text-xs text-neutral-500 mb-3">
                Controls whether you can receive in-app alerts when a compatible blood request arises nearby.
              </p>
              <div role="radiogroup" aria-label="Notification Preference" className="flex gap-3">
                {[
                  { value: 'enabled' as const, label: 'Enabled', icon: '🔔' },
                  { value: 'disabled' as const, label: 'Disabled', icon: '🔕' },
                ].map(({ value, label, icon }) => {
                  const isSelected = formData.notificationPreference === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => updateField('notificationPreference', value)}
                      className={`flex-1 sm:flex-none sm:w-40 py-3 px-4 rounded-xl text-sm font-medium border transition-all cursor-pointer flex items-center gap-2 justify-center ${
                        isSelected
                          ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs'
                          : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-700 border-neutral-200/90'
                      }`}
                    >
                      <span>{icon}</span>
                      {label}
                    </button>
                  );
                })}
              </div>
              {errors.notificationPreference && (
                <p role="alert" className="mt-2 text-xs font-medium text-rose-600">{errors.notificationPreference}</p>
              )}
            </div>

            {/* Consent */}
            <div id="consentGiven" className={`p-4 rounded-2xl border ${errors.consentGiven ? 'border-rose-300 bg-rose-50/30' : 'border-neutral-200/80 bg-neutral-50/60'}`}>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  id="consentCheckbox"
                  checked={formData.consentGiven ?? false}
                  onChange={(e) => updateField('consentGiven', e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-rose-600 shrink-0 cursor-pointer"
                />
                <span className="text-sm text-neutral-700 leading-relaxed">
                  I agree that Hemo Match may use my donor profile information to identify potentially
                  relevant blood requests. My contact details remain private until the appropriate
                  contact-reveal stage. I understand that registering does not guarantee eligibility,
                  donation, or matching.
                </span>
              </label>
              {errors.consentGiven && (
                <p role="alert" className="mt-2 text-xs font-medium text-rose-600">{errors.consentGiven}</p>
              )}
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              id="submit-donor-registration-btn"
              disabled={isSubmitting}
              className="w-full py-4 rounded-full bg-rose-600 hover:bg-rose-700 active:scale-[0.99] text-white font-semibold text-base transition-all duration-150 shadow-sm hover:shadow flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
              </svg>
              Register as Donor
            </button>
            <p className="text-center text-xs text-neutral-400 mt-3">
              Your profile will be stored locally in this session only.
            </p>
          </div>
        </form>
      </main>
    </div>
  );
}
