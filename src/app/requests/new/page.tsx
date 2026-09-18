'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/ui/AppHeader';
import { EmergencyBanner } from '@/components/ui/EmergencyBanner';
import { type BloodRequest, DEMO_DISTRICTS } from '@/types';
import {
  VALID_BLOOD_GROUPS,
  VALID_BLOOD_COMPONENTS,
  validateBloodRequest,
  type BloodRequestFormData,
} from '@/lib/validation';

export default function NewBloodRequestPage() {
  const router = useRouter();

  // Form State
  const [formData, setFormData] = useState<Partial<BloodRequestFormData>>({
    bloodGroup: undefined,
    component: 'Whole Blood',
    unitsNeeded: 1,
    districtId: '',
    approximateArea: '',
    hospitalName: '',
    requiredByDate: '',
    requiredByTime: '',
    urgency: 'urgent',
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Field change helper
  const updateField = <K extends keyof BloodRequestFormData>(
    field: K,
    value: BloodRequestFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (submitError) {
      setSubmitError(null);
    }
    // Clear error for that field on change
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

    const validation = validateBloodRequest(formData);

    if (!validation.isValid || !validation.data) {
      setErrors(validation.errors);
      setIsSubmitting(false);

      // Scroll to the first error
      const firstErrorField = Object.keys(validation.errors)[0];
      if (firstErrorField) {
        const element = document.getElementById(firstErrorField);
        if (element) {
          element.focus();
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
      return;
    }

    const d = validation.data;

    // Send validated payload to POST /api/requests without client-generated ID
    const payload = {
      bloodGroup: d.bloodGroup,
      component: d.component,
      unitsNeeded: d.unitsNeeded,
      districtId: d.districtId,
      approximateArea: d.approximateArea,
      hospitalName: d.hospitalName,
      requiredByDate: d.requiredByDate,
      requiredByTime: d.requiredByTime,
      urgency: d.urgency,
      notes: d.notes || undefined,
    };

    try {
      const response = await fetch('/api/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => null);

      const hasValidRequestId =
        typeof result?.request?.id === 'string' &&
        result.request.id.trim().length > 0;

      if (
        response.status !== 201 ||
        !result?.success ||
        !result?.request ||
        !hasValidRequestId
      ) {
        if (result?.errors && typeof result.errors === 'object') {
          setErrors(result.errors);
        }
        const userMessage =
          response.status === 503 || result?.error === 'service_unavailable'
            ? 'Database service is temporarily unavailable. Please try again shortly.'
            : typeof result?.message === 'string' && response.status >= 400 && response.status < 500
            ? result.message
            : 'Unable to create blood request. Please verify your details and try again.';
        setSubmitError(userMessage);
        setIsSubmitting(false);
        return;
      }

      // Success: use authoritative PostgreSQL UUID returned from API
      const dbRequest = result.request;
      const selectedDistrict = DEMO_DISTRICTS.find(
        (dist) => dist.id === d.districtId
      );

      const requestProfile: BloodRequest = {
        id: dbRequest.id,
        bloodGroup: d.bloodGroup,
        component: d.component,
        unitsNeeded: d.unitsNeeded,
        districtId: d.districtId,
        districtName: selectedDistrict?.name ?? d.districtId,
        approximateArea: d.approximateArea,
        hospitalName: d.hospitalName,
        requiredByDate: d.requiredByDate,
        requiredByTime: d.requiredByTime,
        urgency: d.urgency,
        notes: d.notes,
        status: 'open',
        createdAt: dbRequest.created_at || new Date().toISOString(),
        updatedAt: dbRequest.updated_at || new Date().toISOString(),
      };

      try {
        // Store in client-side localStorage for the matching demo page
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(
            'hemo_match_active_request',
            JSON.stringify(requestProfile)
          );
        }
      } catch {
        console.warn('Unable to write request to localStorage');
      }

      // Navigate to matching demo page
      router.push('/requests/matching-demo');
    } catch {
      setSubmitError(
        'A network error occurred while submitting your blood request. Please check your connection and try again.'
      );
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F7F5] dark:bg-[#0B0B0C] text-neutral-900 dark:text-neutral-100 transition-colors duration-150 selection:bg-rose-100 dark:selection:bg-rose-950/50 selection:text-rose-900 dark:selection:text-rose-200 pb-20">
      {/* Global App Header with Requester Context */}
      <AppHeader roleContext="requester" backHref="/" backLabel="Home" />

      {/* Main Container */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12">
        {/* Title & Introductory Context */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-950 dark:text-white mb-2">
            Request Blood
          </h1>
          <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400 leading-relaxed">
            Create an urgent requirement to match with compatible volunteer
            donors in your district while protecting donor contact privacy.
          </p>
        </div>

        {/* Safety & Clinical Trust Banner */}
        <EmergencyBanner tone="notice" title="Safety & Clinical Notice" className="mb-8">
          Hemo Match helps connect blood requests with potentially eligible
          nearby donors. Final donor eligibility, blood compatibility, and
          transfusion decisions must be confirmed by qualified blood-centre or
          clinical personnel.
        </EmergencyBanner>

        {/* Request Form */}
        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          {/* Card 1: Blood & Component Details */}
          <div className="bg-white rounded-3xl border border-neutral-200/80 p-5 sm:p-7 shadow-xs">
            <h2 className="text-base font-semibold text-neutral-900 mb-4 pb-2 border-b border-neutral-100 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              Required Blood Specification
            </h2>

            {/* A. Blood Group Selection */}
            <div className="mb-6" id="bloodGroup">
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-2">
                Blood Group <span className="text-rose-600">*</span>
              </label>
              <div
                role="radiogroup"
                aria-label="Blood Group"
                className="grid grid-cols-4 sm:grid-cols-8 gap-2"
              >
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
                <p role="alert" className="mt-2 text-xs font-medium text-rose-600">
                  {errors.bloodGroup}
                </p>
              )}
            </div>

            {/* B. Component Needed */}
            <div className="mb-6" id="component">
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-2">
                Component Needed <span className="text-rose-600">*</span>
              </label>
              <div
                role="radiogroup"
                aria-label="Component Needed"
                className="grid grid-cols-2 sm:grid-cols-4 gap-2"
              >
                {VALID_BLOOD_COMPONENTS.map((comp) => {
                  const isSelected = formData.component === comp;
                  return (
                    <button
                      key={comp}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => updateField('component', comp)}
                      className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-medium transition-all duration-150 flex items-center justify-center text-center cursor-pointer border ${
                        isSelected
                          ? 'bg-neutral-900 text-white border-neutral-900 shadow-xs'
                          : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-700 border-neutral-200/90'
                      }`}
                    >
                      {comp}
                    </button>
                  );
                })}
              </div>
              {errors.component && (
                <p role="alert" className="mt-2 text-xs font-medium text-rose-600">
                  {errors.component}
                </p>
              )}
            </div>

            {/* C. Quantity */}
            <div id="unitsNeeded">
              <label
                htmlFor="unitsNeededInput"
                className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-2"
              >
                Quantity (Units / Bags) <span className="text-rose-600">*</span>
              </label>
              <div className="relative max-w-xs">
                <input
                  id="unitsNeededInput"
                  type="number"
                  min="1"
                  max="20"
                  step="1"
                  value={formData.unitsNeeded ?? ''}
                  onChange={(e) =>
                    updateField(
                      'unitsNeeded',
                      e.target.value === '' ? ('' as unknown as number) : Number(e.target.value)
                    )
                  }
                  className={`w-full h-11 px-3.5 pr-14 rounded-xl text-sm bg-neutral-50 border transition-all focus:outline-none focus:ring-2 ${
                    errors.unitsNeeded
                      ? 'border-rose-500 focus:ring-rose-500/20'
                      : 'border-neutral-200 focus:ring-rose-500/20 focus:border-rose-600'
                  }`}
                  placeholder="e.g. 2"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-neutral-400 pointer-events-none">
                  Units
                </span>
              </div>
              <p className="mt-1.5 text-xs text-neutral-500">
                Standard whole blood unit is approx. 350ml - 450ml.
              </p>
              {errors.unitsNeeded && (
                <p role="alert" className="mt-1.5 text-xs font-medium text-rose-600">
                  {errors.unitsNeeded}
                </p>
              )}
            </div>
          </div>

          {/* Card 2: Location & Destination */}
          <div className="bg-white rounded-3xl border border-neutral-200/80 p-5 sm:p-7 shadow-xs">
            <h2 className="text-base font-semibold text-neutral-900 mb-4 pb-2 border-b border-neutral-100 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              District &amp; Location
            </h2>

            {/* D. District Dropdown */}
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
                <option value="">Select a district...</option>
                {DEMO_DISTRICTS.map((dist) => (
                  <option key={dist.id} value={dist.id}>
                    {dist.name} {dist.state ? `(${dist.state})` : ''}
                  </option>
                ))}
              </select>
              {errors.districtId && (
                <p role="alert" className="mt-1.5 text-xs font-medium text-rose-600">
                  {errors.districtId}
                </p>
              )}
            </div>

            {/* E. Approximate Area / Locality */}
            <div className="mb-5" id="approximateArea">
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
                Please enter a neighbourhood or landmark only. Do not provide private home addresses.
              </p>
              {errors.approximateArea && (
                <p role="alert" className="mt-1.5 text-xs font-medium text-rose-600">
                  {errors.approximateArea}
                </p>
              )}
            </div>

            {/* F. Hospital / Blood Centre */}
            <div id="hospitalName">
              <label
                htmlFor="hospitalNameInput"
                className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-2"
              >
                Hospital / Blood Centre <span className="text-rose-600">*</span>
              </label>
              <input
                id="hospitalNameInput"
                type="text"
                value={formData.hospitalName ?? ''}
                onChange={(e) => updateField('hospitalName', e.target.value)}
                placeholder="e.g., General Hospital Blood Bank, City Medical Trust"
                className={`w-full h-11 px-3.5 rounded-xl text-sm bg-neutral-50 border transition-all focus:outline-none focus:ring-2 ${
                  errors.hospitalName
                    ? 'border-rose-500 focus:ring-rose-500/20'
                    : 'border-neutral-200 focus:ring-rose-500/20 focus:border-rose-600'
                }`}
              />
              {errors.hospitalName && (
                <p role="alert" className="mt-1.5 text-xs font-medium text-rose-600">
                  {errors.hospitalName}
                </p>
              )}
            </div>
          </div>

          {/* Card 3: Urgency & Timing */}
          <div className="bg-white rounded-3xl border border-neutral-200/80 p-5 sm:p-7 shadow-xs">
            <h2 className="text-base font-semibold text-neutral-900 mb-4 pb-2 border-b border-neutral-100 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              Timing &amp; Urgency Tier
            </h2>

            {/* G. Required By Date and Time */}
            <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div id="requiredByDate">
                <label
                  htmlFor="requiredByDateInput"
                  className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-2"
                >
                  Required By Date <span className="text-rose-600">*</span>
                </label>
                <input
                  id="requiredByDateInput"
                  type="date"
                  value={formData.requiredByDate ?? ''}
                  onChange={(e) => updateField('requiredByDate', e.target.value)}
                  className={`w-full h-11 px-3.5 rounded-xl text-sm bg-neutral-50 border transition-all focus:outline-none focus:ring-2 cursor-pointer ${
                    errors.requiredByDate
                      ? 'border-rose-500 focus:ring-rose-500/20'
                      : 'border-neutral-200 focus:ring-rose-500/20 focus:border-rose-600'
                  }`}
                />
                {errors.requiredByDate && (
                  <p role="alert" className="mt-1.5 text-xs font-medium text-rose-600">
                    {errors.requiredByDate}
                  </p>
                )}
              </div>

              <div id="requiredByTime">
                <label
                  htmlFor="requiredByTimeInput"
                  className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-2"
                >
                  Required By Time <span className="text-rose-600">*</span>
                </label>
                <input
                  id="requiredByTimeInput"
                  type="time"
                  value={formData.requiredByTime ?? ''}
                  onChange={(e) => updateField('requiredByTime', e.target.value)}
                  className={`w-full h-11 px-3.5 rounded-xl text-sm bg-neutral-50 border transition-all focus:outline-none focus:ring-2 cursor-pointer ${
                    errors.requiredByTime
                      ? 'border-rose-500 focus:ring-rose-500/20'
                      : 'border-neutral-200 focus:ring-rose-500/20 focus:border-rose-600'
                  }`}
                />
                {errors.requiredByTime && (
                  <p role="alert" className="mt-1.5 text-xs font-medium text-rose-600">
                    {errors.requiredByTime}
                  </p>
                )}
              </div>
            </div>

            {/* H. Urgency Cards */}
            <div id="urgency">
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-2">
                Urgency Level <span className="text-rose-600">*</span>
              </label>
              <div
                role="radiogroup"
                aria-label="Urgency Level"
                className="grid grid-cols-1 sm:grid-cols-3 gap-3"
              >
                {/* Critical */}
                <button
                  type="button"
                  role="radio"
                  aria-checked={formData.urgency === 'critical'}
                  onClick={() => updateField('urgency', 'critical')}
                  className={`p-4 rounded-2xl text-left border transition-all cursor-pointer ${
                    formData.urgency === 'critical'
                      ? 'bg-rose-50/80 border-rose-500 ring-2 ring-rose-500/20'
                      : 'bg-neutral-50 hover:bg-neutral-100 border-neutral-200/90'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-rose-700">Critical</span>
                    <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
                  </div>
                  <p className="text-xs text-neutral-600">Immediate emergency / surgery</p>
                </button>

                {/* Urgent */}
                <button
                  type="button"
                  role="radio"
                  aria-checked={formData.urgency === 'urgent'}
                  onClick={() => updateField('urgency', 'urgent')}
                  className={`p-4 rounded-2xl text-left border transition-all cursor-pointer ${
                    formData.urgency === 'urgent'
                      ? 'bg-amber-50/80 border-amber-500 ring-2 ring-amber-500/20'
                      : 'bg-neutral-50 hover:bg-neutral-100 border-neutral-200/90'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-amber-700">Urgent</span>
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                  </div>
                  <p className="text-xs text-neutral-600">Needed within 12–24 hours</p>
                </button>

                {/* Routine */}
                <button
                  type="button"
                  role="radio"
                  aria-checked={formData.urgency === 'routine'}
                  onClick={() => updateField('urgency', 'routine')}
                  className={`p-4 rounded-2xl text-left border transition-all cursor-pointer ${
                    formData.urgency === 'routine'
                      ? 'bg-neutral-100 border-neutral-400 ring-2 ring-neutral-400/20'
                      : 'bg-neutral-50 hover:bg-neutral-100 border-neutral-200/90'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-neutral-800">Routine</span>
                    <span className="w-2 h-2 rounded-full bg-neutral-400" />
                  </div>
                  <p className="text-xs text-neutral-600">Scheduled within 24+ hours</p>
                </button>
              </div>
              {errors.urgency && (
                <p role="alert" className="mt-1.5 text-xs font-medium text-rose-600">
                  {errors.urgency}
                </p>
              )}
            </div>
          </div>

          {/* Card 4: Optional Note & Privacy Guard */}
          <div className="bg-white rounded-3xl border border-neutral-200/80 p-5 sm:p-7 shadow-xs">
            <h2 className="text-base font-semibold text-neutral-900 mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-neutral-400" />
              Coordination Notes (Optional)
            </h2>
            <p className="text-xs text-neutral-500 mb-4">
              Add logistical details such as specific hospital wing or blood bank counter.
              <strong className="text-neutral-700 block mt-0.5">
                Do not include patient names, personal phone numbers, or private medical details.
              </strong>
            </p>

            <textarea
              rows={3}
              id="notes"
              value={formData.notes ?? ''}
              onChange={(e) => updateField('notes', e.target.value)}
              placeholder="e.g., Replacement donation requested at Blood Bank counter B."
              className="w-full p-3.5 rounded-xl text-sm bg-neutral-50 border border-neutral-200 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 focus:outline-none resize-y"
            />
          </div>

          {/* Submission Action */}
          <div className="pt-2">
            {submitError && (
              <div
                role="alert"
                className="mb-4 p-4 rounded-2xl border border-rose-200 bg-rose-50/80 text-rose-800 text-sm flex items-start gap-3"
              >
                <svg
                  className="w-5 h-5 text-rose-600 shrink-0 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
                  />
                </svg>
                <div>
                  <p className="font-semibold text-rose-900">Request Error</p>
                  <p className="mt-0.5 text-xs text-rose-700 leading-relaxed">{submitError}</p>
                </div>
              </div>
            )}

            <button
              type="submit"
              id="find-matching-donors-btn"
              disabled={isSubmitting}
              className="w-full py-4 rounded-full bg-rose-600 hover:bg-rose-700 active:scale-[0.99] text-white font-semibold text-base transition-all duration-150 shadow-sm hover:shadow flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin w-5 h-5 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  <span>Saving Blood Request...</span>
                </>
              ) : (
                <>
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                    />
                  </svg>
                  <span>Find Matching Donors</span>
                </>
              )}
            </button>
            <p className="text-center text-xs text-neutral-400 mt-3">
              Your request will be securely saved to the database and ready for donor matching.
            </p>
          </div>
        </form>
      </main>
    </div>
  );
}
